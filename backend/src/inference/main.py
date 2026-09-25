import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
import time
from typing import Any, Optional

import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

from src.config import Config
from src.utils.image import decode_image
from src.utils.logger import logger


@dataclass(slots=True)
class RawDetection:
    class_id: int
    class_name: str
    confidence: float
    box: list[float]  # [x1, y1, x2, y2]
    polygon: Optional[list[list[float]]] = None


@dataclass(slots=True)
class EngineResult:
    image_width: int
    image_height: int
    model_name: str
    task: str
    detections: list[RawDetection]
    decode_ms: float
    inference_ms: float
    postprocess_ms: float
    total_ms: float


MODELS_CATALOG = {
    "yolo26-seg": {
        "id": "yolo26-seg",
        "name": "Crop & Weed Segmentation (YOLO26)",
        "task": "segment",
        "path": "weights/best.pt",
        "description": "Segments Maize, Broadleaf Weeds, and Narrowleaf Weeds with organic polygon leaf contours and boxes.",
        "imgsz": 1024,
    },
    "weedblaster-detect": {
        "id": "weedblaster-detect",
        "name": "Multi-Crop & Weed Detector (WeedBlaster)",
        "task": "detect",
        "path": "weights/weedblaster-vision-yolov_best.pt",
        "description": "Detects 9 categories (Maize, Sugar beet, Soy, Sunflower, Potato, Pea, Bean, Pumpkin, Weed) with bounding boxes.",
        "imgsz": 1280,
    },
}


def _resolve_model_path(path_str: str) -> Path:
    p = Path(path_str)
    if not p.exists():
        alt = Path(__file__).resolve().parent.parent.parent / path_str
        if alt.exists():
            return alt
    return p


class InferenceEngine:
    def __init__(self, default_model_path: str = Config.MODEL_PATH):
        self.default_model_path = default_model_path
        self._models: dict[str, YOLO] = {}
        self._is_ready: bool = False
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="yolo-infer")

    @property
    def is_ready(self) -> bool:
        return self._is_ready and len(self._models) > 0

    def load(self) -> None:
        """Loads available YOLO model weights synchronously."""
        for mid, entry in MODELS_CATALOG.items():
            resolved = _resolve_model_path(entry["path"])
            if resolved.exists():
                logger.info(f"Loading model '{mid}' from '{resolved}'...")
                t0 = time.perf_counter()
                model = YOLO(str(resolved))
                load_ms = (time.perf_counter() - t0) * 1000
                self._models[mid] = model
                logger.info(f"Model '{mid}' loaded in {load_ms:.1f}ms. Names: {model.names}")
            else:
                logger.warning(f"Weights file not found for model '{mid}' at '{resolved}'")

        if not self._models:
            # Fallback to Config.MODEL_PATH
            fallback_p = _resolve_model_path(self.default_model_path)
            if fallback_p.exists():
                self._models["yolo26-seg"] = YOLO(str(fallback_p))

        self._is_ready = len(self._models) > 0
        logger.info(f"InferenceEngine ready with {len(self._models)} model(s): {list(self._models.keys())}")

    def warmup(self, runs: int = 1) -> None:
        """Warms up all loaded models with dummy inferences."""
        if not self.is_ready:
            raise RuntimeError("Cannot warmup engine before models are loaded.")

        dummy = np.zeros((Config.INFERENCE_IMGSZ, Config.INFERENCE_IMGSZ, 3), dtype=np.uint8)
        for mid, model in self._models.items():
            logger.info(f"Warming up model '{mid}'...")
            for i in range(runs):
                t0 = time.perf_counter()
                model.predict(
                    source=dummy,
                    imgsz=Config.INFERENCE_IMGSZ,
                    save=False,
                    verbose=False,
                )
                logger.info(f"Warmup '{mid}' run {i + 1} finished in {(time.perf_counter() - t0) * 1000:.1f}ms")

    def _predict_sync(self, image_data: bytes, model_id: Optional[str] = None) -> EngineResult:
        if not self.is_ready:
            raise RuntimeError("Inference engine is not ready.")

        # Determine target model
        target_id = model_id if model_id and model_id in self._models else next(iter(self._models.keys()))
        model = self._models[target_id]
        catalog_entry = MODELS_CATALOG.get(target_id, {
            "name": Config.MODEL_NAME,
            "task": getattr(model, "task", "detect"),
        })

        # 1. Decode & preprocess
        t_decode_start = time.perf_counter()
        img: Image.Image = decode_image(
            image_data,
            max_pixels=Config.MAX_IMAGE_PIXELS,
        )
        img_w, img_h = img.size
        t_decode_end = time.perf_counter()

        # 2. Run YOLO Inference
        t_infer_start = time.perf_counter()
        target_imgsz = catalog_entry.get("imgsz", Config.INFERENCE_IMGSZ)
        results = model.predict(
            source=img,
            imgsz=target_imgsz,
            conf=Config.CONFIDENCE_THRESHOLD,
            iou=Config.IOU_THRESHOLD,
            max_det=Config.MAX_DETECTIONS,
            save=False,
            verbose=False,
        )
        t_infer_end = time.perf_counter()

        # 3. Postprocess detections and masks
        t_post_start = time.perf_counter()
        result = results[0]

        detections: list[RawDetection] = []
        names_map: dict[int, str] = model.names or {}

        has_boxes = result.boxes is not None and len(result.boxes) > 0
        if has_boxes:
            boxes_xyxy = result.boxes.xyxy.cpu().numpy()
            classes = result.boxes.cls.cpu().numpy().astype(int)
            confidences = result.boxes.conf.cpu().numpy()

            masks_xy = None
            if result.masks is not None and result.masks.xy is not None:
                masks_xy = result.masks.xy

            num_detections = len(boxes_xyxy)
            for i in range(num_detections):
                cls_id = int(classes[i])
                cls_name = names_map.get(cls_id, f"class_{cls_id}")
                conf = float(round(float(confidences[i]), 3))
                box_coords = [round(float(c), 1) for c in boxes_xyxy[i]]

                simplified_poly: Optional[list[list[float]]] = None
                if masks_xy is not None and i < len(masks_xy):
                    poly_raw = masks_xy[i]
                    if poly_raw is not None and len(poly_raw) >= 3:
                        poly_pts = np.ascontiguousarray(poly_raw, dtype=np.float32).reshape(-1, 1, 2)
                        approx = cv2.approxPolyDP(poly_pts, epsilon=Config.POLYGON_EPSILON_PX, closed=True)
                        simplified_poly = [
                            [round(float(pt[0][0]), 1), round(float(pt[0][1]), 1)]
                            for pt in approx
                        ]

                detections.append(
                    RawDetection(
                        class_id=cls_id,
                        class_name=cls_name,
                        confidence=conf,
                        box=box_coords,
                        polygon=simplified_poly,
                    )
                )

        t_post_end = time.perf_counter()

        decode_ms = round((t_decode_end - t_decode_start) * 1000, 2)
        inference_ms = round((t_infer_end - t_infer_start) * 1000, 2)
        postprocess_ms = round((t_post_end - t_post_start) * 1000, 2)
        total_ms = round((t_post_end - t_decode_start) * 1000, 2)

        return EngineResult(
            image_width=img_w,
            image_height=img_h,
            model_name=catalog_entry["name"],
            task=catalog_entry["task"],
            detections=detections,
            decode_ms=decode_ms,
            inference_ms=inference_ms,
            postprocess_ms=postprocess_ms,
            total_ms=total_ms,
        )

    async def analyse(self, image_data: bytes, model_id: Optional[str] = None) -> EngineResult:
        """Dispatches CPU-heavy inference to the dedicated single-thread pool."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._predict_sync, image_data, model_id)

    def get_models_list(self) -> list[dict[str, Any]]:
        models_out = []
        for mid, model in self._models.items():
            entry = MODELS_CATALOG.get(mid, {
                "id": mid,
                "name": mid,
                "task": getattr(model, "task", "detect"),
                "description": "",
            })
            classes = []
            if model.names:
                for cid, cname in model.names.items():
                    classes.append({"id": int(cid), "name": str(cname)})

            models_out.append({
                "id": mid,
                "name": entry["name"],
                "task": entry["task"],
                "description": entry["description"],
                "classes": classes,
            })
        return models_out

    def get_info(self, model_id: Optional[str] = None) -> dict[str, Any]:
        target_id = model_id if model_id and model_id in self._models else next(iter(self._models.keys()))
        model = self._models[target_id]
        entry = MODELS_CATALOG.get(target_id, {
            "name": target_id,
            "task": getattr(model, "task", "detect"),
        })
        classes = []
        if model.names:
            for cid, cname in model.names.items():
                classes.append({"id": int(cid), "name": str(cname)})
        return {
            "name": entry["name"],
            "task": entry["task"],
            "imgsz": Config.INFERENCE_IMGSZ,
            "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
            "classes": classes,
        }

    def shutdown(self) -> None:
        """Shuts down the thread pool executor."""
        logger.info("Shutting down InferenceEngine thread pool...")
        self._executor.shutdown(wait=False)

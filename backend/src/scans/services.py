from fastapi import HTTPException, UploadFile, status

from src.config import Config
from src.inference.main import InferenceEngine
from src.scans.schemas import DetectionOut, ModelClassOut, ModelDescriptorOut, ModelInfoOut, ScanOut, ScanTimingsOut
from src.utils.image import ImageTooLargeError, InvalidImageError, UnsupportedImageError
from src.utils.logger import logger


class ScanServices:
    def __init__(self, engine: InferenceEngine):
        self.engine = engine

    async def analyse_image(self, *, upload: UploadFile, model_id: str | None = None) -> ScanOut:
        if not self.engine.is_ready:
            logger.warning("Scan attempted while inference engine is not ready.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The model is still starting. Try again in a few seconds.",
            )

        # 1. Fast Content-Type check (if sent by client)
        if upload.content_type:
            ct = upload.content_type.lower().strip()
            if not (ct.startswith("image/") or ct == "application/octet-stream"):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Use a JPG, PNG or WebP photo.",
                )

        # 2. Fast size check from header metadata if available
        max_bytes = Config.MAX_UPLOAD_MB * 1024 * 1024
        if upload.size and upload.size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"That photo is too large. Maximum size is {Config.MAX_UPLOAD_MB} MB.",
            )

        # 3. Streamed read with hard byte cap to prevent memory exhaustion
        chunks = []
        total_read = 0
        try:
            while chunk := await upload.read(1024 * 1024):
                total_read += len(chunk)
                if total_read > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"That photo is too large. Maximum size is {Config.MAX_UPLOAD_MB} MB.",
                    )
                chunks.append(chunk)
            data = b"".join(chunks)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to read uploaded file: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not read uploaded file.",
            ) from e

        if not data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded image file is empty.",
            )

        # 3. Analyze through inference engine
        try:
            result = await self.engine.analyse(data, model_id=model_id)
        except UnsupportedImageError as e:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Use a JPG, PNG or WebP photo.",
            ) from e
        except ImageTooLargeError as e:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image dimensions exceed maximum allowed limits.",
            ) from e
        except InvalidImageError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="We couldn't read that image. Try another photo.",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error during inference: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Something went wrong during image analysis. Try again.",
            ) from e

        # 4. Map to ScanOut schema
        return ScanOut(
            image_width=result.image_width,
            image_height=result.image_height,
            model_name=result.model_name,
            task=result.task,
            detections=[
                DetectionOut(
                    class_id=d.class_id,
                    class_name=d.class_name,
                    confidence=d.confidence,
                    box=d.box,
                    polygon=d.polygon,
                )
                for d in result.detections
            ],
            timings=ScanTimingsOut(
                decode_ms=result.decode_ms,
                inference_ms=result.inference_ms,
                postprocess_ms=result.postprocess_ms,
                total_ms=result.total_ms,
            ),
        )

    def get_available_models(self) -> list[ModelDescriptorOut]:
        if not self.engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The models are still loading. Try again in a few seconds.",
            )
        raw_list = self.engine.get_models_list()
        return [
            ModelDescriptorOut(
                id=m["id"],
                name=m["name"],
                task=m["task"],
                description=m["description"],
                classes=[ModelClassOut(id=c["id"], name=c["name"]) for c in m["classes"]],
            )
            for m in raw_list
        ]

    def get_model_info(self, model_id: str | None = None) -> ModelInfoOut:
        if not self.engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The model is still starting. Try again in a few seconds.",
            )
        info = self.engine.get_info(model_id=model_id)
        return ModelInfoOut(
            name=info["name"],
            task=info["task"],
            imgsz=info["imgsz"],
            confidence_threshold=info["confidence_threshold"],
            classes=[ModelClassOut(id=c["id"], name=c["name"]) for c in info["classes"]],
        )


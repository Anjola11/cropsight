from dataclasses import dataclass
import pytest
from httpx import ASGITransport, AsyncClient

from src import app
from src.utils.image import decode_image


@dataclass(slots=True)
class RawDetection:
    class_id: int
    class_name: str
    confidence: float
    box: list[float]
    polygon: list[list[float]] | None


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


class FakeEngine:
    def __init__(self, is_ready: bool = True):
        self._is_ready = is_ready
        self.names = {0: "BroWeed", 1: "Maize", 2: "NarWeed"}
        self.task = "segment"
        self.imgsz = 640
        self.confidence = 0.25

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    def set_ready(self, val: bool) -> None:
        self._is_ready = val

    async def load(self) -> None:
        pass

    async def analyse(self, data: bytes, model_id: str | None = None) -> EngineResult:
        decode_image(data)
        return EngineResult(
            image_width=1024,
            image_height=768,
            model_name="Crop & Weed Segmentation (YOLO26)",
            task="segment",
            detections=[
                RawDetection(
                    class_id=1,
                    class_name="Maize",
                    confidence=0.925,
                    box=[100.0, 50.0, 300.0, 400.0],
                    polygon=[[100.0, 50.0], [300.0, 50.0], [300.0, 400.0]],
                )
            ],
            decode_ms=5.0,
            inference_ms=120.0,
            postprocess_ms=2.0,
            total_ms=127.0,
        )

    def get_models_list(self):
        return [
            {
                "id": "yolo26-seg",
                "name": "Crop & Weed Segmentation (YOLO26)",
                "task": "segment",
                "description": "Segmentation model",
                "classes": [{"id": k, "name": v} for k, v in self.names.items()],
            },
            {
                "id": "weedblaster-detect",
                "name": "Multi-Crop & Weed Detector (WeedBlaster)",
                "task": "detect",
                "description": "Detection model",
                "classes": [{"id": 0, "name": "Maize"}, {"id": 1, "name": "Weed"}],
            },
        ]

    def get_info(self, model_id: str | None = None):
        return {
            "name": "yolo26s-seg",
            "task": self.task,
            "imgsz": self.imgsz,
            "confidence_threshold": self.confidence,
            "classes": [{"id": k, "name": v} for k, v in self.names.items()],
        }

    def close(self) -> None:
        pass

    def shutdown(self) -> None:
        pass



@pytest.fixture
def fake_engine():
    return FakeEngine(is_ready=True)


@pytest.fixture
async def client(fake_engine):
    app.state.inference_engine = fake_engine
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

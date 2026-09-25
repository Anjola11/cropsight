from typing import Optional
from pydantic import BaseModel, Field


class DetectionOut(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    box: list[float]  # [x1, y1, x2, y2]
    polygon: Optional[list[list[float]]] = None


class ScanTimingsOut(BaseModel):
    decode_ms: float
    inference_ms: float
    postprocess_ms: float
    total_ms: float


class ScanOut(BaseModel):
    image_width: int
    image_height: int
    model_name: str
    task: str = "segment"
    detections: list[DetectionOut]
    timings: ScanTimingsOut


class ModelClassOut(BaseModel):
    id: int
    name: str


class ModelDescriptorOut(BaseModel):
    id: str
    name: str
    task: str
    description: str
    classes: list[ModelClassOut]


class ModelInfoOut(BaseModel):
    name: str
    task: str
    imgsz: int
    confidence_threshold: float
    classes: list[ModelClassOut]


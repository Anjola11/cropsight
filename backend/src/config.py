from typing import Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    IS_PRODUCTION: bool = False
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    APP_NAME: str = "CropSight"
    MODEL_PATH: str = "weights/best.pt"
    MODEL_NAME: str = "yolo26s-seg"
    INFERENCE_IMGSZ: int = 1024
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.7
    MAX_DETECTIONS: int = 100
    MAX_UPLOAD_MB: int = 10
    MAX_IMAGE_PIXELS: int = 40_000_000
    POLYGON_EPSILON_PX: float = 1.0
    RATE_LIMIT_SCAN: str = "30/minute"
    RATE_LIMIT_READ: str = "120/minute"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


Config = Settings()


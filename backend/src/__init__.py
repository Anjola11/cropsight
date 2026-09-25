from contextlib import asynccontextmanager
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.config import Config
from src.inference.main import InferenceEngine
from src.limiter import limiter
from src.scans.routes import scans_router
from src.utils.logger import logger
from src.utils.responses import success_response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {Config.APP_NAME} backend...")
    engine = InferenceEngine(Config.MODEL_PATH)
    try:
        engine.load()
        engine.warmup(runs=2)
    except Exception as e:
        logger.error(f"Failed to load or warmup inference engine: {e}", exc_info=True)
    app.state.inference_engine = engine
    yield
    logger.info(f"Shutting down {Config.APP_NAME} backend...")
    if hasattr(app.state, "inference_engine") and app.state.inference_engine:
        app.state.inference_engine.shutdown()


app = FastAPI(
    title=Config.APP_NAME,
    lifespan=lifespan,
)

# Middleware stack
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)

origins = Config.ALLOWED_ORIGINS
allow_creds = True
if origins == ["*"] or origins == "*":
    allow_creds = False
    origins = ["*"]
elif isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter


def format_validation_errors(errors):
    formatted = []
    for err in errors:
        loc = err["loc"]
        field = ".".join(str(l) for l in loc[1:]) if len(loc) > 1 else str(loc[0])
        formatted.append({"field": field, "message": err["msg"]})
    return formatted


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "data": None,
        },
    )


@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Validation error", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": format_validation_errors(exc.errors()),
            "data": None,
        },
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    headers = getattr(exc, "headers", None) or {}
    retry_after_raw = headers.get("Retry-After") or headers.get("retry-after")

    retry_after_seconds: int = 0
    if retry_after_raw:
        try:
            retry_after_seconds = int(float(str(retry_after_raw)))
        except ValueError:
            try:
                retry_dt = parsedate_to_datetime(str(retry_after_raw))
                if retry_dt.tzinfo is None:
                    retry_dt = retry_dt.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                retry_after_seconds = max(0, int((retry_dt - now).total_seconds()))
            except Exception:
                retry_after_seconds = 0

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(retry_after_seconds)},
        content={
            "success": False,
            "message": "Too many requests",
            "retry_after": retry_after_seconds,
            "data": None,
        },
    )


@app.get("/")
@app.get("/api/v1")
@app.get("/api/v1/")
@limiter.limit(Config.RATE_LIMIT_READ)
async def root_health_check(request: Request):
    engine = getattr(request.app.state, "inference_engine", None)
    is_ready = getattr(engine, "is_ready", False)
    return success_response(
        f"{Config.APP_NAME} API is running",
        {"model_ready": is_ready},
    )


# Routers
app.include_router(scans_router, prefix="/api/v1/scans", tags=["scans"])
app.include_router(scans_router, prefix="/api/v1", tags=["scans"])

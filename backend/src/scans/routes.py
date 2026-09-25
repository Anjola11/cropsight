from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from src.config import Config
from src.limiter import limiter
from src.scans.services import ScanServices
from src.utils.responses import success_response

scans_router = APIRouter()


def get_scan_services(request: Request) -> ScanServices:
    engine = getattr(request.app.state, "inference_engine", None)
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Inference engine not configured or starting.",
        )
    return ScanServices(engine)


@scans_router.post("")
@scans_router.post("/")
@limiter.limit(Config.RATE_LIMIT_SCAN)
async def analyse_scan(
    request: Request,
    file: UploadFile = File(...),
    model_id: Optional[str] = Form(None),
    services: ScanServices = Depends(get_scan_services),
):
    """Upload an image to detect crops, weeds, and segment coordinates."""
    chosen_model = model_id or request.query_params.get("model_id")
    result = await services.analyse_image(upload=file, model_id=chosen_model)
    return success_response("Scan completed successfully", result.model_dump())


@scans_router.post("/batch")
@limiter.limit(Config.RATE_LIMIT_SCAN)
async def analyse_batch_scans(
    request: Request,
    files: list[UploadFile] = File(...),
    model_id: Optional[str] = Form(None),
    services: ScanServices = Depends(get_scan_services),
):
    """Upload multiple images (up to MAX_BATCH_SIZE) to detect crops, weeds, and segment coordinates."""
    chosen_model = model_id or request.query_params.get("model_id")
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No files provided for batch scanning.",
        )
    if len(files) > Config.MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size exceeds maximum limit of {Config.MAX_BATCH_SIZE} photos.",
        )

    items = []
    successful_count = 0
    failed_count = 0

    for idx, f in enumerate(files):
        try:
            res = await services.analyse_image(upload=f, model_id=chosen_model)
            items.append({
                "index": idx,
                "filename": f.filename or f"photo_{idx + 1}.jpg",
                "success": True,
                "data": res.model_dump(),
                "error": None,
            })
            successful_count += 1
        except HTTPException as e:
            items.append({
                "index": idx,
                "filename": f.filename or f"photo_{idx + 1}.jpg",
                "success": False,
                "data": None,
                "error": e.detail,
            })
            failed_count += 1
        except Exception as e:
            items.append({
                "index": idx,
                "filename": f.filename or f"photo_{idx + 1}.jpg",
                "success": False,
                "data": None,
                "error": "Failed to analyze image.",
            })
            failed_count += 1

    return success_response(
        f"Batch analysis completed: {successful_count} succeeded, {failed_count} failed",
        {
            "items": items,
            "total": len(files),
            "successful": successful_count,
            "failed": failed_count,
        },
    )


@scans_router.get("/models")
@limiter.limit(Config.RATE_LIMIT_READ)
async def get_models_catalog(
    request: Request,
    services: ScanServices = Depends(get_scan_services),
):
    """Retrieve catalog of all available models and their tasks/classes."""
    models = services.get_available_models()
    return success_response("Available models retrieved", [m.model_dump() for m in models])


@scans_router.get("/model")
@limiter.limit(Config.RATE_LIMIT_READ)
async def get_model_information(
    request: Request,
    model_id: Optional[str] = None,
    services: ScanServices = Depends(get_scan_services),
):
    """Retrieve metadata and classes for the currently loaded model."""
    info = services.get_model_info(model_id=model_id)
    return success_response("Model information retrieved", info.model_dump())

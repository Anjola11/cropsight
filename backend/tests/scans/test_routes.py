import io
import pytest
from PIL import Image


def make_dummy_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(100, 200, 50))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_root_and_apiv1_health(client):
    r1 = await client.get("/")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["success"] is True
    assert d1["data"]["model_ready"] is True

    r2 = await client.get("/api/v1")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["success"] is True


@pytest.mark.asyncio
async def test_get_model_info(client):
    r = await client.get("/api/v1/scans/model")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["name"] == "yolo26s-seg"
    assert len(body["data"]["classes"]) == 3


@pytest.mark.asyncio
async def test_analyse_scan_success(client):
    jpeg_bytes = make_dummy_jpeg()
    files = {"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["image_width"] == 1024
    assert len(data["detections"]) == 1
    assert data["detections"][0]["class_name"] == "Maize"
    assert "timings" in data


@pytest.mark.asyncio
async def test_analyse_scan_engine_not_ready(client, fake_engine):
    fake_engine.set_ready(False)
    jpeg_bytes = make_dummy_jpeg()
    files = {"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 503
    body = r.json()
    assert body["success"] is False
    assert "starting" in body["message"].lower()


@pytest.mark.asyncio
async def test_get_models_catalog(client):
    r = await client.get("/api/v1/scans/models")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert len(body["data"]) == 2
    assert body["data"][0]["id"] == "yolo26-seg"
    assert body["data"][1]["id"] == "weedblaster-detect"


@pytest.mark.asyncio
async def test_analyse_scan_rejects_empty_file(client):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 422
    body = r.json()
    assert body["success"] is False
    assert "empty" in body["message"].lower()


@pytest.mark.asyncio
async def test_analyse_scan_rejects_non_image_mime(client):
    files = {"file": ("document.pdf", b"%PDF-1.4 dummy", "application/pdf")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 415
    body = r.json()
    assert body["success"] is False
    assert "jpg, png or webp" in body["message"].lower()


@pytest.mark.asyncio
async def test_analyse_scan_rejects_corrupted_bytes(client):
    files = {"file": ("fake.jpg", b"NOT_A_REAL_IMAGE_BYTES", "image/jpeg")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 422
    body = r.json()
    assert body["success"] is False


@pytest.mark.asyncio
async def test_analyse_scan_rejects_oversized_file(client, monkeypatch):
    from src.config import Config
    monkeypatch.setattr(Config, "MAX_UPLOAD_MB", 1)
    large_payload = b"0" * (1 * 1024 * 1024 + 100)
    files = {"file": ("large.jpg", large_payload, "image/jpeg")}
    r = await client.post("/api/v1/scans", files=files)
    assert r.status_code == 413
    body = r.json()
    assert body["success"] is False
    assert "too large" in body["message"].lower()


@pytest.mark.asyncio
async def test_analyse_batch_scans_success(client):
    img1 = make_dummy_jpeg()
    img2 = make_dummy_jpeg()
    files = [
        ("files", ("photo1.jpg", img1, "image/jpeg")),
        ("files", ("photo2.jpg", img2, "image/jpeg")),
    ]
    r = await client.post("/api/v1/scans/batch", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["total"] == 2
    assert data["successful"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["success"] is True
    assert data["items"][1]["success"] is True


@pytest.mark.asyncio
async def test_analyse_batch_scans_exceeds_cap(client, monkeypatch):
    from src.config import Config
    monkeypatch.setattr(Config, "MAX_BATCH_SIZE", 2)
    img = make_dummy_jpeg()
    files = [
        ("files", ("p1.jpg", img, "image/jpeg")),
        ("files", ("p2.jpg", img, "image/jpeg")),
        ("files", ("p3.jpg", img, "image/jpeg")),
    ]
    r = await client.post("/api/v1/scans/batch", files=files)
    assert r.status_code == 400
    body = r.json()
    assert body["success"] is False
    assert "exceeds maximum limit" in body["message"].lower()


@pytest.mark.asyncio
async def test_analyse_batch_scans_handles_mixed_results(client):
    img = make_dummy_jpeg()
    files = [
        ("files", ("valid.jpg", img, "image/jpeg")),
        ("files", ("bad.txt", b"plain text", "text/plain")),
    ]
    r = await client.post("/api/v1/scans/batch", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["total"] == 2
    assert data["successful"] == 1
    assert data["failed"] == 1
    assert data["items"][0]["success"] is True
    assert data["items"][1]["success"] is False
    assert data["items"][1]["error"] is not None



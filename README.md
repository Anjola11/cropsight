# CropSight

CropSight is an AI-powered precision agriculture application. A user uploads a plant or field photo, and the app instantly marks detected plants and weeds with pixel-accurate bounding boxes and organic polygon outlines, labeled with category and confidence.

---

## Architecture Overview

```
ifa/
├── backend/                  # FastAPI + Ultralytics YOLO backend
│   ├── src/                  # App code (config, limiter, inference, scans)
│   ├── tests/                # Pytest async test suite
│   └── weights/              # Committed model weights (best.pt)
├── frontend/                 # React 19 + Vite + Tailwind CSS v4
│   ├── src/components/       # UI primitives, layout, charts, scans
│   ├── src/pages/            # Overview, Scan, History, Model, NotFound
│   └── src/services/         # API client & local scan storage
└── README.md
```

* **Backend:** FastAPI with Ultralytics YOLO segmentation (`yolo26s-seg`). Inference runs inside a dedicated single-thread executor to prevent blocking the event loop.
* **Frontend:** React 19, TanStack Router (code-based tree), TanStack Query, Tailwind CSS v4 with design tokens mapped to CSS variables, Plus Jakarta Sans typography.
* **Local Scan History:** Recent scans (up to 10) are saved on-device in `localStorage`.

---

## Quick Start (Local Development)

### Prerequisites
* Python 3.13+
* Node.js v20+
* [uv](https://docs.astral.sh/uv/) package manager

### 1. Backend Setup
From the repository root:
```powershell
cd backend
uv sync
uv run uvicorn src:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`. Test health at `http://localhost:8000/`.

### 2. Frontend Setup
In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Vite proxies `/api/v1` requests to `http://localhost:8000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `IS_PRODUCTION` | bool | `false` | Production mode toggle |
| `ALLOWED_ORIGINS` | list | `["http://localhost:5173"]` | CORS allowed origins |
| `APP_NAME` | str | `"CropSight"` | FastAPI application title |
| `MODEL_PATH` | str | `"weights/best.pt"` | Path to YOLO weights file |
| `MODEL_NAME` | str | `"yolo26s-seg"` | Model display name |
| `INFERENCE_IMGSZ` | int | `640` | YOLO inference dimension |
| `CONFIDENCE_THRESHOLD` | float | `0.25` | Minimum detection confidence |
| `IOU_THRESHOLD` | float | `0.7` | NMS IoU threshold |
| `MAX_DETECTIONS` | int | `100` | Max detections per image |
| `MAX_UPLOAD_MB` | int | `10` | Max file upload size in MB |
| `MAX_IMAGE_PIXELS` | int | `40000000` | Decompression bomb limit |
| `POLYGON_EPSILON_PX` | float | `1.0` | Polygon contour approximation factor |
| `RATE_LIMIT_SCAN` | str | `"30/minute"` | Rate limit for scan endpoint |
| `RATE_LIMIT_READ` | str | `"120/minute"` | Rate limit for read endpoints |

### Frontend (`frontend/.env`)

| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Base API URL. In local dev, leave blank so Vite proxies to `localhost:8000`. In production (Vercel), set to your deployed Heroku backend URL (e.g. `https://your-api.herokuapp.com`). |
| `VITE_UPLOAD_MAX_SIDE` | Max resolution side for client-side pre-upload downscaling (default: `1024`). |

---

## Deployment Guide

### Backend on Heroku
1. Set the buildpack to Python or use a `Procfile`:
   ```Procfile
   web: uvicorn src:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"
   ```
2. Configure config vars in Heroku Dashboard matching `backend/.env.example`, setting `IS_PRODUCTION=true` and `ALLOWED_ORIGINS` to include your Vercel frontend URL.

### Frontend on Vercel
1. Set root directory to `frontend`.
2. Framework preset: **Vite**.
3. Build command: `npm run build`, Output directory: `dist`.
4. Environment variable:
   * `VITE_API_URL = https://your-backend.herokuapp.com`

---

## How to Swap the Model

CropSight is completely model-agnostic:
1. Copy your new trained YOLO `.pt` file to `backend/weights/<your_model>.pt`.
2. Update `MODEL_PATH` and `MODEL_NAME` in `backend/.env`.
3. If new classes were introduced, update `frontend/src/utils/classMeta.ts` with human-readable labels, kinds (`crop`, `weed`, `disease`, `other`), and token colors. Unknown classes will automatically fall back to deterministic palette colors.
4. Restart the server. No other code changes are required.

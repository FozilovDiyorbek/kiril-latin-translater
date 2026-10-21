"""
FastAPI Server Entrypoint for UzLang Transliteration Service
"""

import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.v1.transliteration import router as v1_router
from app.core.ocr_engine import ocr_engine

app = FastAPI(
    title="UzLang Transliteration Infrastructure API",
    description="Enterprise API-first platform for Uzbek Latin ↔ Cyrillic Transliteration.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configurable CORS origins for production deployment
raw_origins = os.environ.get("CORS_ORIGINS", "*")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
is_wildcard = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck endpoints for Docker, Kubernetes, Render, Nginx
@app.get("/health", tags=["System"], summary="Health Check")
@app.get("/healthz", tags=["System"], include_in_schema=False)
async def health_check():
    """Service liveness and readiness probe for load balancers & container orchestrators."""
    return {
        "status": "healthy",
        "service": "uzlang-transliteration",
        "version": "1.0.0",
        "ocr_available": ocr_engine.is_tesseract_installed(),
    }

# Mount API V1 routes
app.include_router(v1_router)

# Static files directory path
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        # Don't intercept API, system health, or docs routes
        if full_path.startswith(("v1", "docs", "redoc", "openapi.json", "health", "healthz", "gradio")):
            raise HTTPException(status_code=404, detail="Not Found")
        target = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from app.core.config import settings
from app.db.init_db import init_database
from app.routers import auth, complaints, departments, officers, admin
from app.services.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CivicPulse AI platform...")
    init_database()
    yield
    # Shutdown
    logger.info("Shutting down CivicPulse AI platform.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Public Complaint and Issue Management Platform powered by Groq AI and Deterministic Safety Rules.",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(officers.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)


# Health Check
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "groq_configured": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_"))
    }


# WebSocket Endpoints for Real-Time Operations
@app.websocket("/ws/officer/{department_id}")
async def websocket_officer_endpoint(websocket: WebSocket, department_id: int):
    await ws_manager.connect_officer(websocket, department_id)
    try:
        while True:
            # Keep connection alive; officers primarily receive push broadcasts
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_officer(websocket, department_id)
    except Exception:
        ws_manager.disconnect_officer(websocket, department_id)


@app.websocket("/ws/admin")
async def websocket_admin_endpoint(websocket: WebSocket):
    await ws_manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(websocket)
    except Exception:
        ws_manager.disconnect_admin(websocket)


@app.websocket("/ws/citizen/{user_id}")
async def websocket_citizen_endpoint(websocket: WebSocket, user_id: int):
    await ws_manager.connect_citizen(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_citizen(websocket, user_id)
    except Exception:
        ws_manager.disconnect_citizen(websocket, user_id)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again or contact administration."}
    )


# Serve Built Frontend SPA (dist) directly from FastAPI
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="spa-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "uploads/", "docs", "openapi.json", "ws/")):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend not built"})

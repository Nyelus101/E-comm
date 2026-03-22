# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import all models so SQLAlchemy registers them with Base
import app.models  # noqa: F401

app = FastAPI(
    title="Laptop Store API",
    description="Production e-commerce API for laptop retail",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc UI at http://localhost:8000/redoc
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) allows your Next.js frontend
# running on localhost:3000 to call this API on localhost:8000.
# Without this, the browser would block the requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,      # Allows cookies/auth headers
    allow_methods=["*"],         # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """
    Simple endpoint to confirm the API is running.
    Used by Docker health checks and monitoring tools.
    """
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
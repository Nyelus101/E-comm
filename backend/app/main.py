# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.elasticsearch_service import create_index
import app.models  # noqa — registers all models with SQLAlchemy

# Import routers
from app.routers import auth, users, products, admin, cart, orders, search

app = FastAPI(
    title="Laptop Store API",
    description="Production e-commerce API for laptop retail",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Create ES index on startup ────────────────────────────────────────────────
# This is idempotent — safe to call every restart.
# Wrapped in try/except so a slow ES startup doesn't crash the API.
@app.on_event("startup")
async def startup():
    try:
        create_index()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"ES index creation deferred: {e}")

# ─── Routers ─────────────────────────────────────────────────────────────────
# prefix="/api/v1" means all routes become /api/v1/auth/login, etc.
# Versioning from day one — you can add /api/v2 later without breaking clients
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")     
app.include_router(admin.router, prefix="/api/v1")
app.include_router(cart.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")   # no extra prefix — has /checkout, /webhooks, /orders
app.include_router(search.router, prefix="/api/v1") 



@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
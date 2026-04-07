# backend/app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    All configuration is loaded from environment variables.
    Pydantic-settings automatically reads from the .env file.
    Using lru_cache means this is only created once (singleton pattern).
    """

    # ─── Database ────────────────────────────────────────────
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # ─── Security ────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Email ───────────────────────────────────────────────
    # RESEND_API_KEY: str = ""
    # FROM_EMAIL: str = "noreply@laptopstore.com"
    EMAIL_PROVIDER: str = "mailersend"  # "resend" or "smtp"

    MAILERSEND_API_KEY: str = ""
    FROM_EMAIL: str = ""
    FROM_NAME: str = "Laptop Store"

    # ─── Cloudinary ──────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ─── Stripe ──────────────────────────────────────────────
    # STRIPE_SECRET_KEY: str = ""
    # STRIPE_WEBHOOK_SECRET: str = ""

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""

    # ─── Redis ───────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379"

    # ─── App ─────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"

    # ─── Elasticsearch ────────────────────────────────────────
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"
    SEARCH_CACHE_TTL: int = 300   # 5 minutes

    class Config:
        env_file = ".env"           # Reads from backend/.env
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    lru_cache ensures the .env file is only read once on startup,
    not on every request.
    """
    return Settings()


# Convenience — import this anywhere in the app
settings = get_settings()
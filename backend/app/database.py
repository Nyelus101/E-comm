# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# ─── Engine ──────────────────────────────────────────────────────────────────
# The engine is the actual connection to PostgreSQL.
# pool_pre_ping=True: tests connections before using them (handles dropped connections)
# pool_size=10: keeps 10 connections open and ready (connection pooling)
# max_overflow=20: allows 20 extra connections during traffic spikes
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    # connect_args={"sslmode": "require"},
)

# ─── Session Factory ─────────────────────────────────────────────────────────
# SessionLocal is a factory that creates new database sessions.
# autocommit=False: you must explicitly call db.commit() to save changes
# autoflush=False: changes aren't sent to DB until you commit or flush
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ─── Base Class ──────────────────────────────────────────────────────────────
# All your database models (tables) will inherit from this Base.
# It keeps track of all models so Alembic can generate migrations.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()

    The 'yield' makes this a context manager:
    - Opens a session before the route runs
    - Closes it automatically after, even if an error occurs
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
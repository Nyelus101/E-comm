# backend/app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID
import redis

from app.database import get_db
from app.utils.security import decode_token
from app.models.user import User, UserRole
from app.config import settings

# ─── HTTP Bearer ─────────────────────────────────────────────────────────────
# This tells FastAPI to look for: Authorization: Bearer <token>
# auto_error=False means it won't auto-raise if missing — we handle that below
security = HTTPBearer(auto_error=False)

# ─── Redis Client ─────────────────────────────────────────────────────────────
# decode_responses=True means Redis returns strings instead of bytes
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that:
    1. Extracts the Bearer token from the Authorization header
    2. Checks if it's been blacklisted in Redis (logged out)
    3. Decodes and validates the JWT
    4. Loads and returns the User from the database

    Usage in a route:
        @router.get("/me")
        def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    # Define a reusable 401 exception
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
        # WWW-Authenticate header tells the client what auth scheme to use
    )

    # No token provided
    if not credentials:
        raise credentials_exception

    token = credentials.credentials

    # Check Redis blacklist — if this token was logged out, reject it
    # Even though the JWT hasn't expired yet, we treat it as invalid
    if redis_client.get(f"blacklist:{token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
        )

    # Decode the JWT
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Ensure this is an access token, not a refresh token being misused
    if payload.get("type") != "access":
        raise credentials_exception

    # Get user ID from the "sub" (subject) claim
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Load user from database
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None:
        raise credentials_exception

    # Check account is still active (admin might have deactivated it)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated.",
        )

    return user


def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Like get_current_user but also requires email to be verified.
    Used for routes that require a fully active account (cart, checkout, etc).
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address first.",
        )
    return current_user


def get_current_admin(
    current_user: User = Depends(get_current_verified_user),
) -> User:
    """
    Requires the user to be an admin.
    Used for all admin dashboard routes.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
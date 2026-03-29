# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole
import re


# ─── Registration ─────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """
    What the client sends to POST /auth/register.
    EmailStr validates it's a real email format.
    Field(...) means required. Field("default") sets a default.
    """
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Passwords must have at least one uppercase, one lowercase, one digit.
        This runs before the data hits the route handler.
        If it fails, FastAPI automatically returns a 422 with a clear message.
        """
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Strip whitespace from names."""
        return v.strip()


# ─── Login ────────────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    """What the client sends to POST /auth/login."""
    email: EmailStr
    password: str


# ─── Token Responses ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """
    What we return after a successful login or token refresh.
    The client stores access_token in memory and refresh_token securely (httpOnly cookie or secure storage).
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """What the client sends to POST /auth/refresh."""
    refresh_token: str


# ─── Password Reset ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


# ─── User Responses ───────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """
    What we return when someone asks for user info.
    Notice: NO hashed_password, NO tokens, NO internal fields.
    This is what GET /users/me returns.
    """
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    is_verified: bool
    created_at: datetime

    class Config:
        # Allows Pydantic to read data from SQLAlchemy model attributes
        # Without this, you'd have to manually convert ORM objects to dicts
        from_attributes = True


class UserUpdate(BaseModel):
    """What the client sends to PUT /users/me. All fields optional."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
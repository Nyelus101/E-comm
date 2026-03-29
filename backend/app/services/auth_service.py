# backend/app/services/auth_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
import redis

from app.models.user import User, UserRole
from app.schemas.user import UserRegister, UserLogin, ResetPasswordRequest
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.email_service import send_verification_email, send_password_reset_email
from app.config import settings

# Redis client for token blacklisting and refresh token storage
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


# ─── Register ─────────────────────────────────────────────────────────────────

async def register_user(data: UserRegister, db: Session) -> User:
    """
    Creates a new user account.
    Steps:
      1. Check email isn't already taken
      2. Hash the password (NEVER store plain text)
      3. Generate a verification token
      4. Save user to DB
      5. Send verification email
    """
    # Check duplicate email — case-insensitive
    existing = db.query(User).filter(
        User.email == data.email.lower()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Generate a secure random token for email verification
    # secrets.token_urlsafe generates a URL-safe random string
    # 32 bytes = 43 characters of base64 — effectively impossible to guess
    verification_token = secrets.token_urlsafe(32)

    # Create the user object (not saved to DB yet)
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=UserRole.CUSTOMER,
        is_verified=False,
        verification_token=verification_token,
    )

    # Save to DB
    db.add(user)
    db.commit()
    db.refresh(user)   # Refreshes the object with DB-generated fields (id, created_at)

    # Send verification email asynchronously
    # We don't block on this — if it fails, the user can request resend later
    await send_verification_email(
        email=user.email,
        first_name=user.first_name,
        token=verification_token,
    )

    return user


# ─── Verify Email ─────────────────────────────────────────────────────────────

def verify_email(token: str, db: Session) -> User:
    """
    Called when user clicks the link in their email.
    Finds the user by token, marks them as verified, clears the token.
    """
    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified.",
        )

    # Mark verified and clear the token (single-use)
    user.is_verified = True
    user.verification_token = None
    db.commit()
    db.refresh(user)

    return user

# ─── Resend Verification Email ────────────────────────────────────────────────────────────────────

async def resend_verification_email(email: str, db: Session) -> None:
    """
    Generates a fresh verification token and resends the email.
    
    Cases handled:
    - Email not found: silently does nothing (no enumeration)
    - Already verified: silently does nothing
    - Unverified: generates new token, updates DB, sends email
    
    Why generate a new token? The old one may have been lost or expired
    in the user's inbox. A fresh token guarantees a working link.
    """
    user = db.query(User).filter(User.email == email.lower()).first()

    # Silently return for both "not found" and "already verified"
    if not user or user.is_verified:
        return

    # Generate a fresh token — invalidates any old link still in their inbox
    new_token = secrets.token_urlsafe(32)
    user.verification_token = new_token
    db.commit()

    await send_verification_email(
        email=user.email,
        first_name=user.first_name,
        token=new_token,
    )



# ─── Login ────────────────────────────────────────────────────────────────────

def login_user(data: UserLogin, db: Session) -> dict:
    """
    Authenticates a user and returns access + refresh tokens.

    Security note: we return the SAME error message whether the email
    doesn't exist OR the password is wrong. This prevents "email enumeration"
    attacks where an attacker can discover which emails are registered.
    """
    user = db.query(User).filter(User.email == data.email.lower()).first()

    # Same error for "not found" and "wrong password" — intentional
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    if not user:
        raise invalid_credentials

    if not verify_password(data.password, user.hashed_password):
        raise invalid_credentials

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Create both tokens
    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token in Redis with expiry
    # Key format: "refresh:{user_id}" — one active refresh token per user
    # When this expires in Redis, the user must log in again
    redis_client.setex(
        name=f"refresh:{str(user.id)}",
        time=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        value=refresh_token,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ─── Refresh Token ────────────────────────────────────────────────────────────

def refresh_access_token(refresh_token: str, db: Session) -> dict:
    """
    Issues a new access token using a valid refresh token.
    This is called when the access token expires (every 30 min).

    Steps:
      1. Decode the refresh token
      2. Verify it's not blacklisted
      3. Verify it matches what's stored in Redis
      4. Issue a new access token
    """
    invalid_token = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
    )

    # Decode JWT
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise invalid_token

    user_id = payload.get("sub")
    if not user_id:
        raise invalid_token

    # Verify the token matches what we stored in Redis
    # This catches replay attacks — if someone steals a refresh token,
    # we can invalidate it by clearing the Redis key
    stored_token = redis_client.get(f"refresh:{user_id}")
    if not stored_token or stored_token != refresh_token:
        raise invalid_token

    # Load user to include fresh role in the new token
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise invalid_token

    # Issue a new access token
    token_data = {"sub": str(user.id), "role": user.role.value}
    new_access_token = create_access_token(token_data)

    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token,   # Return same refresh token (still valid)
        "token_type": "bearer",
    }


# ─── Logout ───────────────────────────────────────────────────────────────────

def logout_user(access_token: str, user_id: str) -> None:
    """
    Logs out a user by:
    1. Adding the access token to a Redis blacklist (so it can't be used again)
    2. Deleting the refresh token from Redis

    Why blacklist the access token? JWTs are stateless — once issued, they're
    valid until they expire. Without a blacklist, a logged-out token could still
    be used for up to 30 minutes. The blacklist ensures it's immediately invalid.
    """
    # Decode to get remaining TTL of the access token
    payload = decode_token(access_token)
    if payload:
        exp = payload.get("exp")
        if exp:
            remaining = exp - int(datetime.now(timezone.utc).timestamp())
            if remaining > 0:
                # Add to blacklist with TTL matching remaining token life
                # After it naturally expires, Redis auto-removes it (no cleanup needed)
                redis_client.setex(
                    name=f"blacklist:{access_token}",
                    time=remaining,
                    value="1",
                )

    # Delete the refresh token — user must log in again to get a new one
    redis_client.delete(f"refresh:{user_id}")


# ─── Forgot Password ──────────────────────────────────────────────────────────

async def forgot_password(email: str, db: Session) -> None:
    """
    Sends a password reset email.

    Security note: we always return success even if the email doesn't exist.
    This prevents email enumeration — an attacker can't use this endpoint
    to discover which emails are registered.
    """
    user = db.query(User).filter(User.email == email.lower()).first()

    # Silently return if user not found (don't reveal this to caller)
    if not user:
        return

    # Generate a secure random reset token
    reset_token = secrets.token_urlsafe(32)

    # Store the token (plain) in DB with 1-hour expiry
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    # Send email
    await send_password_reset_email(
        email=user.email,
        first_name=user.first_name,
        token=reset_token,
    )


# ─── Reset Password ───────────────────────────────────────────────────────────

def reset_password(data: ResetPasswordRequest, db: Session) -> None:
    """
    Sets a new password using the reset token from the email link.
    After resetting, clears the token and logs out all devices
    by deleting the Redis refresh token.
    """
    user = db.query(User).filter(
        User.password_reset_token == data.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link.",
        )

    # Check the token hasn't expired (we set 1 hour above)
    if user.password_reset_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one.",
        )

    # Set new hashed password and clear reset token
    user.hashed_password = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    # Invalidate all existing sessions for security
    # After a password reset, the user must log in again on all devices
    redis_client.delete(f"refresh:{str(user.id)}")
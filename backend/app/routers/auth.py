# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse
)
from app.services import auth_service
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    Creates a new customer account and sends a verification email.
    Returns the created user (without sensitive fields).
    """
    user = await auth_service.register_user(data, db)
    return user


@router.post(
    "/verify-email",
    response_model=UserResponse,
    summary="Verify email address",
)
def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verifies the user's email using the token from the verification email.
    Call this with ?token=<token_from_email>
    """
    user = auth_service.verify_email(token, db)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive tokens",
)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates the user and returns access + refresh tokens.
    Store the access_token and use it as: Authorization: Bearer <access_token>
    """
    return auth_service.login_user(data, db)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Issues a new access token when the current one expires.
    Send the refresh_token you received at login.
    """
    return auth_service.refresh_access_token(data.refresh_token, db)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout",
)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
):
    """
    Logs out the current user.
    Blacklists the current access token and removes the refresh token.
    Returns 204 No Content on success.
    """
    auth_service.logout_user(
        access_token=credentials.credentials,
        user_id=str(current_user.id),
    )


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request password reset email",
)
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Sends a password reset email if the email exists in the system.
    Always returns 202 regardless of whether the email was found (security).
    """
    await auth_service.forgot_password(data.email, db)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using token",
)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Sets a new password using the token from the reset email.
    After resetting, the user must log in again.
    """
    auth_service.reset_password(data, db)
    return {"message": "Password reset successfully. Please log in with your new password."}



@router.post(
    "/resend-verification",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Resend verification email",
)
async def resend_verification(
    data: ForgotPasswordRequest,  # reuses the same {email} schema
    db: Session = Depends(get_db)
):
    """
    Resends the verification email if the account exists and is not yet verified.
    Always returns 202 regardless — same security reason as forgot-password,
    we don't reveal whether an email is registered or not.
    """
    await auth_service.resend_verification_email(data.email, db)
    return {"message": "If an unverified account exists, a new verification email has been sent."}
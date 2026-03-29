# backend/app/routers/users.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.dependencies import get_current_verified_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get my profile",
)
def get_my_profile(current_user: User = Depends(get_current_verified_user)):
    """
    Returns the currently authenticated user's profile.
    Requires a valid Bearer token.
    """
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update my profile",
)
def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """
    Updates the current user's profile.
    Only updates fields that were actually provided (partial update).
    """
    # model_dump(exclude_unset=True) only returns fields the client actually sent
    # So if they only sent {"first_name": "John"}, last_name stays unchanged
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return current_user
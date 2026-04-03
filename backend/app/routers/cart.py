# backend/app/routers/cart.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate
from app.services import cart_service

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", summary="View my cart")
def get_cart(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """Returns the current user's cart with totals."""
    return cart_service.get_cart(current_user, db)


@router.post("", summary="Add item to cart")
def add_to_cart(
    data: CartItemAdd,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """
    Adds a product to the cart.
    If the product is already in the cart, increases the quantity.
    Returns the full updated cart.
    """
    return cart_service.add_to_cart(data, current_user, db)


@router.put("/{item_id}", summary="Update item quantity")
def update_cart_item(
    item_id: UUID,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """
    Sets a cart item to an exact quantity.
    Example: user changes quantity from 1 to 3.
    Returns the full updated cart.
    """
    return cart_service.update_cart_item(item_id, data, current_user, db)


@router.delete("/{item_id}", summary="Remove item from cart")
def remove_from_cart(
    item_id: UUID,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """Removes a single item from the cart. Returns the updated cart."""
    return cart_service.remove_from_cart(item_id, current_user, db)


@router.delete("", summary="Clear entire cart")
def clear_cart(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """Removes all items from the cart."""
    cart_service.clear_cart(current_user, db)
    return {"message": "Cart cleared."}
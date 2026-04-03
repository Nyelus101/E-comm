# backend/app/services/cart_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from decimal import Decimal

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate


def _get_or_create_cart(user: User, db: Session) -> Cart:
    """
    Every user has exactly one cart. This function gets it or creates
    it on first use. Called internally by all cart operations.
    """
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def get_cart(user: User, db: Session) -> dict:
    """
    Returns the user's cart with full product details and calculated totals.
    Items for unavailable or deleted products are automatically excluded.
    """
    cart = _get_or_create_cart(user, db)

    items = []
    subtotal = Decimal("0.00")

    for item in cart.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()

        # Skip items whose product was deleted or made unavailable
        if not product or not product.is_available:
            continue

        line_total = product.price * item.quantity
        subtotal += line_total

        items.append({
            "id": str(item.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "product_slug": product.slug,
            "thumbnail_url": product.thumbnail_url,
            "unit_price": str(product.price),
            "quantity": item.quantity,
            "line_total": str(line_total),
        })

    return {
        "id": str(cart.id),
        "items": items,
        "subtotal": str(subtotal),
        "item_count": sum(i["quantity"] for i in items),
    }


def add_to_cart(data: CartItemAdd, user: User, db: Session) -> dict:
    """
    Adds a product to the cart.

    If the product is already in the cart, INCREASES quantity rather
    than creating a duplicate row. This is the correct behaviour —
    adding the same laptop twice should show quantity=2, not two rows.

    Validates:
    - Product exists and is available
    - Requested quantity doesn't exceed stock
    """
    product = db.query(Product).filter(Product.id == data.product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if not product.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This product is currently unavailable.",
        )

    cart = _get_or_create_cart(user, db)

    # Check if item already in cart
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == data.product_id,
    ).first()

    if existing_item:
        new_quantity = existing_item.quantity + data.quantity

        # Can't add more than what's in stock
        if new_quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units available. "
                       f"You already have {existing_item.quantity} in your cart.",
            )

        existing_item.quantity = new_quantity
    else:
        # New item — check stock
        if data.quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units available.",
            )

        new_item = CartItem(
            cart_id=cart.id,
            product_id=data.product_id,
            quantity=data.quantity,
        )
        db.add(new_item)

    db.commit()
    return get_cart(user, db)


def update_cart_item(item_id: UUID, data: CartItemUpdate, user: User, db: Session) -> dict:
    """
    Sets a cart item to an exact quantity (replaces, doesn't add).
    Use this when the user types "3" into the quantity box.
    """
    cart = _get_or_create_cart(user, db)

    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id,    # ensures user owns this item
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if data.quantity > product.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock_quantity} units available.",
        )

    item.quantity = data.quantity
    db.commit()
    return get_cart(user, db)


def remove_from_cart(item_id: UUID, user: User, db: Session) -> dict:
    """Removes a specific item from the cart."""
    cart = _get_or_create_cart(user, db)

    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    db.delete(item)
    db.commit()
    return get_cart(user, db)


def clear_cart(user: User, db: Session) -> None:
    """
    Removes all items from the cart.
    Called automatically after a successful payment.
    Can also be called manually by the user.
    """
    cart = _get_or_create_cart(user, db)

    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
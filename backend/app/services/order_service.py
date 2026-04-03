# backend/app/services/order_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from decimal import Decimal
import json
import logging
import redis

from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CheckoutRequest
from app.schemas.order import OrderStatusUpdate
from app.services import paystack_service, cart_service
from app.config import settings

logger = logging.getLogger(__name__)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Flat shipping rate in Naira — adjust as needed
SHIPPING_AMOUNT = Decimal("2000.00")

# VAT rate — 7.5% in Nigeria
TAX_RATE = Decimal("0.075")


async def initiate_checkout(
    data: CheckoutRequest,
    user: User,
    db: Session,
) -> dict:
    """
    The checkout process:
      1. Validate the cart (not empty, all items in stock)
      2. Calculate totals (subtotal + tax + shipping)
      3. Create a PENDING order in the DB
      4. Initialise a Paystack payment
      5. Return the Paystack payment URL to the frontend

    The order is created BEFORE payment so we have a record even
    if the user abandons. Abandoned PENDING orders can be cleaned
    up later with a scheduled job.
    """
    # ── Validate cart ─────────────────────────────────────────────────────────
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty.",
        )

    # Validate every item before touching money or creating an order
    validated_items = []
    for cart_item in cart.items:
        product = db.query(Product).filter(Product.id == cart_item.product_id).with_for_update().first()

        if not product or not product.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{product.name if product else 'A product'}' is no longer available. "
                       f"Please remove it from your cart.",
            )

        if cart_item.quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units of '{product.name}' available. "
                       f"You requested {cart_item.quantity}.",
            )

        validated_items.append((cart_item, product))

    # ── Calculate totals ──────────────────────────────────────────────────────
    subtotal = sum(
        product.price * cart_item.quantity
        for cart_item, product in validated_items
    )
    tax_amount = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
    total_amount = subtotal + tax_amount + SHIPPING_AMOUNT

    # ── Generate Paystack reference ───────────────────────────────────────────
    reference = paystack_service.generate_reference()

    # ── Create PENDING order ──────────────────────────────────────────────────
    order = Order(
        user_id=user.id,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        tax_amount=tax_amount,
        shipping_amount=SHIPPING_AMOUNT,
        total_amount=total_amount,
        paystack_reference=reference,
        shipping_address=data.shipping_address,
        notes=data.notes,
    )
    db.add(order)
    db.flush()   # flush to get order.id without committing yet

    # Create order items (price snapshot)
    for cart_item, product in validated_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=cart_item.quantity,
            unit_price=product.price,
            total_price=product.price * cart_item.quantity,
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)

    # ── Initialise Paystack payment ───────────────────────────────────────────
    callback_url = f"{settings.FRONTEND_URL}/checkout/verify?reference={reference}"

    paystack_data = await paystack_service.initialize_payment(
        email=user.email,
        amount_naira=total_amount,
        reference=reference,
        order_id=str(order.id),
        callback_url=callback_url,
    )

    return {
        "order_id": order.id,
        "payment_url": paystack_data["authorization_url"],
        "reference": reference,
        "amount": total_amount,
    }


def confirm_payment_from_webhook(
    reference: str,
    paystack_event: dict,
    db: Session,
) -> Order:
    """
    Called when Paystack sends a 'charge.success' webhook.

    Steps:
      1. Find the order by reference
      2. Verify it's not already processed (idempotency)
      3. Mark as PAID
      4. Deduct stock for each item
      5. Clear the customer's cart

    Idempotency: Paystack may send the same webhook more than once
    (network retries). We check order.status first — if it's already
    PAID, we return early and don't process again.
    """
    order = db.query(Order).filter(
        Order.paystack_reference == reference
    ).first()

    if not order:
        logger.error(f"Webhook received for unknown reference: {reference}")
        raise HTTPException(status_code=404, detail="Order not found.")

    # Idempotency check — already processed
    if order.status != OrderStatus.PENDING:
        logger.info(f"Webhook duplicate for reference {reference}, order already {order.status}")
        return order

    # Mark order as paid
    order.status = OrderStatus.PAID
    db.flush()

    # Deduct stock for each item
    for order_item in order.items:
        product = db.query(Product).filter(
            Product.id == order_item.product_id
        ).with_for_update().first()

        if product:
            product.stock_quantity = max(0, product.stock_quantity - order_item.quantity)
            # Auto-set unavailable if stock hits zero
            if product.stock_quantity == 0:
                product.is_available = False

    # Clear the customer's cart
    if order.user_id:
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            cart_service.clear_cart(user, db)

    db.commit()
    db.refresh(order)

    logger.info(f"Order {order.id} confirmed paid via webhook (ref: {reference})")
    return order


def get_user_orders(user: User, db: Session, page: int = 1, page_size: int = 20) -> dict:
    """Returns the current user's order history, newest first."""
    query = db.query(Order).filter(Order.user_id == user.id)
    total = query.count()
    orders = (
        query
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_order_to_dict(o) for o in orders],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_order_detail(order_id: UUID, user: User, db: Session) -> Order:
    """
    Returns a single order.
    Customers can only see their own orders.
    """
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Customers can't see other people's orders
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return _order_to_dict(order)


# ─── Admin ────────────────────────────────────────────────────────────────────

def admin_get_all_orders(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    status_filter: OrderStatus = None,
) -> dict:
    """Returns all orders for the admin dashboard."""
    query = db.query(Order)

    if status_filter:
        query = query.filter(Order.status == status_filter)

    total = query.count()
    orders = (
        query
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [_order_to_dict(o) for o in orders],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def admin_update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    db: Session,
) -> Order:
    """
    Admin moves an order through its lifecycle.
    Validates transitions — can't mark a DELIVERED order as PENDING.

    Valid transitions:
      PENDING     → CANCELLED
      PAID        → PROCESSING, CANCELLED
      PROCESSING  → SHIPPED, CANCELLED
      SHIPPED     → DELIVERED
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Define allowed transitions
    allowed = {
        OrderStatus.PENDING: [OrderStatus.CANCELLED],
        OrderStatus.PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [],
        OrderStatus.CANCELLED: [],
        OrderStatus.REFUNDED: [],
    }

    if data.status not in allowed.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition order from '{order.status}' to '{data.status}'. "
                   f"Allowed next statuses: {[s.value for s in allowed[order.status]]}",
        )

    # Tracking number required when shipping
    if data.status == OrderStatus.SHIPPED and not data.tracking_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracking number is required when marking an order as shipped.",
        )

    # If cancelling a PAID order, restore stock
    if data.status == OrderStatus.CANCELLED and order.status == OrderStatus.PAID:
        for order_item in order.items:
            product = db.query(Product).filter(
                Product.id == order_item.product_id
            ).first()
            if product:
                product.stock_quantity += order_item.quantity
                product.is_available = True

    order.status = data.status
    if data.tracking_number:
        order.tracking_number = data.tracking_number

    db.commit()
    db.refresh(order)
    return _order_to_dict(order)


# ─── Serialiser ───────────────────────────────────────────────────────────────

def _order_to_dict(order: Order) -> dict:
    return {
        "id": str(order.id),
        "status": order.status.value,
        "subtotal": str(order.subtotal),
        "tax_amount": str(order.tax_amount),
        "shipping_amount": str(order.shipping_amount),
        "total_amount": str(order.total_amount),
        "paystack_reference": order.paystack_reference,
        "shipping_address": order.shipping_address,
        "tracking_number": order.tracking_number,
        "notes": order.notes,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "total_price": str(item.total_price),
            }
            for item in order.items
        ],
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }
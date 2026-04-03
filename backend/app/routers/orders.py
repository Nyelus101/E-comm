# backend/app/routers/orders.py
from fastapi import APIRouter, Depends, Request, Header, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
import json

from app.database import get_db
from app.dependencies import get_current_verified_user, get_current_admin
from app.models.user import User
from app.models.order import OrderStatus
from app.schemas.cart import CheckoutRequest
from app.schemas.order import OrderStatusUpdate
from app.services import order_service, paystack_service

router = APIRouter(tags=["Orders"])


# ─── Customer: Checkout ───────────────────────────────────────────────────────

@router.post("/checkout", summary="Initiate checkout")
async def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """
    Validates cart, creates a pending order, and returns a Paystack payment URL.
    Redirect the user to payment_url to complete payment.

    After payment, Paystack redirects to your callback_url and also sends
    a webhook to POST /webhooks/paystack.
    """
    return await order_service.initiate_checkout(data, current_user, db)


# ─── Paystack Webhook ─────────────────────────────────────────────────────────

@router.post("/webhooks/paystack", include_in_schema=False)
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_paystack_signature: Optional[str] = Header(default=None),
):
    """
    Paystack calls this endpoint after payment events.

    IMPORTANT:
    - This endpoint must NOT require authentication (Paystack calls it, not the user)
    - We verify the signature instead to confirm it's really from Paystack
    - We must read raw bytes BEFORE parsing JSON (signature is over raw bytes)
    - Always return 200 quickly — Paystack retries if we return an error

    include_in_schema=False hides it from Swagger docs (it's not for clients).
    """
    # Read raw bytes first — MUST happen before any JSON parsing
    payload_bytes = await request.body()

    # Verify the request is genuinely from Paystack
    if not x_paystack_signature:
        raise HTTPException(status_code=400, detail="Missing signature.")

    if not paystack_service.verify_webhook_signature(payload_bytes, x_paystack_signature):
        raise HTTPException(status_code=401, detail="Invalid signature.")

    # Parse the event
    try:
        event = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON.")

    event_type = event.get("event")

    # We only care about successful charges
    if event_type == "charge.success":
        data = event.get("data", {})
        reference = data.get("reference")

        if reference:
            order_service.confirm_payment_from_webhook(reference, data, db)

    # Always return 200 — even for events we don't handle
    # Paystack marks our webhook as failed if we return non-200
    return {"status": "ok"}


# ─── Customer: Order history ──────────────────────────────────────────────────

@router.get("/orders/me", summary="My order history")
def get_my_orders(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    """Returns the current user's orders, newest first."""
    return order_service.get_user_orders(current_user, db, page, page_size)


@router.get("/orders/me/{order_id}", summary="Get order detail")
def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """Returns full detail for one of the user's orders."""
    return order_service.get_order_detail(order_id, current_user, db)


# ─── Admin: Order management ──────────────────────────────────────────────────

@router.get("/admin/orders", summary="All orders (admin)")
def admin_list_orders(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    status_filter: Optional[OrderStatus] = Query(default=None),
):
    """
    Returns all orders. Filter by status using:
    ?status_filter=pending, paid, processing, shipped, delivered, cancelled
    """
    return order_service.admin_get_all_orders(db, page, page_size, status_filter)


@router.patch("/admin/orders/{order_id}/status", summary="Update order status (admin)")
def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Moves an order through its lifecycle.
    Enforces valid transitions — can't go backwards.
    Requires tracking_number when setting status to 'shipped'.
    """
    return order_service.admin_update_order_status(order_id, data, db)
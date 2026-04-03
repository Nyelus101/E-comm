# backend/app/schemas/order.py
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemResponse(BaseModel):
    """One line item in an order."""
    id: UUID
    product_id: Optional[UUID]
    product_name: str           # Snapshot — safe even if product is later deleted
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    """Full order detail."""
    id: UUID
    status: OrderStatus
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal
    shipping_address: Optional[dict]
    tracking_number: Optional[str]
    notes: Optional[str]
    paystack_reference: Optional[str]
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    """Admin uses this to move an order through its lifecycle."""
    status: OrderStatus
    tracking_number: Optional[str] = None
    # tracking_number required when status = shipped


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
# backend/app/schemas/cart.py
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime


class CartItemAdd(BaseModel):
    """What the client sends to add an item to the cart."""
    product_id: UUID
    quantity: int = Field(default=1, ge=1, le=100)
    # le=100 prevents someone adding 10,000 units of a laptop


class CartItemUpdate(BaseModel):
    """What the client sends to change the quantity of a cart item."""
    quantity: int = Field(..., ge=1, le=100)


class CartItemResponse(BaseModel):
    """One line item in the cart response."""
    id: UUID
    product_id: UUID
    product_name: str
    product_slug: str
    thumbnail_url: Optional[str]
    unit_price: Decimal
    quantity: int
    line_total: Decimal       # unit_price × quantity, calculated in the service

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    """
    Full cart response.
    subtotal is the sum of all line_totals.
    item_count is the total number of individual units (not unique products).
    """
    id: UUID
    items: List[CartItemResponse]
    subtotal: Decimal
    item_count: int


class CheckoutRequest(BaseModel):
    """
    What the client sends to POST /checkout.
    shipping_address is stored as a snapshot on the order.
    """
    shipping_address: dict = Field(
        ...,
        description="e.g. {'street': '10 Lagos St', 'city': 'Lagos', 'state': 'Lagos', 'country': 'Nigeria'}"
    )
    notes: Optional[str] = Field(None, max_length=500)


class CheckoutResponse(BaseModel):
    """
    What the server returns after initialising a Paystack payment.
    The frontend redirects the user to payment_url.
    """
    order_id: UUID
    payment_url: str        # Paystack's hosted payment page
    reference: str          # Paystack reference — used to verify payment
    amount: Decimal         # Total charged in Naira
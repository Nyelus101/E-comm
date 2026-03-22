# backend/app/models/order.py
from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"           # Order placed, payment not confirmed
    PAID = "paid"                 # Payment confirmed by Stripe webhook
    PROCESSING = "processing"     # Being prepared
    SHIPPED = "shipped"           # On the way
    DELIVERED = "delivered"       # Received by customer
    CANCELLED = "cancelled"       # Cancelled before shipping
    REFUNDED = "refunded"         # Money returned


class Order(Base):
    """
    One order = one transaction by one user.
    Contains multiple OrderItems (the actual laptops purchased).

    We store a snapshot of shipping_address in JSONB because
    even if the user later changes their address, the order history
    should show where it was actually shipped.
    """
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Foreign key links this order to a specific user
    # ondelete="SET NULL": if user is deleted, keep the order but set user_id to NULL
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)

    # ─── Pricing ─────────────────────────────────────────────
    subtotal = Column(Numeric(10, 2), nullable=False)   # Before tax/shipping
    tax_amount = Column(Numeric(10, 2), default=0.0)
    shipping_amount = Column(Numeric(10, 2), default=0.0)
    total_amount = Column(Numeric(10, 2), nullable=False)  # What was actually charged

    # # ─── Stripe ──────────────────────────────────────────────
    # # Stripe generates these IDs when payment happens
    # stripe_payment_intent_id = Column(String(255), nullable=True, unique=True)
    # stripe_charge_id = Column(String(255), nullable=True)


    # ─── Paystack ────────────────────────────────────────────
    # Paystack generates these when payment is initialized and verified
    paystack_reference = Column(String(255), nullable=True, unique=True)
    # The reference is generated when you initialize a transaction.
    # It's what you use to verify payment after the customer pays.

    paystack_transaction_id = Column(String(255), nullable=True)
    # Paystack's internal transaction ID — returned after successful payment verification.
    # Useful for reconciliation and refunds from the dashboard.


    # ─── Shipping ────────────────────────────────────────────
    # Stored as JSON snapshot: {"street": "...", "city": "...", "country": "..."}
    shipping_address = Column(JSONB, nullable=True)
    tracking_number = Column(String(255), nullable=True)

    notes = Column(Text, nullable=True)  # Customer notes at checkout

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Relationships ───────────────────────────────────────
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    # cascade="all, delete-orphan": if order is deleted, delete its items too


class OrderItem(Base):
    """
    Each row = one laptop line in an order.
    We snapshot the price at time of purchase — even if the product price
    changes later, the order history shows what the customer actually paid.
    """
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)    # Price at time of purchase (snapshot)
    total_price = Column(Numeric(10, 2), nullable=False)   # unit_price × quantity

    # Snapshot of product info at purchase time
    product_name = Column(String(255), nullable=False)  # In case product is later deleted

    # ─── Relationships ───────────────────────────────────────
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
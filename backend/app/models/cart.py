# backend/app/models/cart.py
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Cart(Base):
    """
    Each user has exactly ONE cart (uselist=False in User relationship).
    The cart persists in the database — so if a user closes the browser
    and comes back later, their cart is still there.
    """
    __tablename__ = "carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Relationships ───────────────────────────────────────
    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    """
    Each row = one laptop in the cart.
    If a user adds the same laptop twice, we UPDATE quantity — 
    we don't create a duplicate row.
    """
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    quantity = Column(Integer, default=1, nullable=False)

    added_at = Column(DateTime(timezone=True), server_default=func.now())

    # ─── Relationships ───────────────────────────────────────
    cart = relationship("Cart", back_populates="items")
    product = relationship("Product", back_populates="cart_items")
# backend/app/models/review.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    # Table-level constraints — enforced by PostgreSQL itself,
    # not just Python. This means even if someone bypasses your
    # API and writes to the DB directly, the rules still hold.
    __table_args__ = (
        # One review per user per product — duplicates are impossible at DB level
        UniqueConstraint("user_id", "product_id", name="uq_user_product_review"),

        # PostgreSQL CHECK constraint: rating must be 1–5
        # The DB will reject any INSERT or UPDATE that violates this
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
    )
    

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)    # 1–5 stars
    title = Column(String(200), nullable=True)
    body = Column(Text, nullable=True)

    # Admin can hide inappropriate reviews
    is_approved = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Relationships ───────────────────────────────────────
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")
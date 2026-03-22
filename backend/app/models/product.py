# backend/app/models/product.py
from sqlalchemy import Column, String, Integer, Numeric, Text, Boolean, DateTime, ForeignKey, ARRAY, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Product(Base):
    """
    The 'products' table — each row is one laptop for sale.

    JSONB: PostgreSQL's binary JSON type. Faster than JSON and supports indexing.
    We use it for images (list of URLs) since a laptop can have many photos.
    """
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # ─── Basic Info ──────────────────────────────────────────
    name = Column(String(255), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    slug = Column(String(300), unique=True, nullable=False, index=True)
    # Slug is the URL-friendly version of the name, e.g. "dell-xps-15-2024"

    # ─── Hardware Specs ──────────────────────────────────────
    cpu = Column(String(200), nullable=False)          # "Intel Core i7-13700H"
    ram_gb = Column(Integer, nullable=False)            # 16
    gpu = Column(String(200), nullable=True)           # "NVIDIA RTX 4060"
    storage_gb = Column(Integer, nullable=False)        # 512
    storage_type = Column(String(50), nullable=True)   # "SSD", "HDD", "NVMe"
    screen_size_inch = Column(Float, nullable=True)    # 15.6
    screen_resolution = Column(String(50), nullable=True)  # "1920x1080"
    battery_wh = Column(Float, nullable=True)          # 86.0 (watt-hours)
    battery_life_hours = Column(Float, nullable=True)  # 10.0 (estimated hours)
    weight_kg = Column(Float, nullable=True)           # 1.8
    operating_system = Column(String(100), nullable=True)  # "Windows 11 Home"

    # ─── Pricing & Inventory ─────────────────────────────────
    price = Column(Numeric(10, 2), nullable=False, index=True)
    # original_price for showing "was $1200, now $999" discounts
    original_price = Column(Numeric(10, 2), nullable=True)
    stock_quantity = Column(Integer, default=0, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)

    # ─── Images ──────────────────────────────────────────────
    # Stored as a JSON array: ["https://cloudinary.com/img1.jpg", "..."]
    # We don't create a separate images table to keep queries simple
    images = Column(JSONB, default=list, nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    # thumbnail is the first/main image shown in product listings

    # ─── SEO & Discovery ─────────────────────────────────────
    # Tags like ["gaming", "ultrabook", "student"] for filtering
    tags = Column(JSONB, default=list, nullable=False)

    # ─── Admin ───────────────────────────────────────────────
    is_featured = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Relationships ───────────────────────────────────────
    order_items = relationship("OrderItem", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")

    def __repr__(self):
        return f"<Product {self.name} ${self.price}>"
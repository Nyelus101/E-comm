# backend/app/schemas/product.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# ─── Create (Admin only) ──────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    """
    What the admin sends to POST /admin/products.
    Images are uploaded separately via a dedicated endpoint,
    so they're not part of this schema.
    """
    name: str = Field(..., min_length=2, max_length=255)
    brand: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

    # Hardware specs
    cpu: str = Field(..., min_length=2, max_length=200)
    ram_gb: int = Field(..., gt=0, le=512)           # gt=0 means > 0
    gpu: Optional[str] = Field(None, max_length=200)
    storage_gb: int = Field(..., gt=0)
    storage_type: Optional[str] = Field(None, max_length=50)
    screen_size_inch: Optional[float] = Field(None, gt=0, le=25)
    screen_resolution: Optional[str] = Field(None, max_length=50)
    battery_wh: Optional[float] = Field(None, gt=0)
    battery_life_hours: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    operating_system: Optional[str] = Field(None, max_length=100)

    # Pricing & stock
    price: Decimal = Field(..., gt=0, decimal_places=2)
    original_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    stock_quantity: int = Field(default=0, ge=0)   # ge=0 means >= 0

    # Discovery
    tags: Optional[List[str]] = Field(default_factory=list)
    is_featured: bool = False

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        """Clean and limit tags."""
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        # Strip whitespace and lowercase each tag
        return [tag.strip().lower() for tag in v if tag.strip()]


class ProductUpdate(BaseModel):
    """
    What admin sends to PUT /admin/products/{id}.
    Every field is optional — only send what you want to change.
    """
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    cpu: Optional[str] = Field(None, min_length=2, max_length=200)
    ram_gb: Optional[int] = Field(None, gt=0, le=512)
    gpu: Optional[str] = Field(None, max_length=200)
    storage_gb: Optional[int] = Field(None, gt=0)
    storage_type: Optional[str] = Field(None, max_length=50)
    screen_size_inch: Optional[float] = Field(None, gt=0, le=25)
    screen_resolution: Optional[str] = Field(None, max_length=50)
    battery_wh: Optional[float] = Field(None, gt=0)
    battery_life_hours: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    operating_system: Optional[str] = Field(None, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    original_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    stock_quantity: Optional[int] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_available: Optional[bool] = None


class StockUpdate(BaseModel):
    """Dedicated schema for updating stock quantity only."""
    stock_quantity: int = Field(..., ge=0)


# ─── Responses ────────────────────────────────────────────────────────────────

class ProductResponse(BaseModel):
    """
    Returned for every product endpoint — list and detail.
    Decimal fields for price ensure exact values are serialised.
    """
    id: UUID
    name: str
    brand: str
    slug: str
    description: Optional[str]
    cpu: str
    ram_gb: int
    gpu: Optional[str]
    storage_gb: int
    storage_type: Optional[str]
    screen_size_inch: Optional[float]
    screen_resolution: Optional[str]
    battery_wh: Optional[float]
    battery_life_hours: Optional[float]
    weight_kg: Optional[float]
    operating_system: Optional[str]
    price: Decimal
    original_price: Optional[Decimal]
    stock_quantity: int
    is_available: bool
    images: List[str]           # List of Cloudinary URLs
    thumbnail_url: Optional[str]
    tags: List[str]
    is_featured: bool
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """
    Paginated list response.
    The frontend uses total + page + page_size to build pagination UI.
    """
    items: List[ProductResponse]
    total: int          # Total matching products (ignoring pagination)
    page: int
    page_size: int
    total_pages: int


# ─── Reviews ──────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)    # Pydantic layer (DB has CheckConstraint too)
    title: Optional[str] = Field(None, max_length=200)
    body: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    rating: int
    title: Optional[str]
    body: Optional[str]
    user_id: UUID
    product_id: UUID
    created_at: datetime

    # Nested user info so the frontend can show reviewer name
    class UserSummary(BaseModel):
        id: UUID
        first_name: str
        last_name: str

        class Config:
            from_attributes = True

    user: Optional[UserSummary] = None

    class Config:
        from_attributes = True
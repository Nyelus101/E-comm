# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
import json
from app.models.review import Review
from app.schemas.product import ReviewResponse

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.product import ProductUpdate, StockUpdate, ProductResponse
from app.services import product_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post(
    "/products",
    status_code=status.HTTP_201_CREATED,
    response_model=ProductResponse,
    summary="Create a product (admin)",
)
async def create_product(
    # Form fields — we use Form() because this endpoint also receives files
    # You can't mix JSON body with file uploads; use multipart/form-data instead
    name: str = Form(...),
    brand: str = Form(...),
    cpu: str = Form(...),
    ram_gb: int = Form(...),
    storage_gb: int = Form(...),
    price: Decimal = Form(...),
    description: Optional[str] = Form(None),
    gpu: Optional[str] = Form(None),
    storage_type: Optional[str] = Form(None),
    screen_size_inch: Optional[float] = Form(None),
    screen_resolution: Optional[str] = Form(None),
    battery_wh: Optional[float] = Form(None),
    battery_life_hours: Optional[float] = Form(None),
    weight_kg: Optional[float] = Form(None),
    operating_system: Optional[str] = Form(None),
    original_price: Optional[Decimal] = Form(None),
    stock_quantity: int = Form(default=0),
    tags: Optional[str] = Form(default="[]"),   # JSON string e.g. '["gaming","rtx"]'
    is_featured: bool = Form(default=False),
    # File upload — List[UploadFile] accepts multiple files
    images: List[UploadFile] = File(default=[], description="Upload up to 5 images. In Postman: add multiple 'images' keys in form-data, each with a different file."),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Creates a new laptop product with images.

    Send as multipart/form-data (not JSON).
    Images are optional at creation — you can add them later.

    In Postman: Body → form-data, set image fields to type "File".
    """
    from app.schemas.product import ProductCreate

    # Parse tags from JSON string
    try:
        tags_list = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        tags_list = []

    data = ProductCreate(
        name=name,
        brand=brand,
        cpu=cpu,
        ram_gb=ram_gb,
        storage_gb=storage_gb,
        price=price,
        description=description,
        gpu=gpu,
        storage_type=storage_type,
        screen_size_inch=screen_size_inch,
        screen_resolution=screen_resolution,
        battery_wh=battery_wh,
        battery_life_hours=battery_life_hours,
        weight_kg=weight_kg,
        operating_system=operating_system,
        original_price=original_price,
        stock_quantity=stock_quantity,
        tags=tags_list,
        is_featured=is_featured,
    )

    return await product_service.create_product(data, images, db)


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Update a product (admin)",
)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Updates product fields. Send only the fields you want to change.
    Send as JSON (no files — use the image endpoints for image management).
    """
    return await product_service.update_product(product_id, data, db)


@router.post( "/products/{product_id}/images", response_model=ProductResponse, summary="Add images to a product (admin)" )
async def add_images(
    product_id: UUID,
    images: List[UploadFile] = File(..., description="Select up to 5 images at once. Repeat the 'images' key for each file in form-data."),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Adds images to an existing product.
    Max 5 images per request. Max 8 images total per product.

    How to send multiple files in Postman:
      Body → form-data
      Key: images  Type: File  → select first image
      Key: images  Type: File  → select second image
      (same key name, different files — this is how multipart arrays work)
    """
    return await product_service.add_product_images(product_id, images, db)


@router.delete(
    "/products/{product_id}/images",
    response_model=ProductResponse,
    summary="Remove an image from a product (admin)",
)
async def remove_image(
    product_id: UUID,
    image_url: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Removes a specific image by URL.
    Also deletes it from Cloudinary.
    Send: ?image_url=https://res.cloudinary.com/...
    """
    return await product_service.remove_product_image(product_id, image_url, db)


@router.patch(
    "/products/{product_id}/stock",
    response_model=ProductResponse,
    summary="Update stock quantity (admin)",
)
def update_stock(
    product_id: UUID,
    data: StockUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Updates stock quantity only.
    Automatically sets is_available=False when stock reaches 0.
    """
    return product_service.update_stock(product_id, data, db)


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product (admin)",
)
async def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Permanently deletes a product and all its Cloudinary images.
    This cannot be undone.
    """
    await product_service.delete_product(product_id, db)


@router.get(
    "/products",
    summary="List all products (admin)",
)
def admin_list_products(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
    page: int = 1,
    page_size: int = 50,
):
    """
    Admin version of product list — includes unavailable products.
    Higher default page_size for the admin dashboard.
    """
    # Admin sees ALL products including out-of-stock
    products = db.query(product_service.Product).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": [product_service._product_to_dict(p) for p in products],
        "total": db.query(product_service.Product).count(),
        "page": page,
        "page_size": page_size,
    }




# ─── Review Management ────────────────────────────────────────────────────────

@router.get(
    "/reviews",
    summary="List all reviews (admin)",
)
def list_all_reviews(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
    page: int = 1,
    page_size: int = 50,
    approved_only: bool = False,
    pending_only: bool = False,
):
    """
    Returns all reviews across all products.
    Use pending_only=true to see reviews awaiting approval.
    Use approved_only=true to see only live reviews.
    """
    query = db.query(Review)

    if approved_only:
        query = query.filter(Review.is_approved == True)
    elif pending_only:
        query = query.filter(Review.is_approved == False)

    total = query.count()
    reviews = (
        query
        .order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [_review_to_dict(r, db) for r in reviews],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch(
    "/reviews/{review_id}/approve",
    summary="Approve a review (admin)",
)
def approve_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Approves a review so it appears publicly on the product page.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    review.is_approved = True
    db.commit()
    db.refresh(review)
    return _review_to_dict(review, db)


@router.patch(
    "/reviews/{review_id}/reject",
    summary="Reject (hide) a review (admin)",
)
def reject_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Hides a review from the public product page.
    Does not delete it — admin can re-approve later if needed.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    review.is_approved = False
    db.commit()
    db.refresh(review)
    return _review_to_dict(review, db)


@router.delete(
    "/reviews/{review_id}",
    status_code=204,
    summary="Delete a review permanently (admin)",
)
def delete_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Permanently deletes a review. Cannot be undone.
    Use reject instead if you might want to restore it.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    db.delete(review)
    db.commit()


def _review_to_dict(review: Review, db: Session) -> dict:
    """
    Serialises a review with the reviewer's name attached.
    Admin sees all fields including is_approved status.
    """
    user = db.query(User).filter(User.id == review.user_id).first()
    return {
        "id": str(review.id),
        "product_id": str(review.product_id),
        "product_name": review.product.name if review.product else "Deleted product",
        "user_id": str(review.user_id),
        "reviewer_name": f"{user.first_name} {user.last_name}" if user else "Deleted user",
        "reviewer_email": user.email if user else None,
        "rating": review.rating,
        "title": review.title,
        "body": review.body,
        "is_approved": review.is_approved,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }
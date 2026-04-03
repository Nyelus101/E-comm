# # backend/app/routers/products.py
# from fastapi import APIRouter, Depends, Query
# from sqlalchemy.orm import Session
# from typing import Optional
# from decimal import Decimal
# from uuid import UUID

# from app.database import get_db
# from app.services import product_service
# from app.schemas.product import ReviewCreate
# from app.dependencies import get_current_verified_user
# from app.models.user import User

# router = APIRouter(prefix="/products", tags=["Products"])


# @router.get( "", summary="List products with filters" )
# def list_products(
#     db: Session = Depends(get_db),
#     page: int = Query(default=1, ge=1),
#     page_size: int = Query(default=20, ge=1, le=100),
#     # Filters
#     brand: Optional[str] = Query(default=None),
#     min_price: Optional[Decimal] = Query(default=None, ge=0),
#     max_price: Optional[Decimal] = Query(default=None, ge=0),
#     min_ram: Optional[int] = Query(default=None, ge=1),
#     max_ram: Optional[int] = Query(default=None),
#     storage_gb: Optional[int] = Query(default=None, ge=1),
#     gpu_keyword: Optional[str] = Query(default=None, description="e.g. 'RTX' or 'Intel Iris'"),
#     search: Optional[str] = Query(default=None, description="Search name, brand, CPU, description"),
#     is_featured: Optional[bool] = Query(default=None),
#     # Sorting
#     sort_by: Optional[str] = Query(
#         default="newest",
#         description="Options: newest, oldest, popular, price_asc, price_desc, name_asc, name_desc"
#     ),
# ):
#     """
#     Browse all available products with optional filters and sorting.
#     Results are paginated and cached in Redis.

#     Example requests:
#     - GET /products?brand=Dell&max_price=1500
#     - GET /products?min_ram=16&gpu_keyword=RTX&sort_by=price_asc
#     - GET /products?search=gaming&page=2
#     """
#     return product_service.get_products(
#         db=db,
#         page=page,
#         page_size=page_size,
#         brand=brand,
#         min_price=min_price,
#         max_price=max_price,
#         min_ram=min_ram,
#         max_ram=max_ram,
#         storage_gb=storage_gb,
#         gpu_keyword=gpu_keyword,
#         search=search,
#         is_featured=is_featured,
#         sort_by=sort_by,
#         sort_order="desc",
#     )


# @router.get( "/{slug}", summary="Get product by slug" )
# def get_product(slug: str, db: Session = Depends(get_db)):
#     """
#     Returns full product detail by slug.
#     Also increments the product's view count.
#     Example: GET /products/dell-xps-15-2024
#     """
#     return product_service.get_product_by_slug(slug, db)


# @router.get( "/{product_id}/reviews", summary="Get product reviews" )
# def get_reviews(product_id: UUID, db: Session = Depends(get_db)):
#     """Returns all approved reviews for a product."""
#     return product_service.get_product_reviews(product_id, db)


# @router.post( "/{product_id}/reviews", status_code=201, summary="Submit a review" )
# def create_review(
#     product_id: UUID,
#     data: ReviewCreate, 
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_verified_user), 
# ):
#     """
#     Submit a review for a product.
#     Requires a verified account. One review per user per product.
#     """
#     return product_service.create_review(product_id, data, current_user, db)















# backend/app/routers/products.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from uuid import UUID

from app.database import get_db
from app.services import product_service
from app.schemas.product import ReviewCreate
from app.dependencies import get_current_verified_user
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", summary="List products with filters")
def list_products(
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    brand: Optional[str] = Query(default=None),
    min_price: Optional[Decimal] = Query(default=None, ge=0),
    max_price: Optional[Decimal] = Query(default=None, ge=0),
    min_ram: Optional[int] = Query(default=None, ge=1),
    max_ram: Optional[int] = Query(default=None),
    storage_gb: Optional[int] = Query(default=None, ge=1),
    gpu_keyword: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    is_featured: Optional[bool] = Query(default=None),
    sort_by: Optional[str] = Query(default="newest"),
):
    return product_service.get_products(
        db=db,
        page=page,
        page_size=page_size,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_ram=min_ram,
        max_ram=max_ram,
        storage_gb=storage_gb,
        gpu_keyword=gpu_keyword,
        search=search,
        is_featured=is_featured,
        sort_by=sort_by,
        sort_order="desc",
    )


@router.get("/{slug}", summary="Get product by slug")
def get_product(slug: str, db: Session = Depends(get_db)):
    return product_service.get_product_by_slug(slug, db)


@router.get("/{product_id}/reviews", summary="Get product reviews")
def get_reviews(product_id: UUID, db: Session = Depends(get_db)):
    return product_service.get_product_reviews(product_id, db)


@router.post(
    "/{product_id}/reviews",
    status_code=201,
    summary="Submit a review",
)
def create_review(
    product_id: UUID,
    data: ReviewCreate,                                    # properly typed
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),   # clean import
):
    """
    Submit a review. Requires a verified account.
    One review per user per product — returns 409 on duplicate.
    """
    return product_service.create_review(product_id, data, current_user, db)
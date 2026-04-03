# backend/app/services/product_service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status, UploadFile
from uuid import UUID
from decimal import Decimal
import json
import redis

from slugify import slugify

from app.models.product import Product
from app.models.review import Review
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, StockUpdate, ReviewCreate
from app.services.cloudinary_service import upload_multiple_images, delete_product_image
from app.config import settings

# Redis client — same pattern as auth
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# How long product data is cached (in seconds)
# 10 minutes for lists, 30 minutes for individual products
CACHE_TTL_LIST = 600
CACHE_TTL_DETAIL = 1800


# ─── Cache helpers ────────────────────────────────────────────────────────────

def _invalidate_product_cache(product_id: str = None, slug: str = None):
    """
    Clears cached product data from Redis when something changes.

    We use a pattern delete to clear ALL list caches — because changing
    one product can affect any page of results (e.g. if you sort by price
    and change the price, the product moves to a different page).

    Called whenever a product is created, updated, or deleted.
    """
    # Delete all product list caches (they all start with "products:list:")
    for key in redis_client.scan_iter("products:list:*"):
        redis_client.delete(key)

    # Delete this specific product's detail cache
    if product_id:
        redis_client.delete(f"products:detail:id:{product_id}")
    if slug:
        redis_client.delete(f"products:detail:slug:{slug}")


# ─── Slug generation ──────────────────────────────────────────────────────────

def _generate_unique_slug(name: str, brand: str, db: Session, exclude_id: UUID = None) -> str:
    """
    Creates a URL-friendly slug from product name and brand.
    Handles duplicates by appending a number.

    Example:
        "Dell XPS 15 (2024)" + "Dell" → "dell-xps-15-2024"
        If that exists: "dell-xps-15-2024-2"
    """
    base_slug = slugify(f"{brand} {name}")
    slug = base_slug
    counter = 2

    while True:
        # Check if slug exists (excluding the current product on updates)
        query = db.query(Product).filter(Product.slug == slug)
        if exclude_id:
            query = query.filter(Product.id != exclude_id)

        if not query.first():
            return slug   # Slug is unique, use it

        # Try with incrementing number suffix
        slug = f"{base_slug}-{counter}"
        counter += 1


# ─── Admin: Create ────────────────────────────────────────────────────────────

async def create_product(
    data: ProductCreate,
    files: list[UploadFile],
    db: Session,
) -> Product:
    """
    Creates a new product with images.

    Flow:
      1. Generate unique slug
      2. Upload images to Cloudinary (if any provided)
      3. Save product to DB
      4. Invalidate list caches
    """
    slug = _generate_unique_slug(data.name, data.brand, db)

    # Upload images first — if Cloudinary fails, we don't create the product
    image_urls = []
    thumbnail_url = None

    if files and files[0].filename:
        # files[0].filename being empty means no file was actually attached
        uploaded = await upload_multiple_images(files, slug)
        image_urls = [img["url"] for img in uploaded]
        thumbnail_url = image_urls[0] if image_urls else None

    # Convert Pydantic model to dict, then to Product ORM object
    product_data = data.model_dump()
    product = Product(
        **product_data,
        slug=slug,
        images=image_urls,
        thumbnail_url=thumbnail_url,
        is_available=data.stock_quantity > 0,
        # is_available is automatically False when stock hits 0
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    # Clear all list caches so the new product appears in results
    _invalidate_product_cache()

    return product


# ─── Admin: Update ────────────────────────────────────────────────────────────

async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: Session,
) -> Product:
    """
    Updates a product. Only updates fields that were actually sent.
    If name or brand changes, regenerates the slug.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    update_data = data.model_dump(exclude_unset=True)

    # If name or brand changed, generate a new slug
    if "name" in update_data or "brand" in update_data:
        new_name = update_data.get("name", product.name)
        new_brand = update_data.get("brand", product.brand)
        update_data["slug"] = _generate_unique_slug(new_name, new_brand, db, exclude_id=product_id)

    # If stock_quantity was updated, sync is_available
    if "stock_quantity" in update_data:
        # Don't override is_available if it was explicitly set
        if "is_available" not in update_data:
            update_data["is_available"] = update_data["stock_quantity"] > 0

    old_slug = product.slug
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    # Invalidate both old slug cache and new if slug changed
    _invalidate_product_cache(
        product_id=str(product.id),
        slug=old_slug,
    )
    if product.slug != old_slug:
        _invalidate_product_cache(slug=product.slug)

    return product


# ─── Admin: Add images ────────────────────────────────────────────────────────

async def add_product_images(
    product_id: UUID,
    files: list[UploadFile],
    db: Session,
) -> Product:
    """
    Adds more images to an existing product.
    Checks the 8-image limit before uploading.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    current_count = len(product.images) if product.images else 0
    if current_count + len(files) > 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adding {len(files)} images would exceed the 8-image limit. "
                   f"Product currently has {current_count} images.",
        )

    uploaded = await upload_multiple_images(files, product.slug)
    new_urls = [img["url"] for img in uploaded]

    # Append to existing list
    current_images = product.images or []
    product.images = current_images + new_urls

    # Set thumbnail if product had no images
    if not product.thumbnail_url and new_urls:
        product.thumbnail_url = new_urls[0]

    db.commit()
    db.refresh(product)
    _invalidate_product_cache(product_id=str(product.id), slug=product.slug)

    return product


# ─── Admin: Delete image ──────────────────────────────────────────────────────

async def remove_product_image(
    product_id: UUID,
    image_url: str,
    db: Session,
) -> Product:
    """
    Removes a specific image from a product.
    Deletes it from Cloudinary and removes the URL from the product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if image_url not in (product.images or []):
        raise HTTPException(status_code=404, detail="Image not found on this product.")

    # Extract public_id from Cloudinary URL to delete it
    # URL format: https://res.cloudinary.com/cloud_name/image/upload/v123/laptop-store/slug/public_id.ext
    # We need: "laptop-store/slug/public_id"
    try:
        # Split on "/upload/" and take everything after, strip extension
        path_after_upload = image_url.split("/upload/")[1]
        # Remove version prefix like "v1234567890/"
        parts = path_after_upload.split("/")
        if parts[0].startswith("v") and parts[0][1:].isdigit():
            parts = parts[1:]
        public_id = "/".join(parts).rsplit(".", 1)[0]
        await delete_product_image(public_id)
    except Exception:
        # Log but don't fail — we still remove the URL from the product
        pass

    # Remove from images list
    updated_images = [img for img in product.images if img != image_url]
    product.images = updated_images

    # If deleted image was the thumbnail, set new thumbnail
    if product.thumbnail_url == image_url:
        product.thumbnail_url = updated_images[0] if updated_images else None

    db.commit()
    db.refresh(product)
    _invalidate_product_cache(product_id=str(product.id), slug=product.slug)

    return product


# ─── Admin: Delete product ────────────────────────────────────────────────────

async def delete_product(product_id: UUID, db: Session) -> None:
    """
    Deletes a product and all its Cloudinary images.
    Soft-delete could be used instead, but for a retail store
    hard delete is appropriate — admin knows what they're doing.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Delete all Cloudinary images first
    for image_url in (product.images or []):
        try:
            path_after_upload = image_url.split("/upload/")[1]
            parts = path_after_upload.split("/")
            if parts[0].startswith("v") and parts[0][1:].isdigit():
                parts = parts[1:]
            public_id = "/".join(parts).rsplit(".", 1)[0]
            await delete_product_image(public_id)
        except Exception:
            pass  # Continue even if Cloudinary delete fails

    slug = product.slug
    product_id_str = str(product.id)

    db.delete(product)
    db.commit()

    _invalidate_product_cache(product_id=product_id_str, slug=slug)


# ─── Admin: Stock update ──────────────────────────────────────────────────────

def update_stock(product_id: UUID, data: StockUpdate, db: Session) -> Product:
    """Updates stock quantity and syncs is_available."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.stock_quantity = data.stock_quantity
    product.is_available = data.stock_quantity > 0

    db.commit()
    db.refresh(product)
    _invalidate_product_cache(product_id=str(product.id), slug=product.slug)

    return product


# ─── Public: Get product list ─────────────────────────────────────────────────

def get_products(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    brand: str = None,
    min_price: Decimal = None,
    max_price: Decimal = None,
    min_ram: int = None,
    max_ram: int = None,
    storage_gb: int = None,
    gpu_keyword: str = None,
    search: str = None,
    is_featured: bool = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> dict:
    """
    Returns a paginated, filtered, sorted list of available products.

    Cache key includes all filter params so different filter combinations
    are cached independently. Cache is cleared on any product change.

    Filters:
      brand         - exact match (case-insensitive)
      min/max_price - price range
      min/max_ram   - RAM range in GB
      storage_gb    - minimum storage
      gpu_keyword   - substring match on GPU field ("RTX", "Intel", etc.)
      search        - searches name, brand, cpu, description
      is_featured   - filter featured products

    Sort options:
      price_asc, price_desc, name_asc, newest (default)
    """
    # ── Build cache key from all parameters ──────────────────────────────────
    cache_key = (
        f"products:list:p{page}:ps{page_size}:b{brand}:minp{min_price}:"
        f"maxp{max_price}:ram{min_ram}-{max_ram}:stor{storage_gb}:"
        f"gpu{gpu_keyword}:q{search}:feat{is_featured}:sort{sort_by}{sort_order}"
    )

    # Check cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # ── Build query ───────────────────────────────────────────────────────────
    query = db.query(Product).filter(Product.is_available == True)

    # Text search across multiple fields
    # ilike = case-insensitive LIKE — % is wildcard on both sides
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.cpu.ilike(search_term),
                Product.description.ilike(search_term),
            )
        )

    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if min_ram is not None:
        query = query.filter(Product.ram_gb >= min_ram)

    if max_ram is not None:
        query = query.filter(Product.ram_gb <= max_ram)

    if storage_gb is not None:
        query = query.filter(Product.storage_gb >= storage_gb)

    if gpu_keyword:
        query = query.filter(Product.gpu.ilike(f"%{gpu_keyword}%"))

    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)

    # ── Sorting ───────────────────────────────────────────────────────────────
    sort_options = {
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name_asc": Product.name.asc(),
        "name_desc": Product.name.desc(),
        "newest": Product.created_at.desc(),
        "oldest": Product.created_at.asc(),
        "popular": Product.view_count.desc(),
    }
    order_clause = sort_options.get(f"{sort_by}_{sort_order}", Product.created_at.desc())
    # Handle shorthand sort values like "newest", "popular"
    if sort_by in ("newest", "oldest", "popular"):
        order_clause = sort_options.get(sort_by, Product.created_at.desc())

    query = query.order_by(order_clause)

    # ── Pagination ────────────────────────────────────────────────────────────
    # Count total BEFORE applying offset/limit (for pagination UI)
    total = query.count()
    total_pages = (total + page_size - 1) // page_size  # ceiling division

    products = query.offset((page - 1) * page_size).limit(page_size).all()

    result = {
        "items": [_product_to_dict(p) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

    # Cache the result
    redis_client.setex(cache_key, CACHE_TTL_LIST, json.dumps(result, default=str))

    return result


# ─── Public: Get single product ───────────────────────────────────────────────

def get_product_by_slug(slug: str, db: Session) -> Product:
    """
    Returns a single product by its URL slug.
    Increments view_count and caches the result.

    Why slug instead of ID? Slugs are human-readable and SEO-friendly.
    /products/dell-xps-15-2024 is better than /products/uuid-here.
    """
    cache_key = f"products:detail:slug:{slug}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    product = db.query(Product).filter(
        Product.slug == slug,
        Product.is_available == True,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Increment view count (shows popularity in admin analytics later)
    product.view_count += 1
    db.commit()
    db.refresh(product)

    result = _product_to_dict(product)
    redis_client.setex(cache_key, CACHE_TTL_DETAIL, json.dumps(result, default=str))

    return result


def get_product_by_id(product_id: UUID, db: Session) -> Product:
    """
    Returns a product by ID — used in admin routes where slug may not be known.
    No view count increment for admin views.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


# ─── Reviews ──────────────────────────────────────────────────────────────────

def create_review(
    product_id: UUID,
    data: ReviewCreate,
    user: User,
    db: Session,
) -> Review:
    """
    Creates a review. The UniqueConstraint on (user_id, product_id)
    in the DB model means one review per user per product — enforced at DB level.
    We also check here to give a friendly error message.
    """
    # Check product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Check for existing review — friendly error before DB raises IntegrityError
    existing = db.query(Review).filter(
        Review.user_id == user.id,
        Review.product_id == product_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this product.",
        )

    review = Review(
        user_id=user.id,
        product_id=product_id,
        rating=data.rating,
        title=data.title,
        body=data.body,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return review


def get_product_reviews(product_id: UUID, db: Session) -> list:
    """
    Returns all approved reviews for a product, newest first.
    Loads user info (name) via join so reviewer name is available.
    """
    reviews = (
        db.query(Review)
        .filter(
            Review.product_id == product_id,
            Review.is_approved == True,
        )
        .order_by(Review.created_at.desc())
        .all()
    )
    return reviews


# ─── Helper: ORM → dict ───────────────────────────────────────────────────────

def _product_to_dict(product: Product) -> dict:
    """
    Converts a SQLAlchemy Product object to a plain dict for JSON serialisation.
    Needed because SQLAlchemy objects can't be directly JSON-serialised.
    Decimal fields converted to str to avoid JSON serialisation issues.
    """
    return {
        "id": str(product.id),
        "name": product.name,
        "brand": product.brand,
        "slug": product.slug,
        "description": product.description,
        "cpu": product.cpu,
        "ram_gb": product.ram_gb,
        "gpu": product.gpu,
        "storage_gb": product.storage_gb,
        "storage_type": product.storage_type,
        "screen_size_inch": product.screen_size_inch,
        "screen_resolution": product.screen_resolution,
        "battery_wh": product.battery_wh,
        "battery_life_hours": product.battery_life_hours,
        "weight_kg": product.weight_kg,
        "operating_system": product.operating_system,
        "price": str(product.price),
        "original_price": str(product.original_price) if product.original_price else None,
        "stock_quantity": product.stock_quantity,
        "is_available": product.is_available,
        "images": product.images or [],
        "thumbnail_url": product.thumbnail_url,
        "tags": product.tags or [],
        "is_featured": product.is_featured,
        "view_count": product.view_count,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }
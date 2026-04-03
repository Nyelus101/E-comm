# backend/app/services/cloudinary_service.py
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# ─── Configure Cloudinary once at import time ────────────────────────────────
# This reads your credentials from config and sets them globally.
# Cloudinary's SDK uses this global config for every call.
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,   # Always use HTTPS URLs
)

# Allowed image types — we reject anything else before uploading
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Max file size: 5MB in bytes
MAX_FILE_SIZE = 5 * 1024 * 1024


async def upload_product_image(file: UploadFile, product_slug: str) -> dict:
    """
    Uploads a single product image to Cloudinary.

    Steps:
      1. Validate file type and size
      2. Upload to Cloudinary under a folder named after the product
      3. Return the secure URL and public_id

    Args:
        file: The uploaded file from the request
        product_slug: Used to organise images in Cloudinary folders
                      e.g. "dell-xps-15" → folder "laptop-store/dell-xps-15"

    Returns:
        {"url": "https://...", "public_id": "laptop-store/dell-xps-15/abc123"}
    """
    # ── Validate file type ───────────────────────────────────────────────────
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    # ── Read file bytes and validate size ────────────────────────────────────
    # We read the whole file into memory to check size.
    # For very large files you'd use chunked reading, but 5MB is fine here.
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB.",
        )

    # ── Upload to Cloudinary ─────────────────────────────────────────────────
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=f"laptop-store/{product_slug}",
            # transformation: auto-format (webp for modern browsers, jpg fallback)
            # and auto-quality compression — reduces file size without visible loss
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ],
            # resource_type="image" tells Cloudinary this is an image (not video/raw)
            resource_type="image",
        )

        return {
            "url": result["secure_url"],         # HTTPS URL to display in the frontend
            "public_id": result["public_id"],    # ID needed to delete the image later
        }

    except cloudinary.exceptions.Error as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Please try again.",
        )


async def delete_product_image(public_id: str) -> bool:
    """
    Deletes an image from Cloudinary by its public_id.
    Called when admin removes an image or deletes a product.

    Returns True if deleted, False if not found.
    """
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        # Cloudinary returns {"result": "ok"} on success
        # or {"result": "not found"} if the image doesn't exist
        return result.get("result") == "ok"
    except cloudinary.exceptions.Error as e:
        logger.error(f"Cloudinary delete failed for {public_id}: {str(e)}")
        return False


async def upload_multiple_images(
    files: list[UploadFile],
    product_slug: str
) -> list[dict]:
    """
    Uploads multiple images for a single product.
    Each image is uploaded individually and results collected.
    Max 8 images per product.
    """
    if len(files) > 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 8 images allowed per product.",
        )

    results = []
    for file in files:
        result = await upload_product_image(file, product_slug)
        results.append(result)

    return results
# backend/app/services/embedding_service.py
import httpx
import numpy as np
from typing import Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)

VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
EMBEDDING_MODEL = "voyage-2"        # 1024 dimensions, great for semantic search
EMBEDDING_DIM   = 1024


def _build_product_text(product) -> str:
    """
    Builds a rich text representation of a product for embedding.

    What we include and why:
    - Name + brand: most important identifiers
    - Use-case tags: "gaming", "student", "ultrabook" — intent signals
    - CPU/GPU: hardware-focused queries like "RTX laptop" need these
    - RAM/storage: "16GB RAM laptop" queries
    - Price: "under ₦400,000" — embedding price helps semantic budget matching
    - Description: free-form text captures nuanced specs

    We repeat the name and key specs intentionally — repetition increases
    their weight in the embedding vector.
    """
    parts = [
        f"{product.brand} {product.name}",
        f"{product.brand} {product.name}",           # repeated for weight
        f"Processor: {product.cpu}",
        f"RAM: {product.ram_gb}GB",
        f"Storage: {product.storage_gb}GB {product.storage_type or ''}",
        f"Price: {float(product.price):.0f} Naira",
    ]

    if product.gpu:
        parts.append(f"GPU: {product.gpu}")
        parts.append(f"GPU: {product.gpu}")           # repeated for weight

    if product.screen_size_inch:
        parts.append(f"Screen: {product.screen_size_inch} inch")

    if product.battery_life_hours:
        parts.append(f"Battery life: {product.battery_life_hours} hours")

    if product.weight_kg:
        parts.append(f"Weight: {product.weight_kg}kg")

    if product.operating_system:
        parts.append(f"OS: {product.operating_system}")

    if product.tags:
        tag_str = " ".join(product.tags)
        parts.append(f"Category: {tag_str}")
        parts.append(f"Use case: {tag_str}")          # rephrase for semantic variation

    if product.description:
        parts.append(product.description)

    return " | ".join(parts)


async def generate_embedding(text: str) -> Optional[list[float]]:
    """
    Calls Voyage AI to generate a 1024-dimension embedding vector.

    Why Voyage AI instead of OpenAI embeddings?
    - Anthropic's recommended embedding partner
    - voyage-2 outperforms text-embedding-ada-002 on retrieval benchmarks
    - 50M free tokens/month — more than enough for a laptop store

    Returns a list of 1024 floats, or None if the API call fails.
    """
    if not settings.VOYAGE_API_KEY:
        logger.warning("VOYAGE_API_KEY not set — embeddings disabled")
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                VOYAGE_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.VOYAGE_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "input": [text],
                    "model": EMBEDDING_MODEL,
                },
                timeout=30.0,
            )

        if response.status_code != 200:
            logger.error(f"Voyage AI error {response.status_code}: {response.text}")
            return None

        data = response.json()
        return data["data"][0]["embedding"]

    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return None


async def generate_query_embedding(query: str) -> Optional[list[float]]:
    """
    Generates an embedding for a search query.
    Voyage AI recommends prepending "query: " for retrieval tasks.
    """
    return await generate_embedding(f"query: {query}")


async def embed_and_store_product(product, db) -> bool:
    """
    Generates and stores an embedding for a product.
    Called when a product is created or updated.

    Returns True if successful, False if embedding generation failed.
    In failure cases we log but don't crash — the product is still
    saved to PostgreSQL and Elasticsearch, just without vector search.
    """
    text = _build_product_text(product)
    embedding = await generate_embedding(text)

    if embedding is None:
        return False

    product.embedding = embedding
    db.commit()
    return True


async def embed_all_products(db) -> int:
    """
    Generates embeddings for all products that don't have one yet.
    Called via the admin reindex endpoint.
    Returns count of successfully embedded products.
    """
    from app.models.product import Product

    # Only products without embeddings — don't re-embed unnecessarily
    products = db.query(Product).filter(Product.embedding == None).all()
    count = 0

    for product in products:
        success = await embed_and_store_product(product, db)
        if success:
            count += 1

    logger.info(f"Generated embeddings for {count}/{len(products)} products")
    return count
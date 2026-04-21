# # backend/app/services/embedding_service.py
# import httpx
# import numpy as np
# from typing import Optional
# import logging
# from app.config import settings

# logger = logging.getLogger(__name__)

# VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
# EMBEDDING_MODEL = "voyage-2"        # 1024 dimensions, great for semantic search
# EMBEDDING_DIM   = 1024


# def _build_product_text(product) -> str:
#     """
#     Builds a rich text representation of a product for embedding.

#     What we include and why:
#     - Name + brand: most important identifiers
#     - Use-case tags: "gaming", "student", "ultrabook" — intent signals
#     - CPU/GPU: hardware-focused queries like "RTX laptop" need these
#     - RAM/storage: "16GB RAM laptop" queries
#     - Price: "under ₦400,000" — embedding price helps semantic budget matching
#     - Description: free-form text captures nuanced specs

#     We repeat the name and key specs intentionally — repetition increases
#     their weight in the embedding vector.
#     """
#     parts = [
#         f"{product.brand} {product.name}",
#         f"{product.brand} {product.name}",           # repeated for weight
#         f"Processor: {product.cpu}",
#         f"RAM: {product.ram_gb}GB",
#         f"Storage: {product.storage_gb}GB {product.storage_type or ''}",
#         f"Price: {float(product.price):.0f} Naira",
#     ]

#     if product.gpu:
#         parts.append(f"GPU: {product.gpu}")
#         parts.append(f"GPU: {product.gpu}")           # repeated for weight

#     if product.screen_size_inch:
#         parts.append(f"Screen: {product.screen_size_inch} inch")

#     if product.battery_life_hours:
#         parts.append(f"Battery life: {product.battery_life_hours} hours")

#     if product.weight_kg:
#         parts.append(f"Weight: {product.weight_kg}kg")

#     if product.operating_system:
#         parts.append(f"OS: {product.operating_system}")

#     if product.tags:
#         tag_str = " ".join(product.tags)
#         parts.append(f"Category: {tag_str}")
#         parts.append(f"Use case: {tag_str}")          # rephrase for semantic variation

#     if product.description:
#         parts.append(product.description)

#     return " | ".join(parts)


# async def generate_embedding(text: str) -> Optional[list[float]]:
#     """
#     Calls Voyage AI to generate a 1024-dimension embedding vector.

#     Why Voyage AI instead of OpenAI embeddings?
#     - Anthropic's recommended embedding partner
#     - voyage-2 outperforms text-embedding-ada-002 on retrieval benchmarks
#     - 50M free tokens/month — more than enough for a laptop store

#     Returns a list of 1024 floats, or None if the API call fails.
#     """
#     if not settings.VOYAGE_API_KEY:
#         logger.warning("VOYAGE_API_KEY not set — embeddings disabled")
#         return None

#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.post(
#                 VOYAGE_API_URL,
#                 headers={
#                     "Authorization": f"Bearer {settings.VOYAGE_API_KEY}",
#                     "Content-Type":  "application/json",
#                 },
#                 json={
#                     "input": [text],
#                     "model": EMBEDDING_MODEL,
#                 },
#                 timeout=30.0,
#             )

#         if response.status_code != 200:
#             logger.error(f"Voyage AI error {response.status_code}: {response.text}")
#             return None

#         data = response.json()
#         return data["data"][0]["embedding"]

#     except Exception as e:
#         logger.error(f"Embedding generation failed: {e}")
#         return None


# async def generate_query_embedding(query: str) -> Optional[list[float]]:
#     """
#     Generates an embedding for a search query.
#     Voyage AI recommends prepending "query: " for retrieval tasks.
#     """
#     return await generate_embedding(f"query: {query}")


# async def embed_and_store_product(product, db) -> bool:
#     """
#     Generates and stores an embedding for a product.
#     Called when a product is created or updated.

#     Returns True if successful, False if embedding generation failed.
#     In failure cases we log but don't crash — the product is still
#     saved to PostgreSQL and Elasticsearch, just without vector search.
#     """
#     text = _build_product_text(product)
#     embedding = await generate_embedding(text)

#     if embedding is None:
#         return False

#     product.embedding = embedding
#     db.commit()
#     return True


# async def embed_all_products(db) -> int:
#     """
#     Generates embeddings for all products that don't have one yet.
#     Called via the admin reindex endpoint.
#     Returns count of successfully embedded products.
#     """
#     from app.models.product import Product

#     # Only products without embeddings — don't re-embed unnecessarily
#     products = db.query(Product).filter(Product.embedding == None).all()
#     count = 0

#     for product in products:
#         success = await embed_and_store_product(product, db)
#         if success:
#             count += 1

#     logger.info(f"Generated embeddings for {count}/{len(products)} products")
#     return count



































# backend/app/services/embedding_service.py
"""
Embedding Service — generates vector embeddings using Voyage AI official SDK.

Embeddings are stored in TWO places:
  1. PostgreSQL products.embedding (Vector(1024)) — used by pgvector similarity search
  2. Typesense document field 'embedding' (float[]) — used by Typesense hybrid search

Both are kept in sync whenever a product is created or updated.
"""
import voyageai
import numpy as np
from typing import Optional, List
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Voyage AI client — initialised once at module load
# The SDK handles retries and connection pooling internally
_voyage_client: Optional[voyageai.Client] = None

EMBEDDING_MODEL = "voyage-2"   # 1024 dimensions
EMBEDDING_DIM   = 1024


def _get_voyage_client() -> Optional[voyageai.Client]:
    """
    Returns a cached Voyage AI client.
    Returns None if no API key is configured so the app starts
    without crashing even when embeddings aren't set up yet.
    """
    global _voyage_client
    if _voyage_client is None:
        if not settings.VOYAGE_API_KEY:
            logger.warning("VOYAGE_API_KEY not set — embeddings disabled")
            return None
        _voyage_client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)
    return _voyage_client


def _build_product_text(product) -> str:
    """
    Constructs a rich text representation of a product for embedding.

    Key design choices:
    - Name and brand are repeated for higher weight in the vector
    - GPU is repeated because gaming/RTX queries need strong GPU signal
    - Price is included as text so semantic budget queries work
    - Use-case tags are rephrased ("Category: gaming" + "Use case: gaming")
      to match both ways users might phrase intent
    """
    parts = [
        f"{product.brand} {product.name}",
        f"{product.brand} {product.name}",        # weight boost
        f"Brand: {product.brand}",
        f"Processor: {product.cpu}",
        f"RAM: {product.ram_gb}GB memory",
        f"Storage: {product.storage_gb}GB {product.storage_type or ''}",
        f"Price: {float(product.price):.0f} Naira NGN",
    ]

    if product.gpu:
        parts.append(f"Graphics: {product.gpu}")
        parts.append(f"GPU: {product.gpu}")        # weight boost

    if product.screen_size_inch:
        parts.append(f"Screen: {product.screen_size_inch} inch display")

    if product.battery_life_hours:
        parts.append(f"Battery life: approximately {product.battery_life_hours} hours")

    if product.weight_kg:
        parts.append(f"Weight: {product.weight_kg}kg portable laptop")

    if product.operating_system:
        parts.append(f"Operating system: {product.operating_system}")

    if product.tags:
        tag_str = " ".join(product.tags)
        parts.append(f"Category: {tag_str}")
        parts.append(f"Use case: {tag_str}")       # rephrase for semantic variety
        parts.append(f"Suitable for: {tag_str}")

    if product.description:
        parts.append(product.description)

    return " | ".join(parts)


def generate_embedding_sync(text: str) -> Optional[List[float]]:
    """
    Generates a single embedding synchronously using the Voyage AI SDK.

    The voyageai SDK is synchronous — we use the sync version throughout
    since SQLAlchemy sessions and most of our service code is also sync.
    FastAPI async endpoints call this in a thread pool via run_in_executor
    when needed.

    Returns a list of 1024 floats, or None on failure.
    """
    client = _get_voyage_client()
    if client is None:
        return None

    try:
        result = client.embed(
            texts=[text],
            model=EMBEDDING_MODEL,
            input_type="document",    # "document" for storing, "query" for searching
        )
        return result.embeddings[0]
    except Exception as e:
        logger.error(f"Voyage AI embedding failed: {e}")
        return None


def generate_query_embedding_sync(query: str) -> Optional[List[float]]:
    """
    Generates an embedding for a search query.

    Voyage AI distinguishes between document and query embeddings.
    Using input_type="query" optimises the vector for retrieval tasks —
    it produces slightly different vectors tuned for matching documents.
    """
    client = _get_voyage_client()
    if client is None:
        return None

    try:
        result = client.embed(
            texts=[query],
            model=EMBEDDING_MODEL,
            input_type="query",    # optimised for search queries
        )
        return result.embeddings[0]
    except Exception as e:
        logger.error(f"Voyage AI query embedding failed: {e}")
        return None


async def generate_embedding(text: str) -> Optional[List[float]]:
    """
    Async wrapper — runs the sync SDK call in FastAPI's thread pool.
    Used by async route handlers and LangGraph nodes.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, generate_embedding_sync, text)


async def generate_query_embedding(query: str) -> Optional[List[float]]:
    """Async wrapper for query embedding generation."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, generate_query_embedding_sync, query)


def embed_and_store_product_sync(product, db) -> Optional[List[float]]:
    """
    Generates an embedding for a product and stores it in PostgreSQL.
    Returns the embedding vector (list of floats) or None on failure.

    The embedding is also returned so callers can store it in Typesense
    without generating it twice.
    """
    text      = _build_product_text(product)
    embedding = generate_embedding_sync(text)

    if embedding is None:
        logger.warning(f"Could not generate embedding for product {product.id}")
        return None

    product.embedding = embedding
    db.commit()
    return embedding


async def embed_and_store_product(product, db) -> Optional[List[float]]:
    """Async wrapper — used in async service functions."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        embed_and_store_product_sync,
        product,
        db,
    )


async def embed_all_products(db) -> int:
    """
    Generates and stores embeddings for all products missing one.
    Returns count of successfully embedded products.
    """
    from app.models.product import Product

    products = db.query(Product).filter(Product.embedding == None).all()
    count    = 0

    for product in products:
        embedding = await embed_and_store_product(product, db)
        if embedding is not None:
            count += 1

    logger.info(f"Generated embeddings for {count}/{len(products)} products")
    return count
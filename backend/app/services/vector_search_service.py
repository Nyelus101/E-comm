# # backend/app/services/vector_search_service.py
# from sqlalchemy.orm import Session
# from sqlalchemy import text
# from typing import Optional
# import logging

# logger = logging.getLogger(__name__)


# def vector_search(
#     query_embedding: list[float],
#     db: Session,
#     limit: int = 20,
#     min_price: Optional[float] = None,
#     max_price: Optional[float] = None,
#     min_ram: Optional[int] = None,
#     brand: Optional[str] = None,
# ) -> list[dict]:
#     """
#     Performs cosine similarity search using pgvector.

#     The <=> operator computes cosine distance between vectors.
#     Lower distance = more similar. We ORDER BY distance ASC to get
#     closest matches first.

#     We apply structural filters here too — a "gaming laptop under ₦500k"
#     query should only vector-search within the budget range.

#     Why raw SQL instead of SQLAlchemy ORM?
#     pgvector's operators (<=> for cosine, <-> for L2, <#> for inner product)
#     aren't natively supported by SQLAlchemy's expression language yet.
#     Raw SQL with parameter binding is safe — no injection risk.
#     """
#     # Build WHERE clauses dynamically
#     conditions = ["is_available = TRUE", "embedding IS NOT NULL"]
#     params: dict = {"embedding": str(query_embedding), "limit": limit}

#     if min_price is not None:
#         conditions.append("price >= :min_price")
#         params["min_price"] = min_price

#     if max_price is not None:
#         conditions.append("price <= :max_price")
#         params["max_price"] = max_price

#     if min_ram is not None:
#         conditions.append("ram_gb >= :min_ram")
#         params["min_ram"] = min_ram

#     if brand:
#         conditions.append("LOWER(brand) LIKE :brand")
#         params["brand"] = f"%{brand.lower()}%"

#     where_clause = " AND ".join(conditions)

#     # <=> is pgvector cosine distance
#     # 1 - distance = cosine similarity (we return similarity for ranking)
#     sql = text(f"""
#         SELECT
#             id::text,
#             name,
#             brand,
#             slug,
#             cpu,
#             gpu,
#             ram_gb,
#             storage_gb,
#             storage_type,
#             price::float,
#             original_price::float,
#             stock_quantity,
#             is_available,
#             is_featured,
#             thumbnail_url,
#             images,
#             tags,
#             description,
#             view_count,
#             1 - (embedding <=> :embedding::vector) AS similarity_score
#         FROM products
#         WHERE {where_clause}
#         ORDER BY embedding <=> :embedding::vector
#         LIMIT :limit
#     """)

#     try:
#         result = db.execute(sql, params)
#         rows = result.fetchall()

#         products = []
#         for row in rows:
#             products.append({
#                 "id":               row.id,
#                 "name":             row.name,
#                 "brand":            row.brand,
#                 "slug":             row.slug,
#                 "cpu":              row.cpu,
#                 "gpu":              row.gpu,
#                 "ram_gb":           row.ram_gb,
#                 "storage_gb":       row.storage_gb,
#                 "storage_type":     row.storage_type,
#                 "price":            str(row.price),
#                 "original_price":   str(row.original_price) if row.original_price else None,
#                 "stock_quantity":   row.stock_quantity,
#                 "is_available":     row.is_available,
#                 "is_featured":      row.is_featured,
#                 "thumbnail_url":    row.thumbnail_url,
#                 "images":           row.images or [],
#                 "tags":             row.tags or [],
#                 "description":      row.description,
#                 "view_count":       row.view_count,
#                 "similarity_score": float(row.similarity_score),
#                 "_source":          "vector",
#             })

#         return products

#     except Exception as e:
#         logger.error(f"Vector search failed: {e}")
#         return []
































# backend/app/services/vector_search_service.py
"""
pgvector similarity search — used as a supplementary search path
in the AI pipeline alongside Typesense hybrid search.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


def vector_search(
    query_embedding: List[float],
    db:              Session,
    limit:           int            = 15,
    min_price:       Optional[float] = None,
    max_price:       Optional[float] = None,
    min_ram:         Optional[int]   = None,
    brand:           Optional[str]   = None,
) -> List[dict]:
    """
    Cosine similarity search using pgvector.
    Used in the AI pipeline as a secondary signal alongside Typesense.

    Returns products ordered by semantic similarity to the query embedding.
    """
    conditions = [
        "is_available = TRUE",
        "embedding IS NOT NULL",
    ]
    params: dict = {
        "embedding": str(query_embedding),
        "limit":     limit,
    }

    if min_price is not None:
        conditions.append("price >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("price <= :max_price")
        params["max_price"] = max_price

    if min_ram is not None:
        conditions.append("ram_gb >= :min_ram")
        params["min_ram"] = min_ram

    if brand:
        conditions.append("LOWER(brand) LIKE :brand")
        params["brand"] = f"%{brand.lower()}%"

    where_clause = " AND ".join(conditions)

    sql = text(f"""
        SELECT
            id::text        AS product_id,
            name,
            brand,
            slug,
            cpu,
            gpu,
            ram_gb,
            storage_gb,
            storage_type,
            price::float,
            original_price::float,
            stock_quantity,
            is_available,
            is_featured,
            thumbnail_url,
            images,
            tags,
            description,
            view_count,
            1 - (embedding <=> :embedding::vector) AS similarity_score
        FROM products
        WHERE {where_clause}
        ORDER BY embedding <=> :embedding::vector
        LIMIT :limit
    """)

    try:
        rows     = db.execute(sql, params).fetchall()
        products = []
        for row in rows:
            products.append({
                "id":              row.product_id,   # UUID string
                "name":            row.name,
                "brand":           row.brand,
                "slug":            row.slug,
                "cpu":             row.cpu,
                "gpu":             row.gpu,
                "ram_gb":          row.ram_gb,
                "storage_gb":      row.storage_gb,
                "storage_type":    row.storage_type,
                "price":           str(row.price),
                "original_price":  str(row.original_price) if row.original_price else None,
                "stock_quantity":  row.stock_quantity,
                "is_available":    row.is_available,
                "is_featured":     row.is_featured,
                "thumbnail_url":   row.thumbnail_url,
                "images":          row.images or [],
                "tags":            row.tags or [],
                "description":     row.description,
                "view_count":      row.view_count,
                "similarity_score": float(row.similarity_score),
                "_source":         "pgvector",
            })
        return products
    except Exception as e:
        logger.error(f"pgvector search failed: {e}")
        return []
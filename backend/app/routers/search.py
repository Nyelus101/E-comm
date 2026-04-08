# backend/app/routers/search.py
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional
import json
import redis

from app.database import get_db
from app.services.elasticsearch_service import search_products, get_index_stats
from app.services.search_analytics import log_search, get_top_searches, get_zero_result_searches
from app.dependencies import get_current_admin
from app.models.user import User
from app.config import settings

from app.services.ai_search_service import run_ai_search
from app.services.embedding_service import embed_all_products
from pydantic import BaseModel

class AISearchRequest(BaseModel):
    query: str

router = APIRouter(tags=["Search"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/search", summary="Standard search (Elasticsearch)")
async def standard_search(
    q: Optional[str]   = Query(default=None, description="Full-text search query"),
    brand: Optional[str]  = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    min_ram: Optional[int]     = Query(default=None, ge=1),
    max_ram: Optional[int]     = Query(default=None),
    min_storage: Optional[int] = Query(default=None, ge=1),
    gpu_keyword: Optional[str] = Query(default=None),
    is_featured: Optional[bool] = Query(default=None),
    sort_by: Optional[str] = Query(
        default="relevance",
        description="relevance | newest | price_asc | price_desc | popular | name_asc"
    ),
    page: int      = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """
    Full-text search powered by Elasticsearch.

    Supports fuzzy matching — typos like "Delll" still match "Dell".
    Text query searches: name, brand, CPU, GPU, description, tags.
    Filters narrow results without affecting relevance ranking.

    Examples:
    - GET /search?q=gaming+laptop&max_price=500000
    - GET /search?q=dell+xps&min_ram=16
    - GET /search?brand=HP&sort_by=price_asc
    - GET /search?q=rtx+4060&min_ram=16&max_price=800000
    """
    # ── Cache key ─────────────────────────────────────────────────────────────
    cache_key = (
        f"search:std:q{q}:b{brand}:p{min_price}-{max_price}:"
        f"ram{min_ram}-{max_ram}:stor{min_storage}:"
        f"gpu{gpu_keyword}:feat{is_featured}:sort{sort_by}:"
        f"pg{page}:ps{page_size}"
    )

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # ── Execute search ────────────────────────────────────────────────────────
    results = search_products(
        query=q,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_ram=min_ram,
        max_ram=max_ram,
        min_storage=min_storage,
        gpu_keyword=gpu_keyword,
        is_featured=is_featured,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )

    # ── Log analytics ─────────────────────────────────────────────────────────
    # Only log when there's an actual text query
    if q:
        log_search(
            query=q,
            results_count=results["total"],
            search_type="standard",
        )

    # ── Cache results ─────────────────────────────────────────────────────────
    redis_client.setex(
        cache_key,
        settings.SEARCH_CACHE_TTL,
        json.dumps(results, default=str),
    )

    return results


# ─── Admin: Search analytics ──────────────────────────────────────────────────

@router.get(
    "/admin/search/analytics",
    summary="Search analytics (admin)",
)
def search_analytics(
    current_admin: User = Depends(get_current_admin),
):
    """
    Returns search analytics for the admin dashboard.
    - Top searched queries
    - Queries that returned zero results (inventory signal)
    """
    return {
        "top_searches":          get_top_searches(limit=20),
        "zero_result_searches":  get_zero_result_searches(limit=20),
    }


@router.get(
    "/admin/search/index-stats",
    summary="Elasticsearch index stats (admin)",
)
def index_stats(
    current_admin: User = Depends(get_current_admin),
):
    """Returns document count and index health."""
    return get_index_stats()


@router.post(
    "/admin/search/reindex",
    summary="Reindex all products (admin)",
)
def reindex(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Re-indexes every product from PostgreSQL into Elasticsearch.
    Use this if the index gets out of sync — e.g. after bulk DB changes
    or after recreating the index.
    """
    from app.services.elasticsearch_service import reindex_all_products
    count = reindex_all_products(db)
    return {"message": f"Successfully indexed {count} products."}













@router.post("/search/ai", summary="AI-powered natural language search")
async def ai_search(
    request: AISearchRequest,
    db: Session = Depends(get_db),
):
    """
    Natural language search powered by Claude + pgvector + Elasticsearch.

    Send a plain English query and receive:
    - Ranked laptop results merged from vector similarity and keyword search
    - AI explanation for why each laptop matches your query
    - Summary of what was found

    Examples:
    - {"query": "gaming laptop under ₦400,000 with RTX GPU"}
    - {"query": "lightweight laptop for a computer science student"}
    - {"query": "best laptop for video editing under ₦600k"}
    - {"query": "cheap laptop for browsing and office work"}
    """
    if not request.query.strip():
        return {
            "query": "",
            "summary": "Please enter a search query.",
            "items": [],
            "total": 0,
            "source": "ai_hybrid",
        }

    return await run_ai_search(query=request.query.strip(), db=db)


@router.post(
    "/admin/search/embed-all",
    summary="Generate embeddings for all products (admin)",
)
async def embed_all(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Generates vector embeddings for all products that don't have one.
    Run this once after upgrading to Phase 7 to embed existing products.
    """
    count = await embed_all_products(db)
    return {"message": f"Generated embeddings for {count} products."}
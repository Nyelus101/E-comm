# backend/app/services/typesense_service.py
"""
Typesense Search Service — replaces elasticsearch_service.py completely.

Key Typesense design decisions:
  1. DOCUMENT ID: Typesense reserves 'id' as a built-in string field.
     We store our UUID as 'product_id' and use the slug as the Typesense 'id'
     because slugs are unique strings safe for Typesense's id field.

  2. VECTOR SEARCH: Typesense 0.25+ supports native vector search via float[]
     fields. We generate embeddings with Voyage AI and store them directly
     in Typesense documents. This avoids any external connector requirement.

  3. HYBRID SEARCH: Typesense supports hybrid search natively — one query
     can combine keyword BM25 ranking with vector similarity ranking using
     its built-in alpha parameter (0=pure keyword, 1=pure vector, 0.5=balanced).

  4. ANALYTICS: Typesense has a built-in Analytics Rules API that tracks
     search queries, no-result queries, and click-through rates natively.
     We supplement this with our existing Redis analytics layer.
"""
import typesense
import logging
from typing import Optional, List, Dict, Any
from app.config import settings
from app.services.embedding_service import (
    generate_embedding_sync,
    generate_query_embedding_sync,
    _build_product_text,
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "laptops"
EMBEDDING_DIM   = 1024


# ─── Client ───────────────────────────────────────────────────────────────────

def _get_client() -> typesense.Client:
    """
    Returns a Typesense client configured from settings.
    Called once — the client is lightweight and stateless.
    """
    return typesense.Client({
        "nodes": [{
            "host":     settings.TYPESENSE_HOST,
            "port":     str(settings.TYPESENSE_PORT),
            "protocol": settings.TYPESENSE_PROTOCOL,
        }],
        "api_key":          settings.TYPESENSE_API_KEY,
        "connection_timeout_seconds": 10,
        "retry_interval_seconds":     0.1,
        "num_retries":                3,
    })


# ─── Collection schema ────────────────────────────────────────────────────────

COLLECTION_SCHEMA = {
    "name": COLLECTION_NAME,
    "fields": [
        # ── Primary identifiers ──────────────────────────────────────────────
        # IMPORTANT: 'id' is Typesense's reserved internal field (must be string).
        # We store our UUID as 'product_id' and use slug as the Typesense id.
        # This is the correct Typesense pattern.
        {"name": "product_id",      "type": "string"},     # our UUID
        {"name": "slug",            "type": "string"},      # human-readable URL key

        # ── Text search fields ────────────────────────────────────────────────
        # facet:true = can be used for faceted filtering (brand filter, etc.)
        # index:true (default) = included in full-text search
        {"name": "name",            "type": "string"},
        {"name": "brand",           "type": "string",  "facet": True},
        {"name": "description",     "type": "string",  "optional": True},
        {"name": "cpu",             "type": "string"},
        {"name": "gpu",             "type": "string",  "optional": True},
        {"name": "storage_type",    "type": "string",  "optional": True, "facet": True},
        {"name": "operating_system","type": "string",  "optional": True, "facet": True},
        {"name": "tags",            "type": "string[]","facet": True},

        # ── Numeric fields for filtering and sorting ──────────────────────────
        {"name": "ram_gb",           "type": "int32",   "facet": True},
        {"name": "storage_gb",       "type": "int32"},
        {"name": "screen_size_inch", "type": "float",   "optional": True},
        {"name": "battery_life_hours","type": "float",  "optional": True},
        {"name": "weight_kg",        "type": "float",   "optional": True},
        {"name": "view_count",       "type": "int32",   "default": 0},

        # ── Price: stored as float for range queries ──────────────────────────
        {"name": "price",            "type": "float",   "facet": True},
        {"name": "original_price",   "type": "float",   "optional": True},

        # ── Boolean flags ─────────────────────────────────────────────────────
        {"name": "is_available",     "type": "bool",    "facet": True},
        {"name": "is_featured",      "type": "bool",    "facet": True},
        {"name": "stock_quantity",   "type": "int32"},

        # ── Media (stored but not indexed for search) ─────────────────────────
        {"name": "thumbnail_url",    "type": "string",  "optional": True, "index": False},
        {"name": "images",           "type": "string[]","optional": True, "index": False},

        # ── Timestamps ────────────────────────────────────────────────────────
        {"name": "created_at_ts",    "type": "int64"},   # Unix timestamp for sorting

        # ── Vector embedding field ────────────────────────────────────────────
        # float[] stores the Voyage AI 1024-dim embedding.
        # Typesense uses this for native vector + hybrid search.
        # num_dim must match the embedding model dimension exactly.
        {
            "name":    "embedding",
            "type":    "float[]",
            "num_dim": EMBEDDING_DIM,
            "optional": True,           # optional so products without embeddings still index
        },
    ],
    # Default sort: available products first, then by created date
    "default_sorting_field": "created_at_ts",
    # Enable Typesense's built-in Analytics Rules
    "enable_nested_fields": False,
}


# ─── Analytics rules schema ───────────────────────────────────────────────────

ANALYTICS_RULE_TOP_QUERIES = {
    "type":   "popular_queries",
    "params": {
        "source": {
            "collections": [COLLECTION_NAME],
        },
        "destination": {
            "collection": "laptops_top_queries",
        },
        "limit": 1000,
    },
}

ANALYTICS_RULE_NO_RESULTS = {
    "type":   "nohits_queries",
    "params": {
        "source": {
            "collections": [COLLECTION_NAME],
        },
        "destination": {
            "collection": "laptops_no_results_queries",
        },
        "limit": 1000,
    },
}


# ─── Initialisation ───────────────────────────────────────────────────────────

def create_collection() -> None:
    """
    Creates the Typesense collection and analytics rules.
    Safe to call on every restart — skips if already exists.
    """
    client = _get_client()

    # Create main collection
    try:
        client.collections[COLLECTION_NAME].retrieve()
        logger.info(f"Typesense collection '{COLLECTION_NAME}' already exists")
    except typesense.exceptions.ObjectNotFound:
        client.collections.create(COLLECTION_SCHEMA)
        logger.info(f"Typesense collection '{COLLECTION_NAME}' created")

    # Create analytics collections and rules
    # These power the "top searches" and "zero result searches" admin views
    _setup_analytics(client)


def _setup_analytics(client: typesense.Client) -> None:
    """Sets up Typesense native analytics collections and rules."""
    # Top queries analytics collection
    for coll_name in ["laptops_top_queries", "laptops_no_results_queries"]:
        try:
            client.collections[coll_name].retrieve()
        except typesense.exceptions.ObjectNotFound:
            try:
                client.collections.create({
                    "name": coll_name,
                    "fields": [
                        {"name": "q",     "type": "string"},
                        {"name": "count", "type": "int32"},
                    ],
                })
            except Exception as e:
                logger.warning(f"Could not create analytics collection {coll_name}: {e}")

    # Analytics rules
    for rule_name, rule_body in [
        ("laptops-top-queries",    ANALYTICS_RULE_TOP_QUERIES),
        ("laptops-no-results",     ANALYTICS_RULE_NO_RESULTS),
    ]:
        try:
            client.analytics.rules[rule_name].retrieve()
        except Exception:
            try:
                client.analytics.rules.create({**rule_body, "name": rule_name})
                logger.info(f"Analytics rule '{rule_name}' created")
            except Exception as e:
                logger.warning(f"Could not create analytics rule {rule_name}: {e}")


# ─── Document helpers ─────────────────────────────────────────────────────────

def _product_to_document(product, embedding: Optional[List[float]] = None) -> dict:
    """
    Converts a SQLAlchemy Product ORM object to a Typesense document dict.

    Critical mapping:
    - Typesense 'id' = product.slug (unique string, safe for Typesense id field)
    - 'product_id'  = str(product.id) (our UUID, stored for lookup)

    We don't use the UUID as Typesense id because Typesense id must be a
    plain string without hyphens in some operations, and slug is cleaner.
    """
    doc: Dict[str, Any] = {
        # Typesense id = slug (unique, human-readable string)
        "id":               product.slug,
        "product_id":       str(product.id),
        "slug":             product.slug,
        "name":             product.name,
        "brand":            product.brand,
        "description":      product.description or "",
        "cpu":              product.cpu,
        "gpu":              product.gpu or "",
        "ram_gb":           product.ram_gb,
        "storage_gb":       product.storage_gb,
        "storage_type":     product.storage_type or "",
        "screen_size_inch": float(product.screen_size_inch) if product.screen_size_inch else None,
        "battery_life_hours": float(product.battery_life_hours) if product.battery_life_hours else None,
        "weight_kg":        float(product.weight_kg) if product.weight_kg else None,
        "operating_system": product.operating_system or "",
        "price":            float(product.price),
        "original_price":   float(product.original_price) if product.original_price else None,
        "stock_quantity":   product.stock_quantity,
        "is_available":     product.is_available,
        "is_featured":      product.is_featured,
        "tags":             product.tags or [],
        "images":           product.images or [],
        "thumbnail_url":    product.thumbnail_url or "",
        "view_count":       product.view_count or 0,
        "created_at_ts":    int(product.created_at.timestamp()) if product.created_at else 0,
    }

    # Attach embedding if provided
    # If not provided, check if the product already has one in PostgreSQL
    if embedding is not None:
        doc["embedding"] = embedding
    elif product.embedding is not None:
        # Convert from pgvector format to plain list
        doc["embedding"] = list(product.embedding)

    # Remove None values for optional fields — Typesense prefers omitted
    # over null for optional fields to avoid type errors
    optional_fields = ["screen_size_inch", "battery_life_hours", "weight_kg", "original_price"]
    for field in optional_fields:
        if doc.get(field) is None:
            doc.pop(field, None)

    return doc


# ─── Index operations ─────────────────────────────────────────────────────────

def index_product(product, embedding: Optional[List[float]] = None) -> bool:
    """
    Upserts a product into Typesense.
    Called on product create, update, and stock change.

    The embedding parameter allows callers to pass an already-generated
    embedding to avoid calling Voyage AI twice (once for pgvector, once here).
    If not passed, we use whatever is on product.embedding (pgvector column).
    """
    client = _get_client()
    try:
        doc = _product_to_document(product, embedding)
        # upsert = insert or update — idempotent
        client.collections[COLLECTION_NAME].documents.upsert(doc)
        return True
    except Exception as e:
        logger.error(f"Typesense index failed for {product.slug}: {e}")
        return False


def delete_product_from_index(slug: str) -> bool:
    """
    Removes a product from Typesense by slug (our Typesense document id).
    Called when a product is deleted.
    """
    client = _get_client()
    try:
        client.collections[COLLECTION_NAME].documents[slug].delete()
        return True
    except typesense.exceptions.ObjectNotFound:
        return True    # Already gone — that's fine
    except Exception as e:
        logger.error(f"Typesense delete failed for slug {slug}: {e}")
        return False


# ─── Search ───────────────────────────────────────────────────────────────────

def search_products(
    query:        str   = None,
    brand:        str   = None,
    min_price:    float = None,
    max_price:    float = None,
    min_ram:      int   = None,
    max_ram:      int   = None,
    min_storage:  int   = None,
    gpu_keyword:  str   = None,
    is_featured:  bool  = None,
    sort_by:      str   = "relevance",
    page:         int   = 1,
    page_size:    int   = 20,
) -> dict:
    """
    Full-text keyword search with structured filters.
    Uses Typesense's BM25 ranking — the standard search for the Standard Search tab.

    Filter syntax: Typesense uses filter_by strings like:
      "price:>=[100000] && price:<=[500000] && ram_gb:>=[16]"
    """
    client = _get_client()

    # ── Build filter string ───────────────────────────────────────────────────
    filters = ["is_available:=true"]

    if brand:
        # Typesense exact match on facet field (case-insensitive by default)
        filters.append(f"brand:={brand}")

    if min_price is not None:
        filters.append(f"price:>={int(min_price)}")

    if max_price is not None:
        filters.append(f"price:<={int(max_price)}")

    if min_ram is not None:
        filters.append(f"ram_gb:>={min_ram}")

    if max_ram is not None:
        filters.append(f"ram_gb:<={max_ram}")

    if min_storage is not None:
        filters.append(f"storage_gb:>={min_storage}")

    if gpu_keyword:
        # For non-facet text fields we use the search query, not filter_by
        # We'll fold gpu_keyword into the main query below
        pass

    if is_featured is not None:
        filters.append(f"is_featured:={str(is_featured).lower()}")

    filter_by = " && ".join(filters)

    # ── Build sort string ─────────────────────────────────────────────────────
    sort_map = {
        "relevance":  "_text_match:desc,view_count:desc",
        "newest":     "created_at_ts:desc",
        "price_asc":  "price:asc",
        "price_desc": "price:desc",
        "popular":    "view_count:desc,_text_match:desc",
        "name_asc":   "name:asc",
    }
    sort_by_str = sort_map.get(sort_by, "_text_match:desc,view_count:desc")

    # ── Build search query ────────────────────────────────────────────────────
    # Fold gpu_keyword into query if set
    search_query = query or "*"    # "*" = match-all in Typesense
    if gpu_keyword and query:
        search_query = f"{query} {gpu_keyword}"
    elif gpu_keyword:
        search_query = gpu_keyword

    search_params = {
        "q":                   search_query,
        "query_by":            "name,brand,cpu,gpu,description,tags",
        # Boost weights: name most important, tags also highly weighted
        "query_by_weights":    "4,3,2,2,1,3",
        "filter_by":           filter_by,
        "sort_by":             sort_by_str,
        "page":                page,
        "per_page":            page_size,
        # highlight_full_fields shows the full field with <mark> wrapping
        "highlight_full_fields": "name,description",
        "highlight_start_tag":   "<mark>",
        "highlight_end_tag":     "</mark>",
        # typo tolerance: 1 typo allowed for words ≥6 chars, 2 for ≥12
        "num_typos":           "2",
        "typo_tokens_threshold": 1,
        # prefix search: "dell x" matches "Dell XPS"
        "prefix":              "true",
    }

    try:
        result = client.collections[COLLECTION_NAME].documents.search(search_params)
    except Exception as e:
        logger.error(f"Typesense search failed: {e}")
        return {
            "items": [], "total": 0, "page": page,
            "page_size": page_size, "total_pages": 0,
            "source": "typesense",
        }

    total      = result["found"]
    total_pages = (total + page_size - 1) // page_size

    items = []
    for hit in result["hits"]:
        doc = hit["document"].copy()

        # Remap Typesense 'id' (slug) back — consumers expect 'id' = UUID
        # We expose product_id as 'id' for frontend compatibility
        doc["id"] = doc.get("product_id", doc["id"])

        doc["highlights"] = {
            field["field"]: field.get("snippet", "")
            for field in hit.get("highlights", [])
        }
        doc["score"] = hit.get("text_match", 0)

        # Remove the raw embedding vector from response — large and not needed
        doc.pop("embedding", None)

        items.append(doc)

    return {
        "items":       items,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
        "source":      "typesense",
    }


def hybrid_search_typesense(
    query_text:      str,
    query_embedding: List[float],
    brand:           Optional[str]   = None,
    min_price:       Optional[float] = None,
    max_price:       Optional[float] = None,
    min_ram:         Optional[int]   = None,
    gpu_keyword:     Optional[str]   = None,
    limit:           int             = 15,
) -> List[dict]:
    """
    Typesense native hybrid search — combines BM25 keyword ranking with
    vector similarity in a single query using Typesense's vector_query parameter.

    alpha controls the blend:
      alpha=0.0 → pure keyword BM25
      alpha=0.5 → equal weight (default for hybrid)
      alpha=1.0 → pure vector

    We use alpha=0.6 to slightly favour semantic understanding while
    keeping keyword precision for exact model names like "MacBook Air M3".

    This replaces the separate ES + pgvector calls we had before.
    One Typesense query does the job of two.
    """
    client = _get_client()

    # Build filters (same as standard search)
    filters = ["is_available:=true"]
    if brand:           filters.append(f"brand:={brand}")
    if min_price:       filters.append(f"price:>={int(min_price)}")
    if max_price:       filters.append(f"price:<={int(max_price)}")
    if min_ram:         filters.append(f"ram_gb:>={min_ram}")
    if gpu_keyword:     query_text = f"{query_text} {gpu_keyword}"

    filter_by = " && ".join(filters)

    # Format the embedding as Typesense expects: comma-separated floats
    embedding_str = ",".join(str(x) for x in query_embedding)

    search_params = {
        "q":             query_text,
        "query_by":      "name,brand,cpu,gpu,description,tags,embedding",
        "query_by_weights": "4,3,2,2,1,3,2",
        "filter_by":     filter_by,
        "sort_by":       "_text_match:desc,_vector_distance:asc",
        "per_page":      limit,
        "page":          1,
        # Native vector search via vector_query
        "vector_query":  f"embedding:([{embedding_str}], alpha:0.6, k:{limit})",
        "prefix":        "true",
        "num_typos":     "2",
    }

    try:
        result = client.collections[COLLECTION_NAME].documents.search(search_params)
        hits   = result.get("hits", [])
    except Exception as e:
        logger.error(f"Typesense hybrid search failed: {e}")
        # Fallback to pure keyword search if vector search fails
        # (e.g. if product has no embedding yet)
        return _keyword_fallback(query_text, filter_by, limit)

    products = []
    for hit in hits:
        doc = hit["document"].copy()
        doc["id"] = doc.get("product_id", doc["id"])   # remap id

        # Hybrid score: blend text_match rank with vector distance rank
        text_match      = hit.get("text_match", 0)
        vector_distance = hit.get("vector_distance", 1.0)
        vector_score    = 1.0 - vector_distance          # convert distance to similarity

        doc["hybrid_score"]    = (0.6 * vector_score) + (0.4 * (text_match / 1_000_000))
        doc["vector_score"]    = vector_score
        doc.pop("embedding", None)

        products.append(doc)

    return products


def _keyword_fallback(query: str, filter_by: str, limit: int) -> List[dict]:
    """
    Pure keyword fallback used when vector search fails.
    Ensures we always return something.
    """
    client = _get_client()
    try:
        result = client.collections[COLLECTION_NAME].documents.search({
            "q":         query,
            "query_by":  "name,brand,cpu,gpu,description,tags",
            "filter_by": filter_by,
            "per_page":  limit,
        })
        products = []
        for hit in result.get("hits", []):
            doc = hit["document"].copy()
            doc["id"] = doc.get("product_id", doc["id"])
            doc.pop("embedding", None)
            products.append(doc)
        return products
    except Exception as e:
        logger.error(f"Keyword fallback also failed: {e}")
        return []


# ─── Reindex ──────────────────────────────────────────────────────────────────

def reindex_all_products(db) -> int:
    """
    Reindexes all products from PostgreSQL into Typesense.
    Uses import (batch upsert) for efficiency.
    """
    from app.models.product import Product

    products = db.query(Product).all()
    if not products:
        return 0

    docs = []
    for product in products:
        embedding = list(product.embedding) if product.embedding is not None else None
        doc       = _product_to_document(product, embedding)
        docs.append(doc)

    client = _get_client()
    try:
        # Typesense batch import — much faster than individual upserts
        results = client.collections[COLLECTION_NAME].documents.import_(
            docs,
            {"action": "upsert"},
        )

        success_count = sum(
            1 for r in results
            if isinstance(r, dict) and r.get("success", False)
        )
        logger.info(f"Reindexed {success_count}/{len(docs)} products into Typesense")
        return success_count

    except Exception as e:
        logger.error(f"Typesense batch import failed: {e}")
        return 0


# ─── Index stats ──────────────────────────────────────────────────────────────

def get_index_stats() -> dict:
    """Returns collection stats for the admin dashboard."""
    client = _get_client()
    try:
        info = client.collections[COLLECTION_NAME].retrieve()
        return {
            "document_count": info.get("num_documents", 0),
            "status":         "healthy",
            "collection":     COLLECTION_NAME,
        }
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}


# ─── Typesense-native analytics ───────────────────────────────────────────────

def get_top_searches_typesense(limit: int = 20) -> List[dict]:
    """
    Retrieves top searches from Typesense's built-in analytics collection.
    Supplements our Redis-based analytics.
    """
    client = _get_client()
    try:
        result = client.collections["laptops_top_queries"].documents.search({
            "q":        "*",
            "query_by": "q",
            "sort_by":  "count:desc",
            "per_page": limit,
        })
        return [
            {"query": hit["document"]["q"], "count": hit["document"]["count"]}
            for hit in result.get("hits", [])
        ]
    except Exception as e:
        logger.warning(f"Could not fetch Typesense top queries: {e}")
        return []


def get_no_results_searches_typesense(limit: int = 20) -> List[dict]:
    """Retrieves zero-result queries from Typesense's analytics."""
    client = _get_client()
    try:
        result = client.collections["laptops_no_results_queries"].documents.search({
            "q":        "*",
            "query_by": "q",
            "sort_by":  "count:desc",
            "per_page": limit,
        })
        return [
            {"query": hit["document"]["q"], "count": hit["document"]["count"]}
            for hit in result.get("hits", [])
        ]
    except Exception as e:
        logger.warning(f"Could not fetch Typesense no-results queries: {e}")
        return []
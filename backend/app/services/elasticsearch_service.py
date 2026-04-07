# backend/app/services/elasticsearch_service.py
from elasticsearch import Elasticsearch, NotFoundError
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# ─── Client ───────────────────────────────────────────────────────────────────
# Single client instance shared across the app.
# retry_on_timeout and max_retries handle transient network blips.
es = Elasticsearch(
    settings.ELASTICSEARCH_URL,
    retry_on_timeout=True,
    max_retries=3,
)

INDEX_NAME = "laptops"


# ─── Index mapping ────────────────────────────────────────────────────────────
# The mapping tells Elasticsearch how to treat each field.
#
# "text"    — analysed for full-text search (tokenised, stemmed, lowercased)
#             Use for: name, description, cpu — anything you want fuzzy matching on
#
# "keyword" — exact match only, used for filters and aggregations
#             Use for: brand, storage_type, os — things you filter by, not search by
#             A field can have BOTH (text for search, keyword for filtering) via
#             the "fields" sub-property — see "name" and "brand" below
#
# "float" / "integer" — numeric range queries (price, ram_gb, etc.)
#
# "boolean" — is_available filter
#
# Why define this explicitly instead of letting ES auto-detect?
# Auto-detection maps everything as text, which means you can't do range
# queries on price, can't sort by price, and aggregations don't work.
# Explicit mappings give us full control.

INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "id":               {"type": "keyword"},
            "name": {
                "type": "text",
                "analyzer": "english",            # stemming: "gaming" matches "game"
                "fields": {
                    "keyword": {"type": "keyword"} # exact match sub-field for sorting
                }
            },
            "brand": {
                "type": "text",
                "analyzer": "standard",
                "fields": {
                    "keyword": {"type": "keyword"}
                }
            },
            "slug":             {"type": "keyword"},
            "description":      {"type": "text", "analyzer": "english"},
            "cpu":              {"type": "text", "analyzer": "standard"},
            "gpu":              {"type": "text", "analyzer": "standard"},
            "ram_gb":           {"type": "integer"},
            "storage_gb":       {"type": "integer"},
            "storage_type":     {"type": "keyword"},
            "screen_size_inch": {"type": "float"},
            "price":            {"type": "float"},
            "original_price":   {"type": "float"},
            "stock_quantity":   {"type": "integer"},
            "is_available":     {"type": "boolean"},
            "is_featured":      {"type": "boolean"},
            "operating_system": {"type": "keyword"},
            "tags":             {"type": "keyword"},   # array of keywords
            "thumbnail_url":    {"type": "keyword", "index": False},  # stored but not searchable
            "images":           {"type": "keyword", "index": False},
            "view_count":       {"type": "integer"},
            "created_at":       {"type": "date"},
        }
    },
    "settings": {
        "number_of_shards": 1,       # single node — one shard is fine
        "number_of_replicas": 0,     # no replicas for dev (set to 1 in prod)
        "analysis": {
            "analyzer": {
                # Custom analyser that lowercases and removes common words
                # "the Dell laptop" → ["dell", "laptop"]
                "standard": {
                    "type": "standard",
                    "stopwords": "_english_"
                }
            }
        }
    }
}


def create_index():
    """
    Creates the Elasticsearch index with our mapping.
    Called once at startup. Safe to call multiple times — skips if already exists.
    """
    try:
        if not es.indices.exists(index=INDEX_NAME):
            es.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
            logger.info(f"Elasticsearch index '{INDEX_NAME}' created")
        else:
            logger.info(f"Elasticsearch index '{INDEX_NAME}' already exists")
    except Exception as e:
        logger.error(f"Failed to create ES index: {e}")


def index_product(product) -> bool:
    """
    Adds or updates a product in the Elasticsearch index.

    Called whenever a product is:
    - Created (POST /admin/products)
    - Updated (PUT /admin/products/{id})
    - Stock changed (PATCH /admin/products/{id}/stock)

    We use the product's UUID as the ES document ID.
    This means re-indexing the same product is safe — it's an upsert.
    """
    try:
        doc = {
            "id":               str(product.id),
            "name":             product.name,
            "brand":            product.brand,
            "slug":             product.slug,
            "description":      product.description or "",
            "cpu":              product.cpu,
            "gpu":              product.gpu or "",
            "ram_gb":           product.ram_gb,
            "storage_gb":       product.storage_gb,
            "storage_type":     product.storage_type or "",
            "screen_size_inch": product.screen_size_inch,
            "price":            float(product.price),
            "original_price":   float(product.original_price) if product.original_price else None,
            "stock_quantity":   product.stock_quantity,
            "is_available":     product.is_available,
            "is_featured":      product.is_featured,
            "operating_system": product.operating_system or "",
            "tags":             product.tags or [],
            "thumbnail_url":    product.thumbnail_url or "",
            "images":           product.images or [],
            "view_count":       product.view_count,
            "created_at":       product.created_at.isoformat() if product.created_at else None,
        }

        es.index(
            index=INDEX_NAME,
            id=str(product.id),   # use product UUID as ES doc ID
            document=doc,
        )
        return True

    except Exception as e:
        logger.error(f"Failed to index product {product.id}: {e}")
        return False


def delete_product_from_index(product_id: str) -> bool:
    """
    Removes a product from the Elasticsearch index.
    Called when a product is deleted via DELETE /admin/products/{id}.
    """
    try:
        es.delete(index=INDEX_NAME, id=product_id)
        return True
    except NotFoundError:
        # Already not in index — that's fine
        return True
    except Exception as e:
        logger.error(f"Failed to delete product {product_id} from ES: {e}")
        return False


def search_products(
    query: str = None,
    brand: str = None,
    min_price: float = None,
    max_price: float = None,
    min_ram: int = None,
    max_ram: int = None,
    min_storage: int = None,
    gpu_keyword: str = None,
    is_featured: bool = None,
    sort_by: str = "relevance",
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """
    Executes a search against Elasticsearch.

    Query structure:
    - bool query with must + filter clauses
    - "must" contains the full-text multi_match (affects relevance score)
    - "filter" contains structured filters (exact/range — doesn't affect score)

    Why separate must vs filter?
    Filters are cached by ES and are faster. Relevance scoring only matters
    for the text query, not for "price < 500000".

    Returns a dict matching our standard ProductListResponse shape so
    the frontend doesn't need to know whether results came from ES or Postgres.
    """
    # ── Build the query ───────────────────────────────────────────────────────
    must_clauses = []
    filter_clauses = [
        {"term": {"is_available": True}}   # always exclude unavailable products
    ]

    # Full-text search across multiple fields with different boost weights
    # Boosting means: a match in "name" is worth 3x more than in "description"
    if query:
        must_clauses.append({
            "multi_match": {
                "query": query,
                "fields": [
                    "name^3",         # 3x boost — name match most important
                    "brand^2",        # 2x boost
                    "cpu^2",
                    "gpu^1.5",
                    "description^1",  # base relevance
                    "tags^2",
                ],
                "type": "best_fields",
                # fuzziness: AUTO allows 1-2 character typos
                # "ganing" still matches "gaming"
                "fuzziness": "AUTO",
                "minimum_should_match": "75%",
            }
        })

    # Structured filters — these narrow results without affecting relevance
    if brand:
        # match_phrase_prefix lets "del" match "Dell"
        filter_clauses.append({
            "match_phrase_prefix": {"brand": brand}
        })

    if min_price is not None or max_price is not None:
        price_range = {}
        if min_price is not None:
            price_range["gte"] = min_price
        if max_price is not None:
            price_range["lte"] = max_price
        filter_clauses.append({"range": {"price": price_range}})

    if min_ram is not None:
        filter_clauses.append({"range": {"ram_gb": {"gte": min_ram}}})

    if max_ram is not None:
        filter_clauses.append({"range": {"ram_gb": {"lte": max_ram}}})

    if min_storage is not None:
        filter_clauses.append({"range": {"storage_gb": {"gte": min_storage}}})

    if gpu_keyword:
        filter_clauses.append({
            "match": {"gpu": {"query": gpu_keyword, "fuzziness": "AUTO"}}
        })

    if is_featured is not None:
        filter_clauses.append({"term": {"is_featured": is_featured}})

    # ── Build sort ────────────────────────────────────────────────────────────
    sort_options = {
        "relevance":   ["_score"],                              # ES relevance score
        "newest":      [{"created_at": "desc"}],
        "price_asc":   [{"price": "asc"}],
        "price_desc":  [{"price": "desc"}],
        "popular":     [{"view_count": "desc"}],
        "name_asc":    [{"name.keyword": "asc"}],
    }
    sort = sort_options.get(sort_by, ["_score"])

    # ── Assemble full query body ───────────────────────────────────────────────
    query_body = {
        "query": {
            "bool": {
                "must":   must_clauses if must_clauses else [{"match_all": {}}],
                "filter": filter_clauses,
            }
        },
        "sort": sort,
        "from": (page - 1) * page_size,
        "size": page_size,
        # highlight: wraps matching text in <em> tags so frontend can show snippets
        "highlight": {
            "fields": {
                "name":        {"number_of_fragments": 0},
                "description": {"fragment_size": 150, "number_of_fragments": 1},
            },
            "pre_tags":  ["<mark>"],
            "post_tags": ["</mark>"],
        },
    }

    # ── Execute ───────────────────────────────────────────────────────────────
    try:
        response = es.search(index=INDEX_NAME, body=query_body)
    except Exception as e:
        logger.error(f"Elasticsearch search failed: {e}")
        # Return empty result rather than crashing the endpoint
        return {
            "items": [], "total": 0,
            "page": page, "page_size": page_size, "total_pages": 0,
            "source": "elasticsearch",
        }

    # ── Shape the response ────────────────────────────────────────────────────
    hits = response["hits"]
    total = hits["total"]["value"]
    total_pages = (total + page_size - 1) // page_size

    items = []
    for hit in hits["hits"]:
        source = hit["_source"]
        # Attach highlight snippets if available
        source["highlights"] = hit.get("highlight", {})
        source["score"] = hit.get("_score")
        items.append(source)

    return {
        "items":       items,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
        "source":      "elasticsearch",
    }


def reindex_all_products(db) -> int:
    """
    Re-indexes every product in the database into Elasticsearch.
    Called via a management endpoint or manually when the index is stale.

    Returns the count of successfully indexed products.
    """
    from app.models.product import Product

    products = db.query(Product).all()
    success_count = 0

    for product in products:
        if index_product(product):
            success_count += 1

    logger.info(f"Reindexed {success_count}/{len(products)} products")
    return success_count


def get_index_stats() -> dict:
    """
    Returns index statistics for the admin dashboard.
    Useful to verify the index is healthy and up-to-date.
    """
    try:
        stats = es.indices.stats(index=INDEX_NAME)
        count = es.count(index=INDEX_NAME)
        return {
            "document_count":   count["count"],
            "index_size_bytes": stats["_all"]["primaries"]["store"]["size_in_bytes"],
            "status":           "healthy",
        }
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
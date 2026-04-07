# backend/app/services/search_analytics.py
import redis
import json
from datetime import datetime
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Redis keys
SEARCH_LOG_KEY   = "search:log"          # list of recent searches
SEARCH_COUNT_KEY = "search:counts"       # sorted set: query → count
MAX_LOG_SIZE     = 1000                  # keep last 1000 searches


def log_search(query: str, results_count: int, search_type: str = "standard"):
    """
    Logs a search query.

    Two data structures:
    1. A Redis list (search:log) — chronological log of searches.
       The frontend "recent searches" feature can read from this.

    2. A Redis sorted set (search:counts) — query → hit count.
       The sorted set score IS the count, so ZREVRANGE gives top queries instantly.
       This is how "trending searches" works.
    """
    if not query or not query.strip():
        return

    query = query.strip().lower()

    # Log entry with metadata
    entry = json.dumps({
        "query":         query,
        "results_count": results_count,
        "search_type":   search_type,
        "timestamp":     datetime.utcnow().isoformat(),
    })

    # Push to list, trim to MAX_LOG_SIZE
    redis_client.lpush(SEARCH_LOG_KEY, entry)
    redis_client.ltrim(SEARCH_LOG_KEY, 0, MAX_LOG_SIZE - 1)

    # Increment count in sorted set
    # ZINCRBY is atomic — safe under concurrent requests
    redis_client.zincrby(SEARCH_COUNT_KEY, 1, query)


def get_top_searches(limit: int = 10) -> list:
    """
    Returns the most-searched queries.
    Used in the admin dashboard and optionally in the frontend as suggestions.
    """
    # ZREVRANGE returns members sorted by score descending, with scores
    results = redis_client.zrevrange(
        SEARCH_COUNT_KEY,
        0, limit - 1,
        withscores=True
    )
    return [{"query": q, "count": int(score)} for q, score in results]


def get_recent_searches(limit: int = 20) -> list:
    """Returns the most recent individual searches."""
    raw = redis_client.lrange(SEARCH_LOG_KEY, 0, limit - 1)
    return [json.loads(entry) for entry in raw]


def get_zero_result_searches(limit: int = 10) -> list:
    """
    Returns recent searches that returned no results.
    Extremely useful for inventory decisions — if people keep searching
    for "MacBook Pro" and you don't stock it, that's signal.
    """
    raw = redis_client.lrange(SEARCH_LOG_KEY, 0, MAX_LOG_SIZE - 1)
    zero_results = []
    for entry in raw:
        data = json.loads(entry)
        if data.get("results_count") == 0:
            zero_results.append(data)
        if len(zero_results) >= limit:
            break
    return zero_results
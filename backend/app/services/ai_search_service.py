# backend/app/services/ai_search_service.py
import json
import logging
from typing import TypedDict, Optional

from groq import Groq

# ── CLAUDE ALTERNATIVE (uncomment to switch back) ──────────────────────────
# import anthropic
# anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
# ──────────────────────────────────────────────────────────────────────────

from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
import redis

from app.services.embedding_service import generate_query_embedding
from app.services.vector_search_service import vector_search
from app.services.elasticsearch_service import search_products as es_search
from app.services.search_analytics import log_search
from app.config import settings

logger = logging.getLogger(__name__)

redis_client  = redis.from_url(settings.REDIS_URL, decode_responses=True)
groq_client   = Groq(api_key=settings.GROQ_API_KEY)

# ── Model selection ──────────────────────────────────────────────────────────
# llama-3.3-70b-versatile — best Groq model for structured JSON tasks.
# Much better at following JSON schemas than the 8b model.
# Still completely free on Groq's free tier.
#
# Other good Groq options:
#   "llama-3.1-70b-versatile"  — slightly older, also very capable
#   "llama-3.1-8b-instant"     — fastest, weakest at JSON structure
#   "mixtral-8x7b-32768"       — good context window, solid reasoning
#
# ── CLAUDE ALTERNATIVE ──────────────────────────────────────────────────────
# FAST_MODEL = "claude-3-5-haiku-20241022"  # intent parsing + explanations
# ────────────────────────────────────────────────────────────────────────────
GROQ_MODEL = "llama-3.3-70b-versatile"


def _call_groq(prompt: str, max_tokens: int = 1024) -> str:
    """
    Shared helper that calls Groq and returns the response text.
    Centralising the call makes it easy to swap models or add retries.

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    def _call_claude(prompt: str, max_tokens: int = 1024) -> str:
        message = anthropic_client.messages.create(
            model=FAST_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    ─────────────────────────────────────────────────────────────────────────
    """
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.1,      # low temperature = more consistent JSON output
    )
    return response.choices[0].message.content.strip()


def _parse_json_response(raw: str) -> dict:
    """
    Safely extracts JSON from a model response.
    LLMs sometimes wrap JSON in markdown code fences — this strips them.
    """
    text = raw.strip()

    # Strip ```json ... ``` or ``` ... ``` fences
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].strip() == "```" else lines
        text = "\n".join(lines).strip()

    return json.loads(text)


# ─── Agent State ──────────────────────────────────────────────────────────────

class AISearchState(TypedDict):
    raw_query:          str
    parsed_intent:      dict
    search_query:       str
    vector_results:     list
    es_results:         list
    merged_results:     list
    explained_results:  list
    summary:            str
    error:              Optional[str]
    from_cache:         bool


# ─── Node 1: Intent Parser ────────────────────────────────────────────────────

def parse_intent(state: AISearchState) -> AISearchState:
    """
    Extracts structured requirements from the raw natural language query.

    Uses Groq (llama-3.3-70b-versatile) to parse:
    - Budget constraints (₦ amounts, "cheap", "under X")
    - Use cases (gaming, programming, student, video editing)
    - Hardware requirements (RAM, GPU, storage)
    - Brand preferences

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    Same prompt — just replace _call_groq() with _call_claude().
    Claude 3.5 Haiku is slightly more reliable at strict JSON adherence
    but Llama 3.3 70b handles this prompt well with temperature=0.1.
    ─────────────────────────────────────────────────────────────────────────
    """
    query = state["raw_query"]

    prompt = f"""You are an AI assistant for a Nigerian laptop store.
Extract structured search requirements from this customer query.

Query: "{query}"

Respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.
Just the raw JSON starting with {{ and ending with }}.

{{
  "budget_max": <max price in Naira as integer, or null if not mentioned>,
  "budget_min": <min price in Naira as integer, or null>,
  "use_cases": <list of strings, e.g. ["gaming", "programming", "video editing", "student"]>,
  "gpu_required": <true if user explicitly needs dedicated GPU, else false>,
  "gpu_keyword": <specific GPU string mentioned e.g. "RTX" or "GTX" or null>,
  "min_ram": <minimum RAM in GB as integer, or null>,
  "min_storage": <minimum storage in GB as integer, or null>,
  "brand_preference": <specific brand string mentioned or null>,
  "portability_important": <true if user mentions lightweight or portable, else false>,
  "battery_important": <true if user mentions battery life, else false>,
  "search_query": <a clean 3-8 word English search query capturing the core intent>,
  "user_context": <one sentence describing who the user is or their situation, or empty string>
}}

Conversion rules:
- ₦400k or 400k = 400000
- ₦1.5m or 1.5m = 1500000
- "programming" or "coding" or "developer" implies min_ram of 16
- "gaming" implies gpu_required true
- "student" with "cheap" or "budget" implies budget_max 300000 if not specified
- "video editing" implies min_ram 16 and gpu_required true
- If no budget mentioned, budget_max is null"""

    try:
        raw = _call_groq(prompt, max_tokens=512)
        parsed = _parse_json_response(raw)

    except json.JSONDecodeError as e:
        logger.error(f"Intent JSON parse failed: {e} | Raw: {raw!r}")
        # Graceful fallback — treat full query as plain search
        parsed = {
            "budget_max":            None,
            "budget_min":            None,
            "use_cases":             [],
            "gpu_required":          False,
            "gpu_keyword":           None,
            "min_ram":               None,
            "min_storage":           None,
            "brand_preference":      None,
            "portability_important": False,
            "battery_important":     False,
            "search_query":          query,
            "user_context":          "",
        }
    except Exception as e:
        logger.error(f"Intent parsing failed: {e}")
        parsed = {
            "budget_max":            None,
            "budget_min":            None,
            "use_cases":             [],
            "gpu_required":          False,
            "gpu_keyword":           None,
            "min_ram":               None,
            "min_storage":           None,
            "brand_preference":      None,
            "portability_important": False,
            "battery_important":     False,
            "search_query":          query,
            "user_context":          "",
        }

    return {
        **state,
        "parsed_intent": parsed,
        "search_query":  parsed.get("search_query", query),
    }


# ─── Node 2: Hybrid Search ────────────────────────────────────────────────────

async def hybrid_search(state: AISearchState, db: Session) -> AISearchState:
    """
    Runs vector search (pgvector) and keyword search (Elasticsearch) in parallel.
    Filters from parsed_intent are applied to both search engines.
    """
    intent = state["parsed_intent"]
    sq     = state["search_query"]

    max_price = intent.get("budget_max")
    min_price = intent.get("budget_min")
    min_ram   = intent.get("min_ram")
    brand     = intent.get("brand_preference")
    gpu_kw    = intent.get("gpu_keyword")

    # ── Vector search ─────────────────────────────────────────────────────────
    query_embedding = await generate_query_embedding(sq)
    vec_results = []
    if query_embedding:
        vec_results = vector_search(
            query_embedding=query_embedding,
            db=db,
            limit=15,
            min_price=min_price,
            max_price=max_price,
            min_ram=min_ram,
            brand=brand,
        )

    # ── Elasticsearch search ───────────────────────────────────────────────────
    es_result = es_search(
        query=sq,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_ram=min_ram,
        gpu_keyword=gpu_kw,
        page=1,
        page_size=15,
        sort_by="relevance",
    )
    es_results = es_result.get("items", [])

    return {
        **state,
        "vector_results": vec_results,
        "es_results":     es_results,
    }


# ─── Node 3: Reciprocal Rank Fusion ──────────────────────────────────────────

def merge_results(state: AISearchState) -> AISearchState:
    """
    Merges vector and ES results using Reciprocal Rank Fusion (RRF).

    RRF score = Σ 1 / (k + rank)  where k = 60
    Products appearing in both lists get higher combined scores.
    Scale-invariant — works regardless of how ES and vector scores differ.
    """
    vec_results = state["vector_results"]
    es_results  = state["es_results"]

    k = 60
    scores:      dict[str, float] = {}
    product_map: dict[str, dict]  = {}

    for rank, product in enumerate(vec_results):
        pid = product["id"]
        scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
        product_map[pid] = product

    for rank, product in enumerate(es_results):
        pid = product["id"]
        scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
        if pid not in product_map:
            product_map[pid] = product

    sorted_ids = sorted(scores, key=lambda pid: scores[pid], reverse=True)
    top_ids    = sorted_ids[:8]

    merged = []
    for pid in top_ids:
        product = product_map[pid].copy()
        product["rrf_score"] = scores[pid]
        merged.append(product)

    return {**state, "merged_results": merged}


# ─── Node 4: AI Explanation ───────────────────────────────────────────────────

def generate_explanations(state: AISearchState) -> AISearchState:
    """
    Uses Groq to explain why each result matches the user's query.

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    Same prompt — replace _call_groq() with _call_claude().
    Claude tends to produce slightly more natural-sounding explanations
    but Llama 3.3 70b is more than adequate for this task.
    ─────────────────────────────────────────────────────────────────────────
    """
    products = state["merged_results"]
    intent   = state["parsed_intent"]
    query    = state["raw_query"]

    if not products:
        return {
            **state,
            "explained_results": [],
            "summary": (
                "We couldn't find laptops matching your requirements. "
                "Try broadening your budget or adjusting your specs."
            ),
        }

    # Compact product list for the model
    product_lines = []
    for i, p in enumerate(products):
        product_lines.append(
            f"{i+1}. {p['brand']} {p['name']} — "
            f"NGN {float(p['price']):,.0f} | "
            f"{p['cpu']} | "
            f"{p['ram_gb']}GB RAM | "
            f"{p['storage_gb']}GB storage | "
            f"GPU: {p.get('gpu') or 'Integrated'}"
        )
    product_text = "\n".join(product_lines)

    # Summarise intent for the model
    context_parts = []
    if intent.get("user_context"):
        context_parts.append(f"User: {intent['user_context']}")
    if intent.get("budget_max"):
        context_parts.append(f"Budget: up to NGN {intent['budget_max']:,}")
    if intent.get("use_cases"):
        context_parts.append(f"Use cases: {', '.join(intent['use_cases'])}")
    context_str = " | ".join(context_parts) if context_parts else "General use"

    prompt = f"""You are an expert laptop advisor for a Nigerian electronics store.

Customer query: "{query}"
{context_str}

Laptops found:
{product_text}

Write a JSON response. Return ONLY valid JSON with no markdown, no explanation, no extra text.

{{
  "summary": "<2 sentences max: what was found and how well it matches the request>",
  "explanations": [
    {{"rank": 1, "explanation": "<1-2 sentences specific to this customer's needs>"}},
    {{"rank": 2, "explanation": "<1-2 sentences specific to this customer's needs>"}}
  ]
}}

Rules for explanations:
- Be specific — mention the exact spec that matches their need
- Use NGN with commas for prices e.g. NGN 385,000
- If slightly over budget, acknowledge it and explain the value
- Keep each explanation under 40 words
- Sound like a knowledgeable friend, not marketing copy
- Write exactly {len(products)} explanation objects, one per laptop"""

    try:
        raw          = _call_groq(prompt, max_tokens=1200)
        ai_response  = _parse_json_response(raw)

    except json.JSONDecodeError as e:
        logger.error(f"Explanation JSON parse failed: {e} | Raw: {raw!r}")
        ai_response = {
            "summary":      f"Found {len(products)} laptops matching your search.",
            "explanations": [{"rank": i + 1, "explanation": ""} for i in range(len(products))],
        }
    except Exception as e:
        logger.error(f"Explanation generation failed: {e}")
        ai_response = {
            "summary":      f"Found {len(products)} laptops matching your search.",
            "explanations": [{"rank": i + 1, "explanation": ""} for i in range(len(products))],
        }

    explanation_map = {
        item["rank"]: item["explanation"]
        for item in ai_response.get("explanations", [])
    }

    explained = []
    for i, product in enumerate(products):
        copy = product.copy()
        copy["ai_explanation"] = explanation_map.get(i + 1, "")
        explained.append(copy)

    return {
        **state,
        "explained_results": explained,
        "summary":           ai_response.get("summary", ""),
    }


# ─── Pipeline ─────────────────────────────────────────────────────────────────

async def run_ai_search(query: str, db: Session) -> dict:
    """
    Main entry point. Checks Redis cache first, then runs the full pipeline.

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    No changes needed here — the pipeline nodes internally call _call_groq().
    To switch back to Claude, change _call_groq() to _call_claude() in
    parse_intent() and generate_explanations(), and update the model client.
    ─────────────────────────────────────────────────────────────────────────
    """
    # ── Cache check ───────────────────────────────────────────────────────────
    cache_key = f"search:ai:{query.strip().lower()}"
    cached    = redis_client.get(cache_key)
    if cached:
        result              = json.loads(cached)
        result["from_cache"] = True
        return result

    # ── Build graph with db injected ──────────────────────────────────────────
    # LangGraph nodes are pure functions, so we use a closure to inject
    # the SQLAlchemy session into hybrid_search without making it a global.
    async def hybrid_search_with_db(state: AISearchState) -> AISearchState:
        return await hybrid_search(state, db)

    graph = StateGraph(AISearchState)
    graph.add_node("parse_intent",          parse_intent)
    graph.add_node("hybrid_search",         hybrid_search_with_db)
    graph.add_node("merge_results",         merge_results)
    graph.add_node("generate_explanations", generate_explanations)
    graph.set_entry_point("parse_intent")
    graph.add_edge("parse_intent",          "hybrid_search")
    graph.add_edge("hybrid_search",         "merge_results")
    graph.add_edge("merge_results",         "generate_explanations")
    graph.add_edge("generate_explanations", END)
    compiled = graph.compile()

    initial_state: AISearchState = {
        "raw_query":         query,
        "parsed_intent":     {},
        "search_query":      query,
        "vector_results":    [],
        "es_results":        [],
        "merged_results":    [],
        "explained_results": [],
        "summary":           "",
        "error":             None,
        "from_cache":        False,
    }

    final_state = await compiled.ainvoke(initial_state)

    # ── Shape response ────────────────────────────────────────────────────────
    result = {
        "query":         query,
        "summary":       final_state["summary"],
        "items":         final_state["explained_results"],
        "total":         len(final_state["explained_results"]),
        "parsed_intent": final_state["parsed_intent"],
        "source":        "ai_hybrid",
        "from_cache":    False,
    }

    # ── Cache and log ─────────────────────────────────────────────────────────
    redis_client.setex(
        cache_key,
        settings.AI_SEARCH_CACHE_TTL,
        json.dumps(result, default=str),
    )

    log_search(
        query=query,
        results_count=len(final_state["explained_results"]),
        search_type="ai",
    )

    return result
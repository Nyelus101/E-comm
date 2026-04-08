# # backend/app/services/ai_search_service.py
# import json
# import logging
# from typing import TypedDict, Optional

# from groq import Groq

# # ── CLAUDE ALTERNATIVE (uncomment to switch back) ──────────────────────────
# # import anthropic
# # anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
# # ──────────────────────────────────────────────────────────────────────────

# from langgraph.graph import StateGraph, END
# from sqlalchemy.orm import Session
# import redis

# from app.services.embedding_service import generate_query_embedding
# from app.services.vector_search_service import vector_search
# from app.services.elasticsearch_service import search_products as es_search
# from app.services.search_analytics import log_search
# from app.config import settings

# logger = logging.getLogger(__name__)

# redis_client  = redis.from_url(settings.REDIS_URL, decode_responses=True)
# groq_client   = Groq(api_key=settings.GROQ_API_KEY)

# # ── Model selection ──────────────────────────────────────────────────────────
# # llama-3.3-70b-versatile — best Groq model for structured JSON tasks.
# # Much better at following JSON schemas than the 8b model.
# # Still completely free on Groq's free tier.
# #
# # Other good Groq options:
# #   "llama-3.1-70b-versatile"  — slightly older, also very capable
# #   "llama-3.1-8b-instant"     — fastest, weakest at JSON structure
# #   "mixtral-8x7b-32768"       — good context window, solid reasoning
# #
# # ── CLAUDE ALTERNATIVE ──────────────────────────────────────────────────────
# # FAST_MODEL = "claude-3-5-haiku-20241022"  # intent parsing + explanations
# # ────────────────────────────────────────────────────────────────────────────
# GROQ_MODEL = "llama-3.3-70b-versatile"


# def _call_groq(prompt: str, max_tokens: int = 1024) -> str:
#     """
#     Shared helper that calls Groq and returns the response text.
#     Centralising the call makes it easy to swap models or add retries.

#     ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
#     def _call_claude(prompt: str, max_tokens: int = 1024) -> str:
#         message = anthropic_client.messages.create(
#             model=FAST_MODEL,
#             max_tokens=max_tokens,
#             messages=[{"role": "user", "content": prompt}],
#         )
#         return message.content[0].text.strip()
#     ─────────────────────────────────────────────────────────────────────────
#     """
#     response = groq_client.chat.completions.create(
#         model=GROQ_MODEL,
#         messages=[{"role": "user", "content": prompt}],
#         max_tokens=max_tokens,
#         temperature=0.1,      # low temperature = more consistent JSON output
#     )
#     return response.choices[0].message.content.strip()


# def _parse_json_response(raw: str) -> dict:
#     """
#     Safely extracts JSON from a model response.
#     LLMs sometimes wrap JSON in markdown code fences — this strips them.
#     """
#     text = raw.strip()

#     # Strip ```json ... ``` or ``` ... ``` fences
#     if text.startswith("```"):
#         lines = text.split("\n")
#         # Remove first line (```json or ```) and last line (```)
#         lines = lines[1:] if lines[0].startswith("```") else lines
#         lines = lines[:-1] if lines and lines[-1].strip() == "```" else lines
#         text = "\n".join(lines).strip()

#     return json.loads(text)


# # ─── Agent State ──────────────────────────────────────────────────────────────

# class AISearchState(TypedDict):
#     raw_query:          str
#     parsed_intent:      dict
#     search_query:       str
#     vector_results:     list
#     es_results:         list
#     merged_results:     list
#     explained_results:  list
#     summary:            str
#     error:              Optional[str]
#     from_cache:         bool


# # ─── Node 1: Intent Parser ────────────────────────────────────────────────────

# def parse_intent(state: AISearchState) -> AISearchState:
#     """
#     Extracts structured requirements from the raw natural language query.

#     Uses Groq (llama-3.3-70b-versatile) to parse:
#     - Budget constraints (₦ amounts, "cheap", "under X")
#     - Use cases (gaming, programming, student, video editing)
#     - Hardware requirements (RAM, GPU, storage)
#     - Brand preferences

#     ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
#     Same prompt — just replace _call_groq() with _call_claude().
#     Claude 3.5 Haiku is slightly more reliable at strict JSON adherence
#     but Llama 3.3 70b handles this prompt well with temperature=0.1.
#     ─────────────────────────────────────────────────────────────────────────
#     """
#     query = state["raw_query"]

#     prompt = f"""You are an AI assistant for a Nigerian laptop store.
# Extract structured search requirements from this customer query.

# Query: "{query}"

# Respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.
# Just the raw JSON starting with {{ and ending with }}.

# {{
#   "budget_max": <max price in Naira as integer, or null if not mentioned>,
#   "budget_min": <min price in Naira as integer, or null>,
#   "use_cases": <list of strings, e.g. ["gaming", "programming", "video editing", "student"]>,
#   "gpu_required": <true if user explicitly needs dedicated GPU, else false>,
#   "gpu_keyword": <specific GPU string mentioned e.g. "RTX" or "GTX" or null>,
#   "min_ram": <minimum RAM in GB as integer, or null>,
#   "min_storage": <minimum storage in GB as integer, or null>,
#   "brand_preference": <specific brand string mentioned or null>,
#   "portability_important": <true if user mentions lightweight or portable, else false>,
#   "battery_important": <true if user mentions battery life, else false>,
#   "search_query": <a clean 3-8 word English search query capturing the core intent>,
#   "user_context": <one sentence describing who the user is or their situation, or empty string>
# }}

# Conversion rules:
# - ₦400k or 400k = 400000
# - ₦1.5m or 1.5m = 1500000
# - "programming" or "coding" or "developer" implies min_ram of 16
# - "gaming" implies gpu_required true
# - "student" with "cheap" or "budget" implies budget_max 300000 if not specified
# - "video editing" implies min_ram 16 and gpu_required true
# - If no budget mentioned, budget_max is null"""

#     try:
#         raw = _call_groq(prompt, max_tokens=512)
#         parsed = _parse_json_response(raw)

#     except json.JSONDecodeError as e:
#         logger.error(f"Intent JSON parse failed: {e} | Raw: {raw!r}")
#         # Graceful fallback — treat full query as plain search
#         parsed = {
#             "budget_max":            None,
#             "budget_min":            None,
#             "use_cases":             [],
#             "gpu_required":          False,
#             "gpu_keyword":           None,
#             "min_ram":               None,
#             "min_storage":           None,
#             "brand_preference":      None,
#             "portability_important": False,
#             "battery_important":     False,
#             "search_query":          query,
#             "user_context":          "",
#         }
#     except Exception as e:
#         logger.error(f"Intent parsing failed: {e}")
#         parsed = {
#             "budget_max":            None,
#             "budget_min":            None,
#             "use_cases":             [],
#             "gpu_required":          False,
#             "gpu_keyword":           None,
#             "min_ram":               None,
#             "min_storage":           None,
#             "brand_preference":      None,
#             "portability_important": False,
#             "battery_important":     False,
#             "search_query":          query,
#             "user_context":          "",
#         }

#     return {
#         **state,
#         "parsed_intent": parsed,
#         "search_query":  parsed.get("search_query", query),
#     }


# # ─── Node 2: Hybrid Search ────────────────────────────────────────────────────

# async def hybrid_search(state: AISearchState, db: Session) -> AISearchState:
#     """
#     Runs vector search (pgvector) and keyword search (Elasticsearch) in parallel.
#     Filters from parsed_intent are applied to both search engines.
#     """
#     intent = state["parsed_intent"]
#     sq     = state["search_query"]

#     max_price = intent.get("budget_max")
#     min_price = intent.get("budget_min")
#     min_ram   = intent.get("min_ram")
#     brand     = intent.get("brand_preference")
#     gpu_kw    = intent.get("gpu_keyword")

#     # ── Vector search ─────────────────────────────────────────────────────────
#     query_embedding = await generate_query_embedding(sq)
#     vec_results = []
#     if query_embedding:
#         vec_results = vector_search(
#             query_embedding=query_embedding,
#             db=db,
#             limit=15,
#             min_price=min_price,
#             max_price=max_price,
#             min_ram=min_ram,
#             brand=brand,
#         )

#     # ── Elasticsearch search ───────────────────────────────────────────────────
#     es_result = es_search(
#         query=sq,
#         brand=brand,
#         min_price=min_price,
#         max_price=max_price,
#         min_ram=min_ram,
#         gpu_keyword=gpu_kw,
#         page=1,
#         page_size=15,
#         sort_by="relevance",
#     )
#     es_results = es_result.get("items", [])

#     return {
#         **state,
#         "vector_results": vec_results,
#         "es_results":     es_results,
#     }


# # ─── Node 3: Reciprocal Rank Fusion ──────────────────────────────────────────

# def merge_results(state: AISearchState) -> AISearchState:
#     """
#     Merges vector and ES results using Reciprocal Rank Fusion (RRF).

#     RRF score = Σ 1 / (k + rank)  where k = 60
#     Products appearing in both lists get higher combined scores.
#     Scale-invariant — works regardless of how ES and vector scores differ.
#     """
#     vec_results = state["vector_results"]
#     es_results  = state["es_results"]

#     k = 60
#     scores:      dict[str, float] = {}
#     product_map: dict[str, dict]  = {}

#     for rank, product in enumerate(vec_results):
#         pid = product["id"]
#         scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
#         product_map[pid] = product

#     for rank, product in enumerate(es_results):
#         pid = product["id"]
#         scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
#         if pid not in product_map:
#             product_map[pid] = product

#     sorted_ids = sorted(scores, key=lambda pid: scores[pid], reverse=True)
#     top_ids    = sorted_ids[:8]

#     merged = []
#     for pid in top_ids:
#         product = product_map[pid].copy()
#         product["rrf_score"] = scores[pid]
#         merged.append(product)

#     return {**state, "merged_results": merged}


# # ─── Node 4: AI Explanation ───────────────────────────────────────────────────

# def generate_explanations(state: AISearchState) -> AISearchState:
#     """
#     Uses Groq to explain why each result matches the user's query.

#     ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
#     Same prompt — replace _call_groq() with _call_claude().
#     Claude tends to produce slightly more natural-sounding explanations
#     but Llama 3.3 70b is more than adequate for this task.
#     ─────────────────────────────────────────────────────────────────────────
#     """
#     products = state["merged_results"]
#     intent   = state["parsed_intent"]
#     query    = state["raw_query"]

#     if not products:
#         return {
#             **state,
#             "explained_results": [],
#             "summary": (
#                 "We couldn't find laptops matching your requirements. "
#                 "Try broadening your budget or adjusting your specs."
#             ),
#         }

#     # Compact product list for the model
#     product_lines = []
#     for i, p in enumerate(products):
#         product_lines.append(
#             f"{i+1}. {p['brand']} {p['name']} — "
#             f"NGN {float(p['price']):,.0f} | "
#             f"{p['cpu']} | "
#             f"{p['ram_gb']}GB RAM | "
#             f"{p['storage_gb']}GB storage | "
#             f"GPU: {p.get('gpu') or 'Integrated'}"
#         )
#     product_text = "\n".join(product_lines)

#     # Summarise intent for the model
#     context_parts = []
#     if intent.get("user_context"):
#         context_parts.append(f"User: {intent['user_context']}")
#     if intent.get("budget_max"):
#         context_parts.append(f"Budget: up to NGN {intent['budget_max']:,}")
#     if intent.get("use_cases"):
#         context_parts.append(f"Use cases: {', '.join(intent['use_cases'])}")
#     context_str = " | ".join(context_parts) if context_parts else "General use"

#     prompt = f"""You are an expert laptop advisor for a Nigerian electronics store.

# Customer query: "{query}"
# {context_str}

# Laptops found:
# {product_text}

# Write a JSON response. Return ONLY valid JSON with no markdown, no explanation, no extra text.

# {{
#   "summary": "<2 sentences max: what was found and how well it matches the request>",
#   "explanations": [
#     {{"rank": 1, "explanation": "<1-2 sentences specific to this customer's needs>"}},
#     {{"rank": 2, "explanation": "<1-2 sentences specific to this customer's needs>"}}
#   ]
# }}

# Rules for explanations:
# - Be specific — mention the exact spec that matches their need
# - Use NGN with commas for prices e.g. NGN 385,000
# - If slightly over budget, acknowledge it and explain the value
# - Keep each explanation under 40 words
# - Sound like a knowledgeable friend, not marketing copy
# - Write exactly {len(products)} explanation objects, one per laptop"""

#     try:
#         raw          = _call_groq(prompt, max_tokens=1200)
#         ai_response  = _parse_json_response(raw)

#     except json.JSONDecodeError as e:
#         logger.error(f"Explanation JSON parse failed: {e} | Raw: {raw!r}")
#         ai_response = {
#             "summary":      f"Found {len(products)} laptops matching your search.",
#             "explanations": [{"rank": i + 1, "explanation": ""} for i in range(len(products))],
#         }
#     except Exception as e:
#         logger.error(f"Explanation generation failed: {e}")
#         ai_response = {
#             "summary":      f"Found {len(products)} laptops matching your search.",
#             "explanations": [{"rank": i + 1, "explanation": ""} for i in range(len(products))],
#         }

#     explanation_map = {
#         item["rank"]: item["explanation"]
#         for item in ai_response.get("explanations", [])
#     }

#     explained = []
#     for i, product in enumerate(products):
#         copy = product.copy()
#         copy["ai_explanation"] = explanation_map.get(i + 1, "")
#         explained.append(copy)

#     return {
#         **state,
#         "explained_results": explained,
#         "summary":           ai_response.get("summary", ""),
#     }


# # ─── Pipeline ─────────────────────────────────────────────────────────────────

# async def run_ai_search(query: str, db: Session) -> dict:
#     """
#     Main entry point. Checks Redis cache first, then runs the full pipeline.

#     ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
#     No changes needed here — the pipeline nodes internally call _call_groq().
#     To switch back to Claude, change _call_groq() to _call_claude() in
#     parse_intent() and generate_explanations(), and update the model client.
#     ─────────────────────────────────────────────────────────────────────────
#     """
#     # ── Cache check ───────────────────────────────────────────────────────────
#     cache_key = f"search:ai:{query.strip().lower()}"
#     cached    = redis_client.get(cache_key)
#     if cached:
#         result              = json.loads(cached)
#         result["from_cache"] = True
#         return result

#     # ── Build graph with db injected ──────────────────────────────────────────
#     # LangGraph nodes are pure functions, so we use a closure to inject
#     # the SQLAlchemy session into hybrid_search without making it a global.
#     async def hybrid_search_with_db(state: AISearchState) -> AISearchState:
#         return await hybrid_search(state, db)

#     graph = StateGraph(AISearchState)
#     graph.add_node("parse_intent",          parse_intent)
#     graph.add_node("hybrid_search",         hybrid_search_with_db)
#     graph.add_node("merge_results",         merge_results)
#     graph.add_node("generate_explanations", generate_explanations)
#     graph.set_entry_point("parse_intent")
#     graph.add_edge("parse_intent",          "hybrid_search")
#     graph.add_edge("hybrid_search",         "merge_results")
#     graph.add_edge("merge_results",         "generate_explanations")
#     graph.add_edge("generate_explanations", END)
#     compiled = graph.compile()

#     initial_state: AISearchState = {
#         "raw_query":         query,
#         "parsed_intent":     {},
#         "search_query":      query,
#         "vector_results":    [],
#         "es_results":        [],
#         "merged_results":    [],
#         "explained_results": [],
#         "summary":           "",
#         "error":             None,
#         "from_cache":        False,
#     }

#     final_state = await compiled.ainvoke(initial_state)

#     # ── Shape response ────────────────────────────────────────────────────────
#     result = {
#         "query":         query,
#         "summary":       final_state["summary"],
#         "items":         final_state["explained_results"],
#         "total":         len(final_state["explained_results"]),
#         "parsed_intent": final_state["parsed_intent"],
#         "source":        "ai_hybrid",
#         "from_cache":    False,
#     }

#     # ── Cache and log ─────────────────────────────────────────────────────────
#     redis_client.setex(
#         cache_key,
#         settings.AI_SEARCH_CACHE_TTL,
#         json.dumps(result, default=str),
#     )

#     log_search(
#         query=query,
#         results_count=len(final_state["explained_results"]),
#         search_type="ai",
#     )

#     return result





























# backend/app/services/ai_search_service.py
"""
AI Search Service — Intelligent hybrid search using Groq + pgvector + Elasticsearch.

Architecture:
  1. REASONING PHASE  — Groq analyses the query deeply, generates multiple
                        search strategies, and identifies what the user truly needs
  2. MULTI-STRATEGY SEARCH — Each strategy hits both vector and ES search
  3. INTELLIGENT FALLBACK — If primary strategies fail, progressively relax
                            constraints rather than returning empty results
  4. CONTEXTUAL EXPLANATION — Groq explains results relative to the user's
                              actual stated need, including honest notes when
                              exact matches weren't found

Design principles:
  - The LLM reasons about intent, not just keywords
  - Multiple search strategies are tried in order of specificity
  - Empty results always trigger fallback, never a dead end
  - Explanations are honest and commercially useful
"""

import json
import logging
from typing import TypedDict, Optional, List, Dict, Any
import asyncio

from groq import Groq

# ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────────
# import anthropic
# anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
# FAST_MODEL = "claude-3-5-haiku-20241022"
# def _call_llm(prompt: str, max_tokens: int = 2048) -> str:
#     message = anthropic_client.messages.create(
#         model=FAST_MODEL,
#         max_tokens=max_tokens,
#         messages=[{"role": "user", "content": prompt}],
#     )
#     return message.content[0].text.strip()
# ─────────────────────────────────────────────────────────────────────────────

from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
import redis

from app.services.embedding_service import generate_query_embedding
from app.services.vector_search_service import vector_search
from app.services.elasticsearch_service import search_products as es_search
from app.services.search_analytics import log_search
from app.config import settings

logger = logging.getLogger(__name__)

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
groq_client  = Groq(api_key=settings.GROQ_API_KEY)

# llama-3.3-70b-versatile handles structured reasoning and JSON well
# ── CLAUDE ALTERNATIVE: FAST_MODEL = "claude-3-5-haiku-20241022" ─────────────
GROQ_MODEL = "llama-3.3-70b-versatile"


# ─── LLM call helper ──────────────────────────────────────────────────────────

def _call_llm(prompt: str, max_tokens: int = 2048) -> str:
    """
    Calls Groq and returns the raw text response.

    temperature=0.1 keeps JSON output consistent.
    temperature=0.4 for explanations gives slightly more natural language.

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    Replace body with:
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
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()


def _call_llm_creative(prompt: str, max_tokens: int = 2048) -> str:
    """Higher temperature variant for natural-language explanations."""
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.4,
    )
    return response.choices[0].message.content.strip()


def _parse_json(raw: str) -> Any:
    """
    Robustly extracts JSON from LLM output.
    Handles markdown fences, leading text, and trailing commentary.
    """
    text = raw.strip()

    # Strip markdown code fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except json.JSONDecodeError:
                continue

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the first { or [ and try from there
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        end   = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Could not extract JSON from: {text[:200]!r}")


# ─── Agent State ──────────────────────────────────────────────────────────────

class SearchStrategy(TypedDict):
    """One concrete search attempt with specific parameters."""
    search_query:  str
    brand:         Optional[str]
    max_price:     Optional[float]
    min_price:     Optional[float]
    min_ram:       Optional[int]
    gpu_keyword:   Optional[str]
    description:   str            # why this strategy was chosen (for debugging)


class AISearchState(TypedDict):
    # Input
    raw_query:          str

    # After reasoning
    reasoning:          dict       # full analysis of what user needs
    strategies:         List[SearchStrategy]

    # After search
    raw_results:        List[dict] # merged from all strategies
    search_attempted:   bool
    fallback_used:      bool
    fallback_message:   str        # honest message when exact match unavailable

    # After explanation
    explained_results:  List[dict]
    summary:            str

    # Metadata
    from_cache:         bool


# ─── Node 1: Deep Reasoning ───────────────────────────────────────────────────

def reason_about_query(state: AISearchState) -> AISearchState:
    """
    The most important node. Groq deeply analyses what the user actually needs
    and generates multiple concrete search strategies to try.

    Key improvements over the old intent parser:
    - Generates 3 strategies from specific to general (fallback chain)
    - Understands brand aliases WITHOUT hardcoded mapping:
      The LLM already knows MacBook=Apple, Pavilion=HP, ThinkPad=Lenovo etc.
      We ask it to surface this knowledge into explicit brand values.
    - Separates "what they asked for" from "what would satisfy them"
    - Identifies when a request is likely impossible (very low budget)
      and adjusts expectations accordingly

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    Same prompt, replace _call_llm() with _call_claude().
    Claude 3.5 Haiku produces slightly cleaner JSON here but Llama 70b
    works well with the explicit schema instructions below.
    ─────────────────────────────────────────────────────────────────────────
    """
    query = state["raw_query"]

    prompt = f"""You are an expert laptop sales consultant at a Nigerian electronics store.
A customer says: "{query}"

Your job is to deeply understand what they need and create MULTIPLE search strategies
to find matching products in our inventory. You have deep knowledge of laptop brands,
models, and product lines.

IMPORTANT BRAND KNOWLEDGE:
- MacBook, MacBook Air, MacBook Pro = brand "Apple"
- ThinkPad, IdeaPad, Yoga, Legion = brand "Lenovo"
- Pavilion, Envy, Spectre, Omen, EliteBook, ProBook = brand "HP"
- XPS, Inspiron, Alienware, Latitude, Vostro, G-series = brand "Dell"
- VivoBook, ZenBook, TUF Gaming, ROG = brand "Asus"
- Aspire, Nitro, Swift, Predator, Helios = brand "Acer"
- Razer Blade = brand "Razer"
Use this knowledge to set explicit brand values in strategies.

Respond with ONLY this JSON structure, no other text:

{{
  "user_need_summary": "<one sentence: what does this person actually need?>",
  "use_cases": ["<list of use cases: gaming, programming, student, video editing, office, general>"],
  "budget_max": <max budget in Naira as integer, null if not mentioned>,
  "budget_min": <min budget in Naira as integer, null>,
  "is_budget_very_tight": <true if budget seems unrealistically low for their needs>,
  "specific_product_requested": "<exact product name/model if mentioned, else null>",
  "strategies": [
    {{
      "search_query": "<3-6 words: the most specific search for what they want>",
      "brand": "<explicit brand name if identifiable from product name/alias, else null>",
      "max_price": <Naira integer or null>,
      "min_price": <Naira integer or null>,
      "min_ram": <GB integer or null>,
      "gpu_keyword": "<GPU type string if needed, else null>",
      "description": "<why this strategy>"
    }},
    {{
      "search_query": "<broader search if strategy 1 fails>",
      "brand": null,
      "max_price": <same or slightly relaxed budget>,
      "min_price": null,
      "min_ram": <same or relaxed>,
      "gpu_keyword": null,
      "description": "broader fallback"
    }},
    {{
      "search_query": "<very broad search: just the use case category>",
      "brand": null,
      "max_price": null,
      "min_price": null,
      "min_ram": null,
      "gpu_keyword": null,
      "description": "widest fallback to find anything relevant"
    }}
  ]
}}

Price conversion: 2m = 2000000, 500k = 500000, 1.5m = 1500000
RAM rules: programming/coding → 16, gaming → 16, video editing → 16, student/basic → 8
The 3 strategies must go from MOST SPECIFIC to MOST GENERAL.
Strategy 3 must always have null for brand, max_price, min_price, min_ram, gpu_keyword."""

    try:
        raw      = _call_llm(prompt, max_tokens=1024)
        reasoning = _parse_json(raw)

        # Validate strategies exist
        strategies = reasoning.get("strategies", [])
        if not strategies:
            raise ValueError("No strategies in response")

        # Ensure we have at least 3 strategies, pad if model returned fewer
        while len(strategies) < 3:
            strategies.append({
                "search_query":  query,
                "brand":         None,
                "max_price":     None,
                "min_price":     None,
                "min_ram":       None,
                "gpu_keyword":   None,
                "description":   "auto-generated fallback",
            })

    except Exception as e:
        logger.error(f"Reasoning failed: {e}")
        # Safe fallback — treat query as plain search
        reasoning  = {
            "user_need_summary":         query,
            "use_cases":                 [],
            "budget_max":                None,
            "budget_min":                None,
            "is_budget_very_tight":      False,
            "specific_product_requested": None,
        }
        strategies = [
            {
                "search_query": query,
                "brand":        None,
                "max_price":    None,
                "min_price":    None,
                "min_ram":      None,
                "gpu_keyword":  None,
                "description":  "fallback: plain query",
            },
            {
                "search_query": " ".join(query.split()[:3]),
                "brand":        None,
                "max_price":    None,
                "min_price":    None,
                "min_ram":      None,
                "gpu_keyword":  None,
                "description":  "fallback: shortened query",
            },
            {
                "search_query": "laptop",
                "brand":        None,
                "max_price":    None,
                "min_price":    None,
                "min_ram":      None,
                "gpu_keyword":  None,
                "description":  "fallback: generic",
            },
        ]

    return {
        **state,
        "reasoning":   reasoning,
        "strategies":  strategies,
    }


# ─── Node 2: Multi-Strategy Search ────────────────────────────────────────────

async def execute_search_strategies(state: AISearchState, db: Session) -> AISearchState:
    """
    Tries each strategy in order, stopping when enough results are found.

    Strategy cascade:
      1. Try strategy 1 (most specific — brand + budget + specs)
      2. If < 3 results, try strategy 2 (broader)
      3. If still < 3 results, try strategy 3 (widest — find anything)
      4. If still nothing, run a completely unconstrained search

    This guarantees we almost never return empty results.
    The fallback_used flag tells the explanation node to be honest
    about the fact that we relaxed constraints.

    For each strategy we run BOTH vector search and Elasticsearch,
    then merge with RRF. This gives us semantic understanding (vector)
    AND keyword precision (ES) for every attempt.
    """
    strategies    = state["strategies"]
    reasoning     = state["reasoning"]
    all_results:  Dict[str, dict] = {}   # id → product, deduped across strategies
    fallback_used = False
    fallback_msg  = ""

    ENOUGH_RESULTS = 4   # stop trying strategies once we have this many

    for i, strategy in enumerate(strategies):
        if len(all_results) >= ENOUGH_RESULTS:
            break

        logger.info(f"Trying strategy {i+1}: {strategy['description']}")

        strategy_results = await _execute_single_strategy(strategy, db)

        for product in strategy_results:
            pid = product["id"]
            if pid not in all_results:
                all_results[pid] = product

        if len(all_results) < 3 and i >= 1:
            fallback_used = True
            if i == 1:
                fallback_msg = (
                    f"I couldn't find an exact match for your request, "
                    f"so I've broadened the search to show you the closest available options."
                )
            elif i == 2:
                fallback_msg = (
                    f"I couldn't find products matching all your requirements exactly. "
                    f"Here are the most relevant laptops currently available — "
                    f"some may differ from your specifications."
                )

    # Last resort: completely unconstrained search to find SOMETHING
    if len(all_results) == 0:
        logger.info("All strategies failed, running unconstrained fallback")
        fallback_used = True

        # Use the use cases as a broad query
        use_cases   = reasoning.get("use_cases", [])
        broad_query = " ".join(use_cases) if use_cases else "laptop"

        unconstrained = await _execute_single_strategy({
            "search_query": broad_query,
            "brand":        None,
            "max_price":    None,
            "min_price":    None,
            "min_ram":      None,
            "gpu_keyword":  None,
            "description":  "unconstrained fallback",
        }, db)

        for product in unconstrained:
            all_results[product["id"]] = product

        if all_results:
            budget = reasoning.get("budget_max")
            fallback_msg = (
                f"I couldn't find laptops matching your exact requirements"
                + (f" within your ₦{budget:,} budget" if budget else "")
                + f". Here are the closest alternatives currently in stock — "
                f"I'll explain how each one relates to what you need."
            )
        else:
            fallback_msg = "No laptops are currently available in our inventory."

    # RRF merge on the collected results
    merged = _rrf_merge(list(all_results.values()))

    return {
        **state,
        "raw_results":       merged,
        "search_attempted":  True,
        "fallback_used":     fallback_used,
        "fallback_message":  fallback_msg,
    }


async def _execute_single_strategy(
    strategy: dict,
    db: Session,
) -> List[dict]:
    """
    Runs one strategy through both vector search and Elasticsearch,
    merges with RRF, and returns deduplicated results.
    """
    sq          = strategy.get("search_query", "laptop")
    brand       = strategy.get("brand")
    max_price   = strategy.get("max_price")
    min_price   = strategy.get("min_price")
    min_ram     = strategy.get("min_ram")
    gpu_keyword = strategy.get("gpu_keyword")

    # ── Vector search ─────────────────────────────────────────────────────────
    vec_results: List[dict] = []
    try:
        embedding = await generate_query_embedding(sq)
        if embedding:
            vec_results = vector_search(
                query_embedding=embedding,
                db=db,
                limit=10,
                min_price=min_price,
                max_price=max_price,
                min_ram=min_ram,
                brand=brand,
            )
    except Exception as e:
        logger.error(f"Vector search error in strategy: {e}")

    # ── Elasticsearch search ───────────────────────────────────────────────────
    es_results: List[dict] = []
    try:
        es_result = es_search(
            query=sq,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            min_ram=min_ram,
            gpu_keyword=gpu_keyword,
            page=1,
            page_size=10,
            sort_by="relevance",
        )
        es_results = es_result.get("items", [])
    except Exception as e:
        logger.error(f"ES search error in strategy: {e}")

    # ── If brand was set but ES found nothing, retry ES without brand ─────────
    # This handles cases where the brand name in our DB doesn't exactly match
    # what the LLM extracted (e.g. "Apple Inc." vs "Apple")
    if brand and len(es_results) == 0 and len(vec_results) > 0:
        try:
            es_result_no_brand = es_search(
                query=f"{brand} {sq}",   # fold brand into query text instead
                brand=None,
                min_price=min_price,
                max_price=max_price,
                min_ram=min_ram,
                gpu_keyword=gpu_keyword,
                page=1,
                page_size=10,
                sort_by="relevance",
            )
            es_results = es_result_no_brand.get("items", [])
        except Exception as e:
            logger.error(f"ES brand-folded retry error: {e}")

    return _rrf_merge_two_lists(vec_results, es_results)


def _rrf_merge_two_lists(
    list_a: List[dict],
    list_b: List[dict],
    k: int = 60,
    top_n: int = 10,
) -> List[dict]:
    """Merges two ranked lists using Reciprocal Rank Fusion."""
    scores:      Dict[str, float] = {}
    product_map: Dict[str, dict]  = {}

    for rank, p in enumerate(list_a):
        pid = p["id"]
        scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
        product_map[pid] = p

    for rank, p in enumerate(list_b):
        pid = p["id"]
        scores[pid]      = scores.get(pid, 0) + 1 / (k + rank + 1)
        if pid not in product_map:
            product_map[pid] = p

    sorted_ids = sorted(scores, key=lambda pid: scores[pid], reverse=True)
    return [product_map[pid] for pid in sorted_ids[:top_n]]


def _rrf_merge(products: List[dict], top_n: int = 8) -> List[dict]:
    """Re-ranks a flat list by existing rrf_score or original order."""
    sorted_products = sorted(
        products,
        key=lambda p: p.get("rrf_score", 0),
        reverse=True
    )
    return sorted_products[:top_n]


# ─── Node 3: Contextual Explanation ───────────────────────────────────────────

def generate_explanations(state: AISearchState) -> AISearchState:
    """
    Generates honest, commercially useful explanations.

    Key improvements:
    - Uses the full reasoning context, not just the raw query
    - When fallback was used, explicitly acknowledges the mismatch and
      explains WHY each laptop is still a good option
    - Compares each laptop to what the user actually asked for
    - Includes price context (over/under budget, value proposition)

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    Same prompt, replace _call_llm_creative() with _call_claude().
    ─────────────────────────────────────────────────────────────────────────
    """
    products      = state["raw_results"]
    reasoning     = state["reasoning"]
    query         = state["raw_query"]
    fallback_used = state["fallback_used"]
    fallback_msg  = state["fallback_message"]

    if not products:
        return {
            **state,
            "explained_results": [],
            "summary": (
                "We currently don't have any laptops in stock that match your request. "
                "Please check back soon or contact us — we can source specific models."
            ),
        }

    # Build product list for the model
    product_lines = []
    for i, p in enumerate(products):
        price_val = float(p["price"])
        budget    = reasoning.get("budget_max")
        price_note = ""
        if budget:
            diff = price_val - budget
            if diff > 0:
                price_note = f" [₦{diff:,.0f} over budget]"
            else:
                price_note = f" [₦{abs(diff):,.0f} under budget]"

        product_lines.append(
            f"{i+1}. {p['brand']} {p['name']}\n"
            f"   Price: ₦{price_val:,.0f}{price_note}\n"
            f"   CPU: {p.get('cpu', 'N/A')}\n"
            f"   RAM: {p.get('ram_gb', 'N/A')}GB | Storage: {p.get('storage_gb', 'N/A')}GB\n"
            f"   GPU: {p.get('gpu') or 'Integrated graphics'}"
        )
    product_text = "\n\n".join(product_lines)

    # Context for the model
    budget_str   = f"₦{reasoning['budget_max']:,}" if reasoning.get("budget_max") else "not specified"
    use_cases    = ", ".join(reasoning.get("use_cases", [])) or "general use"
    need_summary = reasoning.get("user_need_summary", query)

    fallback_instruction = ""
    if fallback_used:
        fallback_instruction = f"""
IMPORTANT: The exact match was not available. You MUST:
1. Acknowledge this honestly in the summary (don't pretend these are perfect matches)
2. For each laptop, explain how it relates to what they asked for despite not being exact
3. Highlight the closest matches and why they're still good options
4. Be helpful and commercial — guide them toward a decision, don't just say "not found"
"""

    prompt = f"""You are a knowledgeable, honest laptop sales advisor at a Nigerian store.

CUSTOMER'S REQUEST: "{query}"
WHAT THEY NEED: {need_summary}
USE CASES: {use_cases}
BUDGET: {budget_str}
{fallback_instruction}

AVAILABLE LAPTOPS:
{product_text}

Write a JSON response. ONLY valid JSON, nothing else.

{{
  "summary": "<2-3 sentences: honest assessment of how well these results match the request. If fallback was used, acknowledge it but focus on what IS available and why it's still worth considering>",
  "explanations": [
    {{
      "rank": 1,
      "explanation": "<2-3 sentences: specific to this customer's stated need. Mention exact specs that match. If over/under budget, address it directly. Make it helpful for a buying decision.>",
      "match_quality": "<'exact' | 'close' | 'alternative'>"
    }}
  ]
}}

Rules:
- Use ₦ with commas for all prices
- Be specific — "the M3 chip handles your work tasks efficiently" not "great performance"
- If a laptop is over budget, acknowledge it and give a reason it might still be worth it
- If a laptop is under budget, mention the savings
- match_quality: 'exact' = matches all requirements, 'close' = matches most, 'alternative' = different but suitable
- Write exactly {len(products)} explanation objects
- Sound like a trusted friend who knows laptops, not a salesperson"""

    try:
        raw         = _call_llm_creative(prompt, max_tokens=1500)
        ai_response = _parse_json(raw)

    except Exception as e:
        logger.error(f"Explanation generation failed: {e}")
        ai_response = {
            "summary":      fallback_msg or f"Found {len(products)} laptops that may match your needs.",
            "explanations": [
                {"rank": i + 1, "explanation": "", "match_quality": "alternative"}
                for i in range(len(products))
            ],
        }

    explanation_map = {
        item["rank"]: item
        for item in ai_response.get("explanations", [])
    }

    explained = []
    for i, product in enumerate(products):
        copy = product.copy()
        exp  = explanation_map.get(i + 1, {})
        copy["ai_explanation"] = exp.get("explanation", "")
        copy["match_quality"]  = exp.get("match_quality", "alternative")
        explained.append(copy)

    # If fallback was used, prepend the honest fallback message to the summary
    summary = ai_response.get("summary", "")
    if fallback_used and fallback_msg and fallback_msg not in summary:
        summary = f"{fallback_msg} {summary}"

    return {
        **state,
        "explained_results": explained,
        "summary":           summary,
    }


# ─── Pipeline entrypoint ──────────────────────────────────────────────────────

async def run_ai_search(query: str, db: Session) -> dict:
    """
    Main entry point. Checks Redis cache, runs pipeline, caches result.

    ── CLAUDE ALTERNATIVE ────────────────────────────────────────────────────
    No changes needed here. The pipeline nodes call _call_llm() internally.
    To switch to Claude: update _call_llm() and _call_llm_creative() above.
    ─────────────────────────────────────────────────────────────────────────
    """
    # Cache check
    cache_key = f"search:ai:v2:{query.strip().lower()}"
    cached    = redis_client.get(cache_key)
    if cached:
        result               = json.loads(cached)
        result["from_cache"] = True
        return result

    # Inject db into hybrid search via closure
    async def search_with_db(state: AISearchState) -> AISearchState:
        return await execute_search_strategies(state, db)

    # Build graph
    graph = StateGraph(AISearchState)
    graph.add_node("reason_about_query",    reason_about_query)
    graph.add_node("execute_search",        search_with_db)
    graph.add_node("generate_explanations", generate_explanations)
    graph.set_entry_point("reason_about_query")
    graph.add_edge("reason_about_query",    "execute_search")
    graph.add_edge("execute_search",        "generate_explanations")
    graph.add_edge("generate_explanations", END)
    compiled = graph.compile()

    initial_state: AISearchState = {
        "raw_query":         query,
        "reasoning":         {},
        "strategies":        [],
        "raw_results":       [],
        "search_attempted":  False,
        "fallback_used":     False,
        "fallback_message":  "",
        "explained_results": [],
        "summary":           "",
        "from_cache":        False,
    }

    final_state = await compiled.ainvoke(initial_state)

    result = {
        "query":          query,
        "summary":        final_state["summary"],
        "items":          final_state["explained_results"],
        "total":          len(final_state["explained_results"]),
        "parsed_intent":  final_state["reasoning"],
        "fallback_used":  final_state["fallback_used"],
        "source":         "ai_hybrid",
        "from_cache":     False,
    }

    redis_client.setex(
        cache_key,
        settings.AI_SEARCH_CACHE_TTL,
        json.dumps(result, default=str),
    )

    log_search(query=query, results_count=len(final_state["explained_results"]), search_type="ai")
    return result
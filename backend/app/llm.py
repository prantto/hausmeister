"""LLM wiring for Hausmeister.

Embeddings + safety filter  →  Gemini (google-genai SDK)
Hausmeister answers         →  Qwen3-32B via Pioneer (OpenAI-compatible)
"""

import json
import logging
import os
import re
from typing import Optional

from google import genai
from google.genai import types
from openai import OpenAI

from .prompts import FILTER_PROMPT, GENERATE_SCRAP_PROMPT, HAUSMEISTER_CHAT_SYSTEM, HAUSMEISTER_SYSTEM, TAGESBERICHT_PROMPT

logger = logging.getLogger("hausmeister.llm")

# --- Gemini (embeddings + filter) ---
EMBED_MODEL = "gemini-embedding-001"
FILTER_MODEL = "gemini-flash-lite-latest"
EMBED_DIM = 768

# --- Pioneer / Qwen (Hausmeister answers) ---
PIONEER_BASE_URL = "https://api.pioneer.ai/v1/"
PIONEER_MODEL = "meta-llama/Llama-3.3-70B-Instruct"

_EMPTY_FALLBACK = "Hmpf. Schon wieder nichts zu sagen. Frag nochmal."

try:
    _SAFETY_OFF = [
        types.SafetySetting(category=c, threshold="BLOCK_NONE")
        for c in (
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
        )
    ]
except Exception:
    _SAFETY_OFF = None

# --- clients ---
_gemini: Optional[genai.Client] = None
_pioneer: Optional[OpenAI] = None


def gemini_client() -> genai.Client:
    global _gemini
    if _gemini is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _gemini = genai.Client(api_key=api_key)
    return _gemini


def pioneer_client() -> OpenAI:
    global _pioneer
    if _pioneer is None:
        api_key = os.environ.get("PIONEER_API_KEY")
        if not api_key:
            raise RuntimeError("PIONEER_API_KEY not set")
        _pioneer = OpenAI(base_url=PIONEER_BASE_URL, api_key=api_key)
    return _pioneer


# kept as alias so voice_stream.py (which calls llm.embed) still works
def client() -> genai.Client:
    return gemini_client()


def _pioneer_chat(system: str, user: str, *, temperature: float = 0.7, max_tokens: int = 2048) -> str:
    res = pioneer_client().chat.completions.create(
        model=PIONEER_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    logger.warning(
        "pioneer finish_reason=%s text_len=%d",
        res.choices[0].finish_reason,
        len(res.choices[0].message.content or ""),
    )
    return (res.choices[0].message.content or "").strip()


def embed(text: str) -> list[float]:
    res = gemini_client().models.embed_content(
        model=EMBED_MODEL,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    )
    emb = res.embeddings[0]
    return list(emb.values)


def filter_scrap(text: str) -> dict:
    """Safety + funny filter via Gemini Flash Lite. Falls back to accept on error."""
    prompt = FILTER_PROMPT.format(scrap=text)
    try:
        res = gemini_client().models.generate_content(
            model=FILTER_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        raw = (res.text or "").strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
        return json.loads(raw)
    except Exception:
        return {
            "safe": True,
            "safety_reason": None,
            "funny": 4,
            "funny_reason": "filter offline; defaulted",
            "tags": [],
            "redaction": None,
        }


def answer(question: str, retrieved: list[dict]) -> str:
    """Hausmeister reply via Qwen3-32B on Pioneer."""
    if retrieved:
        bullets = "\n".join(f"- [{r['handle']}] {r['body']}" for r in retrieved)
        context = f"# Retrieved scraps (the corpus):\n{bullets}\n"
    else:
        context = "# Retrieved scraps:\n(the corpus is empty for this query)\n"
    user = f"{context}\n# Question from a participant:\n{question}\n"
    return _pioneer_chat(HAUSMEISTER_CHAT_SYSTEM, user) or _EMPTY_FALLBACK


def answer_with_news(question: str, retrieved: list[dict], news: list[dict]) -> str:
    """Hausmeister answer cross-referencing corpus + current news, via Qwen3-32B."""
    corpus = (
        "\n".join(f"- [{r['handle']}] {r['body']}" for r in retrieved)
        if retrieved else "(empty)"
    )
    news_block = (
        "\n".join(f"- {n['title']}: {n['content'][:240]}…  ({n['url']})" for n in news)
        if news else "(no news returned)"
    )
    user = (
        f"# Retrieved scraps (the corpus):\n{corpus}\n\n"
        f"# Current news (Tavily):\n{news_block}\n\n"
        f"# Question:\n{question}\n\n"
        "Answer in Hausmeister voice. You may quote one short fragment from "
        "the news. Reference scraps by handle. 2–4 sentences."
    )
    return _pioneer_chat(HAUSMEISTER_CHAT_SYSTEM, user) or _EMPTY_FALLBACK


def tagesbericht(
    *, time_label: str, report_index: int, n_scraps: int,
    top_scraps: list[dict], hours_to_deadline: int,
) -> dict:
    """Generate a Tagesbericht via Qwen3-32B. Returns {intro, sections, cited}."""
    lines = "\n".join(f"  - [{s['handle']}] {s['body']}" for s in top_scraps)
    prompt = TAGESBERICHT_PROMPT.format(
        time_label=time_label,
        report_index=report_index,
        n_scraps=n_scraps,
        top_scraps=lines or "  (the corpus is empty)",
        hours_to_deadline=hours_to_deadline,
    )
    raw = _pioneer_chat(
        HAUSMEISTER_SYSTEM,
        prompt + "\n\nRespond with valid JSON only. No prose, no code fences.",
        temperature=0.6,
        max_tokens=4096,
    )
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)


def generate_scrap() -> dict:
    """Generate a new scrap in Hausmeister voice. Returns {body, tags, funny_score}."""
    raw = _pioneer_chat(
        "You are a JSON generator.",
        GENERATE_SCRAP_PROMPT,
        temperature=0.9,
        max_tokens=256,
    )
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    data = json.loads(raw)
    return {
        "body": data.get("body", ""),
        "tags": data.get("tags", []),
        "funny_score": 4,
    }

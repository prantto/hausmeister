"""Gemini calls. 2.5 Pro for Hausmeister, Flash for the safety+funny filter,
text-embedding-004 for embeddings."""

import json
import os
import re
from typing import Optional

from google import genai
from google.genai import types

from .prompts import FILTER_PROMPT, HAUSMEISTER_SYSTEM, TAGESBERICHT_PROMPT

_client: Optional[genai.Client] = None

EMBED_MODEL = "text-embedding-004"
# Constraint: only Flash / Flash Lite are available for Gemini. Flash carries
# the Hausmeister voice; Flash Lite handles the sub-second submission filter.
# All voice tasks (STT + TTS) route through Gradium — see app/voice.py.
ANSWER_MODEL = "gemini-2.5-flash"
FILTER_MODEL = "gemini-2.5-flash-lite"
EMBED_DIM = 768


def client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


def embed(text: str) -> list[float]:
    res = client().models.embed_content(model=EMBED_MODEL, contents=text)
    # google-genai returns ContentEmbedding; .values is the float list
    emb = res.embeddings[0]
    return list(emb.values)


def filter_scrap(text: str) -> dict:
    """Run the safety + funny filter. Returns the parsed JSON dict.
    On any error/parse-fail we accept the scrap with a midline funny=4 — we
    don't want the filter to be a hard dependency for the demo."""
    prompt = FILTER_PROMPT.format(scrap=text)
    try:
        res = client().models.generate_content(
            model=FILTER_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        raw = (res.text or "").strip()
        # Strip code fences if a model decides to ignore the mime hint.
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
    """Generate the Hausmeister's reply using retrieved scraps as context."""
    if retrieved:
        bullets = "\n".join(
            f"- [{r['handle']}] {r['body']}" for r in retrieved
        )
        context = f"# Retrieved scraps (the corpus):\n{bullets}\n"
    else:
        context = "# Retrieved scraps:\n(the corpus is empty for this query)\n"

    user = f"{context}\n# Question from a participant:\n{question}\n"

    res = client().models.generate_content(
        model=ANSWER_MODEL,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=HAUSMEISTER_SYSTEM,
            temperature=0.7,
            max_output_tokens=400,
        ),
    )
    return (res.text or "").strip()


def answer_with_news(question: str, retrieved: list[dict], news: list[dict]) -> str:
    """Hausmeister answer that cross-references the corpus with current news."""
    corpus = (
        "\n".join(f"- [{r['handle']}] {r['body']}" for r in retrieved)
        if retrieved else "(empty)"
    )
    news_block = (
        "\n".join(
            f"- {n['title']}: {n['content'][:240]}…  ({n['url']})" for n in news
        )
        if news else "(no news returned)"
    )
    user = (
        f"# Retrieved scraps (the corpus):\n{corpus}\n\n"
        f"# Current news (Tavily):\n{news_block}\n\n"
        f"# Question:\n{question}\n\n"
        "Answer in Hausmeister voice. You may quote one short fragment from "
        "the news. Reference scraps by handle. 2–4 sentences."
    )
    res = client().models.generate_content(
        model=ANSWER_MODEL,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=HAUSMEISTER_SYSTEM,
            temperature=0.7,
            max_output_tokens=400,
        ),
    )
    return (res.text or "").strip()


def tagesbericht(
    *, time_label: str, report_index: int, n_scraps: int,
    top_scraps: list[dict], hours_to_deadline: int,
) -> dict:
    """Generate a Tagesbericht. Returns {intro, sections, cited}."""
    lines = "\n".join(f"  - [{s['handle']}] {s['body']}" for s in top_scraps)
    prompt = TAGESBERICHT_PROMPT.format(
        time_label=time_label,
        report_index=report_index,
        n_scraps=n_scraps,
        top_scraps=lines or "  (the corpus is empty)",
        hours_to_deadline=hours_to_deadline,
    )
    res = client().models.generate_content(
        model=ANSWER_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=HAUSMEISTER_SYSTEM,
            temperature=0.6,
            max_output_tokens=900,
            response_mime_type="application/json",
        ),
    )
    raw = (res.text or "").strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)

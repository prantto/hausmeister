"""Real-time voice loop for /talk, built on Gradium's `gradbot` framework.

Why gradbot: it's Gradium's official open-source voice-agent multiplexer
— Rust core, Python bindings — and it bundles the parts we'd otherwise
hand-roll: streaming Gradium STT/TTS, VAD, turn-taking, barge-in, audio
timing back to the browser.

Pipeline per /voice/stream connection:

    browser mic (PCM via the bundled audio-processor.js + worklet)
      → FastAPI WS  (gradbot.websocket.handle_session)
      → gradbot Rust multiplexer
          ├─ Gradium STT (streaming)
          ├─ LLM via OpenAI-compatible endpoint (Gemini 2.5 Flash)
          │     └─ tool: lookup_corpus(query)  →  pgvector retrieval
          └─ Gradium TTS (streaming, chosen voice_id)
      → audio + transcript + audio_timing back to browser

RAG enters via the `lookup_corpus` tool: the Hausmeister system prompt
instructs the LLM to call it on every user turn before answering, with
the user's question as the query. We embed, run pgvector cosine, and
return the top scraps as JSON. The LLM then grounds its reply in the
returned scraps.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import gradbot
from fastapi import WebSocket

from . import db, llm
from .prompts import HAUSMEISTER_SYSTEM

logger = logging.getLogger("hausmeister.voice_stream")


LOOKUP_CORPUS_TOOL = gradbot.ToolDef(
    "lookup_corpus",
    (
        "Look up scraps from the COMPOST corpus that are relevant to a "
        "question. Always call this BEFORE answering any question about "
        "the corpus, the hackathon, participants, mentors, sponsors, or "
        "what people have submitted. Returns up to 12 scraps as JSON, "
        "each with handle, body, and similarity score."
    ),
    json.dumps({
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "The user's question, paraphrased into a retrieval "
                    "query. Keep it short. English is fine even if the "
                    "user spoke German."
                ),
            }
        },
        "required": ["query"],
    }),
)


async def _lookup_corpus(query: str, *, k: int = 12) -> list[dict]:
    """Same shape as POST /ask retrieval — kept in sync so the live agent
    grounds its answers on the same pgvector index."""
    query = (query or "").strip()
    if not query:
        return []
    try:
        qvec = llm.embed(query)
    except Exception as exc:
        logger.warning("embed failed in tool call: %s", exc)
        return []
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT id, handle, body, 1 - (embedding <=> %s::vector) AS score
                FROM scraps
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (qvec, qvec, k),
            )
            rows = await cur.fetchall()
    return [
        {"handle": r[1], "body": r[2], "score": round(float(r[3]), 3)}
        for r in rows
    ]


def _make_session_config(start_msg: dict) -> gradbot.SessionConfig:
    """Build the gradbot SessionConfig from the browser's `start` payload.

    The browser sends `{type:"start", voice_id, language}` based on what
    the user picked from the /api/voices catalog. We fall back to env
    defaults so /talk still boots if the picker UI is bypassed."""
    voice_id = start_msg.get("voice_id") or os.environ.get("GRADIUM_VOICE_ID") or "default"
    language_str = (start_msg.get("language") or "en").lower()
    language = gradbot.LANGUAGES.get(language_str)

    cfg = gradbot.config.from_env()
    return gradbot.SessionConfig(
        voice_id=voice_id,
        language=language,
        instructions=HAUSMEISTER_SYSTEM,
        tools=[LOOKUP_CORPUS_TOOL],
        **({"assistant_speaks_first": True} | cfg.session_kwargs),
    )


async def _handle_tool_call(
    handle,
    _input_handle: gradbot.SessionInputHandle,
    _ws: WebSocket,
) -> None:
    """Route gradbot tool calls. Currently just `lookup_corpus`."""
    if handle.name == "lookup_corpus":
        query = (handle.args or {}).get("query") or ""
        scraps = await _lookup_corpus(query)
        # Keep the payload tight — the LLM only needs handle + body to
        # quote and attribute.
        await handle.send_json({
            "scraps": [
                {"handle": s["handle"], "body": s["body"], "score": s["score"]}
                for s in scraps
            ],
            "count": len(scraps),
        })
        return
    await handle.send_error(f"unknown tool: {handle.name}")


async def run(ws: WebSocket) -> None:
    """Entrypoint called from app/main.py for each /voice/stream connection.

    `gradbot.websocket.handle_session` accepts the websocket itself and
    drives the whole conversation. We do NOT call ws.accept() — gradbot
    does that internally after wiring the audio pipeline."""
    cfg = gradbot.config.from_env()
    if not cfg.gradium.api_key:
        # Without Gradium creds, the multiplexer can't open STT/TTS.
        await ws.accept()
        await ws.send_json({"type": "error", "message": "GRADIUM_API_KEY not configured"})
        await ws.close()
        return
    if not cfg.llm.api_key:
        await ws.accept()
        await ws.send_json({"type": "error", "message": "LLM_API_KEY not configured"})
        await ws.close()
        return

    await gradbot.websocket.handle_session(
        ws,
        config=cfg,
        on_start=_make_session_config,
        on_tool_call=_handle_tool_call,
    )


def setup_routes(app: Any) -> None:
    """Mount gradbot's helper routes (/api/voices, /api/audio-config) on
    the FastAPI app so the frontend can fetch the Gradium voice catalog
    and the PCM/Opus toggle."""
    cfg = gradbot.config.from_env()
    gradbot.routes.setup(app, config=cfg, with_voices=True)

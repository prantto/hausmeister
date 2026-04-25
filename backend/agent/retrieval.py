"""Async pgvector retrieval for the live agent. Mirrors the /ask endpoint
but lives in the agent process so we don't add an HTTP hop on every turn."""

import os
from typing import Optional

import psycopg
from psycopg_pool import AsyncConnectionPool
from pgvector.psycopg import register_vector_async
from google import genai

EMBED_MODEL = "text-embedding-004"

_pool: Optional[AsyncConnectionPool] = None
_genai: Optional[genai.Client] = None


async def _configure(conn: psycopg.AsyncConnection) -> None:
    await register_vector_async(conn)


async def init() -> None:
    global _pool, _genai
    if _pool is None:
        dsn = os.environ["DATABASE_URL"]
        _pool = AsyncConnectionPool(dsn, min_size=1, max_size=4, configure=_configure, open=False)
        await _pool.open()
    if _genai is None:
        _genai = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


async def close() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def retrieve(question: str, k: int = 12) -> list[dict]:
    if _pool is None or _genai is None:
        await init()
    res = _genai.models.embed_content(model=EMBED_MODEL, contents=question)
    qvec = list(res.embeddings[0].values)

    async with _pool.connection() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT handle, body, 1 - (embedding <=> %s) AS score
                FROM scraps
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                (qvec, qvec, k),
            )
            rows = await cur.fetchall()
    return [{"handle": r[0], "body": r[1], "score": float(r[2])} for r in rows]

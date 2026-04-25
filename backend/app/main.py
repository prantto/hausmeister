"""Hausmeister FastAPI app. Two endpoints carry the core loop:
- POST /scrap  — run filter, embed, store
- POST /ask    — embed question, retrieve top-k, ask the Hausmeister
"""

import os
from contextlib import asynccontextmanager
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import db, llm
from .schemas import AskIn, AskOut, CitedScrap, ScrapIn, ScrapOut

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="Hausmeister", lifespan=lifespan)

origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/scrap", response_model=ScrapOut)
async def submit_scrap(payload: ScrapIn):
    verdict = llm.filter_scrap(payload.body)

    if not verdict.get("safe", True):
        # We don't store rejected scraps — just count them, per SPEC.md.
        return ScrapOut(
            id=UUID(int=0),
            handle=payload.handle,
            body=payload.body,
            kind=payload.kind,
            funny_score=0,
            tags=[],
            created_at=__import__("datetime").datetime.utcnow(),
            accepted=False,
            safety_reason=verdict.get("safety_reason"),
        )

    body_to_store = verdict.get("redaction") or payload.body
    funny = int(verdict.get("funny") or 0)
    funny_reason = verdict.get("funny_reason")
    tags = verdict.get("tags") or []

    embedding = llm.embed(body_to_store)

    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO scraps (handle, body, kind, funny_score, funny_reason, tags, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (
                    payload.handle,
                    body_to_store,
                    payload.kind,
                    funny,
                    funny_reason,
                    tags,
                    embedding,
                ),
            )
            row = await cur.fetchone()
        await c.commit()

    new_id, created = row
    return ScrapOut(
        id=new_id,
        handle=payload.handle,
        body=body_to_store,
        kind=payload.kind,
        funny_score=funny,
        funny_reason=funny_reason,
        tags=tags,
        created_at=created,
        accepted=True,
    )


@app.post("/ask", response_model=AskOut)
async def ask(payload: AskIn):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question is empty")

    qvec = llm.embed(payload.question)

    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT id, handle, body, 1 - (embedding <=> %s) AS score
                FROM scraps
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s
                LIMIT 20
                """,
                (qvec, qvec),
            )
            rows = await cur.fetchall()

    retrieved = [{"id": r[0], "handle": r[1], "body": r[2], "score": float(r[3])} for r in rows]
    answer_text = llm.answer(payload.question, retrieved)

    return AskOut(
        answer=answer_text,
        cited=[CitedScrap(id=r["id"], handle=r["handle"], body=r["body"], score=r["score"]) for r in retrieved[:5]],
    )

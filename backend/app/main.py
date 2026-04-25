"""Hausmeister FastAPI app. Two endpoints carry the core loop:
- POST /scrap  — run filter, embed, store
- POST /ask    — embed question, retrieve top-k, ask the Hausmeister
"""

import os
from contextlib import asynccontextmanager
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from . import db, llm
from .schemas import (
    AdminScrap,
    AskIn,
    AskOut,
    CitedScrap,
    ScrapIn,
    ScrapOut,
    WallFeed,
    WallScrap,
)

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


def require_admin(x_admin_password: str = Header(default="")) -> None:
    expected = os.environ.get("ADMIN_PASSWORD")
    if not expected or x_admin_password != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad password")


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/wall", response_model=WallFeed)
async def wall(limit: int = 8, min_score: int = 6):
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT id, handle, body, funny_score, created_at
                FROM scraps
                WHERE funny_score >= %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (min_score, limit),
            )
            rows = await cur.fetchall()
            await cur.execute("SELECT count(*) FROM scraps")
            (total,) = await cur.fetchone()
            await cur.execute("SELECT count(*) FROM scraps WHERE funny_score >= %s", (min_score,))
            (on_wall,) = await cur.fetchone()

    scraps = [WallScrap(id=r[0], handle=r[1], body=r[2], funny_score=r[3] or 0, created_at=r[4]) for r in rows]
    return WallFeed(scraps=scraps, counts={"total": total, "on_wall": on_wall})


@app.get("/admin/scraps", response_model=list[AdminScrap], dependencies=[Depends(require_admin)])
async def admin_list(limit: int = 100):
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT id, handle, body, kind, funny_score, tags, created_at
                FROM scraps
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = await cur.fetchall()
    return [
        AdminScrap(
            id=r[0], handle=r[1], body=r[2], kind=r[3],
            funny_score=r[4], tags=list(r[5] or []), created_at=r[6],
        )
        for r in rows
    ]


@app.delete("/admin/scraps/{scrap_id}", dependencies=[Depends(require_admin)])
async def admin_delete(scrap_id: UUID):
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute("DELETE FROM scraps WHERE id = %s", (scrap_id,))
            deleted = cur.rowcount
        await c.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="not found")
    return {"deleted": str(scrap_id)}


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

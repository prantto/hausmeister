"""Hausmeister FastAPI app. Two endpoints carry the core loop:
- POST /scrap  — run filter, embed, store
- POST /ask    — embed question, retrieve top-k, ask the Hausmeister
"""

import os
from contextlib import asynccontextmanager
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import db, livekit_token, llm, news, voice
from .schemas import (
    AdminScrap,
    AskIn,
    AskNewsOut,
    AskOut,
    CitedScrap,
    NewsHit,
    ScrapIn,
    ScrapOut,
    TagesberichtOut,
    TagesberichtSection,
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


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="empty audio")
    if len(audio) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="audio too large")
    try:
        text = await voice.transcribe(audio, file.content_type or "audio/webm")
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"text": text}


class TTSIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice_id: str | None = None


@app.post("/tts")
async def tts(payload: TTSIn):
    try:
        audio, ctype = await voice.synthesize(payload.text, voice_id=payload.voice_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return Response(content=audio, media_type=ctype)


class VoiceTokenIn(BaseModel):
    handle: str = Field(min_length=1, max_length=64)


class VoiceTokenOut(BaseModel):
    token: str
    url: str
    room: str


@app.post("/voice/token", response_model=VoiceTokenOut)
async def voice_token(payload: VoiceTokenIn):
    """Mint a LiveKit access token. The browser uses this to join a room;
    the Hausmeister voice agent worker is dispatched into the same room."""
    livekit_url = os.environ.get("LIVEKIT_URL")
    if not livekit_url:
        raise HTTPException(status_code=503, detail="LIVEKIT_URL not configured")
    try:
        room = livekit_token.room_for_handle(payload.handle)
        token = livekit_token.mint_token(identity=payload.handle, room=room)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return VoiceTokenOut(token=token, url=livekit_url, room=room)


_TAGESBERICHT_CACHE: dict = {}  # 5-minute LLM cache so repeated wall pulls are cheap


@app.get("/tagesbericht", response_model=TagesberichtOut)
async def get_tagesbericht(top: int = 12, refresh: bool = False):
    import datetime as dt

    cached = _TAGESBERICHT_CACHE.get("v")
    if cached and not refresh and (dt.datetime.utcnow() - cached["generated_at"]).total_seconds() < 300:
        return cached["payload"]

    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT handle, body
                FROM scraps
                ORDER BY funny_score DESC NULLS LAST, created_at DESC
                LIMIT %s
                """,
                (top,),
            )
            rows = await cur.fetchall()
            await cur.execute("SELECT count(*) FROM scraps")
            (total,) = await cur.fetchone()

    top_scraps = [{"handle": r[0], "body": r[1]} for r in rows]
    now = dt.datetime.utcnow()
    weekday = now.strftime("%A").upper()
    time_label = f"{weekday} · {now.strftime('%H:%M')}"
    deadline = now.replace(hour=14, minute=0, second=0, microsecond=0)
    while deadline.weekday() != 6:  # Sunday
        deadline += dt.timedelta(days=1)
    hours_to_deadline = max(0, int((deadline - now).total_seconds() // 3600))

    try:
        body = llm.tagesbericht(
            time_label=time_label,
            report_index=2,
            n_scraps=total,
            top_scraps=top_scraps,
            hours_to_deadline=hours_to_deadline,
        )
        sections = [TagesberichtSection(**s) for s in body.get("sections", [])]
        cited = list(body.get("cited") or [])
        intro = body.get("intro", "")
    except Exception as exc:
        # Soft fallback so /tagesbericht always returns something for the demo.
        sections = [
            TagesberichtSection(
                h="Corpus health",
                body=f"{total} scraps total. The remainder is your fault.",
            ),
            TagesberichtSection(
                h="Forecast",
                body=f"{hours_to_deadline} hours to deadline. The Hausmeister leaves at 14:01.",
            ),
        ]
        cited = [s["handle"] for s in top_scraps[:5]]
        intro = f"Na ja. Generator offline ({type(exc).__name__}). The Hausmeister continues to sweep."

    payload = TagesberichtOut(
        nr=2,
        date=time_label,
        intro=intro,
        sections=sections,
        cited=cited,
        counts={"total": total, "top_used": len(top_scraps)},
        generated_at=now,
    )
    _TAGESBERICHT_CACHE["v"] = {"payload": payload, "generated_at": now}
    return payload


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


@app.post("/ask-the-news", response_model=AskNewsOut)
async def ask_the_news(payload: AskIn):
    """Stretch endpoint: cross-reference the corpus with current news via Tavily.
    Returns 503 if TAVILY_API_KEY isn't configured."""
    if not news.enabled():
        raise HTTPException(status_code=503, detail="news search not configured")

    qvec = llm.embed(payload.question)
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute(
                """
                SELECT id, handle, body, 1 - (embedding <=> %s) AS score
                FROM scraps
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s
                LIMIT 12
                """,
                (qvec, qvec),
            )
            rows = await cur.fetchall()

    retrieved = [{"id": r[0], "handle": r[1], "body": r[2], "score": float(r[3])} for r in rows]
    hits = await news.search(payload.question, max_results=5)
    answer_text = llm.answer_with_news(payload.question, retrieved, hits)

    return AskNewsOut(
        answer=answer_text,
        cited=[CitedScrap(id=r["id"], handle=r["handle"], body=r["body"], score=r["score"]) for r in retrieved[:5]],
        news=[NewsHit(title=h["title"], url=h["url"]) for h in hits],
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

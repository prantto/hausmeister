# Hausmeister

A RAG-based hackathon social app. Throw scraps onto the
**Komposthaufen**, ask Der Hausmeister questions about the corpus,
watch the live `/wall`. Built for Big Berlin Hack 2026.

The product spec is in [SPEC.md](SPEC.md). The visual design system
this is built against is the bundle exported from Claude Design (see
the `compost/` files referenced in early commits).

---

## Layout

```
backend/    FastAPI on Cloud Run
  app/      main.py, llm.py, db.py, prompts.py, schemas.py, news.py
  init.sql  single schema file (pgvector + scraps + hausregeln)
  seed.py   loads 30 design-bundle scraps + 20 Hausregeln
frontend/   Vite + React + React Router
  src/screens/  Onboarding, Chat, Submit, Rules, Wall, Tagesbericht, Admin
  src/styles/   tokens.css (design system, OKLCH), app.css
docker-compose.yml  pgvector/pgvector + the FastAPI image
```

---

## Run it locally

You need a `GEMINI_API_KEY` for the LLM calls. Without it the API
boots, but `/scrap`, `/ask`, `/transcribe`, and `/tagesbericht` will
fail.

### 1. Backend + Postgres via docker-compose

```bash
export GEMINI_API_KEY=...
export GRADIUM_API_KEY=...        # voice in + out
export GRADIUM_VOICE_ID=...       # pick from your Gradium voice library
export ADMIN_PASSWORD=change-me   # for /admin
export TAVILY_API_KEY=...         # optional, enables /ask-the-news

docker compose up --build
```

The first boot applies [`backend/init.sql`](backend/init.sql) so the
`vector` and `pgcrypto` extensions and the `scraps` / `hausregeln`
tables exist.

### 2. Seed the corpus

```bash
docker compose exec api python seed.py
```

Loads the 30 design-bundle scraps (with real embeddings) and 20
Hausregeln. Idempotent.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173. Routes:

- `/` — auto-routes to `/onboarding` or `/chat`
- `/onboarding` — handle generator (`kartoffel-04` style), localStorage
- `/chat` — talk to Der Hausmeister (RAG over the corpus)
- `/submit` — drop a scrap (text or voice via mic)
- `/rules` — Hausregeln board
- `/wall` — projector view, polls `/wall` every 8s
- `/tagesbericht` — generated daily report, click ↻ to regenerate
- `/admin` — kill-switch (X-Admin-Password = `ADMIN_PASSWORD`)

Override the API base with `VITE_API_URL` (see
[`frontend/.env.example`](frontend/.env.example)).

---

## API surface

| Method | Path                     | What |
|--------|--------------------------|------|
| POST   | `/scrap`                 | Run safety+funny filter, embed, store. Returns `accepted: false` for unsafe scraps (not stored, only counted). |
| POST   | `/ask`                   | Embed question, retrieve top-20 by cosine, ask Gemini 2.5 Pro. Returns answer + cited handles. |
| POST   | `/transcribe`            | Multipart audio → transcript via Gradium STT (WebSocket). |
| POST   | `/tts`                   | `{text, voice_id?}` → WAV bytes from Gradium TTS. |
| GET    | `/wall?limit=&min_score=`| Top scraps by score + corpus counts. |
| GET    | `/tagesbericht?refresh=` | Generated daily report. 5-minute LLM cache; `?refresh=true` busts it. |
| GET    | `/admin/scraps`          | Recent scraps. Header: `X-Admin-Password`. |
| DELETE | `/admin/scraps/{id}`     | Purge a scrap. Header: `X-Admin-Password`. |
| POST   | `/ask-the-news`          | Stretch: cross-reference corpus with Tavily news. 503 if `TAVILY_API_KEY` unset. |
| GET    | `/health`                | Liveness. |

---

## Voice

All voice tasks route through **Gradium** (sponsor constraint).

- **Input:** browser `MediaRecorder` records webm/opus → `POST /transcribe`
  → server transcodes to 24 kHz mono WAV via ffmpeg → streams over the
  Gradium ASR WebSocket (`wss://api.gradium.ai/api/speech/asr`) → returns
  the joined transcript.
- **Output:** chat composer ♪ toggle calls `POST /tts` → server hits
  Gradium TTS (`/api/post/speech/tts`) with the configured `voice_id`
  → browser plays the returned WAV. One in-flight utterance at a time.

Set `GRADIUM_API_KEY` and `GRADIUM_VOICE_ID`. The Docker image installs
ffmpeg automatically.

---

## Models

Constrained to Flash / Flash Lite:

- **Gemini 2.5 Flash** — `/ask`, `/ask-the-news`, `/tagesbericht`
  (the Hausmeister voice).
- **Gemini 2.5 Flash Lite** — submission safety+funny filter, for
  sub-second feedback on `/scrap`.
- **Gradium STT + TTS** — all voice tasks (`/transcribe`, `/tts`).
- **text-embedding-004** — 768-dim corpus embeddings, ivfflat cosine
  index.

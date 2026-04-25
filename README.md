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
backend/
  app/      FastAPI: main.py, llm.py, db.py, voice.py, prompts.py, news.py,
            schemas.py, livekit_token.py
  agent/    LiveKit voice agent worker (Gradium STT/TTS + ai-coustics
            denoise + Gemini Flash + pgvector RAG)
  init.sql  single schema file (pgvector + scraps + hausregeln)
  seed.py   loads 30 design-bundle scraps + 20 Hausregeln
frontend/   Vite + React + React Router
  src/screens/  Onboarding, Chat, Submit, Rules, Wall, Tagesbericht,
                Admin, Talk (real-time)
  src/styles/   tokens.css (design system, OKLCH), app.css
docker-compose.yml  pgvector/pgvector + FastAPI api + voice agent worker
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
export LIVEKIT_URL=wss://...      # LiveKit Cloud, for /talk
export LIVEKIT_API_KEY=...
export LIVEKIT_API_SECRET=...
export ADMIN_PASSWORD=change-me   # for /admin
export TAVILY_API_KEY=...         # optional, enables /ask-the-news

docker compose up --build
```

The `agent` service registers with LiveKit on boot and waits for
participants to join rooms named `hm-<handle>-<short>`. If you don't
have LiveKit credentials yet, omit them and the rest of the app still
works — `/talk` will surface a clean offline error.

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
- `/talk` — real-time voice conversation (LiveKit room, ai-coustics denoise)

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
| POST   | `/voice/token`           | `{handle}` → LiveKit `{token, url, room}` for real-time `/talk`. |
| GET    | `/wall?limit=&min_score=`| Top scraps by score + corpus counts. |
| GET    | `/tagesbericht?refresh=` | Generated daily report. 5-minute LLM cache; `?refresh=true` busts it. |
| GET    | `/admin/scraps`          | Recent scraps. Header: `X-Admin-Password`. |
| DELETE | `/admin/scraps/{id}`     | Purge a scrap. Header: `X-Admin-Password`. |
| POST   | `/ask-the-news`          | Stretch: cross-reference corpus with Tavily news. 503 if `TAVILY_API_KEY` unset. |
| GET    | `/health`                | Liveness. |

---

## Voice

All voice tasks route through **Gradium** (sponsor constraint). There are
two flows depending on whether the user is in a discrete record-then-send
loop (`/chat`, `/submit`) or in a real-time conversation (`/talk`).

### Discrete record-then-send (`/transcribe`, `/tts`)

- **Input:** browser `MediaRecorder` records webm/opus → `POST /transcribe`
  → server transcodes to 24 kHz mono WAV via ffmpeg → streams over the
  Gradium ASR WebSocket (`wss://api.gradium.ai/api/speech/asr`) → returns
  the joined transcript.
- **Output:** chat composer ♪ toggle calls `POST /tts` → server hits
  Gradium TTS (`/api/post/speech/tts`) with the configured `voice_id`
  → browser plays the returned WAV. One in-flight utterance at a time.

### Real-time conversation (`/talk` → LiveKit + ai-coustics agent)

- Browser hits `POST /voice/token`, joins the returned LiveKit room with
  `livekit-client`, publishes the mic. Server-side noise cancellation is
  handled by **ai-coustics** in the agent worker (no WASM in the bundle).
- The voice agent worker (`backend/agent/`) runs the LiveKit Agents
  framework with **Gradium STT** + **Gradium TTS** plugins and
  **`ai_coustics.audio_enhancement()`** as `room_input_options.noise_cancellation`.
- On each user turn, `Hausmeister.on_user_turn_completed` runs pgvector
  retrieval over the corpus and stuffs the top scraps into the chat
  context as a transient system message before the Gemini Flash call —
  the live agent gets the same RAG grounding as `POST /ask`.

Set `GRADIUM_API_KEY` + `GRADIUM_VOICE_ID` and `LIVEKIT_URL` +
`LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`. The Docker image installs
ffmpeg automatically. The `agent` service in compose runs the worker.

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

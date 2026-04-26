# Hausmeister

A RAG-based hackathon social app. Throw scraps onto the
**Komposthaufen**, ask Der Hausmeister questions about the corpus,
talk to him in real time over a noisy room, watch the live `/wall`.
Built for Big Berlin Hack 2026.

The product spec is in [SPEC.md](SPEC.md). The visual design system
this is built against is the bundle exported from Claude Design (see
the `compost/` files referenced in early commits).

---

## Layout

```
backend/
  app/      FastAPI: main.py, llm.py, db.py, voice.py, voice_stream.py,
            prompts.py, news.py, schemas.py
  init.sql  single schema file (pgvector + scraps + hausregeln)
  seed.py   loads 30 design-bundle scraps + 20 Hausregeln
frontend/   Vite + React + React Router
  public/gradbot/  bundled gradbot audio pipeline (Opus + AudioWorklets)
  src/screens/  Onboarding, Chat, Submit, Rules, Wall, Tagesbericht,
                Admin, Talk (real-time, gradbot-powered)
  src/lib/      api.js, tts.js, voiceStream.js, aicoustics.js
  src/styles/   tokens.css (design system, OKLCH), app.css
docker-compose.yml  pgvector/pgvector + FastAPI api
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

There's just one app service (`api`) plus Postgres. The real-time
`/talk` flow runs inside the API process — a single WebSocket per
participant — so there's no separate worker to start.

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
- `/talk` — real-time voice conversation (single WebSocket, ai-coustics denoise)

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
| WS     | `/voice/stream`          | Real-time voice loop for `/talk`, driven by gradbot. Browser sends `{type:"start", voice_id, language}` then audio frames; server streams transcripts + audio + audio_timing back. |
| GET    | `/api/voices`            | Gradium voice catalog (uid, name, language, gender, description). Backs the picker on `/talk`. |
| GET    | `/api/audio-config`      | `{pcm: bool}` — whether to use raw PCM or OggOpus on the live WS. |
| GET    | `/wall?limit=&min_score=`| Top scraps by score + corpus counts. |
| GET    | `/tagesbericht?refresh=` | Generated daily report. 5-minute LLM cache; `?refresh=true` busts it. |
| GET    | `/admin/scraps`          | Recent scraps. Header: `X-Admin-Password`. |
| DELETE | `/admin/scraps/{id}`     | Purge a scrap. Header: `X-Admin-Password`. |
| POST   | `/ask-the-news`          | Stretch: cross-reference corpus with Tavily news. 503 if `TAVILY_API_KEY` unset. |
| GET    | `/health`                | Liveness. |

---

## Voice

All voice tasks route through **Gradium** (sponsor constraint), with
**ai-coustics** doing the noise cancellation. There are two flows
depending on whether the user is in a discrete record-then-send loop
(`/chat`, `/submit`) or in a real-time conversation (`/talk`).

### Discrete record-then-send (`/transcribe`, `/tts`)

- **Input:** browser `MediaRecorder` records webm/opus → `POST /transcribe`
  → server transcodes to 24 kHz mono WAV via ffmpeg → streams over the
  Gradium ASR WebSocket (`wss://api.gradium.ai/api/speech/asr`) → returns
  the joined transcript.
- **Output:** chat composer ♪ toggle calls `POST /tts` → server hits
  Gradium TTS (`/api/post/speech/tts`) with the configured `voice_id`
  → browser plays the returned WAV. One in-flight utterance at a time.

### Real-time conversation (`/talk` → `/voice/stream` WebSocket, gradbot)

The live agent runs on top of Gradium's open-source
[**gradbot**](https://github.com/gradium-ai/gradbot) framework — Rust
multiplexer, Python bindings — which owns streaming STT/TTS, VAD,
turn-taking, and barge-in. Our code just plugs in the system prompt,
the voice id, and a single tool that does pgvector retrieval.

```
mic (getUserMedia)
  → ai-coustics Web SDK denoise (browser, in src/lib/aicoustics.js)
  → gradbot audio-processor.js (PCM or Opus, AudioWorklet)
  → WS /voice/stream → gradbot.websocket.handle_session
  → Gradium STT (streaming)
  → Gemini 2.5 Flash via OpenAI-compat endpoint
       └─ tool: lookup_corpus(query) → embed + pgvector cosine + top scraps
  → Gradium TTS (chosen voice_id)
  → audio + audio_timing + transcripts back over the same WS
```

The browser side: [`frontend/src/lib/voiceStream.js`](frontend/src/lib/voiceStream.js)
(WS + monkey-patched `getUserMedia` so the stream gradbot sees is
already denoised), [`frontend/src/lib/aicoustics.js`](frontend/src/lib/aicoustics.js)
(SDK loader, passthrough fallback), [`frontend/public/gradbot/`](frontend/public/gradbot/)
(bundled audio worklets from gradbot's Python package).

The server side: [`backend/app/voice_stream.py`](backend/app/voice_stream.py)
exposes `/voice/stream` and `/api/voices` and defines the `lookup_corpus`
tool. The Hausmeister system prompt instructs the LLM to call that tool
on every substantive turn before answering — same RAG grounding as
`POST /ask`.

To run live, set `GRADIUM_API_KEY` and either pick a voice in the UI or
set `GRADIUM_VOICE_ID` (uid from `/api/voices`). `LLM_BASE_URL` and
`LLM_MODEL` default to Gemini Flash via its OpenAI-compatible endpoint.
ai-coustics is loaded best-effort in the browser — if `VITE_AIC_API_KEY`
is missing or the SDK doesn't resolve, the mic falls through unprocessed
so the WS still works.

---

## Models

Constrained to Flash / Flash Lite:

- **Gemini 2.5 Flash** — `/ask`, `/ask-the-news`, `/tagesbericht`
  (the Hausmeister voice). Live `/talk` calls Flash through Gemini's
  OpenAI-compatible endpoint (driven by gradbot).
- **Gemini 2.5 Flash Lite** — submission safety+funny filter, for
  sub-second feedback on `/scrap`.
- **Gradium STT + TTS** — all voice tasks, both record-then-send
  (`/transcribe`, `/tts`) and live (`/voice/stream` via gradbot).
- **text-embedding-004** — 768-dim corpus embeddings, ivfflat cosine
  index. Same index used by `/ask` and the live `lookup_corpus` tool.

Read SPEC.md in this repo. That's the source of truth for what we're 
building. Project is Hausmeister — a RAG-based hackathon social app 
where users throw scraps onto the Komposthaufen and ask Der Hausmeister 
questions. We have 27 hours to ship.

Build order (don't skip ahead):

1. Scaffold the project per SPEC.md file structure. Backend: FastAPI 
   on Cloud Run. Frontend: separate React app (Vite). Vector store: 
   pgvector on Cloud SQL (simpler than managed alternatives at our 
   scale).

2. Get the core loop working end-to-end with text only, before any 
   voice or screen work:
   - POST /scrap (submit a scrap to the Komposthaufen, run safety+funny 
     filter, embed, store)
   - POST /ask (embed question, retrieve top 20, Hausmeister responds)
   - Minimal chat UI that calls both
   
   Test with the 30 pre-seeded scraps from SPEC.md. Don't move on 
   until Der Hausmeister gives a funny answer to a real question.

3. Add Gradium voice input on the chat UI. Voice → transcript → same 
   /scrap or /ask endpoint. Voice output for Hausmeister answers.

4. Build the /wall page (live screen feed) as a separate route. 
   Pulls from a queue of high-funny-score items, rotates with 
   Hausregeln and Tagesbericht. Auto-refreshes.

5. Build /admin page for kill-switch. Password-protect with a single 
   shared password in env var. List recent scraps, one-tap delete.

6. Pseudonymous handle generator on first visit, store in localStorage.

7. Stretch: Tavily integration for /ask-the-news endpoint. Skip if 
   behind schedule.

Constraints:
- Gemini 2.5 Pro for Hausmeister and Tagesbericht. Gemini Flash for 
  the filter (we want sub-second submission feedback).
- Keep it simple. No auth beyond pseudonymous handles. No migrations 
  framework — just a single init.sql.
- Every commit should leave main deployable. Cloud Run auto-deploys 
  from main.

Start with step 1. Show me the file tree you create before writing 
code, so I can sanity-check.
"""Seed the corpus with the 30 design-bundle scraps + 20 Hausregeln.
Idempotent: skips inserts if the table already has any rows.
Run with: python -m backend.seed   (or: cd backend && python seed.py)
"""

import asyncio
import os
import sys
from pathlib import Path

# Allow `python seed.py` from the backend dir.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv

from app import db, llm

load_dotenv()


SEED_SCRAPS = [
    ("kartoffel-04",   "text",  "team next to us has been arguing about whether to use postgres or supabase for 90 minutes. they have written zero code."),
    ("ledig-19",       "voice", "yo the espresso machine is already broken. it is hour two."),
    ("schimmel-77",    "text",  "the mentor from the big AI company just told a team to 'wrap GPT-4 in a chrome extension'. groundbreaking."),
    ("feierabend-12",  "text",  "vegan dinner ran out at 18:45. the people in the line behind it have unionised."),
    ("knoblauch-33",   "voice", "guy at the badge desk asked me if i was 'someone important'. wrong answer either way."),
    ("umlaut-88",      "text",  "team COMPOST has been arguing about the system prompt for the persona for an hour."),
    ("bahn-44",        "text",  "S-Bahn delayed 35 min. arrived to find my teammates have rewritten everything in rust. we are not shipping rust."),
    ("pfand-09",       "voice", "the energy drinks are sponsored by a company that sells software to health insurance companies."),
    ("tuerschloss-21", "text",  "found a guy asleep under the table at HOUR THREE. legend."),
    ("abfall-66",      "text",  "my teammate just said 'we should do this properly' which is hackathon for 'we are not finishing'."),
    ("sauerkraut-02",  "text",  "overheard: 'is this idea defensible' BROTHER YOU ARE BUILDING A TODO APP"),
    ("regenschirm-55", "voice", "Gemini API just rate-limited me for the third time. I am a single user."),
    ("fenster-71",     "text",  "the wall is showing scraps in real time and one team is now writing scraps about how the wall is showing scraps about them. recursive."),
    ("kissen-13",      "text",  "team across the room printed business cards. it is a hackathon. they have business cards."),
    ("matratze-29",    "voice", "i am told the silent room is 'silent' but a man is doing a sales call in there."),
    ("kaffee-86",      "text",  "first 'we should pivot' of the night spotted at table 14. cause of death: react native."),
    ("treppen-47",     "text",  "guy in the hallway is on a call with his girlfriend explaining what RAG is. she is winning."),
    ("lampe-90",       "voice", "i have been debugging a CORS error for 47 minutes. it was a typo."),
    ("vorhang-03",     "text",  "the night DJ is playing minimal techno at 4am as if we are not all writing python."),
    ("schluessel-58",  "text",  "sunrise. three teams have not gone to sleep. one team has been asleep since midnight. the second team will win."),
    ("aufzug-25",      "voice", "the breakfast croissants are warm and i am crying a little."),
    ("rasen-17",       "text",  "first demo rehearsal in the corner. the founder is gesturing wildly. there is no product behind him."),
    ("buegeleisen-41", "text",  "mentor just said 'have you considered an MCP server'. unsolicited. nobody asked."),
    ("geranie-08",     "voice", "Lovable just generated a landing page that says 'AI-Powered AI for AI'. we are shipping it."),
    ("klingel-62",     "text",  "lunch is currywurst and the vegan option is currywurst with a sign that says 'vegan'."),
    ("treppe-39",      "text",  "team B07 has a kanban board with 47 tickets and 0 done. they are 'organising'."),
    ("blume-74",       "text",  "the sponsor from the cloud company just said 'it scales'. it does not scale. it is a flask app."),
    ("muelltonne-15",  "voice", "my cofounder just used the word 'moat' and i felt my soul leave my body."),
    ("balkon-93",      "text",  "T-7 hours. nobody at table 9 is talking. they are either focused or divorced."),
    ("klempner-50",    "text",  "saw a team eat a pizza box. not the pizza. the box. they are tired."),
]

SEED_HAUSREGELN = [
    (1,  "Snoring in the silent room is permitted. Sales calls are not."),
    (2,  "If you say 'moat' you forfeit your dinner ticket. Final."),
    (3,  "Pivots after 02:00 are not pivots. They are surrenders."),
    (4,  "The espresso machine breaks at exactly hour two. Do not investigate."),
    (5,  "Business cards at a hackathon: see §2."),
    (6,  "One (1) demo rehearsal per hour. Anything more is performance art."),
    (7,  "'We should do this properly' is a confession."),
    (8,  "If your README mentions blockchain, the README is the product."),
    (9,  "Mentors who say 'have you considered MCP' must first define MCP. Without notes."),
    (10, "Sleeping under a table is not weakness. Sleeping AT a table is weakness."),
    (11, "Vegan currywurst is currywurst with a sticker. Do not start a fight."),
    (12, "Rust rewrites after Friday 22:00 are forbidden. The committee has spoken."),
    (13, "Kanban tickets are not progress. Closed tickets are progress. Learn the difference."),
    (14, "The S-Bahn is not your fault. Your commit history is."),
    (15, "If you must use the word 'defensible' about a todo app, you must apologise to the room."),
    (16, "Energy drinks may not be consumed in the silent room. The silent room is the silent room."),
    (17, "Landing-page generators that hallucinate the product are still landing pages. Ship it."),
    (18, "If you cry over warm croissants, the room shall pretend not to see."),
    (19, "CORS errors are typos. Always. Forever. Look again."),
    (20, "Submission deadline is Sunday 14:00. The Hausmeister does not negotiate. The Hausmeister leaves at 14:01."),
]


async def main() -> None:
    if not os.environ.get("GEMINI_API_KEY"):
        raise SystemExit("GEMINI_API_KEY not set; embeddings will fail.")
    if not os.environ.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL not set.")

    await db.init_pool()
    async with db.conn() as c:
        async with c.cursor() as cur:
            await cur.execute("SELECT count(*) FROM scraps")
            (existing,) = await cur.fetchone()
        if existing:
            print(f"scraps table already has {existing} rows; skipping seed.")
            await db.close_pool()
            return

        async with c.cursor() as cur:
            for handle, kind, body in SEED_SCRAPS:
                emb = llm.embed(body)
                await cur.execute(
                    """
                    INSERT INTO scraps (handle, body, kind, funny_score, tags, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (handle, body, kind, 7, [], emb),
                )
                print(f"  + {handle}: {body[:60]}…")

            for n, rule in SEED_HAUSREGELN:
                await cur.execute(
                    "INSERT INTO hausregeln (n, rule) VALUES (%s, %s) ON CONFLICT (n) DO NOTHING",
                    (n, rule),
                )
        await c.commit()

    await db.close_pool()
    print(f"seeded {len(SEED_SCRAPS)} scraps + {len(SEED_HAUSREGELN)} hausregeln.")


if __name__ == "__main__":
    asyncio.run(main())

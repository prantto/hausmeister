"""Hausmeister voice agent worker.

Joins a LiveKit room as a participant, denoises the human's input via
ai-coustics, transcribes via Gradium STT, asks Gemini Flash with our
RAG corpus, and speaks back via Gradium TTS.

Run locally:
    python -m agent.main dev

Run as a worker (production / docker):
    python -m agent.main start
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    llm as agent_llm,
)
from livekit.plugins import ai_coustics, gradium, google, silero

from prompts import HAUSMEISTER_SYSTEM
from . import retrieval

load_dotenv()

logger = logging.getLogger("hausmeister.agent")
logging.basicConfig(level=logging.INFO)


class Hausmeister(Agent):
    """The Hausmeister persona. on_user_turn_completed runs corpus
    retrieval and stuffs the top scraps into the chat context as a
    transient system message so the LLM call grounds its answer."""

    def __init__(self) -> None:
        super().__init__(instructions=HAUSMEISTER_SYSTEM)

    async def on_user_turn_completed(
        self, turn_ctx: agent_llm.ChatContext, new_message: agent_llm.ChatMessage
    ) -> None:
        text = (new_message.text_content or "").strip()
        if not text:
            return
        try:
            scraps = await retrieval.retrieve(text, k=12)
        except Exception as exc:
            logger.warning("retrieval failed: %s", exc)
            return
        if not scraps:
            return
        bullets = "\n".join(f"- [{s['handle']}] {s['body']}" for s in scraps)
        turn_ctx.add_message(
            role="system",
            content=(
                "# Retrieved scraps (the corpus). Reference these by handle "
                "in your reply; do not invent any others.\n" + bullets
            ),
        )


async def entrypoint(ctx: JobContext) -> None:
    await retrieval.init()
    await ctx.connect()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=gradium.STT(),
        llm=google.LLM(model="gemini-2.5-flash", temperature=0.7),
        tts=gradium.TTS(voice_id=os.environ.get("GRADIUM_VOICE_ID", "default")),
        allow_interruptions=True,
    )

    await session.start(
        agent=Hausmeister(),
        room=ctx.room,
        room_input_options={
            "noise_cancellation": ai_coustics.audio_enhancement(),
        },
    )

    # First-line greeting so the user knows the Hausmeister is on duty.
    await session.say(
        "Na ja. Der Hausmeister is on duty. What did you see?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

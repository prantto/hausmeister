"""Gradium voice — STT (WebSocket) and TTS (REST).

All voice tasks (transcription + synthesis) route through Gradium per the
sponsor constraint. Browser-recorded audio (typically webm/opus from
MediaRecorder) is transcoded to 24 kHz mono 16-bit WAV server-side via
ffmpeg before being streamed to the Gradium ASR WebSocket.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import subprocess
from typing import Optional

import httpx
import websockets

STT_URL = "wss://api.gradium.ai/api/speech/asr"
TTS_URL = "https://api.gradium.ai/api/post/speech/tts"

# Gradium STT expects 80 ms chunks (1920 samples @ 24 kHz, 16-bit, mono =
# 3840 bytes). We chunk the WAV payload after stripping the 44-byte header
# so the server sees one continuous PCM stream.
_PCM_CHUNK_BYTES = 1920 * 2


def _api_key() -> str:
    key = os.environ.get("GRADIUM_API_KEY")
    if not key:
        raise RuntimeError("GRADIUM_API_KEY not set")
    return key


def _voice_id() -> str:
    return os.environ.get("GRADIUM_VOICE_ID", "default")


def _to_wav(audio: bytes) -> bytes:
    """Transcode anything ffmpeg can read into 24 kHz mono 16-bit WAV.

    The browser produces webm/opus or audio/mp4 depending on platform;
    Gradium STT only takes pcm/wav/opus (Ogg-wrapped). WAV is the safe
    common ground.
    """
    proc = subprocess.run(
        [
            "ffmpeg", "-loglevel", "error",
            "-i", "pipe:0",
            "-ar", "24000", "-ac", "1", "-f", "wav", "pipe:1",
        ],
        input=audio,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode(errors='ignore')[:300]}")
    return proc.stdout


async def transcribe(audio: bytes, mime_type: str = "audio/webm") -> str:
    """One-shot transcription via Gradium STT WebSocket. Streams the audio in
    once, collects all `text` segments, joins them in order."""
    wav = _to_wav(audio)

    parts: list[tuple[float, str]] = []
    headers = [("x-api-key", _api_key())]

    async with websockets.connect(STT_URL, additional_headers=headers, max_size=8 * 1024 * 1024) as ws:
        await ws.send(json.dumps({
            "type": "setup",
            "model_name": os.environ.get("GRADIUM_STT_MODEL", "default"),
            "input_format": "wav",
        }))
        ready = json.loads(await ws.recv())
        if ready.get("type") != "ready":
            raise RuntimeError(f"unexpected setup reply: {ready}")

        # Send the WAV header + PCM body in 80 ms PCM-sized chunks. Gradium
        # tolerates the header at the start since input_format=wav.
        for i in range(0, len(wav), _PCM_CHUNK_BYTES):
            chunk = wav[i : i + _PCM_CHUNK_BYTES]
            await ws.send(json.dumps({
                "type": "audio",
                "audio": base64.b64encode(chunk).decode("ascii"),
            }))

        await ws.send(json.dumps({"type": "end_of_stream"}))

        # Drain until the server closes or sends end_of_stream / error.
        try:
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=30.0)
                msg = json.loads(raw)
                t = msg.get("type")
                if t == "text":
                    parts.append((float(msg.get("start_s") or 0), msg.get("text") or ""))
                elif t == "end_of_stream":
                    break
                elif t == "error":
                    raise RuntimeError(f"Gradium STT error: {msg.get('message')}")
        except asyncio.TimeoutError:
            pass
        except websockets.ConnectionClosed:
            pass

    parts.sort(key=lambda x: x[0])
    return " ".join(p for _, p in parts if p).strip()


async def synthesize(text: str, *, voice_id: Optional[str] = None,
                     output_format: str = "wav") -> tuple[bytes, str]:
    """Render `text` to audio via Gradium TTS. Returns (bytes, content_type)."""
    payload = {
        "text": text,
        "voice_id": voice_id or _voice_id(),
        "output_format": output_format,
        "only_audio": True,
    }
    async with httpx.AsyncClient(timeout=30.0) as cli:
        r = await cli.post(
            TTS_URL,
            headers={"x-api-key": _api_key()},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Gradium TTS {r.status_code}: {r.text[:300]}")
        ctype = r.headers.get("content-type", "audio/wav")
        return r.content, ctype

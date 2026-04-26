// Browser-side voice loop for /talk, talking to the FastAPI gradbot
// session at /voice/stream.
//
// We rely on gradbot's bundled SyncedAudioPlayer (loaded as a global via
// <script> in index.html). It owns the mic, the Opus encoder/decoder,
// the playback worklet, and the audio_timing → text sync.
//
// Where ai-coustics enters: SyncedAudioPlayer calls
// `navigator.mediaDevices.getUserMedia` itself. We monkey-patch that
// call for the duration of the session so that the MediaStream gradbot
// receives has already been denoised by the ai-coustics SDK. When the
// session ends we restore the original implementation.

import { BASE, voiceStreamUrl } from "./api.js";
import { enhanceStream } from "./aicoustics.js";

export async function connect({
  voiceId,
  language = "en",
  echoCancellation = true,
  onState,
  onTranscript,
  onEvent,
  onError,
} = {}) {
  if (typeof window.SyncedAudioPlayer !== "function") {
    throw new Error(
      "gradbot audio bundle missing — check index.html script tags"
    );
  }

  // Find out whether the server wants raw PCM or Opus for the inbound
  // audio. (Outbound encoding is set by gradbot's audio-processor.js.)
  let pcmOutput = false;
  try {
    const res = await fetch(`${BASE}/api/audio-config`);
    if (res.ok) pcmOutput = !!(await res.json()).pcm;
  } catch {
    /* ignore — default to Opus */
  }

  // Patch getUserMedia → ai-coustics → gradbot. We restore on leave.
  const realGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices,
  );
  let patched = false;
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const raw = await realGetUserMedia(constraints);
    try {
      return await enhanceStream(raw);
    } catch (e) {
      console.warn("[voice] enhanceStream threw, using raw mic:", e);
      return raw;
    }
  };
  patched = true;

  let ws;
  let player;
  const turns = new Map(); // turnIdx → "user" | "haus", for transcript dedupe

  const fail = (err) => {
    if (onError) onError(typeof err === "string" ? err : err?.message || String(err));
  };

  try {
    player = new window.SyncedAudioPlayer({
      basePath: "/gradbot",
      sampleRate: 24000,
      pcmOutput,
      echoCancellation,
      onEncodedAudio: (data) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
      },
      onText: ({ text, turnIdx, isUser }) => {
        if (!text) return;
        const role = isUser ? "user" : "haus";
        turns.set(turnIdx, role);
        if (onTranscript) onTranscript({ role, text, turnIdx, final: true });
      },
      onEvent: (eventType, msg) => {
        if (onEvent) onEvent(eventType, msg);
      },
      onError: (e) => fail(e),
    });

    await player.start();

    ws = new WebSocket(voiceStreamUrl());
    ws.binaryType = "blob";

    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "start",
          voice_id: voiceId,
          language,
        }));
        resolve();
      };
      ws.onerror = () => reject(new Error("WebSocket connection failed"));
    });

    if (onState) onState("listening");

    ws.onmessage = (event) => {
      // gradbot sends both JSON (text) and binary (audio) frames; the
      // SyncedAudioPlayer handles both transparently.
      player.handleMessage(event.data);

      // We also peek at JSON frames for state + error surfacing.
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "error") fail(msg.message || "unknown error");
          else if (msg.type === "event" && onEvent) onEvent(msg.event, msg);
        } catch {
          /* ignore */
        }
      }
    };

    ws.onclose = () => { if (onState) onState("closed"); };
  } catch (err) {
    if (patched) navigator.mediaDevices.getUserMedia = realGetUserMedia;
    try { await player?.stop?.(); } catch {}
    try { ws?.close?.(); } catch {}
    throw err;
  }

  return {
    setMuted(value) {
      // gradbot's SyncedAudioPlayer doesn't expose a mute toggle, but we
      // can stop forwarding encoded audio frames for the muted period.
      this._muted = !!value;
      const orig = player.onEncodedAudio;
      // Replace once; idempotent across calls.
      if (!this._origForwarder) this._origForwarder = orig;
      player.audioProcessor && (
        player.audioProcessor.onEncodedAudio = (data) => {
          if (!this._muted && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        }
      );
    },
    async leave() {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stop" }));
        }
      } catch {}
      try { ws?.close?.(); } catch {}
      try { await player?.stop?.(); } catch {}
      if (patched) navigator.mediaDevices.getUserMedia = realGetUserMedia;
      if (onState) onState("closed");
    },
  };
}

export async function fetchVoices() {
  const res = await fetch(`${BASE}/api/voices`);
  if (!res.ok) throw new Error(`/api/voices ${res.status}`);
  const data = await res.json();
  return data.voices || [];
}

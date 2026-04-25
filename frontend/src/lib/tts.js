// Gradium-backed playback. Calls the backend /tts endpoint, plays the
// returned audio blob through a single in-flight Audio element so the
// Hausmeister never talks over himself.

import { tts as fetchTTS } from "./api.js";

let currentAudio = null;
let currentUrl = null;

function release() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  currentAudio = null;
}

export async function speak(text) {
  if (!text) return;
  stop();
  try {
    const blob = await fetchTTS(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentUrl = url;
    audio.onended = release;
    audio.onerror = release;
    await audio.play();
  } catch (err) {
    // Swallow — TTS is opt-in and shouldn't break the chat.
    console.warn("Gradium TTS failed:", err.message || err);
    release();
  }
}

export function stop() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
  }
  release();
}

// Server-backed, so always available — the runtime check is now whether
// the user opted in via the chat ♪ toggle.
export const ttsSupported = true;

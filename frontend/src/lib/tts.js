// Browser speechSynthesis wrapper. Tries to pick a German-flavored voice so
// the Hausmeister sounds the part; falls back to whatever the platform has.

let cachedVoice = null;

function pickVoice() {
  if (cachedVoice) return cachedVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  cachedVoice =
    voices.find((v) => v.lang?.toLowerCase().startsWith("de")) ||
    voices.find((v) => /(en-gb|en-us)/i.test(v.lang)) ||
    voices[0];
  return cachedVoice;
}

export function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  // Cancel any in-flight utterance — the Hausmeister never talks over himself.
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  }
  u.rate = 0.95;
  u.pitch = 0.85;
  window.speechSynthesis.speak(u);
}

export function stop() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export const ttsSupported =
  typeof window !== "undefined" && !!window.speechSynthesis;

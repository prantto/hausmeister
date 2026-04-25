// Thin client for the Hausmeister backend.
// The base URL is read from VITE_API_URL; if unset we default to a local
// dev server. All callers should treat backend failures as soft — the UI
// has stub data to fall back on so the demo never goes black.

export const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function request(method, path, { body, headers } = {}) {
  const init = { method, headers: { ...(headers || {}) } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function submitScrap({ handle, body, kind = "text" }) {
  return request("POST", "/scrap", { body: { handle, body, kind } });
}

export async function ask({ handle, question }) {
  return request("POST", "/ask", { body: { handle, question } });
}

export async function fetchWall({ limit = 8, minScore = 6 } = {}) {
  return request("GET", `/wall?limit=${limit}&min_score=${minScore}`);
}

export async function fetchTagesbericht({ refresh = false } = {}) {
  return request("GET", `/tagesbericht${refresh ? "?refresh=true" : ""}`);
}

export async function adminList(password, limit = 100) {
  return request("GET", `/admin/scraps?limit=${limit}`, {
    headers: { "X-Admin-Password": password },
  });
}

export async function adminDelete(password, id) {
  return request("DELETE", `/admin/scraps/${id}`, {
    headers: { "X-Admin-Password": password },
  });
}

export async function transcribe(blob) {
  const fd = new FormData();
  const ext = (blob.type || "audio/webm").split("/")[1].split(";")[0] || "webm";
  fd.append("file", blob, `scrap.${ext}`);
  const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`/transcribe ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function tts(text, voiceId) {
  const res = await fetch(`${BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId || null }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`/tts ${res.status}: ${t || res.statusText}`);
  }
  return res.blob();
}

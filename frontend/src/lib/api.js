// Thin client for the Hausmeister backend.
// The base URL is read from VITE_API_URL; if unset we default to a local
// dev server. All callers should treat backend failures as soft — the UI
// has stub data to fall back on so the demo never goes black.

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function submitScrap({ handle, body, kind = "text" }) {
  return post("/scrap", { handle, body, kind });
}

export async function ask({ handle, question }) {
  return post("/ask", { handle, question });
}

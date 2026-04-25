// Thin client for the Hausmeister backend.
// The base URL is read from VITE_API_URL; if unset we default to a local
// dev server. All callers should treat backend failures as soft — the UI
// has stub data to fall back on so the demo never goes black.

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

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

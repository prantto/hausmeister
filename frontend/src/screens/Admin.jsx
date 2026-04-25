import { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import { adminDelete, adminList } from "../lib/api.js";

export default function Admin() {
  const [pw, setPw] = useState(() => sessionStorage.getItem("hm.admin.pw") || "");
  const [auth, setAuth] = useState(false);
  const [scraps, setScraps] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (password) => {
    setBusy(true);
    setError(null);
    try {
      const rows = await adminList(password);
      setScraps(rows);
      setAuth(true);
      sessionStorage.setItem("hm.admin.pw", password);
    } catch (err) {
      setAuth(false);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (pw) load(pw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (id) => {
    if (!confirm("Purge this scrap? Cannot be undone.")) return;
    try {
      await adminDelete(pw, id);
      setScraps((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!auth) {
    return (
      <div
        className="hm-sans"
        style={{
          minHeight: "100vh",
          background: "var(--ink)",
          color: "var(--bone)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopBar subtitle="Hausverwaltung" right="kill-switch" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(pw);
          }}
          style={{
            margin: "auto",
            padding: 24,
            maxWidth: 420,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span className="hm-aushang">Verfahren · admin</span>
          <h1
            className="hm-display"
            style={{ fontSize: 28, lineHeight: 1.0, margin: "10px 0 0" }}
          >
            Show your <span style={{ color: "var(--olive)" }}>Hausmeister</span>{" "}
            credentials.
          </h1>
          <input
            className="hm-field"
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
            placeholder="admin password"
          />
          {error && (
            <div
              className="hm-stamp-label"
              style={{ color: "var(--stamp-red)", fontSize: 11 }}
            >
              ☞ {error}
            </div>
          )}
          <button className="hm-btn hm-btn-primary" type="submit" disabled={busy}>
            <span>{busy ? "checking…" : "enter"}</span>
            <span className="arrow">→</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="hm-sans"
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        color: "var(--bone)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar subtitle="Hausverwaltung" right={`${scraps.length} scraps`} />

      <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "baseline", gap: 14 }}>
        <span className="hm-aushang">Aushang · kill-switch</span>
        <h1
          className="hm-display"
          style={{ fontSize: 22, margin: 0, letterSpacing: "-0.01em" }}
        >
          Recent scraps
        </h1>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => load(pw)}
          className="hm-chip"
          style={{ cursor: "pointer", background: "transparent" }}
        >
          ↻ refresh
        </button>
      </div>

      {error && (
        <div
          className="hm-stamp-label"
          style={{ color: "var(--stamp-red)", padding: "0 24px 8px", fontSize: 11 }}
        >
          ☞ {error}
        </div>
      )}

      <div style={{ padding: "0 12px 24px", flex: 1 }}>
        {scraps.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--muted-foreground)",
              fontSize: 12,
            }}
          >
            ☞ Komposthaufen is empty.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scraps.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  padding: "12px 14px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="hm-display" style={{ fontSize: 13, color: "var(--olive)" }}>
                      {s.handle}
                    </span>
                    <span
                      className="hm-stamp-label"
                      style={{ color: "var(--muted-foreground)", fontSize: 9 }}
                    >
                      {new Date(s.created_at).toLocaleString()} · {s.kind}
                    </span>
                    {typeof s.funny_score === "number" && (
                      <span
                        className="hm-stamp-label"
                        style={{ color: "var(--yellow-faded)", fontSize: 9 }}
                      >
                        score {s.funny_score}/10
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--bone)" }}>
                    {s.body}
                  </div>
                  {s.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {s.tags.map((t) => (
                        <span key={t} className="hm-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="hm-btn hm-btn-danger"
                  style={{ padding: "8px 12px", fontSize: 10 }}
                  onClick={() => remove(s.id)}
                >
                  purge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

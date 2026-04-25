import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import TabBar from "../components/TabBar.jsx";
import { VOICE_WAVES } from "../data/corpus.js";
import { submitScrap } from "../lib/api.js";

const MAX = 240;

export default function Submit() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState(null); // { kind: 'ok'|'rejected'|'error', score?, reason? }
  const [busy, setBusy] = useState(false);
  const tickRef = useRef(null);
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";

  useEffect(() => {
    if (recording) {
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(tickRef.current);
      setSeconds(0);
    }
    return () => clearInterval(tickRef.current);
  }, [recording]);

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await submitScrap({ handle, body, kind: recording ? "voice" : "text" });
      if (!res.accepted) {
        setStatus({ kind: "rejected", reason: res.safety_reason || "rejected" });
      } else {
        setStatus({ kind: "ok", score: res.funny_score });
        setText("");
        setRecording(false);
      }
    } catch (err) {
      setStatus({ kind: "error", reason: err.message });
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const ss = String(seconds % 60).padStart(2, "0");
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");

  return (
    <div
      className="hm-sans"
      style={{
        background: "var(--ink)",
        color: "var(--bone)",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <TopBar subtitle="Drop a scrap" right={handle} />

      <form
        onSubmit={submit}
        style={{ flex: 1, padding: "18px 20px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <div style={{ marginBottom: 16 }}>
          <span className="hm-aushang">Verfahren · drop</span>
          <h2 className="hm-display" style={{ fontSize: 26, margin: "14px 0 4px", lineHeight: 1.0 }}>
            What did<br />
            you <span style={{ color: "var(--olive)" }}>see</span>?
          </h2>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--muted-foreground)",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            One scrap. ≤ {MAX} characters. No real names. Throw it on the{" "}
            <span className="hm-text-yellow">Komposthaufen</span>.
          </div>
        </div>

        <div
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "12px 14px",
            fontSize: 13.5,
            lineHeight: 1.55,
            minHeight: 140,
            position: "relative",
            display: "flex",
          }}
        >
          {recording ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
              <div className="hm-stamp-label" style={{ color: "var(--stamp-red)" }}>
                ● recording · {mm}:{ss}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center", height: 60 }}>
                {VOICE_WAVES.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: Math.max(4, h * 50) + "px",
                      background: "var(--olive)",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                listening…
              </div>
            </div>
          ) : (
            <textarea
              autoFocus
              value={text}
              maxLength={MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="team next to us has been arguing about postgres vs supabase for ninety minutes…"
              style={{
                flex: 1,
                background: "transparent",
                border: 0,
                outline: 0,
                color: "var(--bone)",
                resize: "none",
                font: "inherit",
                fontSize: 13.5,
                lineHeight: 1.55,
                width: "100%",
              }}
            />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 12, gap: 10 }}>
          <button
            type="button"
            title="Voice toggle"
            onClick={() => setRecording((r) => !r)}
            style={{
              width: 42,
              height: 42,
              border: "1px solid " + (recording ? "var(--stamp-red)" : "var(--border)"),
              background: recording ? "var(--stamp-red)" : "transparent",
              color: recording ? "var(--bone)" : "var(--muted-foreground)",
              cursor: "pointer",
              padding: 0,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="18" viewBox="0 0 14 18">
              <rect x="4" y="0" width="6" height="11" fill="currentColor" />
              <path
                d="M1 9 v1 a6 6 0 0 0 12 0 v-1 M7 16 v2"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </button>
          <span className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
            {text.length} / {MAX}
          </span>
          <span style={{ flex: 1 }} />
          <button type="submit" className="hm-btn hm-btn-primary" disabled={busy}>
            <span>
              {busy
                ? "logging…"
                : status?.kind === "ok"
                ? `logged · ${status.score}/10`
                : status?.kind === "rejected"
                ? `rejected · ${status.reason}`
                : status?.kind === "error"
                ? "offline"
                : "submit"}
            </span>
            <span className="arrow">→</span>
          </button>
        </div>

        <div
          style={{
            fontSize: 10,
            color: "var(--muted-foreground)",
            marginTop: 12,
            lineHeight: 1.6,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          ☞ reviewed for safety + funny score.
          <br />
          ☞ ≥ 6/10 goes to /wall. &lt; 6 stays on the Komposthaufen.
          <br />
          ☞ rejected scraps are not stored, only counted.
        </div>
      </form>

      <TabBar />
    </div>
  );
}

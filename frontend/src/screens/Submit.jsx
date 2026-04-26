import { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import TabBar from "../components/TabBar.jsx";
import { VOICE_WAVES } from "../data/corpus.js";
import { submitScrap, transcribe } from "../lib/api.js";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.js";

const MAX = 240;

export default function Submit({ onClose } = {}) {
  const [text, setText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [lastKind, setLastKind] = useState("text"); // 'text' | 'voice'
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const recorder = useVoiceRecorder();
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await submitScrap({ handle, body, kind: lastKind });
      if (!res.accepted) {
        setStatus({ kind: "rejected", reason: res.safety_reason || "rejected" });
      } else {
        setStatus({ kind: "ok", score: res.funny_score });
        setText("");
        setLastKind("text");
      }
    } catch (err) {
      setStatus({ kind: "error", reason: err.message });
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const onVoice = async () => {
    if (transcribing || busy) return;
    if (recorder.recording) {
      const blob = await recorder.stop();
      if (!blob) return;
      setTranscribing(true);
      try {
        const { text: transcript } = await transcribe(blob);
        if (transcript) {
          setText(transcript.slice(0, MAX));
          setLastKind("voice");
        }
      } catch (err) {
        setStatus({ kind: "error", reason: err.message });
        setTimeout(() => setStatus(null), 3000);
      } finally {
        setTranscribing(false);
      }
    } else {
      await recorder.start();
    }
  };

  const ss = String(recorder.seconds % 60).padStart(2, "0");
  const mm = String(Math.floor(recorder.seconds / 60)).padStart(2, "0");

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
      {onClose ? (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="hm-stamp-label" style={{ color: "var(--olive)" }}>☞ drop a scrap</span>
          <button onClick={onClose} className="hm-chip" style={{ cursor: "pointer", background: "transparent" }}>✕ close</button>
        </div>
      ) : (
        <TopBar subtitle="Drop a scrap" right={handle} />
      )}

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
          {recorder.recording ? (
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
                      animation: `hm-bar ${0.6 + (i % 5) * 0.1}s ease-in-out ${i * 0.04}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                listening… tap mic to stop & transcribe
              </div>
            </div>
          ) : transcribing ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted-foreground)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              transcribing…
            </div>
          ) : (
            <textarea
              autoFocus
              value={text}
              maxLength={MAX}
              onChange={(e) => {
                setText(e.target.value);
                if (lastKind !== "text") setLastKind("text");
              }}
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
            title={recorder.recording ? "stop & transcribe" : "record"}
            onClick={onVoice}
            disabled={transcribing || !recorder.supported}
            style={{
              width: 42,
              height: 42,
              border:
                "1px solid " + (recorder.recording ? "var(--stamp-red)" : "var(--border)"),
              background: recorder.recording ? "var(--stamp-red)" : "transparent",
              color: recorder.recording ? "var(--bone)" : "var(--muted-foreground)",
              cursor: recorder.supported ? "pointer" : "not-allowed",
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
              {busy ? "logging…" : status?.kind === "rejected" ? "rejected" : status?.kind === "error" ? "offline" : "submit"}
            </span>
            <span className="arrow">→</span>
          </button>
        </div>

        {status?.kind === "ok" && (
          <div
            style={{
              marginTop: 14,
              border: "1px solid var(--border)",
              background: "var(--card)",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>
                FUNNY SCORE
              </span>
              <span style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                fontWeight: 700,
                color: status.score >= 6 ? "var(--olive)" : status.score >= 4 ? "var(--bone)" : "var(--muted-foreground)",
              }}>
                {status.score} / 10
              </span>
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    background: i < status.score
                      ? (status.score >= 6 ? "var(--olive)" : status.score >= 4 ? "var(--bone)" : "var(--muted-foreground)")
                      : "var(--border)",
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--muted-foreground)" }}>
              {status.score >= 6
                ? "☞ geht auf die /wall"
                : "☞ bleibt im Komposthaufen"}
            </div>
          </div>
        )}

        {status?.kind === "rejected" && (
          <div style={{ marginTop: 14, border: "1px solid var(--stamp-red)", background: "var(--card)", padding: "10px 14px" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--stamp-red)", letterSpacing: "0.08em" }}>
              REJECTED · {status.reason}
            </span>
          </div>
        )}

        {status?.kind === "error" && (
          <div style={{ marginTop: 14, border: "1px solid var(--border)", background: "var(--card)", padding: "10px 14px" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--muted-foreground)" }}>
              offline · {status.reason}
            </span>
          </div>
        )}

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

      {!onClose && <TabBar />}
    </div>
  );
}

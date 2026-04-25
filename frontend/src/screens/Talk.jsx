import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { fetchVoiceToken } from "../lib/api.js";
import { connectAndPublish } from "../lib/livekit.js";

export default function Talk() {
  const navigate = useNavigate();
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";
  const [state, setState] = useState("idle"); // idle | connecting | live | error
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);

  const start = async () => {
    setError(null);
    setState("connecting");
    try {
      const t = await fetchVoiceToken(handle);
      const session = await connectAndPublish({
        url: t.url,
        token: t.token,
        onState: (s) => setState(s === "connected" ? "live" : s),
        onTranscript: (msg) => {
          if (msg?.text) {
            setTranscript((prev) => [...prev, { who: msg.role || "haus", body: msg.text }]);
          }
        },
      });
      sessionRef.current = session;
    } catch (err) {
      setError(err.message || String(err));
      setState("error");
    }
  };

  const leave = async () => {
    if (sessionRef.current) await sessionRef.current.leave();
    sessionRef.current = null;
    setState("idle");
    setTranscript([]);
  };

  const toggleMute = () => {
    if (!sessionRef.current) return;
    const next = !muted;
    sessionRef.current.setMicEnabled(!next);
    setMuted(next);
  };

  useEffect(() => () => { sessionRef.current?.leave(); }, []);

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
      <TopBar
        subtitle="Live · noisy room ready"
        right={
          <button
            onClick={() => navigate("/chat")}
            className="hm-chip"
            style={{ cursor: "pointer", background: "transparent" }}
          >
            ← chat
          </button>
        }
      />

      <div
        style={{
          flex: 1,
          padding: "24px 22px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 520,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <span className="hm-aushang">Verfahren · live</span>
        <h1
          className="hm-display hm-scanline"
          style={{ fontSize: 30, lineHeight: 0.95, margin: 0, position: "relative" }}
        >
          Talk to <span style={{ color: "var(--olive)" }}>der Hausmeister</span>.
          <br />
          He hears you. <br/>Even with the espresso machine.
        </h1>

        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.55, margin: 0 }}>
          Real-time conversation over a LiveKit room. Your mic gets denoised
          server-side via <span className="hm-text-yellow">ai-coustics</span>;
          the Hausmeister speaks back through{" "}
          <span className="hm-text-yellow">Gradium</span>. Mostly English with
          the occasional German interjection.
        </p>

        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            className="hm-dot"
            style={{ background: state === "live" ? "var(--olive)" : "var(--muted-foreground)" }}
          />
          <div style={{ flex: 1 }}>
            <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
              {state === "idle"       && "ready"}
              {state === "connecting" && "connecting…"}
              {state === "live"       && "on duty · he is listening"}
              {state === "error"      && "offline"}
            </div>
            <div className="hm-stamp-label" style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
              handle · {handle}
            </div>
          </div>
          {state !== "live" ? (
            <button
              className="hm-btn hm-btn-primary"
              onClick={start}
              disabled={state === "connecting"}
            >
              <span>{state === "connecting" ? "joining…" : "join room"}</span>
              <span className="arrow">→</span>
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className="hm-btn"
                style={{
                  borderColor: muted ? "var(--stamp-red)" : "var(--border)",
                  color: muted ? "var(--stamp-red)" : "var(--bone)",
                }}
              >
                {muted ? "● muted" : "mic on"}
              </button>
              <button onClick={leave} className="hm-btn hm-btn-danger">
                leave
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="hm-stamp-label" style={{ color: "var(--stamp-red)", fontSize: 11 }}>
            ☞ {error}
          </div>
        )}

        <div
          style={{
            flex: 1,
            border: "1px dashed var(--border)",
            padding: "16px 18px",
            minHeight: 180,
            overflowY: "auto",
            background: "var(--ink)",
          }}
        >
          <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)", marginBottom: 8 }}>
            ☞ Transcript
          </div>
          {transcript.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              {state === "live" ? "(listening… speak when ready)" : "(join to begin)"}
            </div>
          ) : (
            transcript.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <span
                  className="hm-stamp-label"
                  style={{
                    color: m.who === "haus" ? "var(--olive)" : "var(--muted-foreground)",
                    marginRight: 8,
                  }}
                >
                  {m.who === "haus" ? "Hausmeister" : "you"}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>{m.body}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
          ☞ ai-coustics denoise → Gradium STT → Gemini Flash + corpus RAG → Gradium TTS.
        </div>
      </div>
    </div>
  );
}

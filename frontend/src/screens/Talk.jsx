import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { connect as connectVoice, fetchVoices } from "../lib/voiceStream.js";

const FLAGS = { en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸", pt: "🇵🇹" };

export default function Talk() {
  const navigate = useNavigate();
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";

  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem("hm.voiceId") || "");
  const [language, setLanguage] = useState(() => localStorage.getItem("hm.voiceLang") || "en");

  const [state, setState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchVoices()
      .then((vs) => {
        if (cancelled) return;
        setVoices(vs);
        if (!voiceId && vs.length) {
          // Bias toward German voices for the Hausmeister persona.
          const pick = vs.find((v) => v.language === "de") || vs[0];
          setVoiceId(pick.voice_id);
          setLanguage(pick.language || "en");
          localStorage.setItem("hm.voiceId", pick.voice_id);
          localStorage.setItem("hm.voiceLang", pick.language || "en");
        }
      })
      .catch((e) => setError(`could not load voices: ${e.message}`));
    return () => { cancelled = true; };
    // voiceId intentionally omitted — first load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voice_id === voiceId) || null,
    [voices, voiceId],
  );

  const start = async () => {
    if (!voiceId) {
      setError("pick a voice first");
      return;
    }
    setError(null);
    setState("connecting");
    setTranscript([]);
    try {
      const session = await connectVoice({
        voiceId,
        language,
        echoCancellation: true,
        onState: (s) => setState((prev) => (prev === "error" ? prev : s)),
        onTranscript: ({ role, text, turnIdx }) => {
          setTranscript((prev) => {
            // gradbot streams text incrementally per turn — append to the
            // last bubble of the same role+turnIdx, otherwise start fresh.
            const last = prev[prev.length - 1];
            if (last && last.who === role && last.turnIdx === turnIdx) {
              const next = prev.slice(0, -1);
              next.push({ ...last, body: `${last.body} ${text}`.trim() });
              return next;
            }
            return [...prev, { who: role, body: text, turnIdx }];
          });
        },
        onEvent: (evt) => {
          if (evt) console.debug("[voice] event:", evt);
        },
        onError: (msg) => {
          setError(msg);
          setState("error");
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
    setMuted(false);
  };

  const toggleMute = () => {
    if (!sessionRef.current) return;
    const next = !muted;
    sessionRef.current.setMuted(next);
    setMuted(next);
  };

  const onPickVoice = (v) => {
    setVoiceId(v.voice_id);
    setLanguage(v.language || "en");
    localStorage.setItem("hm.voiceId", v.voice_id);
    localStorage.setItem("hm.voiceLang", v.language || "en");
  };

  useEffect(() => () => { sessionRef.current?.leave(); }, []);

  const live = state === "listening" || state === "thinking" || state === "speaking";
  const stateLabel = {
    idle: "ready",
    connecting: "connecting…",
    listening: "on duty · he is listening",
    thinking: "thinking…",
    speaking: "speaking…",
    closed: "offline",
    error: "offline",
  }[state] || state;

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
            onClick={() => navigate("/m/chat")}
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
          He hears you. <br />Even with the espresso machine.
        </h1>

        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.55, margin: 0 }}>
          Real-time conversation over a single WebSocket. Mic is denoised in the
          browser via <span className="hm-text-yellow">ai-coustics</span>; STT
          and TTS run on <span className="hm-text-yellow">Gradium</span> through
          the open-source <span className="hm-text-yellow">gradbot</span>{" "}
          multiplexer. Mostly English with the occasional German interjection.
        </p>

        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            className="hm-stamp-label"
            style={{ color: "var(--muted-foreground)", fontSize: 9 }}
          >
            ☞ voice
          </div>
          {voices.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              loading catalog…
            </div>
          ) : (
            <select
              className="hm-field"
              value={voiceId}
              onChange={(e) => {
                const v = voices.find((x) => x.voice_id === e.target.value);
                if (v) onPickVoice(v);
              }}
              disabled={live || state === "connecting"}
              style={{ width: "100%" }}
            >
              {voices.map((v) => {
                const flag = FLAGS[v.language] || "🌐";
                const label = v.name && v.name !== "unknow" ? v.name : v.voice_id;
                const meta = [v.gender, v.country_name || v.country]
                  .filter((x) => x && x !== "—")
                  .join(" · ");
                return (
                  <option key={v.voice_id} value={v.voice_id}>
                    {flag} {label}{meta ? ` · ${meta}` : ""}
                  </option>
                );
              })}
            </select>
          )}
          {selectedVoice?.description && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {selectedVoice.description}
            </div>
          )}
        </div>

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
            style={{ background: live ? "var(--olive)" : "var(--muted-foreground)" }}
          />
          <div style={{ flex: 1 }}>
            <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
              {stateLabel}
            </div>
            <div className="hm-stamp-label" style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
              handle · {handle}
            </div>
          </div>
          {!live && state !== "connecting" ? (
            <button
              className="hm-btn hm-btn-primary"
              onClick={start}
              disabled={!voiceId}
            >
              <span>{state === "error" ? "retry" : "join"}</span>
              <span className="arrow">→</span>
            </button>
          ) : state === "connecting" ? (
            <button className="hm-btn hm-btn-primary" disabled>
              <span>joining…</span>
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
              {live ? "(listening… speak when ready)" : "(join to begin)"}
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
          ☞ mic → ai-coustics (browser) → gradbot WS → Gradium STT → Gemini Flash + corpus tool → Gradium TTS.
        </div>
      </div>
    </div>
  );
}

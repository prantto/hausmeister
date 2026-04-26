import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import TabBar from "../components/TabBar.jsx";
import { SAMPLE_CHAT } from "../data/corpus.js";
import { ask, transcribe } from "../lib/api.js";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.js";
import { speak, stop as stopTTS, ttsSupported } from "../lib/tts.js";

export default function Chat({ onClose } = {}) {
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [cited, setCited] = useState(null);
  const [tts, setTts] = useState(() => localStorage.getItem("hm.tts") === "1");
  const scrollRef = useRef(null);
  const recorder = useVoiceRecorder();
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  useEffect(() => () => stopTTS(), []);

  const toggleTts = () => {
    const next = !tts;
    setTts(next);
    localStorage.setItem("hm.tts", next ? "1" : "0");
    if (!next) stopTTS();
  };

  const handleHausReply = (body) => {
    setMessages((m) => [...m, { who: "haus", t: stamp(), body }]);
    if (tts) speak(body);
  };

  const stamp = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendText = async (text) => {
    if (!text.trim() || pending) return;
    const t = stamp();
    setMessages((m) => [...m, { who: "you", t, body: text }]);
    setDraft("");
    setPending(true);
    try {
      const res = await ask({ handle, question: text });
      setCited(res.cited?.map((c) => c.handle) || null);
      handleHausReply(res.answer);
    } catch (err) {
      console.error("[/ask] failed:", err);
      handleHausReply(
        `Na ja. The corpus is unreachable — ${err.message || err}. (§19)`
      );
    } finally {
      setPending(false);
    }
  };

  const send = (e) => {
    e?.preventDefault();
    sendText(draft.trim());
  };

  const onVoice = async () => {
    if (transcribing || pending) return;
    if (recorder.recording) {
      const blob = await recorder.stop();
      if (!blob) return;
      setTranscribing(true);
      try {
        const { text } = await transcribe(blob);
        if (text) setDraft(text);
      } catch (err) {
        setMessages((m) => [
          ...m,
          { who: "haus", t: stamp(), body: `(transcription failed: ${err.message})` },
        ]);
      } finally {
        setTranscribing(false);
      }
    } else {
      await recorder.start();
    }
  };

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
          <span className="hm-stamp-label" style={{ color: "var(--olive)" }}>☞ ask the Hausmeister</span>
          <button onClick={onClose} className="hm-chip" style={{ cursor: "pointer", background: "transparent" }}>✕ close</button>
        </div>
      ) : (
        <TopBar subtitle="On duty" right={<span style={{ fontSize: 10, letterSpacing: "0.12em" }}>247 scraps · sweeping</span>} />
      )}

      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "2px solid var(--olive)",
            color: "var(--olive)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          H.
        </div>
        <div style={{ flex: 1 }}>
          <div className="hm-display" style={{ fontSize: 14, color: "var(--bone)" }}>
            der_hausmeister
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--muted-foreground)",
              letterSpacing: "0.06em",
              marginTop: 2,
            }}
          >
            sweeping continuously · answers in his own time
          </div>
        </div>
        {ttsSupported && (
          <button
            onClick={toggleTts}
            title={tts ? "voice: on" : "voice: off"}
            className="hm-chip"
            style={{
              cursor: "pointer",
              background: "transparent",
              color: tts ? "var(--olive)" : "var(--muted-foreground)",
              borderColor: tts ? "var(--olive)" : "var(--border)",
            }}
          >
            {tts ? "♪ on" : "♪ off"}
          </button>
        )}
        <Link
          to="/m/talk"
          className="hm-chip hm-reset"
          style={{ color: "var(--yellow-faded)", borderColor: "var(--yellow-faded)" }}
          title="Real-time conversation"
        >
          ● live
        </Link>
        <span className="hm-chip" style={{ color: "var(--olive)", borderColor: "var(--olive)" }}>
          rag
        </span>
      </div>

      <div
        ref={scrollRef}
        className="hm-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "14px 16px 8px", background: "var(--ink)", minHeight: 0 }}
      >
        {messages.map((m, i) => {
          const isHaus = m.who === "haus";
          return (
            <div
              key={i}
              style={{
                marginBottom: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: isHaus ? "flex-start" : "flex-end",
              }}
            >
              <div
                className="hm-stamp-label"
                style={{ color: "var(--muted-foreground)", marginBottom: 4 }}
              >
                {isHaus ? "Hausmeister" : "you"} · {m.t}
              </div>
              <div
                style={{
                  maxWidth: "84%",
                  background: isHaus ? "var(--card)" : "transparent",
                  color: "var(--bone)",
                  border: "1px solid " + (isHaus ? "var(--border)" : "var(--olive)"),
                  borderLeft: isHaus ? "2px solid var(--olive)" : "1px solid var(--olive)",
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {m.body}
              </div>
              {isHaus && i === messages.length - 1 && cited && cited.length > 0 && (
                <div
                  className="hm-stamp-label"
                  style={{ color: "var(--muted-foreground)", marginTop: 6, fontSize: 9 }}
                >
                  ☞ cited: {cited.slice(0, 4).join(" · ")}
                </div>
              )}
            </div>
          );
        })}

        {pending && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
              Hausmeister is typing
            </div>
            <span style={{ display: "inline-flex", gap: 3 }}>
              <span style={{ width: 4, height: 4, background: "var(--olive)" }} />
              <span style={{ width: 4, height: 4, background: "var(--olive)", opacity: 0.6 }} />
              <span style={{ width: 4, height: 4, background: "var(--olive)", opacity: 0.3 }} />
            </span>
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        style={{
          padding: "10px 14px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          title={recorder.recording ? "stop & transcribe" : "record"}
          onClick={onVoice}
          disabled={transcribing || !recorder.supported}
          style={{
            width: 38,
            height: 38,
            border:
              "1px solid " + (recorder.recording ? "var(--stamp-red)" : "var(--border)"),
            background: recorder.recording ? "var(--stamp-red)" : "transparent",
            color: recorder.recording ? "var(--bone)" : "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: recorder.supported ? "pointer" : "not-allowed",
            padding: 0,
            borderRadius: 2,
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
        <input
          className="hm-field"
          placeholder={
            recorder.recording
              ? `● recording · ${recorder.seconds}s — tap mic to stop`
              : transcribing
              ? "transcribing…"
              : "ask him anything…"
          }
          value={draft}
          disabled={recorder.recording || transcribing}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="hm-btn hm-btn-primary" style={{ padding: "10px 14px" }}>
          <span>send</span>
          <span className="arrow">→</span>
        </button>
      </form>

      {!onClose && <TabBar />}
    </div>
  );
}

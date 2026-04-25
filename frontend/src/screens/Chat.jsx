import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import TabBar from "../components/TabBar.jsx";
import { SAMPLE_CHAT } from "../data/corpus.js";
import { ask } from "../lib/api.js";

export default function Chat() {
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [cited, setCited] = useState(null);
  const scrollRef = useRef(null);
  const handle = localStorage.getItem("hm.handle") || "kartoffel-04";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  const send = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { who: "you", t, body: text }]);
    setDraft("");
    setPending(true);
    try {
      const res = await ask({ handle, question: text });
      setCited(res.cited?.map((c) => c.handle) || null);
      setMessages((m) => [...m, { who: "haus", t, body: res.answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          who: "haus",
          t,
          body:
            "Na ja. The corpus is unreachable. Probably a CORS error. Look again. (§19)",
        },
      ]);
    } finally {
      setPending(false);
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
      <TopBar subtitle="On duty" right={<span style={{ fontSize: 10, letterSpacing: "0.12em" }}>247 scraps · sweeping</span>} />

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
          title="Voice"
          style={{
            width: 38,
            height: 38,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
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
          placeholder="ask him anything…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="hm-btn hm-btn-primary" style={{ padding: "10px 14px" }}>
          <span>send</span>
          <span className="arrow">→</span>
        </button>
      </form>

      <TabBar />
    </div>
  );
}

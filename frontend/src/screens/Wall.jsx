import { useEffect, useMemo, useState } from "react";
import QRPlaceholder from "../components/QRPlaceholder.jsx";
import Chat from "./Chat.jsx";
import Submit from "./Submit.jsx";
import { SEED_HAUSREGELN, WALL_FEED } from "../data/corpus.js";
import { fetchRecent, fetchTagesbericht, fetchWall, generateScrap } from "../lib/api.js";

const FALLBACK = WALL_FEED.filter((w) => w.type === "scrap").map((s, i) => ({
  id: `seed-${i}`,
  handle: s.handle,
  body: s.body,
  funny_score: s.score,
  created_at: new Date().toISOString(),
  _t: s.t,
}));
const FALLBACK_COUNTS = { total: 247, on_wall: 61 };

export default function Wall() {
  const [scraps, setScraps] = useState(FALLBACK);
  const [recent, setRecent] = useState([]);
  const [counts, setCounts] = useState(FALLBACK_COUNTS);
  const [live, setLive] = useState(false);
  const [bericht, setBericht] = useState(null);
  const [ruleIdx, setRuleIdx] = useState(0);
  const [panel, setPanel] = useState(null); // null | 'chat' | 'submit'
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const scrap = await generateScrap();
      // Insert at the top of scraps
      setScraps((prev) => [
        {
          id: scrap.id,
          handle: scrap.handle,
          body: scrap.body,
          funny_score: scrap.funny_score,
          created_at: scrap.created_at,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const [wallFeed, recentFeed] = await Promise.all([
          fetchWall({ limit: 8, minScore: 6 }),
          fetchRecent({ limit: 12 }),
        ]);
        if (cancelled) return;
        if (wallFeed.scraps?.length) {
          setScraps(wallFeed.scraps);
          setLive(true);
        }
        if (wallFeed.counts) setCounts(wallFeed.counts);
        if (recentFeed.scraps?.length) setRecent(recentFeed.scraps);
      } catch {
        // backend offline — keep showing the seed feed
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Tagesbericht refreshes much slower — backend caches 5 min anyway.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const tb = await fetchTagesbericht();
        if (!cancelled && tb) setBericht(tb);
      } catch {
        // soft fail — the right column just won't show the bericht line
      }
    };
    pull();
    const id = setInterval(pull, 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Rotate one Hausregel every 12s so the §-stamp feels alive.
  useEffect(() => {
    const id = setInterval(
      () => setRuleIdx((i) => (i + 1) % SEED_HAUSREGELN.length),
      12_000
    );
    return () => clearInterval(id);
  }, []);

  const overheard = useMemo(() => {
    // Pick a recent scrap that's NOT already on the main wall (left col),
    // so the "just overheard" line shows fresh, lower-score material.
    const wallIds = new Set(scraps.slice(0, 4).map((s) => s.id));
    return recent.find((s) => !wallIds.has(s.id)) || null;
  }, [scraps, recent]);

  const rule = SEED_HAUSREGELN[ruleIdx];
  const berichtLine = bericht?.intro || bericht?.sections?.[0]?.body;
  const berichtQ = bericht ? `Tagesbericht ${bericht.date}` : null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const clock = `${now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${now.toTimeString().slice(0, 5)}`;

  const ticker = [
    `${counts.total} scraps logged`,
    `${counts.on_wall} on the wall`,
    "next Tagesbericht 14:00",
    "Hausmeister leaves SUN 14:01",
    live ? "● live · Komposthaufen" : "○ standby · seed feed",
  ];

  const fmtTime = (s) =>
    s._t ?? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="hm-bigscreen hm-sans">
      <div className="hm-warning-band" />

      <div
        style={{
          padding: "20px 36px 16px",
          borderBottom: "2px solid var(--olive)",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span className="hm-dot" style={{ width: 12, height: 12, alignSelf: "center" }} />
          <span
            className="hm-display"
            style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.03em" }}
          >
            HAUSMEISTER
          </span>
          <span
            className="hm-stamp-label"
            style={{ color: "var(--muted-foreground)", fontSize: 11 }}
          >
            /wall · live feed
          </span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
          <span
            className="hm-stamp-label"
            style={{ color: "var(--muted-foreground)", fontSize: 11 }}
          >
            {counts.total} logged · {counts.on_wall} on wall
          </span>
          <span className="hm-stamp-label" style={{ color: "var(--olive)", fontSize: 12 }}>
            ● {clock}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--olive)",
        }}
      >
        <button
          onClick={() => setPanel(panel === "submit" ? null : "submit")}
          style={{
            flex: 1,
            padding: "18px 28px",
            background: panel === "submit" ? "var(--olive)" : "var(--card)",
            color: panel === "submit" ? "var(--ink)" : "var(--bone)",
            border: "none",
            borderRight: "2px solid var(--olive)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 28 }}>✏</span>
          <span>
            <div className="hm-display" style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1 }}>
              DROP A SCRAP
            </div>
            <div className="hm-stamp-label" style={{ marginTop: 4, fontSize: 11, color: panel === "submit" ? "var(--ink)" : "var(--muted-foreground)" }}>
              throw something on the Komposthaufen
            </div>
          </span>
        </button>
        <button
          onClick={() => setPanel(panel === "chat" ? null : "chat")}
          style={{
            flex: 1,
            padding: "18px 28px",
            background: panel === "chat" ? "var(--olive)" : "transparent",
            color: panel === "chat" ? "var(--ink)" : "var(--bone)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 28 }}>⌨</span>
          <span>
            <div className="hm-display" style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1 }}>
              ASK HAUSMEISTER
            </div>
            <div className="hm-stamp-label" style={{ marginTop: 4, fontSize: 11, color: panel === "chat" ? "var(--ink)" : "var(--muted-foreground)" }}>
              he has read everything. he is not happy about it.
            </div>
          </span>
        </button>
      </div>

      <div className="hm-wall-grid" style={{ flex: 1, overflow: "hidden" }}>
        <div
          style={{
            borderRight: "2px solid var(--olive)",
            padding: "16px 26px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
            ☞ Incoming · live from the Komposthaufen
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {scraps.slice(0, 4).map((s) => (
              <div
                key={s.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  padding: "12px 16px",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span className="hm-display" style={{ fontSize: 14, color: "var(--olive)" }}>
                    {s.handle}
                  </span>
                  <span
                    className="hm-stamp-label"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    · {fmtTime(s)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
                    score
                  </span>
                  <span className="hm-display" style={{ fontSize: 18, color: "var(--bone)" }}>
                    {s.funny_score}
                    <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>/10</span>
                  </span>
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.4, color: "var(--bone)" }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: "16px 26px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
            ☞ Der Hausmeister spricht
          </div>

          <div
            style={{
              background: "var(--bone)",
              color: "var(--ink)",
              padding: "16px 20px",
              border: "2px solid var(--olive)",
              position: "relative",
            }}
          >
            <div className="hm-stamp-label" style={{ color: "var(--olive-deep)", marginBottom: 8 }}>
              {berichtQ || "Latest Tagesbericht"}
            </div>
            <div
              style={{
                fontSize: 20,
                lineHeight: 1.35,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 500,
              }}
            >
              {berichtLine ||
                "Tagesbericht is being prepared. The Hausmeister sweeps."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                <div
                  className="hm-display"
                  style={{
                    fontSize: 28,
                    color: "var(--ink)",
                    background: "var(--olive)",
                    padding: "8px 12px",
                    lineHeight: 1,
                    alignSelf: "stretch",
                    display: "flex",
                    alignItems: "center",
                    letterSpacing: "-0.02em",
                  }}
                >
                  §{rule.n}
                </div>
                <div style={{ flex: 1, fontSize: 15, lineHeight: 1.4, padding: "6px 0" }}>
                  {rule.rule}
                  <div
                    className="hm-stamp-label"
                    style={{ color: "var(--muted-foreground)", marginTop: 4 }}
                  >
                    Hausregeln · rotating
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div
                  className="hm-stamp-label"
                  style={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                >
                  ☞ just overheard
                </div>
                {overheard ? (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                    }}
                  >
                    "{overheard.body}"
                    <span
                      className="hm-display"
                      style={{
                        color: "var(--olive)",
                        fontStyle: "normal",
                        fontSize: 12,
                        marginLeft: 6,
                      }}
                    >
                      {overheard.handle}
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                    }}
                  >
                    Komposthaufen is quiet.
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                    fontSize: 11,
                    cursor: generating ? "not-allowed" : "pointer",
                    opacity: generating ? 0.6 : 1,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  {generating ? "sweeping…" : "☞ erzähl mir was"}
                </button>
              </div>
            </div>

            <div style={{ width: 130 }}>
              <div
                className="hm-shadow-card"
                style={{
                  width: 130,
                  height: 130,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QRPlaceholder size={108} />
              </div>
              <div
                className="hm-stamp-label"
                style={{
                  marginTop: 14,
                  color: "var(--muted-foreground)",
                  fontSize: 9,
                  textAlign: "center",
                }}
              >
                scan to compost
              </div>
              <div
                className="hm-stamp-label"
                style={{
                  color: "var(--stamp-red)",
                  fontSize: 9,
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                Akte №047-K
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "2px solid var(--olive)",
          borderBottom: "2px solid var(--olive)",
          background: "var(--card)",
          overflow: "hidden",
          position: "relative",
          height: 38,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          className="hm-ticker-track"
          style={{
            whiteSpace: "nowrap",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            letterSpacing: "0.12em",
            color: "var(--bone)",
          }}
        >
          {[...ticker, ...ticker].map((t, i) => (
            <span
              key={i}
              style={{ display: "inline-flex", alignItems: "center", padding: "0 24px", gap: 18 }}
            >
              <span style={{ color: "var(--olive)" }}>▌</span>
              <span>{t}</span>
            </span>
          ))}
        </div>
      </div>
      {panel && (
        <>
          <div
            onClick={() => setPanel(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: 440,
              background: "var(--ink)",
              borderLeft: "2px solid var(--olive)",
              zIndex: 41,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {panel === "chat"   && <Chat   onClose={() => setPanel(null)} />}
            {panel === "submit" && <Submit onClose={() => setPanel(null)} />}
          </div>
        </>
      )}
    </div>
  );
}

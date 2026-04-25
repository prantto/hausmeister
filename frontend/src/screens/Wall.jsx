import QRPlaceholder from "../components/QRPlaceholder.jsx";
import { WALL_FEED } from "../data/corpus.js";

const TICKER = [
  "247 scraps logged",
  "31 purged for safety",
  "19 marked langweilig",
  "next Tagesbericht 14:00",
  "T-22:13 to submission",
  "Hausmeister leaves SUN 14:01",
];

export default function Wall() {
  const scraps = WALL_FEED.filter((w) => w.type === "scrap");

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
            247 logged · 61 on wall
          </span>
          <span className="hm-stamp-label" style={{ color: "var(--olive)", fontSize: 12 }}>
            ● SAT 13:47
          </span>
        </div>
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
            {scraps.slice(0, 4).map((s, i) => (
              <div
                key={i}
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
                    · SAT {s.t}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
                    score
                  </span>
                  <span className="hm-display" style={{ fontSize: 18, color: "var(--bone)" }}>
                    {s.score}
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
              In response to: "what's table 14 doing?"
            </div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.35,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 500,
              }}
            >
              Table 14 has had their first{" "}
              <span style={{ background: "var(--yellow-faded)", padding: "0 4px" }}>
                "we should pivot"
              </span>
              , which is hackathon-Latin for{" "}
              <span style={{ fontStyle: "italic" }}>"we are out, but with style"</span>.
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
                  §19
                </div>
                <div style={{ flex: 1, fontSize: 15, lineHeight: 1.4, padding: "6px 0" }}>
                  CORS errors are typos. Always. Forever. Look again.
                  <div
                    className="hm-stamp-label"
                    style={{ color: "var(--muted-foreground)", marginTop: 4 }}
                  >
                    NEU · derived from lampe-90 · 02:18
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "var(--olive)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 2, alignItems: "center", height: 18 }}>
                    {[6, 14, 10, 18, 8].map((h, i) => (
                      <div key={i} style={{ width: 2, height: h, background: "var(--ink)" }} />
                    ))}
                  </div>
                </div>
                <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
                  speaking · TTS · 8.4s
                </div>
              </div>

              <div style={{ marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div
                  className="hm-stamp-label"
                  style={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                >
                  ☞ just overheard
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "var(--muted-foreground)",
                    fontStyle: "italic",
                  }}
                >
                  "my cofounder just used the word 'moat' and i felt my soul leave my body."
                  <span
                    className="hm-display"
                    style={{
                      color: "var(--olive)",
                      fontStyle: "normal",
                      fontSize: 12,
                      marginLeft: 6,
                    }}
                  >
                    muelltonne-15
                  </span>
                </div>
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
          {[...TICKER, ...TICKER].map((t, i) => (
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
    </div>
  );
}

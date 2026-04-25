import TopBar from "../components/TopBar.jsx";
import TabBar from "../components/TabBar.jsx";
import { SEED_HAUSREGELN } from "../data/corpus.js";

export default function Rules() {
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
      <TopBar subtitle="Hausordnung" right="§1 – §20" />

      <div className="hm-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--ink)", minHeight: 0 }}>
        <div style={{ padding: "22px 20px 12px" }}>
          <div className="hm-aushang-frame">
            <span className="hm-aushang-label">Aushang · §1–§20</span>
            <h2 className="hm-display" style={{ fontSize: 24, margin: "4px 0 6px", lineHeight: 1.0 }}>
              The <span style={{ color: "var(--olive)" }}>Hausregeln</span>
              <br />
              are binding.
            </h2>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
              Auto-curated by der Hausmeister.
              <br />
              Last revision: <span className="hm-text-yellow">SAT 12:00</span>. Effective immediately.
            </div>
          </div>
        </div>

        <div>
          {SEED_HAUSREGELN.map((r, i) => (
            <div
              key={r.n}
              style={{
                padding: "12px 20px",
                borderBottom:
                  i === SEED_HAUSREGELN.length - 1 ? "none" : "1px dashed var(--border)",
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                gap: 12,
              }}
            >
              <div
                className="hm-display"
                style={{
                  fontSize: 13,
                  color: "var(--olive)",
                  lineHeight: 1.5,
                  letterSpacing: "0.02em",
                }}
              >
                §{r.n}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--bone)" }}>{r.rule}</div>
            </div>
          ))}
          <div style={{ padding: "16px 20px", textAlign: "center" }}>
            <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
              ☞ end of notice · D. Hausmeister
            </div>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
}

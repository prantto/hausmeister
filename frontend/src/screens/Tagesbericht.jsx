import { TAGESBERICHT } from "../data/corpus.js";

const STATS = [
  { k: "Scraps total",    v: "247" },
  { k: "On the wall",     v: "61"  },
  { k: "Purged (safety)", v: "31"  },
  { k: "Marked boring",   v: "19"  },
  { k: "Active handles",  v: "188" },
  { k: "Median funny",    v: "5.4" },
];

const CITED = ["umlaut-88", "kartoffel-04", "lampe-90", "muelltonne-15", "schimmel-77"];

export default function Tagesbericht() {
  const r = TAGESBERICHT;
  return (
    <div className="hm-bigscreen hm-sans">
      <div
        style={{
          background: "var(--card)",
          borderBottom: "2px solid var(--olive)",
          padding: "22px 36px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              className="hm-stamp-label"
              style={{ color: "var(--muted-foreground)", fontSize: 11 }}
            >
              Verfahren · internal · do not forward
            </div>
            <h1
              className="hm-display"
              style={{
                fontSize: 56,
                margin: "8px 0 4px",
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              }}
            >
              Tagesbericht
            </h1>
            <div
              className="hm-stamp-label"
              style={{ fontSize: 12, color: "var(--muted-foreground)" }}
            >
              No. 02 · {r.date}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="hm-stamp">Bearbeitet</span>
            <div
              className="hm-stamp-label"
              style={{ color: "var(--muted-foreground)", marginTop: 12, fontSize: 9 }}
            >
              Generated · LLM
              <br />
              Corpus slice: FRI 18:00 → SAT 10:00
            </div>
          </div>
        </div>
      </div>

      <div
        className="hm-scroll hm-bericht-grid"
        style={{ flex: 1, padding: "28px 36px", overflow: "auto" }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              marginBottom: 24,
              fontStyle: "italic",
              borderLeft: "3px solid var(--olive)",
              paddingLeft: 16,
              color: "var(--bone)",
            }}
          >
            {r.intro}
          </div>

          {r.sections.map((s) => (
            <div key={s.h} style={{ marginBottom: 22 }}>
              <div
                className="hm-display"
                style={{
                  fontSize: 13,
                  color: "var(--olive)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 6,
                  marginBottom: 10,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                {s.h}
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--bone)" }}>{s.body}</div>
            </div>
          ))}

          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div
                className="hm-display"
                style={{
                  fontSize: 16,
                  fontStyle: "italic",
                  letterSpacing: "0.01em",
                  textTransform: "none",
                }}
              >
                — Signed: D. Hausmeister
              </div>
              <div
                className="hm-stamp-label"
                style={{ color: "var(--muted-foreground)", marginTop: 2 }}
              >
                Berlin · 14.06.2026 · caretaker
              </div>
            </div>
            <span className="hm-stamp">Freigegeben</span>
          </div>
        </div>

        <div>
          <div className="hm-aushang-frame" style={{ padding: "20px 18px 16px" }}>
            <span className="hm-aushang-label">Kennzahlen · stats</span>
            <div style={{ paddingTop: 4 }}>
              {STATS.map((row, i) => (
                <div
                  key={row.k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "8px 0",
                    borderBottom:
                      i === STATS.length - 1 ? "none" : "1px dashed var(--border)",
                  }}
                >
                  <span
                    className="hm-stamp-label"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {row.k}
                  </span>
                  <span className="hm-display" style={{ fontSize: 18, color: "var(--bone)" }}>
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div
              className="hm-stamp-label"
              style={{ color: "var(--muted-foreground)", marginBottom: 8 }}
            >
              ☞ Cited corpus
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {CITED.map((h) => (
                <li key={h} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
                  <span className="hm-stamp-label" style={{ color: "var(--olive)" }}>
                    →
                  </span>
                  <span
                    className="hm-stamp-label"
                    style={{
                      fontSize: 11,
                      color: "var(--bone)",
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    {h}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="hm-stamp-label"
            style={{
              color: "var(--muted-foreground)",
              lineHeight: 1.7,
              marginTop: 24,
              fontSize: 9,
            }}
          >
            Tagesbericht generated every 2h on /wall.
            <br />
            Final report: SUN 14:01. The Hausmeister leaves at 14:01.
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { generateHandle } from "../data/corpus.js";

export default function Onboarding() {
  const navigate = useNavigate();
  const [handle, setHandle] = useState(() => {
    const stored = localStorage.getItem("hm.handle");
    if (stored) return stored;
    const fresh = generateHandle();
    localStorage.setItem("hm.handle", fresh);
    return fresh;
  });

  const reroll = () => {
    const fresh = generateHandle();
    localStorage.setItem("hm.handle", fresh);
    setHandle(fresh);
  };

  const enter = () => {
    localStorage.setItem("hm.onboarded", "1");
    navigate("/chat");
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
      }}
    >
      <TopBar subtitle="v0.1-kompost" />

      <div
        style={{
          flex: 1,
          padding: "20px 22px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <span className="hm-aushang">Aushang · §1 BGB</span>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>
            BIG BERLIN HACK · 2026
          </span>
        </div>

        <h1
          className="hm-display hm-scanline"
          style={{
            fontSize: 32,
            margin: 0,
            lineHeight: 0.95,
            fontWeight: 800,
            position: "relative",
          }}
        >
          Der <span style={{ color: "var(--olive)" }}>Hausmeister</span>
          <br />
          has <span style={{ color: "var(--olive)" }} className="hm-underline">read</span>
          <br />
          everything
          <br />
          you've said.
        </h1>

        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--muted-foreground)",
            marginTop: 18,
            marginBottom: 0,
          }}
        >
          Throw it on the <span className="hm-text-yellow">Komposthaufen</span>. He'll let you know
          what he thinks. Logged and ignored. Probably.
        </p>

        <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div className="hm-stamp-label" style={{ color: "var(--muted-foreground)" }}>
            ☞ Your handle
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span
              className="hm-display"
              style={{ fontSize: 22, color: "var(--yellow-faded)", letterSpacing: "-0.02em" }}
            >
              {handle}
            </span>
            <button
              onClick={reroll}
              className="hm-chip"
              style={{ cursor: "pointer", background: "transparent" }}
            >
              ↻ reroll
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 6 }}>
            No signup. No email. Just the Komposthaufen.
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          className="hm-btn hm-btn-primary"
          onClick={enter}
          style={{ alignSelf: "stretch", justifyContent: "space-between", marginTop: 18 }}
        >
          <span>Talk to Der Hausmeister</span>
          <span className="arrow">→</span>
        </button>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
          <span className="hm-chip">passive-aggressive</span>
          <span className="hm-chip">approx. fermented</span>
          <span className="hm-chip">no signup, no email</span>
        </div>

        <div
          className="hm-stamp-label"
          style={{ color: "var(--muted-foreground)", marginTop: 14, fontSize: 9 }}
        >
          Signed: D. Hausmeister · Berlin · 14.06.2026
        </div>
      </div>
    </div>
  );
}

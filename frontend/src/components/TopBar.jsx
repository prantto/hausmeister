export default function TopBar({ subtitle = "On duty", right = "Akte №047-K" }) {
  return (
    <div className="hm-statusbar" style={{ justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="hm-dot" />
        <span style={{ color: "var(--olive)", fontWeight: 700, letterSpacing: "0.12em" }}>
          HAUSMEISTER
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>· {subtitle}</span>
      </div>
      <div style={{ color: "var(--muted-foreground)" }}>{right}</div>
    </div>
  );
}

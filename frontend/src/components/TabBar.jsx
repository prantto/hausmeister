import { NavLink } from "react-router-dom";

const TABS = [
  { id: "ask",    label: "ask",    to: "/chat" },
  { id: "submit", label: "drop",   to: "/submit" },
  { id: "rules",  label: "regeln", to: "/rules" },
];

export default function TabBar() {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--ink)",
        display: "flex",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 14px)",
      }}
    >
      {TABS.map((t, i) => (
        <NavLink
          key={t.id}
          to={t.to}
          className="hm-reset"
          style={({ isActive }) => ({
            flex: 1,
            padding: "12px 4px 14px",
            borderRight: i < TABS.length - 1 ? "1px solid var(--border)" : "none",
            background: "transparent",
            color: isActive ? "var(--olive)" : "var(--muted-foreground)",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: isActive ? 700 : 500,
            letterSpacing: "0.14em",
            fontSize: 11,
            textTransform: "lowercase",
            textAlign: "center",
            cursor: "pointer",
          })}
        >
          {({ isActive }) => (
            <>
              {isActive ? "▸ " : ""}
              {t.label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

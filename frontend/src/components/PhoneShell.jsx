// Phone-like outer shell + a faux iOS status bar at the top. Keeps the
// design's "device" feeling on desktop without literally drawing a notch.
export default function PhoneShell({ children }) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="hm-app-shell">
      <div className="hm-faux-status">
        <span>{time}</span>
        <span style={{ color: "var(--muted-foreground)" }}>● ● ●</span>
      </div>
      <div className="hm-screen-fill">{children}</div>
    </div>
  );
}

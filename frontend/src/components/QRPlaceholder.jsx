export default function QRPlaceholder({ size = 108 }) {
  const cells = [];
  const rng = (i, j) => ((i * 37 + j * 19 + i * j * 3) % 7) < 3;
  for (let i = 0; i < 21; i++) {
    for (let j = 0; j < 21; j++) {
      const corner = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
      const isFinder =
        corner &&
        ((i === 0 || i === 6 || j === 0 || j === 6) ||
          ((i >= 2 && i <= 4) && (j >= 2 && j <= 4)) ||
          ((i < 7 && j > 13) &&
            (i === 0 || i === 6 || j === 14 || j === 20 ||
              ((i >= 2 && i <= 4) && (j >= 16 && j <= 18)))) ||
          ((i > 13 && j < 7) &&
            (i === 14 || i === 20 || j === 0 || j === 6 ||
              ((i >= 16 && i <= 18) && (j >= 2 && j <= 4)))));
      const fill = corner ? isFinder : rng(i, j);
      cells.push({ i, j, fill });
    }
  }
  const cell = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: "var(--bone)" }}>
      {cells.map((c, k) =>
        c.fill ? (
          <rect key={k} x={c.j * cell} y={c.i * cell} width={cell} height={cell} fill="var(--ink)" />
        ) : null
      )}
    </svg>
  );
}

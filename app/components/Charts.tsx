type Series = { label: string; value: number };

export function BarChart({
  data,
  unit,
  color = "#10b981",
}: {
  data: Series[];
  unit?: string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 320;
  const height = 160;
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = innerW / data.length - 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padding.left + i * (innerW / data.length) + 4;
        const y = padding.top + (innerH - h);
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx="4" fill={color} />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-slate-700"
              fontSize="10"
              fontWeight="600"
            >
              {d.value > 0 ? d.value.toLocaleString("ro-RO") : ""}
            </text>
            <text
              x={x + barW / 2}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="11"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      {unit && (
        <text x={width - 4} y={12} textAnchor="end" className="fill-slate-400" fontSize="10">
          {unit}
        </text>
      )}
    </svg>
  );
}

export function LineChart({
  data,
  unit,
  color = "#f59e0b",
}: {
  data: Series[];
  unit?: string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 320;
  const height = 160;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (innerW * i) / Math.max(1, data.length - 1);
    const y = padding.top + (innerH - (d.value / max) * innerH);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${points[points.length - 1]?.x ?? padding.left},${
    padding.top + innerH
  } L${points[0]?.x ?? padding.left},${padding.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      <path d={area} fill={color} fillOpacity="0.15" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            className="fill-slate-700"
            fontSize="10"
            fontWeight="600"
          >
            {p.value > 0 ? p.value.toLocaleString("ro-RO") : ""}
          </text>
          <text x={p.x} y={height - 10} textAnchor="middle" className="fill-slate-500" fontSize="11">
            {p.label}
          </text>
        </g>
      ))}
      {unit && (
        <text x={width - 4} y={12} textAnchor="end" className="fill-slate-400" fontSize="10">
          {unit}
        </text>
      )}
    </svg>
  );
}

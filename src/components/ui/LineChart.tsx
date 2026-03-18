"use client";

interface LineChartProps {
  data: { label: string; actual: number; optimised?: number }[];
  height?: number;
  color?: string;
  optimisedColor?: string;
  formatValue?: (v: number) => string;
}

export function LineChart({
  data,
  height = 160,
  color = "#0A8A4C",
  optimisedColor = "#F5A94A",
  formatValue,
}: LineChartProps) {
  const allValues = data.flatMap((d) => [d.actual, d.optimised ?? 0]).filter((v) => v > 0);
  const min = Math.min(...allValues) * 0.9;
  const max = Math.max(...allValues) * 1.05;
  const range = max - min;

  const w = 600;
  const h = height - 32;
  const pad = 8;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const toY = (v: number) => h - ((v - min) / range) * (h - pad * 2) - pad;

  const actualPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.actual)}`).join(" ");
  const optimisedPath = data
    .filter((d) => d.optimised)
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.optimised!)}`)
    .join(" ");

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h + 32}`} className="w-full" style={{ height }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            y1={toY(min + t * range)}
            x2={w - pad}
            y2={toY(min + t * range)}
            stroke="#1a2d45"
            strokeWidth="1"
          />
        ))}

        {/* Optimised line */}
        {optimisedPath && (
          <path d={optimisedPath} fill="none" stroke={optimisedColor} strokeWidth="2" strokeDasharray="6,3" opacity="0.8" />
        )}

        {/* Actual line */}
        <path d={actualPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.actual)} r="3.5" fill={color} />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={h + 20} textAnchor="middle" fontSize="10" fill="#5a7a96">
            {d.label}
          </text>
        ))}

        {/* Last value label */}
        <text x={toX(data.length - 1) + 6} y={toY(data[data.length - 1].actual)} fontSize="10" fill={color} dominantBaseline="middle">
          {fmt(data[data.length - 1].actual)}
        </text>
      </svg>
    </div>
  );
}

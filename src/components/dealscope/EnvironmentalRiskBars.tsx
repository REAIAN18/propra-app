"use client";

export interface EnvironmentalRisk {
  label: string;
  pct: number;
}

interface EnvironmentalRiskBarsProps {
  risks?: EnvironmentalRisk[];
}

function barColor(pct: number): string {
  if (pct >= 60) return "var(--red)";
  if (pct >= 25) return "var(--amb)";
  return "var(--grn)";
}

export function EnvironmentalRiskBars({ risks }: EnvironmentalRiskBarsProps) {
  if (!risks || risks.length === 0) return null;
  return (
    <div>
      {risks.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ width: 110, fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{r.label}</span>
          <div style={{ flex: 1, height: 5, background: "var(--s3, #27272a)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${r.pct}%`, height: "100%", background: barColor(r.pct), borderRadius: 3, transition: "width .6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

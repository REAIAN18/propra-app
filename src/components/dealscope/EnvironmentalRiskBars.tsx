"use client";

export interface EnvironmentalRisk {
  label: string;
  pct: number;
}

interface EnvironmentalRiskBarsProps {
  risks?: EnvironmentalRisk[];
}

const DEFAULT_RISKS: EnvironmentalRisk[] = [
  { label: "Flood (rivers)",  pct: 5  },
  { label: "Flood (surface)", pct: 8  },
  { label: "Contamination",   pct: 35 },
  { label: "Asbestos",        pct: 30 },
  { label: "Ground stability",pct: 8  },
  { label: "Radon",           pct: 3  },
  { label: "Air quality",     pct: 15 },
  { label: "Noise",           pct: 20 },
];

export function EnvironmentalRiskBars({ risks = DEFAULT_RISKS }: EnvironmentalRiskBarsProps) {
  return (
    <div>
      {risks.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ width: 110, fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{r.label}</span>
          <div style={{ flex: 1, height: 5, background: "var(--s3, #27272a)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${r.pct}%`, height: "100%", background: r.pct > 25 ? "var(--amb)" : "var(--grn)", borderRadius: 3, transition: "width .6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { Skeleton } from "./ui/Skeleton";

export interface ValuationScenario {
  label: string;
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  method: string;
  confidence: "high" | "medium" | "low";
}

interface MultipleValuationsProps {
  scenarios: ValuationScenario[];
  isLoading?: boolean;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "#2dd4a8",
  medium: "#eab020",
  low:    "#f06060",
};

export function MultipleValuations({ scenarios, isLoading = false }: MultipleValuationsProps) {
  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Skeleton height={10} width="55%" borderRadius={3} />
            <Skeleton height={22} width="70%" borderRadius={4} />
            <Skeleton height={9} width="80%" borderRadius={3} />
            <Skeleton height={9} width="50%" borderRadius={3} />
          </div>
        ))}
      </div>
    );
  }

  if (!scenarios || scenarios.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(scenarios.length, 3)}, 1fr)`,
        gap: 14,
      }}
    >
      {scenarios.map((sc, i) => (
        <div
          key={i}
          style={{
            background: "var(--s1)",
            border: "1px solid var(--s2)",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--tx3)",
              textTransform: "uppercase",
              letterSpacing: ".8px",
              marginBottom: 8,
            }}
          >
            {sc.label}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--tx)",
              marginBottom: 4,
            }}
          >
            {fmtCurrency(sc.valueMid)}
          </div>
          <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 2 }}>
            {fmtCurrency(sc.valueLow)} – {fmtCurrency(sc.valueHigh)}
          </div>
          <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 4 }}>
            {sc.method}
          </div>
          <div style={{ fontSize: 9, color: CONFIDENCE_COLOR[sc.confidence] }}>
            Confidence: {sc.confidence.charAt(0).toUpperCase() + sc.confidence.slice(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

interface G2NCardProps {
  className?: string;
  g2nPct: number;
  benchLow: number;
  benchHigh: number;
  grossIncome: string;
  totalOpex: string;
  opexVsBench: string;
  noi: string;
  benchLabel: string;
  calloutText: string;
  onCalloutClick?: () => void;
}

export function G2NComparisonCard({
  className,
  g2nPct,
  benchLow,
  benchHigh,
  grossIncome,
  totalOpex,
  opexVsBench,
  noi,
  benchLabel,
  calloutText,
  onCalloutClick,
}: G2NCardProps) {
  const isBelow = g2nPct < benchLow;

  return (
    <div className={`g2n-card ${className ?? ""}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a7a96" }}>
            Gross to Net — Portfolio
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: "#3d5a72" }}>
            Benchmark {benchLow}–{benchHigh}% · Click to fix →
          </p>
        </div>
        <div className="text-right">
          <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: isBelow ? "#F5A94A" : "#0A8A4C", lineHeight: 1 }}>
            {g2nPct}%
          </p>
          <p className="text-[10px] font-bold" style={{ color: isBelow ? "#F5A94A" : "#0A8A4C" }}>
            {isBelow ? "↓ Below benchmark" : "✓ On benchmark"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="g2n-bar">
        <div className="g2n-bar-fill" style={{ width: `${Math.min(g2nPct, 100)}%` }} />
        <div className="g2n-bar-mark" style={{ left: `${benchLow}%` }} />
        <div className="g2n-bar-mark" style={{ left: `${benchHigh}%` }} />
      </div>

      {/* 3-cell breakdown */}
      <div className="g2n-cells">
        {[
          { label: "Gross Income", value: grossIncome, color: "#e8eef5", sub: "rental income/yr" },
          { label: "Total Opex", value: totalOpex, color: "#f06040", sub: opexVsBench, subColor: "#F5A94A" },
          { label: "NOI (Net)", value: noi, color: "#F5A94A", sub: benchLabel },
        ].map((cell, i) => (
          <div key={i} className="g2n-cell">
            <p className="g2n-cell-label">{cell.label}</p>
            <p className="g2n-cell-value" style={{ color: cell.color }}>
              {cell.value}
            </p>
            <p className="text-[9px]" style={{ color: cell.subColor ?? "#94A3B8" }}>
              {cell.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Callout */}
      {/* eslint-disable-next-line react/no-danger */}
      <div className="g2n-callout" onClick={onCalloutClick} dangerouslySetInnerHTML={{ __html: calloutText }} />
    </div>
  );
}

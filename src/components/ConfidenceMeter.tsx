"use client";

export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const level = confidence >= 0.75 ? "high" : confidence >= 0.45 ? "med" : "low";
  const widthPct = confidence >= 0.75 ? "85%" : confidence >= 0.45 ? "55%" : "25%";
  const color =
    level === "high" ? "var(--grn)" : level === "med" ? "var(--amb)" : "var(--red)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          width: "48px",
          height: "5px",
          background: "var(--s3)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "3px",
            background: color,
            width: widthPct,
          }}
        />
      </div>
      <span style={{ font: "500 9px/1 var(--mono)", color }}>{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
}

"use client";

import { Skeleton } from "./ui/Skeleton";

interface DealScoreProps {
  score: number;
  maxScore?: number;
  label?: string;
  sublabel?: string;
  isLoading?: boolean;
}

export function DealScore({ score, maxScore = 100, label = "Deal score", sublabel, isLoading = false }: DealScoreProps) {
  if (isLoading) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Skeleton height={42} width={42} borderRadius="50%" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Skeleton height={10} width={60} />
          <Skeleton height={8} width={40} />
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = pct >= 70 ? "#2dd4a8" : pct >= 40 ? "#eab020" : "#f06060";
  const glow = pct >= 70
    ? "rgba(45,212,168,.35)"
    : pct >= 40 ? "rgba(234,176,32,.25)" : "rgba(240,96,96,.25)";

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: `2.5px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontWeight: 600,
          color,
          boxShadow: `0 0 12px ${glow}`,
          flexShrink: 0,
        }}
      >
        {score.toFixed(0)}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--tx2)" }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 9, color }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Skeleton } from "./ui/Skeleton";

export interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: "default" | "green" | "amber" | "red";
  mono?: boolean;
  isLoading?: boolean;
}

const VALUE_COLORS = {
  default: "#e4e4ec",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
};

export function MetricCard({
  label,
  value,
  subtitle,
  color = "default",
  mono = true,
  isLoading = false,
}: MetricCardProps) {
  return (
    <div
      style={{
        background: "var(--s2, #18181f)",
        border: "1px solid var(--s3, #25252d)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      {isLoading ? (
        <>
          <Skeleton height={10} width="55%" borderRadius={3} />
          <Skeleton height={22} width="70%" borderRadius={4} style={{ marginTop: 4 }} />
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#a0a0ab",
              textTransform: "uppercase",
              letterSpacing: "0.7px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: VALUE_COLORS[color],
              fontFamily: mono ? "var(--mono, 'JetBrains Mono', monospace)" : "inherit",
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11,
                color: "#71717a",
              }}
            >
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
}

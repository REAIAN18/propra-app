"use client";

import { Skeleton } from "./ui/Skeleton";

interface AISummaryProps {
  summary: string;
  play?: string;
  isLoading?: boolean;
}

export function AISummary({ summary, play, isLoading = false }: AISummaryProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(124,106,240,.08), rgba(124,106,240,.03))",
        border: "1px solid rgba(124,106,240,.2)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton height={10} width={80} borderRadius={4} />
          <Skeleton height={13} width="90%" />
          <Skeleton height={13} width="75%" />
          <Skeleton height={13} width="60%" />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                background: "rgba(124,106,240,.15)",
                color: "#a899ff",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1px",
                padding: "2px 7px",
                borderRadius: 4,
                textTransform: "uppercase",
                fontFamily: "var(--mono, monospace)",
              }}
            >
              AI SUMMARY
            </span>
            {play && (
              <span style={{ fontSize: 12, color: "#a0a0ab", fontStyle: "italic" }}>
                {play}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#e4e4ec",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {summary}
          </p>
        </>
      )}
    </div>
  );
}

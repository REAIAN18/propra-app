"use client";

interface AISummaryProps {
  summary: string;
  play?: string;
}

export function AISummary({ summary, play }: AISummaryProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(124,106,240,.06), rgba(45,212,168,.04))",
        border: "1px solid rgba(124,106,240,.12)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#a899ff",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          AI ANALYSIS
        </span>
        {play && (
          <span style={{ fontSize: 12, color: "#8e8ea0", fontStyle: "italic" }}>
            {play}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 13,
          color: "#e8e8f0",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {summary}
      </p>
    </div>
  );
}

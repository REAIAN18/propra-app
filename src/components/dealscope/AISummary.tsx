"use client";

interface AISummaryProps {
  summary: string;
  play?: string;
}

export function AISummary({ summary, play }: AISummaryProps) {
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
    </div>
  );
}

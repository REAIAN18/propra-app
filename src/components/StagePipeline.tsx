"use client";

type Stage = "identified" | "researching" | "quoting" | "approved" | "installing" | "live" | "renewing";

const STAGES: { key: Stage; label: string }[] = [
  { key: "identified", label: "Identified" },
  { key: "researching", label: "Researching" },
  { key: "quoting", label: "Quoting" },
  { key: "approved", label: "Approved" },
  { key: "installing", label: "Installing" },
  { key: "live", label: "Live" },
  { key: "renewing", label: "Renewing" },
];

export function StagePipeline({ currentStage }: { currentStage: Stage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "18px" }}>
      {STAGES.map((stage, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <div
            key={stage.key}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 4px",
              position: "relative",
              font: "500 9px/1 var(--mono)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: isDone ? "var(--grn)" : isCurrent ? "var(--acc)" : "var(--tx3)",
              fontWeight: isCurrent ? 700 : 500,
              background: isCurrent ? "var(--acc-lt)" : "transparent",
              borderRadius: isCurrent ? "6px" : 0,
              border: isCurrent ? "1px solid var(--acc-bdr)" : "none",
              opacity: isFuture ? 0.5 : 1,
            }}
          >
            {isDone && <span style={{ animation: "check-pop 0.3s ease both" }}>✓ </span>}
            {stage.label}
            {idx < STAGES.length - 1 && (
              <span
                style={{
                  content: "''",
                  position: "absolute",
                  right: "-1px",
                  top: "50%",
                  width: "10px",
                  height: "1px",
                  background: "var(--bdr)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

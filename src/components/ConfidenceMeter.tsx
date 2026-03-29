interface ConfidenceMeterProps {
  score: number; // 0-100
  showLabel?: boolean;
}

export function ConfidenceMeter({
  score,
  showLabel = true,
}: ConfidenceMeterProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "var(--grn)";
    if (score >= 60) return "var(--amb)";
    return "var(--red)";
  };

  const getLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Progress bar */}
      <div
        style={{
          flex: 1,
          height: "6px",
          background: "var(--s2)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: getColor(score),
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Score */}
      <div
        style={{
          font: "600 14px var(--sans)",
          color: getColor(score),
          minWidth: "40px",
        }}
      >
        {score}%
      </div>

      {/* Label */}
      {showLabel && (
        <div
          style={{
            font: "500 10px var(--sans)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {getLabel(score)}
        </div>
      )}
    </div>
  );
}

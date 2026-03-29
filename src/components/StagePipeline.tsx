interface StagePipelineProps {
  currentStage:
    | "identified"
    | "researching"
    | "quoting"
    | "approved"
    | "installing"
    | "live";
}

export function StagePipeline({ currentStage }: StagePipelineProps) {
  const stages = [
    { key: "identified", label: "Identified" },
    { key: "researching", label: "Researching" },
    { key: "quoting", label: "Quoting" },
    { key: "approved", label: "Approved" },
    { key: "installing", label: "Installing" },
    { key: "live", label: "Live" },
  ] as const;

  const currentIndex = stages.findIndex((s) => s.key === currentStage);

  return (
    <div
      className="stage-pipeline"
      style={{
        display: "flex",
        gap: "6px",
        marginBottom: "14px",
      }}
    >
      {stages.map((stage, index) => {
        const stateClass =
          index < currentIndex
            ? "done"
            : index === currentIndex
            ? "current"
            : "future";

        return (
          <div
            key={stage.key}
            className={`stage ${stateClass}`}
            style={{
              flex: 1,
              padding: "10px 12px",
              textAlign: "center",
              font: "500 10px var(--sans)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderRadius: "6px",
              transition: "all 0.2s",
              ...(stateClass === "done" && {
                background: "var(--grn-lt)",
                color: "var(--grn)",
                border: "1px solid var(--grn-bdr)",
              }),
              ...(stateClass === "current" && {
                background: "var(--acc)",
                color: "#fff",
                border: "1px solid var(--acc)",
              }),
              ...(stateClass === "future" && {
                background: "var(--s2)",
                color: "var(--tx3)",
                border: "1px solid var(--bdr)",
              }),
            }}
          >
            {stage.label}
          </div>
        );
      })}
    </div>
  );
}

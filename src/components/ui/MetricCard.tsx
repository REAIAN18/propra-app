interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "green" | "amber" | "blue" | "red";
  action?: string;
  onAction?: () => void;
}

const accentColors = {
  green: "#0A8A4C",
  amber: "#F5A94A",
  blue: "#1647E8",
  red: "#e85116",
};

export function MetricCard({ label, value, sub, trend, trendLabel, accent = "green", action, onAction }: MetricCardProps) {
  const color = accentColors[accent];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg group cursor-default"
      style={{
        backgroundColor: "#111e2e",
        border: "1px solid #1a2d45",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <div className="text-xs font-medium uppercase tracking-widest" style={{ color: "#5a7a96" }}>
        {label}
      </div>
      <div>
        <div
          className="text-3xl font-bold leading-none"
          style={{ color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}
        >
          {value}
        </div>
        {sub && <div className="mt-1.5 text-sm" style={{ color: "#8ba0b8" }}>{sub}</div>}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: trend === "up" ? "#0A8A4C" : trend === "down" ? "#e85116" : "#8ba0b8" }}>
          {trend === "up" && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 9V3M3 6L6 3L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {trend === "down" && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 3V9M3 6L6 9L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {trendLabel}
        </div>
      )}
      {action && (
        <button
          onClick={onAction}
          className="mt-auto text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] w-fit"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

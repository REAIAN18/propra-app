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
  green: "var(--grn)",
  amber: "var(--amb)",
  blue: "var(--acc)",
  red: "var(--red)",
};

export function MetricCard({ label, value, sub, trend, trendLabel, accent = "green", action, onAction }: MetricCardProps) {
  const color = accentColors[accent];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg group cursor-default"
      style={{
        backgroundColor: "var(--s1)",
        border: "1px solid var(--bdr)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--tx3)" }}>
        {label}
      </div>
      <div>
        <div
          className="text-3xl font-bold leading-none"
          style={{ color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
        >
          {value}
        </div>
        {sub && <div className="mt-1.5 text-sm" style={{ color: "var(--tx2)" }}>{sub}</div>}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: trend === "up" ? "var(--grn)" : trend === "down" ? "var(--red)" : "var(--tx2)" }}>
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

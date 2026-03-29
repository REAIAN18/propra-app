interface MonthlyPerformanceChartProps {
  monthlyActuals: Array<{ month: string; amount: number }>;
  currency?: string;
}

export function MonthlyPerformanceChart({
  monthlyActuals,
  currency = "£",
}: MonthlyPerformanceChartProps) {
  // Get last 6 months
  const lastSix = monthlyActuals.slice(-6);

  // Find max value for scaling
  const maxAmount = Math.max(...lastSix.map((m) => m.amount), 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "4px",
      }}
    >
      {lastSix.map((item) => {
        const heightPct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
        const monthLabel = new Date(item.month + "-01").toLocaleDateString(
          "en-GB",
          { month: "short" }
        );

        return (
          <div
            key={item.month}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Bar container */}
            <div
              style={{
                width: "100%",
                height: "60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: "var(--grn)",
                  borderRadius: "3px 3px 0 0",
                }}
                title={`${currency}${item.amount.toLocaleString()}`}
              />
            </div>

            {/* Month label */}
            <div
              style={{
                font: "500 10px var(--sans)",
                color: "var(--tx3)",
                marginBottom: "2px",
              }}
            >
              {monthLabel}
            </div>

            {/* Amount */}
            <div style={{ font: "600 11px var(--sans)", color: "var(--tx)" }}>
              {currency}
              {(item.amount / 1000).toFixed(1)}k
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

export interface ServiceChargeItem {
  label: string;
  annualCost: number;
  category?: string;
}

interface ServiceChargesProps {
  items: ServiceChargeItem[];
  totalBudget?: number;
  currency?: string;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#7c6af0",
  insurance:   "#5599f0",
  management:  "#2dd4a8",
  utilities:   "#eab020",
  other:       "#8e8ea0",
};

export function ServiceCharges({ items, totalBudget }: ServiceChargesProps) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          padding: 10,
          background: "var(--s2)",
          borderRadius: 6,
          border: "1px dashed var(--s3)",
          fontSize: 11,
          color: "var(--tx3)",
          textAlign: "center",
        }}
      >
        No service charge data available
      </div>
    );
  }

  const total = totalBudget ?? items.reduce((s, i) => s + i.annualCost, 0);

  return (
    <div>
      {/* Visual bar chart */}
      <div style={{ marginBottom: 14 }}>
        {items.map((item, i) => {
          const pct = total > 0 ? (item.annualCost / total) * 100 : 0;
          const cat = item.category || "other";
          const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <div style={{ width: 110, fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>
                {item.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: "var(--s3)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                    borderRadius: 3,
                    transition: "width .6s ease",
                  }}
                />
              </div>
              <div
                style={{
                  width: 60,
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--tx2)",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {fmtCurrency(item.annualCost)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div
        style={{
          borderTop: "1px solid var(--s3)",
          paddingTop: 8,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
        }}
      >
        <span style={{ color: "var(--tx)" }}>Total annual service charge</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            color: "var(--tx)",
          }}
        >
          {fmtCurrency(total)}
        </span>
      </div>
    </div>
  );
}

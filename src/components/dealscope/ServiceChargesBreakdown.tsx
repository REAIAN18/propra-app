"use client";

/* ═══════════════════════════════════════════════════
   ServiceChargesBreakdown — DS-T18 — matches 02-dossier-full.html
   Service charge breakdown: management, insurance, maintenance
   ═══════════════════════════════════════════════════ */

export interface ServiceChargeLineItem {
  label: string;
  annualCost: number;
  category?: "management" | "insurance" | "maintenance" | "utilities" | "other";
}

interface ServiceChargesBreakdownProps {
  items: ServiceChargeLineItem[];
  totalBudget?: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

const CATEGORY_COLOR: Record<string, string> = {
  maintenance: "var(--acc)",
  insurance:   "#5599f0",
  management:  "var(--grn)",
  utilities:   "var(--amb)",
  other:       "var(--tx3)",
};

export function ServiceChargesBreakdown({ items, totalBudget }: ServiceChargesBreakdownProps) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 10, background: "var(--s2)", borderRadius: 6, border: "1px dashed var(--s3)", fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
        No service charge data available
      </div>
    );
  }

  const total = totalBudget ?? items.reduce((s, i) => s + i.annualCost, 0);

  return (
    <div>
      {/* Bar rows */}
      {items.map((item, i) => {
        const pct   = total > 0 ? (item.annualCost / total) * 100 : 0;
        const color = CATEGORY_COLOR[item.category ?? "other"] ?? CATEGORY_COLOR.other;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <div style={{ width: 120, fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{item.label}</div>
            <div style={{ flex: 1, height: 5, background: "var(--s3, #1f1f2c)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .6s ease" }} />
            </div>
            <div style={{ width: 60, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", textAlign: "right" as const, flexShrink: 0 }}>
              {fmt(item.annualCost)}
            </div>
          </div>
        );
      })}

      {/* Total row */}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--s3, #1f1f2c)", paddingTop: 8, marginTop: 6, fontSize: 12 }}>
        <span style={{ color: "var(--tx)" }}>Total annual service charge</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: "var(--tx)" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

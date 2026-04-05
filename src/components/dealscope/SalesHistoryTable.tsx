"use client";

import React from "react";

export interface SaleSummary {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

export interface SaleRecord {
  date: string;
  price: number;
  buyer?: string;
  saleType?: string;
  pricePsf?: number;
  changePct?: number;
}

export interface SalesHistoryTableProps {
  summary?: SaleSummary[];
  sales?: SaleRecord[];
  title?: string;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
  if (n >= 1_000)     return `£${Math.round(n / 1_000).toLocaleString()}k`;
  return `£${n.toLocaleString()}`;
}

const TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  color: "var(--tx3,#555566)",
  fontWeight: 500,
  borderBottom: "1px solid var(--s2,#18181f)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: ".5px",
};

const TD_STYLE: React.CSSProperties = {
  padding: 8,
  color: "var(--tx2,#8e8ea0)",
  borderBottom: "1px solid rgba(255,255,255,.02)",
  fontSize: 12,
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

export function SalesHistoryTable({ summary, sales = [], title = "Sales history (Land Registry Price Paid)" }: SalesHistoryTableProps) {
  return (
    <div style={{ background: "var(--s1,#111116)", border: "1px solid var(--s2,#18181f)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3,#555566)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>
        {title}
      </div>

      {/* Summary stat cards */}
      {summary && summary.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {summary.map((s, i) => (
            <div
              key={i}
              style={{ flex: 1, padding: 10, background: "var(--s2,#18181f)", borderRadius: 8, textAlign: "center" }}
            >
              <div style={{ fontSize: 10, color: "var(--tx3,#555566)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ ...MONO, fontSize: 16, fontWeight: 600, color: s.valueColor ?? "var(--tx,#e4e4ec)" }}>
                {s.value}
              </div>
              {s.sub && <div style={{ fontSize: 10, color: s.valueColor ?? "var(--tx3,#555566)" }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Sales table */}
      {sales.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--tx3,#555566)", textAlign: "center", padding: 10 }}>
          No sales history available
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Date", "Price", "Buyer", "Type", "£/sqft", "Change"].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((row, i) => {
              const changeColor =
                row.changePct === undefined ? "var(--tx3,#555566)"
                : row.changePct > 0        ? "var(--grn,#34d399)"
                : row.changePct < 0        ? "var(--red,#f87171)"
                :                            "var(--tx3,#555566)";

              return (
                <tr
                  key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <td style={TD_STYLE}>{row.date}</td>
                  <td style={{ ...TD_STYLE, ...MONO }}>{fmt(row.price)}</td>
                  <td style={TD_STYLE}>{row.buyer ?? "—"}</td>
                  <td style={TD_STYLE}>{row.saleType ?? "—"}</td>
                  <td style={{ ...TD_STYLE, ...MONO }}>
                    {row.pricePsf !== undefined ? `£${row.pricePsf}` : "—"}
                  </td>
                  <td style={{ ...TD_STYLE, ...MONO, color: changeColor }}>
                    {row.changePct !== undefined
                      ? `${row.changePct >= 0 ? "+" : ""}${row.changePct}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

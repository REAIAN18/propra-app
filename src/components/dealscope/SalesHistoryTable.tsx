"use client";

import { Skeleton } from "./ui/Skeleton";

export interface SaleRecord {
  date: string;
  price: number;
  type?: string;
  tenure?: string;
  newBuild?: boolean;
}

interface SalesHistoryTableProps {
  sales: SaleRecord[];
  title?: string;
  isLoading?: boolean;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export function SalesHistoryTable({ sales, title = "Sales history", isLoading = false }: SalesHistoryTableProps) {
  if (isLoading) {
    return (
      <div>
        {title && <Skeleton height={10} width={120} borderRadius={3} style={{ marginBottom: 10 }} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--s2)" }}>
              <Skeleton height={12} width="20%" />
              <Skeleton height={12} width="20%" />
              <Skeleton height={12} width="20%" />
              <Skeleton height={12} width="25%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div style={{ padding: 10, background: "var(--s2)", borderRadius: 6, border: "1px dashed var(--s3)", fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
        No sales history available
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>
          {title}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Date", "Price", "Type", "Tenure"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--tx3)", fontWeight: 500, borderBottom: "1px solid var(--s2)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sales.map((s, i) => (
            <tr key={i}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              <td style={{ padding: 8, color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{fmtDate(s.date)}</td>
              <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{fmtCurrency(s.price)}</td>
              <td style={{ padding: 8, color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{s.type || "—"}</td>
              <td style={{ padding: 8, color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{s.tenure || "—"}{s.newBuild ? " · New build" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { Skeleton } from "./ui/Skeleton";

export interface Comparable {
  address: string;
  type?: string;
  sqft?: number;
  price?: number;
  pricePsf?: number;
  date?: string;
  distance?: string;
  adjustedPsf?: number;
}

interface ComparablesTableProps {
  comps: Comparable[];
  title?: string;
  isLoading?: boolean;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

export function ComparablesTable({ comps, title = "Comparable transactions", isLoading = false }: ComparablesTableProps) {
  if (isLoading) {
    return (
      <div>
        {title && <Skeleton height={10} width={160} borderRadius={3} style={{ marginBottom: 10 }} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--s2)" }}>
              <Skeleton height={12} width="30%" />
              <Skeleton height={12} width="10%" />
              <Skeleton height={12} width="10%" />
              <Skeleton height={12} width="12%" />
              <Skeleton height={12} width="10%" />
              <Skeleton height={12} width="10%" />
              <Skeleton height={12} width="8%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!comps || comps.length === 0) {
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
        No comparable transactions available
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
            {["Property", "Type", "Size", "Price", "£/sqft", "Date", "Dist."].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--tx3)", fontWeight: 500, borderBottom: "1px solid var(--s2)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comps.map((c, i) => (
            <tr key={i} style={{ cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              <td style={{ padding: 8, color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.address}</td>
              <td style={{ padding: 8, color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.type || "—"}</td>
              <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.sqft ? c.sqft.toLocaleString() : "—"}</td>
              <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.price ? fmtCurrency(c.price) : "—"}</td>
              <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.pricePsf ? `£${c.pricePsf}` : c.adjustedPsf ? `£${c.adjustedPsf}` : "—"}</td>
              <td style={{ padding: 8, color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.date || "—"}</td>
              <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{c.distance || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

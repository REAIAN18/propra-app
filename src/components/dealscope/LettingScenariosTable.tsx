"use client";

import React from "react";

export interface LettingScenario {
  label: "Bear" | "Base" | "Bull";
  rentPsf: number;
  annualRent: number;
  voidMonths: number;
  noi: number;
  netYield: number;
  irr?: number;
  notes?: string;
}

interface LettingScenariosTableProps {
  scenarios?: LettingScenario[];
  currency?: string;
}

const SCENARIO_COLOR: Record<string, string> = {
  Bear: "var(--red,#f87171)",
  Base: "var(--amb,#fbbf24)",
  Bull: "var(--grn,#34d399)",
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  color: "var(--tx3,#555566)",
  fontWeight: 500,
  borderBottom: "1px solid var(--s2,#18181f)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: ".5px",
};

const TD: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid rgba(255,255,255,.02)",
  fontSize: 12,
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

function fmtK(n: number, cur = "£"): string {
  if (n >= 1_000_000) return `${cur}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `${cur}${Math.round(n / 1_000)}k`;
  return `${cur}${n.toLocaleString()}`;
}

export function LettingScenariosTable({ scenarios = [], currency = "£" }: LettingScenariosTableProps) {
  if (scenarios.length === 0) {
    return (
      <div style={{ padding: 10, background: "var(--s2,#18181f)", borderRadius: 6, border: "1px dashed var(--s3,#1f1f2c)", fontSize: 11, color: "var(--tx3,#555566)", textAlign: "center" }}>
        No letting scenarios available
      </div>
    );
  }

  return (
    <div style={{ background: "var(--s1,#111116)", border: "1px solid var(--s2,#18181f)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3,#555566)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>
        Letting scenarios
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Scenario", "Rent (psf)", "Annual rent", "Void", "NOI", "Net yield", "IRR", "Notes"].map(h => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s, i) => (
            <tr
              key={i}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              <td style={{ ...TD, fontWeight: 600, color: SCENARIO_COLOR[s.label] ?? "var(--tx2)" }}>
                {s.label}
              </td>
              <td style={{ ...TD, ...MONO, color: "var(--tx2,#8e8ea0)" }}>
                {currency}{s.rentPsf.toFixed(2)}
              </td>
              <td style={{ ...TD, ...MONO, color: "var(--tx2,#8e8ea0)" }}>
                {fmtK(s.annualRent, currency)}
              </td>
              <td style={{ ...TD, color: "var(--tx2,#8e8ea0)" }}>
                {s.voidMonths === 0 ? "None" : `${s.voidMonths}m`}
              </td>
              <td style={{ ...TD, ...MONO, color: "var(--tx,#e4e4ec)" }}>
                {fmtK(s.noi, currency)}
              </td>
              <td style={{ ...TD, ...MONO, color: SCENARIO_COLOR[s.label] ?? "var(--tx2)" }}>
                {s.netYield.toFixed(1)}%
              </td>
              <td style={{ ...TD, ...MONO, color: SCENARIO_COLOR[s.label] ?? "var(--tx2)" }}>
                {s.irr !== undefined ? `${s.irr.toFixed(1)}%` : "—"}
              </td>
              <td style={{ ...TD, color: "var(--tx3,#555566)", fontSize: 11 }}>
                {s.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

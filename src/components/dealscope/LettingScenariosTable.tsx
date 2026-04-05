"use client";

export interface LettingScenario {
  label: "Bear" | "Base" | "Bull";
  rentPsf?: number;
  rentPa?: number;
  voidMonths?: number;
  yield?: number;
  netIncomePa?: number;
  exitValue?: number;
  irr?: number;
  equityMultiple?: number;
}

interface LettingScenariosTableProps {
  scenarios?: LettingScenario[];
  title?: string;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

const SCENARIO_COLOR: Record<string, string> = {
  Bear: "var(--red)",
  Base: "var(--acc)",
  Bull: "var(--grn)",
};

const DEFAULT_SCENARIOS: LettingScenario[] = [
  { label: "Bear", rentPsf: 5.5,  rentPa: 45100, voidMonths: 12, yield: 7.5, netIncomePa: 22300, exitValue: 600000, irr: 9.4,  equityMultiple: 1.38 },
  { label: "Base", rentPsf: 6.5,  rentPa: 53300, voidMonths: 3,  yield: 6.5, netIncomePa: 28845, exitValue: 760000, irr: 18.2, equityMultiple: 1.93 },
  { label: "Bull", rentPsf: 8.00, rentPa: 65600, voidMonths: 1,  yield: 5.5, netIncomePa: 38400, exitValue: 960000, irr: 26.7, equityMultiple: 2.56 },
];

export function LettingScenariosTable({
  scenarios = DEFAULT_SCENARIOS,
  title = "Letting scenarios",
}: LettingScenariosTableProps) {
  return (
    <div>
      {title && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: ".8px",
            marginBottom: 10,
          }}
        >
          {title}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Scenario", "Rent (£/sqft)", "Rent pa", "Void", "Yield", "Net income", "Exit value", "IRR", "Eq. ×"].map(h => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px",
                  color: "var(--tx3)",
                  fontWeight: 500,
                  borderBottom: "1px solid var(--s2)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((sc, i) => {
            const color = SCENARIO_COLOR[sc.label] ?? "var(--tx)";
            return (
              <tr
                key={i}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  <span style={{ fontWeight: 600, color }}>{sc.label}</span>
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.rentPsf != null ? `£${sc.rentPsf.toFixed(2)}` : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.rentPa != null ? fmtCurrency(sc.rentPa) : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx3)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.voidMonths != null ? `${sc.voidMonths}m` : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.yield != null ? `${sc.yield.toFixed(1)}%` : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.netIncomePa != null ? fmtCurrency(sc.netIncomePa) : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--tx2)", borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.exitValue != null ? fmtCurrency(sc.exitValue) : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color, borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.irr != null ? `${sc.irr.toFixed(1)}%` : "—"}
                </td>
                <td style={{ padding: 8, fontFamily: "'JetBrains Mono', monospace", color, borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  {sc.equityMultiple != null ? `${sc.equityMultiple.toFixed(2)}×` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

// ── Rate Sensitivity Component (PRO-801) ─────────────────────────────────────
// Shows impact of SOFR changes on portfolio debt service and DSCR

interface Loan {
  id: string;
  rateType: string;
  rate: number;
  spread: number | null;
  outstandingBalance: number;
  annualDebtService: number;
  currentDSCR: number | null;
}

interface RateSensitivityProps {
  loans: Loan[];
  currency: string;
  currentSOFR: number; // Current SOFR rate (e.g., 5.32)
  portfolioNOI: number; // Portfolio-level NOI for DSCR calculation
}

export function RateSensitivity({
  loans,
  currency,
  currentSOFR,
  portfolioNOI,
}: RateSensitivityProps) {
  const sym = currency === "GBP" ? "£" : "$";

  function fmt(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  // Calculate floating vs fixed split
  const floatingDebt = loans
    .filter((l) => l.rateType === "floating")
    .reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalDebt = loans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const floatingPct = totalDebt > 0 ? Math.round((floatingDebt / totalDebt) * 100) : 0;
  const fixedPct = 100 - floatingPct;

  // Calculate debt service at different SOFR levels
  function calculateAtSOFR(sofrRate: number): {
    totalDebtService: number;
    wtdAvgRate: number;
    portfolioDSCR: number;
  } {
    let totalDebtService = 0;
    let totalWeightedRate = 0;

    loans.forEach((loan) => {
      if (loan.rateType === "floating") {
        // Recalculate rate: SOFR + spread
        const spread = loan.spread || 0;
        const newRate = sofrRate + spread / 100; // spread is in bps, convert to percentage
        const newAnnualDebt = (loan.outstandingBalance * newRate) / 100;
        totalDebtService += newAnnualDebt;
        totalWeightedRate += newRate * loan.outstandingBalance;
      } else {
        // Fixed rate loans don't change
        totalDebtService += loan.annualDebtService;
        totalWeightedRate += loan.rate * loan.outstandingBalance;
      }
    });

    const wtdAvgRate = totalDebt > 0 ? totalWeightedRate / totalDebt : 0;
    const portfolioDSCR = totalDebtService > 0 ? portfolioNOI / totalDebtService : 0;

    return {
      totalDebtService,
      wtdAvgRate,
      portfolioDSCR,
    };
  }

  // Calculate scenarios: -50bps, -25bps, current, +25bps, +50bps
  const scenarios = [
    { label: "SOFR −50bps", sofr: currentSOFR - 0.5, color: "var(--grn)" },
    { label: "SOFR −25bps", sofr: currentSOFR - 0.25, color: "var(--grn)" },
    { label: "Current", sofr: currentSOFR, color: "var(--acc)", isCurrent: true },
    { label: "SOFR +25bps", sofr: currentSOFR + 0.25, color: "var(--amb)" },
    { label: "SOFR +50bps", sofr: currentSOFR + 0.5, color: "var(--red)" },
  ];

  const scenarioResults = scenarios.map((s) => ({
    ...s,
    ...calculateAtSOFR(s.sofr),
  }));

  const currentResult = scenarioResults.find((s) => s.isCurrent);

  if (!currentResult) {
    return null;
  }

  return (
    <div>
      <div className="mb-3">
        <h3
          className="text-[9px] font-medium uppercase tracking-wider"
          style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}
        >
          Rate Sensitivity
        </h3>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
                Impact of SOFR Changes on Your Portfolio
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {floatingPct}% floating · {fixedPct}% fixed debt exposure
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Current SOFR
              </div>
              <div className="text-xl font-bold" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
                {currentSOFR.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "var(--sans)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                <th style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: "8px", fontWeight: 500, color: "var(--tx3)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  SOFR Scenario
                </th>
                <th style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: "8px", fontWeight: 500, color: "var(--tx3)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Wtd Avg Rate
                </th>
                <th style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: "8px", fontWeight: 500, color: "var(--tx3)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Annual Debt Service
                </th>
                <th style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: "8px", fontWeight: 500, color: "var(--tx3)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Change
                </th>
                <th style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: "8px", fontWeight: 500, color: "var(--tx3)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Portfolio DSCR
                </th>
              </tr>
            </thead>
            <tbody>
              {scenarioResults.map((scenario, idx) => {
                const change = scenario.totalDebtService - currentResult.totalDebtService;
                const changeColor = change < 0 ? "var(--grn)" : change > 0 ? "var(--red)" : "var(--tx3)";
                const bgColor = scenario.isCurrent ? "rgba(124, 106, 240, 0.06)" : "transparent";

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < scenarioResults.length - 1 ? "1px solid var(--bdr)" : "none",
                      backgroundColor: bgColor,
                    }}
                  >
                    <td style={{ padding: "8px 12px", color: scenario.isCurrent ? "var(--acc)" : scenario.color, fontWeight: scenario.isCurrent ? 600 : 400 }}>
                      {scenario.label} ({scenario.sofr.toFixed(2)}%)
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: scenario.isCurrent ? "var(--acc)" : "var(--tx)", fontWeight: scenario.isCurrent ? 600 : 400 }}>
                      {scenario.wtdAvgRate.toFixed(2)}%
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: scenario.isCurrent ? "var(--acc)" : changeColor, fontWeight: scenario.isCurrent ? 600 : 400 }}>
                      {fmt(scenario.totalDebtService)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: changeColor }}>
                      {scenario.isCurrent ? "—" : `${change > 0 ? "+" : ""}${fmt(change)}`}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: scenario.isCurrent ? "var(--acc)" : scenario.portfolioDSCR < 1.25 ? "var(--red)" : scenario.portfolioDSCR < 1.5 ? "var(--amb)" : "var(--grn)", fontWeight: scenario.isCurrent ? 600 : 400 }}>
                      {scenario.portfolioDSCR.toFixed(2)}×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Impact summary */}
        <div className="px-5 py-3.5 text-xs" style={{ backgroundColor: "var(--s2)", borderTop: "1px solid var(--bdr)", color: "var(--tx3)" }}>
          Your floating-rate exposure ({fmt(floatingDebt)} / {floatingPct}% of portfolio debt) {floatingPct > 50 ? "benefits from" : "is protected against"} rate drops. A 25bps decrease would save {fmt(Math.abs(scenarioResults[1].totalDebtService - currentResult.totalDebtService))}/yr in debt service.
        </div>
      </div>
    </div>
  );
}

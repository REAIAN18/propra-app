"use client";

import { calculateHoldScenario, type HoldInputs } from "@/lib/hold-sell-model";

interface DCFModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealName: string;
  askingPrice: number;
  capRate: number;
  noi: number;
  currency: string;
}

export function DCFModal({
  isOpen,
  onClose,
  dealName,
  askingPrice,
  capRate,
  noi,
  currency,
}: DCFModalProps) {
  if (!isOpen) return null;

  const sym = currency === "GBP" ? "£" : "$";

  // Calculate 10-year DCF using same logic as scout-returns.ts
  const equityNeeded = askingPrice * 0.35; // 35% equity for 65% LTV
  const passingRent = noi;
  const marketERV = noi * 1.05;

  const holdInputs: HoldInputs = {
    currentValue: equityNeeded,
    passingRent,
    marketERV,
    vacancyAllowance: 0.05,
    opexPct: 0.15,
    rentGrowthPct: 0.025,
    capexAnnual: askingPrice * 0.005,
    exitYield: capRate / 100,
    holdPeriodYears: 10, // 10 years for DCF detail view
    discountRate: 0.08,
  };

  const result = calculateHoldScenario(holdInputs);
  const cashFlows = result.cashFlows;

  // Build year-by-year breakdown
  const years: Array<{
    year: number;
    rent: number;
    netRent: number;
    capex: number;
    cashFlow: number;
    cumulative: number;
  }> = [];

  let cumulative = cashFlows[0]; // Initial investment (negative)

  for (let y = 1; y <= holdInputs.holdPeriodYears; y++) {
    const rentY = passingRent * Math.pow(1 + holdInputs.rentGrowthPct, y - 1);
    const netRentY = rentY * (1 - holdInputs.vacancyAllowance) * (1 - holdInputs.opexPct);
    const cf = cashFlows[y];
    cumulative += cf;

    years.push({
      year: y,
      rent: rentY,
      netRent: netRentY,
      capex: holdInputs.capexAnnual,
      cashFlow: cf,
      cumulative,
    });
  }

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}M`;
    if (Math.abs(val) >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
    return `${sym}${Math.round(val).toLocaleString()}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--bdr)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--bdr)" }}
        >
          <div>
            <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "2px" }}>
              10-Year DCF Analysis
            </h3>
            <p style={{ font: "400 12px var(--sans)", color: "var(--tx3)" }}>
              {dealName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-opacity hover:opacity-60"
            style={{ color: "var(--tx3)" }}
          >
            ×
          </button>
        </div>

        {/* Summary KPIs */}
        <div
          className="px-6 py-4 grid grid-cols-5 gap-4"
          style={{ borderBottom: "1px solid var(--bdr)", background: "var(--s1)" }}
        >
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              Purchase Price
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--tx)" }}>
              {formatCurrency(askingPrice)}
            </div>
          </div>
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              Equity (35%)
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--tx)" }}>
              {formatCurrency(equityNeeded)}
            </div>
          </div>
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              Entry Cap Rate
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--tx)" }}>
              {capRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              10-Yr IRR
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: result.irr >= 0.12 ? "var(--grn)" : result.irr >= 0.08 ? "var(--tx)" : "var(--red)" }}>
              {(result.irr * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
              Equity Multiple
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: result.equityMultiple >= 1.6 ? "var(--grn)" : result.equityMultiple >= 1.3 ? "var(--tx)" : "var(--red)" }}>
              {result.equityMultiple.toFixed(2)}×
            </div>
          </div>
        </div>

        {/* DCF Table */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 240px)" }}>
          <table className="w-full" style={{ font: "400 11px var(--sans)" }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--s2)", zIndex: 1 }}>
              <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Year</th>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Gross Rent</th>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Net Rent</th>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Capex</th>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Cash Flow</th>
                <th style={{ padding: "10px 16px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--bdr-lt)", background: "var(--red-lt)" }}>
                <td style={{ padding: "10px 16px", color: "var(--tx)", fontWeight: 500 }}>Year 0</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--tx3)" }}>—</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--tx3)" }}>—</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--tx3)" }}>—</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--red)", fontWeight: 600 }}>
                  {formatCurrency(cashFlows[0])}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--red)", fontWeight: 500 }}>
                  {formatCurrency(cashFlows[0])}
                </td>
              </tr>
              {years.map((yr) => (
                <tr
                  key={yr.year}
                  style={{
                    borderBottom: yr.year < 10 ? "1px solid rgba(37, 37, 51, 0.5)" : "1px solid var(--bdr)",
                    background: yr.year === 10 ? "var(--grn-lt)" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 16px", color: "var(--tx)", fontWeight: yr.year === 10 ? 600 : 500 }}>
                    Year {yr.year}{yr.year === 10 ? " (Exit)" : ""}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--grn)", fontFamily: "var(--mono)" }}>
                    {formatCurrency(yr.rent)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--tx)", fontFamily: "var(--mono)" }}>
                    {formatCurrency(yr.netRent)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--red)", fontFamily: "var(--mono)" }}>
                    {formatCurrency(yr.capex)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: yr.cashFlow >= 0 ? "var(--grn)" : "var(--red)", fontWeight: 600, fontFamily: "var(--mono)" }}>
                    {formatCurrency(yr.cashFlow)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: yr.cumulative >= 0 ? "var(--grn)" : "var(--amb)", fontWeight: 500, fontFamily: "var(--mono)" }}>
                    {formatCurrency(yr.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sensitivity Analysis */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--bdr)", background: "var(--s2)" }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
            Sensitivity Analysis — IRR by Exit Yield × Rent Growth
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px 4px", font: "400 11px var(--mono)" }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", textAlign: "left" }}>
                    Exit Yield ↓ / Growth →
                  </th>
                  {[1.5, 2.0, 2.5, 3.0, 3.5].map((g) => (
                    <th key={g} style={{ padding: "8px", font: "500 10px var(--mono)", color: "var(--tx)", textAlign: "center", background: "var(--s1)", borderRadius: "4px" }}>
                      {g}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[capRate - 0.5, capRate, capRate + 0.5].map((exitYield) => (
                  <tr key={exitYield}>
                    <td style={{ padding: "8px", font: "500 10px var(--mono)", color: "var(--tx)", background: "var(--s1)", borderRadius: "4px" }}>
                      {exitYield.toFixed(1)}%
                    </td>
                    {[1.5, 2.0, 2.5, 3.0, 3.5].map((growth) => {
                      // Calculate IRR with varied assumptions
                      const sensitivityInputs: HoldInputs = {
                        ...holdInputs,
                        rentGrowthPct: growth / 100,
                        exitYield: exitYield / 100,
                      };
                      const sensitivityResult = calculateHoldScenario(sensitivityInputs);
                      const irrPercent = sensitivityResult.irr * 100;

                      // Color-code based on thresholds
                      let cellColor = "var(--tx)";
                      let bgColor = "var(--s1)";
                      if (irrPercent >= 12) {
                        cellColor = "var(--grn)";
                        bgColor = "rgba(52, 211, 153, 0.1)";
                      } else if (irrPercent < 8) {
                        cellColor = "var(--red)";
                        bgColor = "rgba(248, 113, 113, 0.1)";
                      }

                      return (
                        <td
                          key={`${exitYield}-${growth}`}
                          style={{
                            padding: "10px",
                            textAlign: "center",
                            background: bgColor,
                            color: cellColor,
                            fontWeight: 600,
                            borderRadius: "4px",
                            border: exitYield === capRate && growth === 2.5 ? "2px solid var(--acc)" : "none",
                          }}
                        >
                          {irrPercent.toFixed(1)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "8px", fontStyle: "italic" }}>
            Base case (cap {capRate.toFixed(1)}%, growth 2.5%) highlighted with purple border
          </div>
        </div>

        {/* Footer Assumptions */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--bdr)", background: "var(--s1)" }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Assumptions
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-2" style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>
            <div>Rent growth: <span style={{ color: "var(--tx)", fontWeight: 500 }}>2.5% p.a.</span></div>
            <div>Vacancy: <span style={{ color: "var(--tx)", fontWeight: 500 }}>5%</span></div>
            <div>OpEx: <span style={{ color: "var(--tx)", fontWeight: 500 }}>15% of rent</span></div>
            <div>Capex: <span style={{ color: "var(--tx)", fontWeight: 500 }}>0.5% of value</span></div>
            <div>Leverage: <span style={{ color: "var(--tx)", fontWeight: 500 }}>65% LTV</span></div>
            <div>Exit yield: <span style={{ color: "var(--tx)", fontWeight: 500 }}>{capRate.toFixed(1)}%</span></div>
            <div>Discount rate: <span style={{ color: "var(--tx)", fontWeight: 500 }}>8%</span></div>
            <div>Hold period: <span style={{ color: "var(--tx)", fontWeight: 500 }}>10 years</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

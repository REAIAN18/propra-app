"use client";

// ── Maturity Calendar Component (PRO-801) ────────────────────────────────────
// Timeline view of loan maturities with 12/24/36 month horizons

interface Loan {
  id: string;
  lender: string;
  outstandingBalance: number;
  maturityDate: Date | string;
  asset?: {
    name: string;
  } | null;
}

interface MaturityCalendarProps {
  loans: Loan[];
  currency: string;
}

export function MaturityCalendar({ loans, currency }: MaturityCalendarProps) {
  const sym = currency === "GBP" ? "£" : "$";

  function fmt(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function getMonthsToMaturity(date: Date | string): number {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    return Math.max(0, months);
  }

  if (loans.length === 0) {
    return null;
  }

  // Sort by maturity date
  const sortedLoans = [...loans].sort((a, b) => {
    const dateA = typeof a.maturityDate === "string" ? new Date(a.maturityDate) : a.maturityDate;
    const dateB = typeof b.maturityDate === "string" ? new Date(b.maturityDate) : b.maturityDate;
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate timeline span (4 years)
  const timelineMonths = 48;
  const now = new Date();
  const endDate = new Date(now.getFullYear() + 4, now.getMonth(), 1);

  return (
    <div>
      <div className="mb-3">
        <h3
          className="text-[9px] font-medium uppercase tracking-wider"
          style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}
        >
          Maturity Calendar
        </h3>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
            Loan Maturities
          </div>
          <div className="text-xs" style={{ color: "var(--tx3)" }}>
            {sortedLoans.length} loan{sortedLoans.length !== 1 ? "s" : ""} · {getMonthsToMaturity(sortedLoans[0].maturityDate)}mo to first maturity
          </div>
        </div>

        <div className="p-5">
          {/* Timeline labels */}
          <div className="flex justify-between text-[9px] font-medium uppercase tracking-wide mb-2" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
            <span>Now</span>
            <span>{now.getFullYear() + 1}</span>
            <span>{now.getFullYear() + 2}</span>
            <span>{now.getFullYear() + 3}</span>
            <span>{now.getFullYear() + 4}</span>
          </div>

          {/* Loan maturity bars */}
          <div className="space-y-3">
            {sortedLoans.map((loan) => {
              const monthsToMaturity = getMonthsToMaturity(loan.maturityDate);
              const widthPct = Math.min((monthsToMaturity / timelineMonths) * 100, 100);

              // Color coding: red (<18mo), amber (18-24mo), blue (24-36mo), green (>36mo)
              let color: string;
              let bgColor: string;
              let borderColor: string;

              if (monthsToMaturity < 18) {
                color = "var(--red)";
                bgColor = "rgba(248, 113, 113, 0.1)";
                borderColor = "rgba(248, 113, 113, 0.22)";
              } else if (monthsToMaturity < 24) {
                color = "var(--amb)";
                bgColor = "rgba(251, 191, 36, 0.1)";
                borderColor = "rgba(251, 191, 36, 0.22)";
              } else if (monthsToMaturity < 36) {
                color = "var(--acc)";
                bgColor = "rgba(124, 106, 240, 0.1)";
                borderColor = "rgba(124, 106, 240, 0.22)";
              } else {
                color = "var(--grn)";
                bgColor = "rgba(52, 211, 153, 0.1)";
                borderColor = "rgba(52, 211, 153, 0.22)";
              }

              return (
                <div key={loan.id}>
                  <div className="text-[10px] font-medium mb-1" style={{ color: "var(--tx2)" }}>
                    {loan.asset?.name || "Portfolio Loan"} — {loan.lender}
                  </div>
                  <div className="relative h-8 rounded-md" style={{ backgroundColor: "var(--s2)" }}>
                    {/* "Now" marker */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] z-10 rounded-sm"
                      style={{ left: "0%", backgroundColor: "var(--acc)" }}
                    />
                    {/* Maturity marker */}
                    <div
                      className="absolute h-full rounded-md flex items-center px-3 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        left: "0",
                        width: `${widthPct}%`,
                        backgroundColor: bgColor,
                        border: `1px solid ${borderColor}`,
                        color,
                        fontSize: "9px",
                        fontFamily: "var(--mono)",
                        fontWeight: 500,
                      }}
                      title={`${loan.asset?.name || "Portfolio Loan"} · ${fmt(loan.outstandingBalance)} · Matures ${formatDate(loan.maturityDate)}`}
                    >
                      {fmt(loan.outstandingBalance)} · {formatDate(loan.maturityDate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action triggers */}
          {sortedLoans.some((l) => getMonthsToMaturity(l.maturityDate) < 18) && (
            <div
              className="mt-4 rounded-lg px-4 py-3 text-xs"
              style={{ backgroundColor: "rgba(248, 113, 113, 0.07)", border: "1px solid rgba(248, 113, 113, 0.22)", color: "var(--red)" }}
            >
              <strong>Action required:</strong> {sortedLoans.filter((l) => getMonthsToMaturity(l.maturityDate) < 18).map((l) => l.asset?.name || "A loan").join(", ")} mature{sortedLoans.filter((l) => getMonthsToMaturity(l.maturityDate) < 18).length === 1 ? "s" : ""} within 18 months. Start refinancing conversations now to avoid rush at maturity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

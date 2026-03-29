"use client";

// ── Covenant Monitoring Component (PRO-801) ──────────────────────────────────
// Displays loan covenant status with LTV/DSCR vs thresholds
// Alerts: GREEN (>10% headroom), AMBER (<10%), RED (breach)

interface Loan {
  id: string;
  lender: string;
  rateType: string;
  rateReference: string | null;
  rate: number;
  outstandingBalance: number;
  maturityDate: Date | string;
  ltvCovenant: number | null;
  dscrCovenant: number | null;
  currentLTV: number | null;
  currentDSCR: number | null;
  asset?: {
    name: string;
    location: string;
  } | null;
}

interface CovenantMonitoringProps {
  loans: Loan[];
  currency: string;
}

export function CovenantMonitoring({ loans, currency }: CovenantMonitoringProps) {
  const sym = currency === "GBP" ? "£" : "$";

  function fmt(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  function getCovenantStatus(
    current: number | null,
    covenant: number | null,
    isLTV: boolean
  ): { status: "compliant" | "warning" | "breach"; headroom: number; color: string; bgColor: string; borderColor: string } {
    if (!current || !covenant) {
      return {
        status: "compliant",
        headroom: 0,
        color: "var(--tx3)",
        bgColor: "var(--s2)",
        borderColor: "var(--bdr)",
      };
    }

    // For LTV: lower is better. Breach if current >= covenant
    // For DSCR: higher is better. Breach if current <= covenant
    let headroom: number;
    let isBreach: boolean;
    let isWarning: boolean;

    if (isLTV) {
      headroom = covenant - current;
      isBreach = current >= covenant;
      isWarning = !isBreach && headroom < covenant * 0.1; // <10% headroom
    } else {
      headroom = current - covenant;
      isBreach = current <= covenant;
      isWarning = !isBreach && headroom < covenant * 0.03; // <3% headroom
    }

    if (isBreach) {
      return {
        status: "breach",
        headroom,
        color: "var(--red)",
        bgColor: "rgba(248, 113, 113, 0.07)",
        borderColor: "rgba(248, 113, 113, 0.22)",
      };
    }

    if (isWarning) {
      return {
        status: "warning",
        headroom,
        color: "var(--amb)",
        bgColor: "rgba(251, 191, 36, 0.07)",
        borderColor: "rgba(251, 191, 36, 0.22)",
      };
    }

    return {
      status: "compliant",
      headroom,
      color: "var(--grn)",
      bgColor: "rgba(52, 211, 153, 0.07)",
      borderColor: "rgba(52, 211, 153, 0.22)",
    };
  }

  function formatMaturityDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const loansWithCovenants = loans.filter(
    (l) => l.ltvCovenant !== null || l.dscrCovenant !== null
  );

  if (loansWithCovenants.length === 0) {
    return null;
  }

  const warningCount = loansWithCovenants.filter((l) => {
    const ltvStatus = getCovenantStatus(l.currentLTV, l.ltvCovenant, true);
    const dscrStatus = getCovenantStatus(l.currentDSCR, l.dscrCovenant, false);
    return ltvStatus.status === "warning" || dscrStatus.status === "warning" || ltvStatus.status === "breach" || dscrStatus.status === "breach";
  }).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="text-[9px] font-medium uppercase tracking-wider"
          style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}
        >
          Loan Covenants
        </h3>
        {warningCount > 0 && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.1)",
              color: "var(--amb)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}
          >
            {warningCount} warning{warningCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
            Covenant Status — All Loans
          </div>
          <div className="text-xs" style={{ color: "var(--tx3)" }}>
            LTV and DSCR compliance across {loansWithCovenants.length} loan{loansWithCovenants.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
          {loansWithCovenants.map((loan) => {
            const ltvStatus = getCovenantStatus(loan.currentLTV, loan.ltvCovenant, true);
            const dscrStatus = getCovenantStatus(loan.currentDSCR, loan.dscrCovenant, false);
            const hasBreach = ltvStatus.status === "breach" || dscrStatus.status === "breach";
            const hasWarning = ltvStatus.status === "warning" || dscrStatus.status === "warning";
            const borderColor = hasBreach ? "var(--red)" : hasWarning ? "var(--amb)" : "transparent";

            return (
              <div
                key={loan.id}
                className="px-5 py-4 hover:bg-[var(--s2)] transition-colors cursor-pointer"
                style={{ borderLeft: `3px solid ${borderColor}` }}
              >
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center">
                  {/* Asset name + details */}
                  <div>
                    <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
                      {loan.asset?.name || "Portfolio Loan"} — {loan.lender}
                    </div>
                    <div className="text-xs" style={{ color: "var(--tx3)" }}>
                      {fmt(loan.outstandingBalance)} outstanding · {loan.rateType === "fixed" ? `${loan.rate}% fixed` : loan.rateReference || `${loan.rate}%`} · Matures {formatMaturityDate(loan.maturityDate)}
                    </div>
                  </div>

                  {/* LTV */}
                  {loan.ltvCovenant && (
                    <div>
                      <div className="text-[8px] font-medium uppercase tracking-wide mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        LTV
                      </div>
                      <div className="text-[11px] font-medium" style={{ fontFamily: "var(--mono)", color: ltvStatus.color }}>
                        {loan.currentLTV?.toFixed(0) || "—"}% <span style={{ color: "var(--tx3)" }}>(cov: {loan.ltvCovenant}%)</span>
                      </div>
                    </div>
                  )}

                  {/* DSCR */}
                  {loan.dscrCovenant && (
                    <div>
                      <div className="text-[8px] font-medium uppercase tracking-wide mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        DSCR
                      </div>
                      <div className="text-[11px] font-medium" style={{ fontFamily: "var(--mono)", color: dscrStatus.color }}>
                        {loan.currentDSCR?.toFixed(2) || "—"}× <span style={{ color: "var(--tx3)" }}>(cov: {loan.dscrCovenant}×)</span>
                      </div>
                    </div>
                  )}

                  {/* Rate type badge */}
                  <span
                    className="text-[8px] font-medium px-2 py-1 rounded-full uppercase tracking-wide"
                    style={{
                      fontFamily: "var(--mono)",
                      backgroundColor: loan.rateType === "fixed" ? "rgba(52, 211, 153, 0.1)" : "rgba(251, 191, 36, 0.1)",
                      color: loan.rateType === "fixed" ? "var(--grn)" : "var(--amb)",
                      border: `1px solid ${loan.rateType === "fixed" ? "rgba(52, 211, 153, 0.22)" : "rgba(251, 191, 36, 0.22)"}`,
                    }}
                  >
                    {loan.rateType.toUpperCase()}
                  </span>

                  {/* Status badge */}
                  <span
                    className="text-[9px] font-medium px-2 py-1 rounded-md"
                    style={{
                      fontFamily: "var(--mono)",
                      backgroundColor: hasBreach ? "rgba(248, 113, 113, 0.1)" : hasWarning ? "rgba(251, 191, 36, 0.1)" : "rgba(52, 211, 153, 0.1)",
                      color: hasBreach ? "var(--red)" : hasWarning ? "var(--amb)" : "var(--grn)",
                      border: `1px solid ${hasBreach ? "rgba(248, 113, 113, 0.22)" : hasWarning ? "rgba(251, 191, 36, 0.22)" : "rgba(52, 211, 153, 0.22)"}`,
                    }}
                  >
                    {hasBreach ? "⚠ BREACH" : hasWarning ? `⚠ ${Math.abs(Math.min(ltvStatus.headroom, dscrStatus.headroom)).toFixed(0)}% HEADROOM` : "COMPLIANT"}
                  </span>

                  {/* Arrow */}
                  <span className="text-sm" style={{ color: "var(--tx3)" }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning alerts */}
      {warningCount > 0 && loansWithCovenants.some((l) => {
        const ltvStatus = getCovenantStatus(l.currentLTV, l.ltvCovenant, true);
        const dscrStatus = getCovenantStatus(l.currentDSCR, l.dscrCovenant, false);
        return ltvStatus.status === "warning" || dscrStatus.status === "warning";
      }) && (
        <div
          className="mt-4 rounded-xl px-5 py-3.5"
          style={{ backgroundColor: "rgba(251, 191, 36, 0.07)", border: "1px solid rgba(251, 191, 36, 0.22)" }}
        >
          <div className="text-xs leading-relaxed" style={{ color: "var(--amb)" }}>
            <strong>Covenant warning:</strong> {loansWithCovenants.filter((l) => {
              const ltvStatus = getCovenantStatus(l.currentLTV, l.ltvCovenant, true);
              const dscrStatus = getCovenantStatus(l.currentDSCR, l.dscrCovenant, false);
              return ltvStatus.status === "warning" || dscrStatus.status === "warning";
            }).map((l) => l.asset?.name || "A loan").join(", ")} {warningCount === 1 ? "is" : "are"} within 10% of covenant thresholds. Consider partial prepayment, refinancing, or improving property NOI to increase headroom.
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { portfolioFinancing, AssetLoan } from "@/lib/data/financing";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import type { IndicativeLoan } from "@/app/api/user/financing-summary/route";

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function daysLabel(days: number) {
  if (days <= 0) return "Matured";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}m`;
  return `${(days / 365).toFixed(1)}y`;
}

function maturityColor(days: number) {
  if (days <= 60) return "var(--red)";
  if (days <= 180) return "var(--amb)";
  return "var(--grn)";
}

function maturityBg(days: number) {
  if (days <= 60) return "rgba(248, 113, 113, 0.1)";
  if (days <= 180) return "rgba(251, 191, 36, 0.1)";
  return "rgba(52, 211, 153, 0.1)";
}

function maturityBorder(days: number) {
  if (days <= 60) return "rgba(248, 113, 113, 0.3)";
  if (days <= 180) return "rgba(251, 191, 36, 0.3)";
  return "rgba(52, 211, 153, 0.3)";
}

function icrColor(icr: number, covenant: number) {
  if (icr < covenant) return "var(--red)";
  if (icr < covenant + 0.25) return "var(--amb)";
  return "var(--grn)";
}

function ltvColor(ltv: number, covenant: number) {
  if (ltv >= covenant) return "var(--red)";
  if (ltv >= covenant - 5) return "var(--amb)";
  return "var(--grn)";
}

// Direct execution: financing data is computed from live UserAsset records

// ── Refinancing Side Panel ─────────────────────────────────────────────
function RefinancePanel({
  loan,
  sym,
  onClose,
}: {
  loan: AssetLoan;
  sym: string;
  onClose: () => void;
}) {
  const [sourced, setSourced] = useState(false);
  const rateDelta = loan.interestRate - loan.marketRate;
  const annualSaving = Math.round(loan.outstandingBalance * (rateDelta / 100));
  // Breakage cost: ~3 months interest for fixed, 0 for variable
  const breakageCost = loan.rateType === "fixed"
    ? Math.round(loan.outstandingBalance * (loan.interestRate / 100) * 0.25)
    : 0;
  const paybackMonths = breakageCost > 0 && annualSaving > 0
    ? Math.ceil((breakageCost / annualSaving) * 12)
    : 0;
  const realhqFee = Math.round(loan.outstandingBalance * 0.01); // 1% arrangement fee
  const netFirstYearSaving = annualSaving - breakageCost;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" style={{ backgroundColor: "rgba(11,22,34,0.6)" }} />
      <div
        className="w-full max-w-lg flex flex-col overflow-y-auto"
        style={{ backgroundColor: "var(--s1)", borderLeft: "1px solid var(--bdr)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <div className="text-base font-bold mb-1" style={{ color: "var(--tx)" }}>
              Refinancing Analysis
            </div>
            <div className="text-xs" style={{ color: "var(--tx3)" }}>{loan.assetName}</div>
            <div className="mt-2">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block"
                style={{
                  background: maturityBg(loan.daysToMaturity),
                  color: maturityColor(loan.daysToMaturity),
                  border: `1px solid ${maturityBorder(loan.daysToMaturity)}`,
                }}
              >
                {daysLabel(loan.daysToMaturity)} to maturity
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--bdr)", color: "var(--tx3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Current vs Market */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--tx3)" }}>
            Current vs Market
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Current */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--tx3)" }}>Current debt</div>
              <div className="text-2xl font-bold mb-1" style={{ color: "var(--red)", fontFamily: "var(--serif)" }}>
                {loan.interestRate}%
              </div>
              <div className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
                {loan.rateType === "fixed" ? "Fixed" : loan.rateReference}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Lender</span>
                  <span style={{ color: "var(--tx2)" }}>{loan.lender}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Outstanding</span>
                  <span style={{ color: "var(--tx2)" }}>{fmt(loan.outstandingBalance, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Annual cost</span>
                  <span style={{ color: "var(--tx2)" }}>{fmt(loan.annualDebtService, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Maturity</span>
                  <span style={{ color: "var(--tx2)" }}>{loan.maturityDate}</span>
                </div>
              </div>
            </div>

            {/* Market */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.3)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--tx3)" }}>RealHQ-sourced terms</div>
              <div className="text-2xl font-bold mb-1" style={{ color: "var(--grn)", fontFamily: "var(--serif)" }}>
                {loan.marketRate}%
              </div>
              <div className="text-xs mb-3" style={{ color: "var(--tx3)" }}>
                Market rate · competing lenders
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Rate saving</span>
                  <span style={{ color: "var(--grn)", fontWeight: 600 }}>
                    {rateDelta > 0 ? `-${rateDelta.toFixed(2)}pp` : "At market"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>Annual saving</span>
                  <span style={{ color: "var(--grn)", fontWeight: 600 }}>{fmt(annualSaving, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>New annual cost</span>
                  <span style={{ color: "var(--tx2)" }}>{fmt(loan.annualDebtService - annualSaving, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--tx3)" }}>5yr saving</span>
                  <span style={{ color: "var(--grn)", fontWeight: 600 }}>{fmt(annualSaving * 5, sym)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakage + payback */}
          {breakageCost > 0 && (
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--amb)" }}>
                Early repayment cost
              </div>
              <div className="text-xs" style={{ color: "var(--tx2)" }}>
                Fixed-rate break: ~{fmt(breakageCost, sym)} · Payback: {paybackMonths} months from savings
              </div>
            </div>
          )}

          {/* Net result */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold" style={{ color: "var(--grn)", fontFamily: "var(--serif)" }}>{fmt(annualSaving, sym)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>Annual saving</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: breakageCost > 0 ? "var(--amb)" : "var(--grn)", fontFamily: "var(--serif)" }}>
                  {fmt(Math.max(0, netFirstYearSaving), sym)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>Net yr 1 saving</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: "var(--tx2)", fontFamily: "var(--serif)" }}>{fmt(realhqFee, sym)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>RealHQ fee (1% of facility)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Covenant check */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--tx3)" }}>
            Covenant Status
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>ICR</div>
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  Covenant: {loan.icrCovenant}x minimum
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-xl font-bold"
                  style={{ color: icrColor(loan.icr, loan.icrCovenant), fontFamily: "var(--serif)" }}
                >
                  {loan.icr.toFixed(2)}x
                </div>
                {loan.icr < loan.icrCovenant && (
                  <div className="text-xs" style={{ color: "var(--red)" }}>Below covenant</div>
                )}
                {loan.icr >= loan.icrCovenant && loan.icr < loan.icrCovenant + 0.25 && (
                  <div className="text-xs" style={{ color: "var(--amb)" }}>Low headroom</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>LTV</div>
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  Covenant: {loan.ltvCovenant}% maximum
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-xl font-bold"
                  style={{ color: ltvColor(loan.currentLTV, loan.ltvCovenant), fontFamily: "var(--serif)" }}
                >
                  {loan.currentLTV}%
                </div>
                {loan.currentLTV >= loan.ltvCovenant && (
                  <div className="text-xs" style={{ color: "var(--red)" }}>Above covenant</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 py-4">
          {sourced ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: "var(--s2)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--grn)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--grn)" }}>
                  RealHQ sourcing competing terms — expect indicatives within 48h
                </span>
              </div>
              <Link href="/requests" className="text-xs shrink-0" style={{ color: "var(--acc)" }}>
                Track →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  setSourced(true);
                  // TODO: Implement postRefinanceLead API
                  console.log('Refinance lead submission:', { loan, sym });
                }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "var(--grn)", color: "#fff" }}
              >
                Source competing lender terms
              </button>
              <div className="text-xs text-center" style={{ color: "var(--tx3)" }}>
                No cost if debt is not placed — RealHQ only earns on completion
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Financing Empty State ──────────────────────────────────────────────
function FinancingEmptyState() {
  const [requested, setRequested] = useState(false);
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: "rgba(52, 211, 153, 0.1)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="var(--grn)" strokeWidth="1.5" />
          <path d="M3 10h18" stroke="var(--grn)" strokeWidth="1.5" />
          <circle cx="7.5" cy="14.5" r="1" fill="var(--grn)" />
          <circle cx="11" cy="14.5" r="1" fill="var(--grn)" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--tx)", fontFamily: "var(--serif)" }}>
        No loan data yet
      </h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: "var(--tx2)" }}>
        RealHQ sources competing lender terms across banks and debt funds. Fee: 1% of placed debt, payable on completion.
      </p>

      {/* 3 value props */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mb-8">
        {[
          { icon: "🏦", title: "Competing terms", desc: "Full market approach across banks, debt funds, and challengers" },
          { icon: "🔄", title: "Refinancing management", desc: "We manage execution from term sheet to drawdown" },
          { icon: "📋", title: "Covenant monitoring", desc: "ICR and LTV tracking with early-warning alerts" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl p-4 text-left"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>{item.title}</div>
            <div className="text-xs" style={{ color: "var(--tx2)" }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {requested ? (
        <div className="flex items-center gap-2 px-5 py-3 rounded-xl" style={{ backgroundColor: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.3)" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--grn)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--grn)" }}>
            RealHQ is running your refinancing analysis — results within 24 hours
          </span>
        </div>
      ) : (
        <button
          onClick={() => setRequested(true)}
          className="inline-block px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--grn)", color: "#fff" }}
        >
          Run refinancing analysis →
        </button>
      )}
    </div>
  );
}

// ── Indicative Capacity Section ────────────────────────────────────────
function IndicativeCapacity({ loans, sym }: { loans: IndicativeLoan[]; sym: string }) {
  const totalCapacity = loans.reduce((s, l) => s + l.loanCapacity, 0);
  const totalDebtService = loans.reduce((s, l) => s + l.annualDebtService, 0);

  function fmtI(v: number) {
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
    return `${sym}${v.toLocaleString()}`;
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div
        className="rounded-xl px-5 py-3.5"
        style={{ backgroundColor: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)" }}
      >
        <div className="text-xs" style={{ color: "var(--tx2)" }}>
          <span style={{ fontWeight: 600, color: "var(--amb)" }}>Indicative only</span> — based on 65% LTV at current market rates. Run refinancing analysis for live lender terms.
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--tx3)" }}>Indicative loan capacity</div>
          <div className="text-2xl font-bold" style={{ color: "var(--tx)", fontFamily: "var(--serif)" }}>
            {fmtI(totalCapacity)}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>65% LTV across {loans.length} asset{loans.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--tx3)" }}>Est. annual debt service</div>
          <div className="text-2xl font-bold" style={{ color: "var(--tx)", fontFamily: "var(--serif)" }}>
            {fmtI(totalDebtService)}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>At indicative market rates</div>
        </div>
      </div>

      {/* Per-asset table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
            Indicative financing capacity
          </div>
          <div className="text-xs" style={{ color: "var(--tx3)" }}>
            Per-asset estimates — 65% LTV at market rates
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
          {loans.map((loan) => (
            <div key={loan.assetId} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/assets/${loan.assetId}`}
                    className="text-sm font-semibold hover:underline underline-offset-2 block mb-1"
                    style={{ color: "var(--tx)" }}
                  >
                    {loan.assetName}
                  </Link>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Est. value</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{fmtI(loan.estimatedValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Loan capacity (65%)</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--grn)" }}>{fmtI(loan.loanCapacity)}</div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Indicative rate</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{loan.estimatedRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Annual debt service</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{fmtI(loan.annualDebtService)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="text-lg mt-0.5" style={{ color: "var(--acc)" }}>⚡</div>
        <div className="flex-1">
          <strong className="block mb-0.5 text-sm" style={{ color: "var(--tx)" }}>RealHQ sources competing lender terms — banks, debt funds, and challengers</strong>
          <p style={{ color: "var(--tx3)" }}>RealHQ runs a full market approach across banks, debt funds, and challengers — and manages execution to completion.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function FinancingPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio } = usePortfolio(portfolioId);
  const loans = portfolioFinancing[portfolioId] ?? [];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [indicativeLoans, setIndicativeLoans] = useState<IndicativeLoan[] | null>(null);
  const [indicativeLoading, setIndicativeLoading] = useState(false);
  const [sourced, setSourced] = useState(false);

  useEffect(() => {
    if (portfolioId !== "user") return;
    setIndicativeLoading(true);
    fetch("/api/user/financing-summary")
      .then((r) => r.json())
      .then((data) => setIndicativeLoans(data.loans ?? []))
      .catch(() => setIndicativeLoans([]))
      .finally(() => setIndicativeLoading(false));
  }, [portfolioId]);

  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [sofrData, setSOFRData] = useState<{ value: number; date: string; fetchedAt: string } | null>(null);

  // Fetch SOFR rate
  useEffect(() => {
    fetch("/api/macro/sofr")
      .then((r) => r.json())
      .then((data) => setSOFRData(data.sofr))
      .catch(() => setSOFRData(null));
  }, []);

  // KPI calculations
  const totalDebt = loans.reduce((s, l) => s + l.outstandingBalance, 0);
  const weightedRate =
    loans.reduce((s, l) => s + l.interestRate * l.outstandingBalance, 0) / (totalDebt || 1);
  const weightedMarketRate =
    loans.reduce((s, l) => s + l.marketRate * l.outstandingBalance, 0) / (totalDebt || 1);
  const rateDelta = weightedRate - weightedMarketRate;
  const annualOverpay = Math.round(totalDebt * (rateDelta / 100));
  const avgLTV = Math.round(loans.reduce((s, l) => s + l.currentLTV, 0) / (loans.length || 1));
  const urgentMaturities = loans.filter(l => l.daysToMaturity <= 180).length;
  const covenantBreaches = loans.filter(
    l => l.icr < l.icrCovenant || l.currentLTV >= l.ltvCovenant
  ).length;

  // ── Real user: show indicative capacity or empty state ──────────────
  if (portfolioId === "user") {
    const gbpCount = indicativeLoans?.filter(l => l.currency === "GBP").length ?? 0;
    const totalCount = indicativeLoans?.length ?? 0;
    const userSym = gbpCount > totalCount / 2 ? "£" : "$";
    return (
      <AppShell>
        <TopBar title="Financing" />
        <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6" style={{ background: "var(--bg)" }}>
          {indicativeLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {[0, 1, 2, 3].map(i => <MetricCardSkeleton key={i} />)}
            </div>
          ) : indicativeLoans && indicativeLoans.length > 0 ? (
            <IndicativeCapacity loans={indicativeLoans} sym={userSym} />
          ) : (
            <FinancingEmptyState />
          )}
        </main>
      </AppShell>
    );
  }

  // Sort: most urgent first (covenant breach > expiring soon > refinance opp > fine)
  const sortedLoans = [...loans].sort((a, b) => {
    const scoreA =
      (a.icr < a.icrCovenant ? 100 : 0) +
      (a.currentLTV >= a.ltvCovenant ? 80 : 0) +
      (a.daysToMaturity <= 60 ? 60 : a.daysToMaturity <= 180 ? 40 : 0) +
      (a.interestRate - a.marketRate > 0.5 ? 20 : 0);
    const scoreB =
      (b.icr < b.icrCovenant ? 100 : 0) +
      (b.currentLTV >= b.ltvCovenant ? 80 : 0) +
      (b.daysToMaturity <= 60 ? 60 : b.daysToMaturity <= 180 ? 40 : 0) +
      (b.interestRate - b.marketRate > 0.5 ? 20 : 0);
    return scoreB - scoreA;
  });

  // Maturity ladder — group by quarter (12 quarters = 3 years)
  const quarters: { label: string; loans: AssetLoan[] }[] = Array.from({ length: 12 }, (_, i) => {
    const startDay = i * 91;
    const endDay = (i + 1) * 91;
    const d = new Date(2026, 2, 19 + startDay); // 2026-03-19 + startDay
    const label = `Q${Math.ceil((d.getMonth() + 1) / 3)}'${String(d.getFullYear()).slice(2)}`;
    return {
      label,
      loans: loans.filter(l => l.daysToMaturity > startDay && l.daysToMaturity <= endDay),
    };
  });
  const maxLoansInQuarter = Math.max(...quarters.map(q => q.loans.length), 1);

  return (
    <AppShell>
      <TopBar title="Financing" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6" style={{ background: "var(--bg)" }}>
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden border" style={{ background: "var(--bdr)", borderColor: "var(--bdr)" }}>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Total Debt
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
                {fmt(totalDebt, sym)}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                {loans.length} facilities
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Weighted Avg Rate
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: rateDelta > 0.3 ? "var(--red)" : rateDelta > 0.1 ? "var(--amb)" : "var(--grn)" }}>
                {weightedRate.toFixed(2)}%
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                {annualOverpay > 0 ? `${fmt(annualOverpay, sym)}/yr above market` : "At or below market"}
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Portfolio LTV
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: avgLTV >= 70 ? "var(--red)" : avgLTV >= 60 ? "var(--amb)" : "var(--grn)" }}>
                {avgLTV}%
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                Avg across {loans.length} facilities
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Actions Required
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: urgentMaturities + covenantBreaches > 0 ? "var(--red)" : "var(--grn)" }}>
                {urgentMaturities + covenantBreaches}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                {urgentMaturities + covenantBreaches > 0
                  ? `${urgentMaturities} maturities <6m · ${covenantBreaches} covenant alert${covenantBreaches !== 1 ? "s" : ""}`
                  : "All covenants clear"}
              </div>
            </div>
          </div>
        )}

        {/* SOFR Rate Environment */}
        {!loading && sofrData && (
          <div
            className="rounded-xl px-5 py-4 flex items-center gap-4"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)" }}
              >
                📈
              </div>
              <div>
                <div className="text-[9px] font-medium uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
                  Current SOFR Rate
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-normal" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
                    {sofrData.value.toFixed(2)}%
                  </span>
                  <span className="text-xs" style={{ color: "var(--tx3)" }}>
                    as of {new Date(sofrData.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--tx3)", maxWidth: "400px" }}>
              Secured Overnight Financing Rate — the benchmark for floating-rate debt. Current portfolio weighted rate is{" "}
              <span style={{ color: weightedRate > sofrData.value + 3 ? "var(--red)" : "var(--tx2)", fontWeight: 500 }}>
                {weightedRate.toFixed(2)}%
              </span>
              {weightedRate > sofrData.value + 3 && " (elevated spread over benchmark)"}
            </div>
          </div>
        )}

        {/* Issue context bar */}
        {!loading && annualOverpay > 0 && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-xs" style={{ color: "var(--tx3)" }}>
              Your portfolio is paying{" "}
              <span style={{ color: "var(--amb)", fontWeight: 600 }}>{fmt(annualOverpay, sym)}/yr</span>{" "}
              above market rate on debt.
              {urgentMaturities > 0 && ` ${urgentMaturities} loan${urgentMaturities > 1 ? "s" : ""} mature within 6 months.`}
              {covenantBreaches > 0 && ` ${covenantBreaches} covenant breach${covenantBreaches > 1 ? "es" : ""} flagged.`}
              {" "}RealHQ is sourcing competing terms now.
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <div className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="text-lg mt-0.5" style={{ color: "var(--acc)" }}>⚡</div>
            <div className="flex-1">
              <strong className="block mb-0.5 text-sm" style={{ color: "var(--tx)" }}>RealHQ sources competing lender terms — banks, debt funds, and challengers</strong>
              <p style={{ color: "var(--tx3)" }}>RealHQ runs a full market approach across {loans.length} facilit{loans.length === 1 ? "y" : "ies"}, negotiates terms, and manages execution to completion.</p>
            </div>
          </div>
        )}

        {/* Lender Relationships */}
        {!loading && (() => {
          // Group loans by lender
          const lenderMap = new Map<string, typeof loans>();
          loans.forEach(loan => {
            const lender = loan.lender || "Unknown";
            if (!lenderMap.has(lender)) {
              lenderMap.set(lender, []);
            }
            lenderMap.get(lender)!.push(loan);
          });

          const lenderStats = Array.from(lenderMap.entries()).map(([lender, lenderLoans]) => ({
            name: lender,
            facilityCount: lenderLoans.length,
            totalExposure: lenderLoans.reduce((s, l) => s + l.outstandingBalance, 0),
            avgRate: lenderLoans.reduce((s, l) => s + l.interestRate, 0) / lenderLoans.length,
            earliestMaturity: Math.min(...lenderLoans.map(l => l.daysToMaturity)),
            assets: lenderLoans.map(l => l.assetName),
          })).sort((a, b) => b.totalExposure - a.totalExposure);

          if (lenderStats.length === 0) return null;

          return (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
                  Lender Relationships
                </div>
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  {lenderStats.length} lender{lenderStats.length !== 1 ? "s" : ""} · {loans.length} facilities
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
                {lenderStats.map((lender, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-4 flex items-center gap-4 hover:bg-opacity-50 transition-colors cursor-pointer"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--s2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-0.5" style={{ color: "var(--tx)" }}>
                        {lender.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--tx3)" }}>
                        {lender.assets.join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        Exposure
                      </div>
                      <div className="text-sm font-semibold" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
                        {fmt(lender.totalExposure, sym)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        Avg Rate
                      </div>
                      <div className="text-sm" style={{ color: "var(--tx2)" }}>
                        {lender.avgRate.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        Next Maturity
                      </div>
                      <div className="text-sm" style={{ color: maturityColor(lender.earliestMaturity) }}>
                        {daysLabel(lender.earliestMaturity)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                        Facilities
                      </div>
                      <div className="text-sm" style={{ color: "var(--tx2)" }}>
                        {lender.facilityCount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Maturity Ladder */}
        {!loading && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
                Debt Maturity Ladder
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                Loan maturities over the next 3 years — by quarter
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-20">
                {quarters.map((q, i) => {
                  const count = q.loans.length;
                  const debtInQ = q.loans.reduce((s, l) => s + l.outstandingBalance, 0);
                  const heightPct = count === 0 ? 4 : Math.max(12, (count / maxLoansInQuarter) * 100);
                  const color = i < 2 ? "var(--red)" : i < 6 ? "var(--amb)" : "var(--grn)";
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1 group relative cursor-default"
                      title={
                        count > 0
                          ? `${q.label}: ${count} loan${count > 1 ? "s" : ""} · ${fmt(debtInQ, sym)} — ${q.loans.map(l => l.assetName).join(", ")}`
                          : `${q.label}: no maturities`
                      }
                    >
                      {count > 0 && (
                        <span
                          className="text-xs font-semibold absolute -top-5"
                          style={{ color, fontSize: "10px" }}
                        >
                          {count}
                        </span>
                      )}
                      <div
                        className="w-full rounded-sm transition-all duration-200 group-hover:opacity-80"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: count === 0 ? "var(--bdr)" : color,
                          minHeight: "3px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {quarters.map((q, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center"
                    style={{ fontSize: "9px", color: i % 2 === 0 ? "var(--tx3)" : "transparent" }}
                  >
                    {q.label}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--bdr)" }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--tx3)" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "var(--red)" }} />
                  &lt;6 months — Act now
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--tx3)" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "var(--amb)" }} />
                  6–18 months — Prepare
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--tx3)" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "var(--grn)" }} />
                  18m+ — Monitor
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Per-asset loan cards */}
        {loading ? (
          <CardSkeleton rows={5} />
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
                Loan Register
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {loans.length} facilities · {fmt(totalDebt, sym)} total outstanding
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {sortedLoans.map(loan => {
                const rateDiff = loan.interestRate - loan.marketRate;
                const annualSaving = Math.round(loan.outstandingBalance * (rateDiff / 100));
                const hasRefinanceOpp = rateDiff >= 0.3;
                const matColor = maturityColor(loan.daysToMaturity);
                const barPct = Math.min(100, (loan.daysToMaturity / 1095) * 100); // 3yr horizon
                const icrBreach = loan.icr < loan.icrCovenant;
                const ltvBreach = loan.currentLTV >= loan.ltvCovenant;

                return (
                  <div
                    key={loan.assetId}
                    className="px-5 py-4 transition-colors hover:bg-[var(--s2)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Link href={`/assets/${loan.assetId}`} className="text-sm font-semibold hover:underline underline-offset-2" style={{ color: "var(--tx)" }}>
                            {loan.assetName}
                          </Link>
                          {(icrBreach || ltvBreach) && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: "rgba(248, 113, 113, 0.1)", color: "var(--red)", border: "1px solid rgba(248, 113, 113, 0.3)" }}>
                              Covenant alert
                            </span>
                          )}
                          {!icrBreach && !ltvBreach && loan.daysToMaturity <= 60 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: "rgba(248, 113, 113, 0.1)", color: "var(--red)", border: "1px solid rgba(248, 113, 113, 0.3)" }}>
                              Maturing soon
                            </span>
                          )}
                          {!icrBreach && !ltvBreach && loan.daysToMaturity > 60 && loan.daysToMaturity <= 180 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: "rgba(251, 191, 36, 0.1)", color: "var(--amb)", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                              Approaching
                            </span>
                          )}
                          {hasRefinanceOpp && !icrBreach && !ltvBreach && loan.daysToMaturity > 180 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: "rgba(124, 106, 240, 0.1)", color: "var(--acc)", border: "1px solid rgba(124, 106, 240, 0.3)" }}>
                              Refinance opp
                            </span>
                          )}
                        </div>

                        {/* Maturity bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: "var(--tx3)" }}>
                              {loan.lender} · {loan.rateType === "fixed" ? `${loan.interestRate}% fixed` : `${loan.rateReference}`} · matures {loan.maturityDate}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: matColor }}>
                              {daysLabel(loan.daysToMaturity)} to maturity
                            </span>
                          </div>
                          <div className="h-1 rounded-full" style={{ backgroundColor: "var(--bdr)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, backgroundColor: matColor }}
                            />
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Outstanding</div>
                            <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                              {fmt(loan.outstandingBalance, sym)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Rate vs market</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: rateDiff > 0.3 ? "var(--red)" : rateDiff > 0 ? "var(--amb)" : "var(--grn)" }}
                            >
                              {loan.interestRate}%
                              {rateDiff > 0 && (
                                <span className="text-xs ml-1" style={{ color: "var(--amb)" }}>
                                  +{rateDiff.toFixed(1)}pp
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>ICR</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: icrColor(loan.icr, loan.icrCovenant) }}
                            >
                              {loan.icr.toFixed(2)}x
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>LTV</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: ltvColor(loan.currentLTV, loan.ltvCovenant) }}
                            >
                              {loan.currentLTV}%
                            </div>
                          </div>
                        </div>

                        {/* Issue → Cost → Action context */}
                        {(icrBreach || ltvBreach || hasRefinanceOpp || loan.daysToMaturity <= 180) && (
                          <div className="mt-2.5 text-xs" style={{ color: "var(--tx3)" }}>
                            {icrBreach && (
                              <span style={{ color: "var(--red)" }}>
                                ICR {loan.icr.toFixed(2)}x below {loan.icrCovenant}x covenant —{" "}
                              </span>
                            )}
                            {hasRefinanceOpp && (
                              <span style={{ color: "var(--amb)" }}>
                                {fmt(annualSaving, sym)}/yr saving vs market rate —{" "}
                              </span>
                            )}
                            {loan.daysToMaturity <= 180 && !hasRefinanceOpp && (
                              <span style={{ color: "var(--amb)" }}>
                                Loan matures in {daysLabel(loan.daysToMaturity)} —{" "}
                              </span>
                            )}
                            <span style={{ color: "var(--grn)" }}>
                              RealHQ sources competing terms
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {sourced ? (
                          <div
                            className="text-xs font-medium px-3 py-1.5 rounded-md"
                            style={{ backgroundColor: "rgba(52, 211, 153, 0.1)", color: "var(--grn)", border: "1px solid rgba(52, 211, 153, 0.3)" }}
                          >
                            Sourcing terms ✓
                          </div>
                        ) : (icrBreach || ltvBreach || hasRefinanceOpp || loan.daysToMaturity <= 180) ? (
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 hover:opacity-80 active:scale-95 whitespace-nowrap"
                            style={{
                              backgroundColor: (icrBreach || ltvBreach || loan.daysToMaturity <= 60) ? "var(--red)" : "var(--amb)",
                              color: "#fff",
                            }}
                          >
                            {loan.daysToMaturity <= 180 ? "Refinance →" : "Source terms →"}
                          </button>
                        ) : (
                          <div className="text-xs px-3 py-1.5 rounded-md" style={{ color: "var(--tx3)" }}>
                            On track
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Refinancing side panel */}
      {selectedLoan && (
        <RefinancePanel
          loan={selectedLoan}
          sym={sym}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </AppShell>
  );
}

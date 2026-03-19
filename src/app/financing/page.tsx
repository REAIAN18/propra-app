"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { portfolioFinancing, AssetLoan } from "@/lib/data/financing";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

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
  if (days <= 60) return "#f06040";
  if (days <= 180) return "#F5A94A";
  return "#0A8A4C";
}

function maturityBg(days: number) {
  if (days <= 60) return "#2e0f0a";
  if (days <= 180) return "#2e1e0a";
  return "#0f2a1c";
}

function icrColor(icr: number, covenant: number) {
  if (icr < covenant) return "#f06040";
  if (icr < covenant + 0.25) return "#F5A94A";
  return "#0A8A4C";
}

function ltvColor(ltv: number, covenant: number) {
  if (ltv >= covenant) return "#f06040";
  if (ltv >= covenant - 5) return "#F5A94A";
  return "#0A8A4C";
}

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
  const arcaFee = Math.round(loan.outstandingBalance * 0.0075); // 0.75% arrangement fee
  const netFirstYearSaving = annualSaving - breakageCost;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" style={{ backgroundColor: "rgba(11,22,34,0.6)" }} />
      <div
        className="w-full max-w-lg flex flex-col overflow-y-auto"
        style={{ backgroundColor: "#0B1622", borderLeft: "1px solid #1a2d45" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div>
            <div className="text-base font-bold mb-1" style={{ color: "#e8eef5" }}>
              Refinancing Analysis
            </div>
            <div className="text-xs" style={{ color: "#5a7a96" }}>{loan.assetName}</div>
            <div className="mt-2">
              <Badge variant={loan.daysToMaturity <= 60 ? "red" : loan.daysToMaturity <= 180 ? "amber" : "gray"}>
                {daysLabel(loan.daysToMaturity)} to maturity
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Current vs Market */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#5a7a96" }}>
            Current vs Market
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Current */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>Current debt</div>
              <div className="text-2xl font-bold mb-1" style={{ color: "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                {loan.interestRate}%
              </div>
              <div className="text-xs mb-3" style={{ color: "#5a7a96" }}>
                {loan.rateType === "fixed" ? "Fixed" : loan.rateReference}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Lender</span>
                  <span style={{ color: "#8ba0b8" }}>{loan.lender}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Outstanding</span>
                  <span style={{ color: "#8ba0b8" }}>{fmt(loan.outstandingBalance, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Annual cost</span>
                  <span style={{ color: "#8ba0b8" }}>{fmt(loan.annualDebtService, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Maturity</span>
                  <span style={{ color: "#8ba0b8" }}>{loan.maturityDate}</span>
                </div>
              </div>
            </div>

            {/* Market */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "#0f2a1c", border: "1px solid #1a4d2e" }}>
              <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>Arca-sourced terms</div>
              <div className="text-2xl font-bold mb-1" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                {loan.marketRate}%
              </div>
              <div className="text-xs mb-3" style={{ color: "#5a7a96" }}>
                Market rate · competing lenders
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Rate saving</span>
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>
                    {rateDelta > 0 ? `-${rateDelta.toFixed(2)}pp` : "At market"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>Annual saving</span>
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmt(annualSaving, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>New annual cost</span>
                  <span style={{ color: "#8ba0b8" }}>{fmt(loan.annualDebtService - annualSaving, sym)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>5yr saving</span>
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmt(annualSaving * 5, sym)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakage + payback */}
          {breakageCost > 0 && (
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "#2e1e0a", border: "1px solid #4f330d" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "#F5A94A" }}>
                Early repayment cost
              </div>
              <div className="text-xs" style={{ color: "#8ba0b8" }}>
                Fixed-rate break: ~{fmt(breakageCost, sym)} · Payback: {paybackMonths} months from savings
              </div>
            </div>
          )}

          {/* Net result */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold" style={{ color: "#0A8A4C" }}>{fmt(annualSaving, sym)}</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Annual saving</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: breakageCost > 0 ? "#F5A94A" : "#0A8A4C" }}>
                  {fmt(Math.max(0, netFirstYearSaving), sym)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Net yr 1 saving</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: "#0A8A4C" }}>{fmt(arcaFee, sym)}</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Arca fee (0.75%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Covenant check */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#5a7a96" }}>
            Covenant Status
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>ICR</div>
                <div className="text-xs" style={{ color: "#5a7a96" }}>
                  Covenant: {loan.icrCovenant}x minimum
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-xl font-bold"
                  style={{ color: icrColor(loan.icr, loan.icrCovenant) }}
                >
                  {loan.icr.toFixed(2)}x
                </div>
                {loan.icr < loan.icrCovenant && (
                  <div className="text-xs" style={{ color: "#f06040" }}>Below covenant</div>
                )}
                {loan.icr >= loan.icrCovenant && loan.icr < loan.icrCovenant + 0.25 && (
                  <div className="text-xs" style={{ color: "#F5A94A" }}>Low headroom</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>LTV</div>
                <div className="text-xs" style={{ color: "#5a7a96" }}>
                  Covenant: {loan.ltvCovenant}% maximum
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-xl font-bold"
                  style={{ color: ltvColor(loan.currentLTV, loan.ltvCovenant) }}
                >
                  {loan.currentLTV}%
                </div>
                {loan.currentLTV >= loan.ltvCovenant && (
                  <div className="text-xs" style={{ color: "#f06040" }}>Above covenant</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 py-4">
          {sourced ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ backgroundColor: "#0d1825" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#0A8A4C" }} />
              <span className="text-sm font-medium" style={{ color: "#0A8A4C" }}>
                Arca sourcing competing terms — expect indicatives within 48h
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setSourced(true)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Source competing lender terms
              </button>
              <div className="text-xs text-center" style={{ color: "#3d5a72" }}>
                Arca fees: {fmt(arcaFee, sym)} arrangement fee on placed debt · No cost if not placed
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function FinancingPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const loans = portfolioFinancing[portfolioId] ?? [];
  const sym = portfolioId === "fl-mixed" ? "$" : "£";

  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);
  const [sourcedIds, setSourcedIds] = useState<Set<string>>(new Set());

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

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard
              label="Total Debt"
              value={fmt(totalDebt, sym)}
              sub={`${loans.length} facilities`}
              accent="blue"
            />
            <MetricCard
              label="Weighted Avg Rate"
              value={`${weightedRate.toFixed(2)}%`}
              sub={`Market: ${weightedMarketRate.toFixed(2)}% · ${rateDelta > 0 ? `+${rateDelta.toFixed(2)}pp above` : "at market"}`}
              accent={rateDelta > 0.3 ? "red" : rateDelta > 0.1 ? "amber" : "green"}
              trend={rateDelta > 0 ? "down" : "up"}
              trendLabel={
                annualOverpay > 0
                  ? `${fmt(annualOverpay, sym)}/yr above market`
                  : "At or below market"
              }
            />
            <MetricCard
              label="Portfolio LTV"
              value={`${avgLTV}%`}
              sub="Avg across facilities"
              accent={avgLTV >= 70 ? "red" : avgLTV >= 60 ? "amber" : "green"}
            />
            <MetricCard
              label="Action Required"
              value={`${urgentMaturities + covenantBreaches}`}
              sub={`${urgentMaturities} maturities <6m · ${covenantBreaches} covenant alert${covenantBreaches !== 1 ? "s" : ""}`}
              accent={urgentMaturities + covenantBreaches > 0 ? "red" : "green"}
              trend={urgentMaturities + covenantBreaches > 0 ? "down" : "up"}
              trendLabel={urgentMaturities + covenantBreaches > 0 ? "Immediate action" : "All covenants clear"}
            />
          </div>
        )}

        {/* Issue context bar */}
        {!loading && annualOverpay > 0 && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
              weighted avg rate {weightedRate.toFixed(2)}% vs market {weightedMarketRate.toFixed(2)}%
              {urgentMaturities > 0 && ` · ${urgentMaturities} loan${urgentMaturities > 1 ? "s" : ""} maturing within 6 months`}
              {covenantBreaches > 0 && ` · ${covenantBreaches} ICR/LTV covenant breach${covenantBreaches > 1 ? "es" : ""}`}
              {" "}·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              {fmt(annualOverpay, sym)}/yr above market rate debt service
              {" "}·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              sources competing lender terms, manages refinancing execution
            </div>
          </div>
        )}

        {/* Maturity Ladder */}
        {!loading && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Debt Maturity Ladder"
                subtitle="Loan maturities over the next 3 years — by quarter"
              />
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-20">
                {quarters.map((q, i) => {
                  const count = q.loans.length;
                  const debtInQ = q.loans.reduce((s, l) => s + l.outstandingBalance, 0);
                  const heightPct = count === 0 ? 4 : Math.max(12, (count / maxLoansInQuarter) * 100);
                  const color = i < 2 ? "#f06040" : i < 6 ? "#F5A94A" : "#0A8A4C";
                  const bg = i < 2 ? "#2e0f0a" : i < 6 ? "#2e1e0a" : "#0f2a1c";
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
                          backgroundColor: count === 0 ? "#1a2d45" : color,
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
                    style={{ fontSize: "9px", color: i % 2 === 0 ? "#5a7a96" : "transparent" }}
                  >
                    {q.label}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #1a2d45" }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "#f06040" }} />
                  &lt;6 months — Act now
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "#F5A94A" }} />
                  6–18 months — Prepare
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                  <span className="h-2 w-3 rounded-sm inline-block" style={{ backgroundColor: "#0A8A4C" }} />
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
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Loan Register"
                subtitle={`${loans.length} facilities · ${fmt(totalDebt, sym)} total outstanding`}
              />
            </div>

            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {sortedLoans.map(loan => {
                const isSourced = sourcedIds.has(loan.assetId);
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
                    className="px-5 py-4 transition-colors hover:bg-[#0d1825]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                            {loan.assetName}
                          </span>
                          {(icrBreach || ltvBreach) && (
                            <Badge variant="red">Covenant alert</Badge>
                          )}
                          {!icrBreach && !ltvBreach && loan.daysToMaturity <= 60 && (
                            <Badge variant="red">Maturing soon</Badge>
                          )}
                          {!icrBreach && !ltvBreach && loan.daysToMaturity > 60 && loan.daysToMaturity <= 180 && (
                            <Badge variant="amber">Approaching</Badge>
                          )}
                          {hasRefinanceOpp && !icrBreach && !ltvBreach && loan.daysToMaturity > 180 && (
                            <Badge variant="blue">Refinance opp</Badge>
                          )}
                        </div>

                        {/* Maturity bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: "#5a7a96" }}>
                              {loan.lender} · {loan.rateType === "fixed" ? `${loan.interestRate}% fixed` : `${loan.rateReference}`} · matures {loan.maturityDate}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: matColor }}>
                              {daysLabel(loan.daysToMaturity)} to maturity
                            </span>
                          </div>
                          <div className="h-1 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, backgroundColor: matColor }}
                            />
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Outstanding</div>
                            <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                              {fmt(loan.outstandingBalance, sym)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Rate vs market</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: rateDiff > 0.3 ? "#f06040" : rateDiff > 0 ? "#F5A94A" : "#0A8A4C" }}
                            >
                              {loan.interestRate}%
                              {rateDiff > 0 && (
                                <span className="text-xs ml-1" style={{ color: "#F5A94A" }}>
                                  +{rateDiff.toFixed(1)}pp
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>ICR</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: icrColor(loan.icr, loan.icrCovenant) }}
                            >
                              {loan.icr.toFixed(2)}x
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>LTV</div>
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
                          <div className="mt-2.5 text-xs" style={{ color: "#5a7a96" }}>
                            {icrBreach && (
                              <span style={{ color: "#f06040" }}>
                                ICR {loan.icr.toFixed(2)}x below {loan.icrCovenant}x covenant —{" "}
                              </span>
                            )}
                            {hasRefinanceOpp && (
                              <span style={{ color: "#F5A94A" }}>
                                {fmt(annualSaving, sym)}/yr saving vs market rate —{" "}
                              </span>
                            )}
                            {loan.daysToMaturity <= 180 && !hasRefinanceOpp && (
                              <span style={{ color: "#F5A94A" }}>
                                Loan matures in {daysLabel(loan.daysToMaturity)} —{" "}
                              </span>
                            )}
                            <span style={{ color: "#0A8A4C" }}>
                              Arca sources competing terms
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {isSourced ? (
                          <div
                            className="text-xs font-medium px-3 py-1.5 rounded-md"
                            style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
                          >
                            Sourcing terms ✓
                          </div>
                        ) : (icrBreach || ltvBreach || hasRefinanceOpp || loan.daysToMaturity <= 180) ? (
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 hover:opacity-80 active:scale-95 whitespace-nowrap"
                            style={{
                              backgroundColor: (icrBreach || ltvBreach || loan.daysToMaturity <= 60) ? "#f06040" : "#F5A94A",
                              color: "#0B1622",
                            }}
                          >
                            {loan.daysToMaturity <= 180 ? "Refinance →" : "Source terms →"}
                          </button>
                        ) : (
                          <div className="text-xs px-3 py-1.5 rounded-md" style={{ color: "#3d5a72" }}>
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

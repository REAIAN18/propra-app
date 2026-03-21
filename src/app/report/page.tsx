"use client";

import { useRef, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { portfolioFinancing } from "@/lib/data/financing";
import { computePortfolioHealthScore } from "@/lib/health";
import Link from "next/link";
import type { IndicativeLoan } from "@/app/api/user/financing-summary/route";

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ReportPage() {
  const { portfolioId } = useNav();
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const printRef = useRef<HTMLDivElement>(null);
  const isRealUser = portfolioId === "user";

  const [indicativeLoans, setIndicativeLoans] = useState<IndicativeLoan[]>([]);
  useEffect(() => {
    if (!isRealUser) return;
    fetch("/api/user/financing-summary")
      .then((r) => r.json())
      .then((d) => setIndicativeLoans(d.loans ?? []))
      .catch(() => {});
  }, [isRealUser]);

  const totalGross = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const g2n = Math.round((totalNet / totalGross) * 100);
  const totalAUM = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalInsuranceOverpay = portfolio.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
  const totalEnergyOverpay = portfolio.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
  const totalAddIncome = portfolio.assets.flatMap((a) => a.additionalIncomeOpportunities).reduce((s, o) => s + o.annualIncome, 0);
  const totalOpportunity = totalInsuranceOverpay + totalEnergyOverpay + totalAddIncome;
  const avgOccupancy = Math.round(portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length);
  const expiredCompliance = portfolio.assets.flatMap((a) => a.compliance.filter((c) => c.status !== "valid"));
  const totalFineExposure = expiredCompliance.reduce((s, c) => s + c.fineExposure, 0);
  const expiringLeases = portfolio.assets.flatMap((a) => a.leases.filter((l) => l.status === "expiring_soon" || l.daysToExpiry < 90));

  // For demo portfolios use static financing data; for real users pass empty (health score returns 85 for financing)
  const loans = isRealUser ? [] : (portfolioFinancing[portfolioId] ?? []);
  const hs = computePortfolioHealthScore(portfolio, loans);

  const arcaFee = Math.round(
    totalInsuranceOverpay * 0.15 +
    totalEnergyOverpay * 0.10 +
    totalAddIncome * 0.10
  );

  // Capital value uplift: same formula as dashboard — implied cap rate from AUM / NOI
  const impliedCapRate = totalAUM > 0 && totalNet > 0 ? totalNet / totalAUM : 0.055;
  const capitalValueUplift = Math.round(totalOpportunity / impliedCapRate);

  // Loan maturities within 12 months
  const nearTermLoans = loans.filter((l) => {
    const days = (new Date(l.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 365;
  });

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "https://realhq.com");
    const reportUrl = new URL("/report", base);
    if (portfolioId && portfolioId !== "fl-mixed") reportUrl.searchParams.set("portfolio", portfolioId);
    if (portfolio.shortName && portfolio.shortName !== portfolio.name) reportUrl.searchParams.set("company", portfolio.shortName);

    const subject = encodeURIComponent(
      `RealHQ found ${fmt(totalOpportunity, sym)}/yr of opportunity in ${portfolio.name}`
    );
    const body = encodeURIComponent(
      `Hi,\n\nAs discussed — here is your RealHQ portfolio report.\n\n` +
      `PORTFOLIO: ${portfolio.name} (${portfolio.assets.length} assets)\n` +
      `───────────────────────────────\n` +
      `Total annual opportunity: ${fmt(totalOpportunity, sym)}/yr\n` +
      `  · Insurance overpay: ${fmt(totalInsuranceOverpay, sym)}/yr\n` +
      `  · Energy overpay: ${fmt(totalEnergyOverpay, sym)}/yr\n` +
      `  · Additional income: ${fmt(totalAddIncome, sym)}/yr\n` +
      (totalFineExposure > 0 ? `  · Compliance fine exposure: ${fmt(totalFineExposure, sym)}\n` : "") +
      `\nCapital value uplift: ~${fmt(capitalValueUplift, sym)}\n` +
      `RealHQ fee on delivery: ${fmt(arcaFee, sym)}/yr (commission-only — nothing upfront)\n\n` +
      `View the full interactive report: ${reportUrl.toString()}\n\n` +
      `Let me know if you have any questions.\n\nBest`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <AppShell>
      <TopBar title="Portfolio Report" />

      <main className="flex-1 p-4 lg:p-6">
        {/* Print/share controls — hidden on print */}
        <div className="max-w-3xl mx-auto mb-5 flex items-center justify-between print:hidden">
          <div className="text-sm" style={{ color: "#9CA3AF" }}>
            Portfolio intelligence report · {fmtDate()}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#0A8A4C" }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="11.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="11.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="3.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5.4 6.6l4.2-2.2M5.4 8.4l4.2 2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", color: "#111827" }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3.5 5V1.5H11.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1" y="5" width="13" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3.5 9.5H11.5V13.5H3.5V9.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              Print / Save PDF
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:opacity-70"
              style={{ color: "#9CA3AF" }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Report content */}
        <div
          ref={printRef}
          className="max-w-3xl mx-auto space-y-6"
          style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        >
          {/* ── Print-only prepared-by header ── */}
          <div className="hidden print:block mb-6 pb-4" style={{ borderBottom: "2px solid #0A8A4C" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#0A8A4C", letterSpacing: "0.12em" }}>
                  Prepared by RealHQ
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#555" }}>
                  ian@realhq.com · realhq.com · Commission-only advisory
                </div>
              </div>
              <div className="text-xs" style={{ color: "#555" }}>
                {fmtDate()}
              </div>
            </div>
          </div>

          {/* ── Header ── */}
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.12em" }}>
                    RealHQ · Portfolio Intelligence Report
                  </span>
                </div>
                <h1
                  className="text-3xl font-semibold mb-1"
                  style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#111827" }}
                >
                  {portfolio.name}
                </h1>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  {portfolio.assets.length} assets · {portfolio.currency} · Report date: {fmtDate()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                  {fmt(totalOpportunity, sym)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Total annual opportunity identified</div>
              </div>
            </div>
          </div>

          {/* ── Capital Value Uplift Callout ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#0A8A4C", letterSpacing: "0.1em" }}>
                  Implied Capital Value Uplift
                </div>
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}
                >
                  {fmt(capitalValueUplift, sym)}
                </div>
                <div className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                  {fmt(totalOpportunity, sym)}/yr NOI uplift ÷ {(Math.round(impliedCapRate * 1000) / 10).toFixed(1)}% cap rate
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Annual income recovered</div>
                <div
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#F5A94A" }}
                >
                  {fmt(totalOpportunity, sym)}/yr
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>
                  RealHQ fee: {fmt(arcaFee, sym)}/yr · you keep {fmt(totalOpportunity - arcaFee, sym)}/yr
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "AUM", value: fmt(totalAUM, sym), sub: `${portfolio.assets.length} assets` },
              { label: "Gross Income", value: fmt(totalGross, sym), sub: "per year" },
              { label: "Net Income (G2N)", value: `${g2n}%`, sub: `benchmark ${portfolio.benchmarkG2N}%` },
              { label: "Avg Occupancy", value: `${avgOccupancy}%`, sub: "across portfolio" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>{k.label}</div>
                <div className="text-xl font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{k.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Portfolio Health Score ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Portfolio Health Score</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Optimisation score across 5 dimensions — 100 = fully benchmarked</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>Current</div>
                  <div
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      color: hs.overall >= 75 ? "#0A8A4C" : hs.overall >= 50 ? "#F5A94A" : "#DC2626",
                    }}
                  >
                    {hs.overall}<span className="text-sm font-normal" style={{ color: "#9CA3AF" }}>/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>With RealHQ</div>
                  <div
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}
                  >
                    {hs.projected}<span className="text-sm font-normal" style={{ color: "#9CA3AF" }}>/100</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 grid grid-cols-5 gap-4">
              {[
                { label: "Insurance", score: hs.insurance },
                { label: "Energy", score: hs.energy },
                { label: "Compliance", score: hs.compliance },
                { label: "Leases", score: hs.leases },
                { label: "Financing", score: hs.financing },
              ].map((dim) => {
                const color = dim.score >= 75 ? "#0A8A4C" : dim.score >= 50 ? "#F5A94A" : "#DC2626";
                return (
                  <div key={dim.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>{dim.label}</span>
                      <span className="text-xs font-bold" style={{ color }}>{dim.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
                      <div className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Opportunity Summary ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div className="text-sm font-semibold" style={{ color: "#111827" }}>Opportunity Summary</div>
              <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Annual value recoverable via RealHQ — commission-only, success fee basis</div>
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {[
                {
                  label: "Insurance Retender",
                  value: totalInsuranceOverpay,
                  color: "#F5A94A",
                  fee: `RealHQ fee: 15% of saving (${fmt(Math.round(totalInsuranceOverpay * 0.15), sym)})`,
                  desc: `Portfolio paying above market rate across ${portfolio.assets.length} assets. Retender with competing carriers to close the gap.`,
                },
                {
                  label: "Energy Switching",
                  value: totalEnergyOverpay,
                  color: "#F5A94A",
                  fee: `RealHQ fee: 10% of yr 1 saving (${fmt(Math.round(totalEnergyOverpay * 0.10), sym)})`,
                  desc: "Current energy spend above benchmark. RealHQ sources competing supplier rates and manages the switch.",
                },
                {
                  label: "Additional Income",
                  value: totalAddIncome,
                  color: "#0A8A4C",
                  fee: `RealHQ fee: 10% of first-year income (${fmt(Math.round(totalAddIncome * 0.10), sym)})`,
                  desc: `Solar, EV charging, 5G masts, and other income streams identified. ${portfolio.assets.flatMap((a) => a.additionalIncomeOpportunities).length} opportunities across portfolio.`,
                },
                ...(totalFineExposure > 0
                  ? [{
                      label: "Compliance Fine Exposure",
                      value: totalFineExposure,
                      color: "#DC2626",
                      fee: "Included in platform at no extra cost",
                      desc: `${expiredCompliance.length} certificates expiring or expired. RealHQ tracks all certificates and files renewals.`,
                    }]
                  : []),
              ].map((row) => {
                const pct = Math.round((row.value / (totalOpportunity || 1)) * 100);
                return (
                  <div key={row.label} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="text-sm font-semibold" style={{ color: "#111827" }}>{row.label}</span>
                        </div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>{row.desc}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold" style={{ color: row.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                          {fmt(row.value, sym)}/yr
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>{row.fee}</div>
                      </div>
                    </div>
                    <div className="h-1 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ backgroundColor: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Total annual opportunity</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>RealHQ success fee on delivery: {fmt(arcaFee, sym)}/yr</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                {fmt(totalOpportunity, sym)}/yr
              </div>
            </div>
          </div>

          {/* ── Financing Capacity (real user) ── */}
          {isRealUser && indicativeLoans.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>Indicative Financing Capacity</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Based on NOI at 65% LTV — contact Arca for live lender terms</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                      <circle cx="5" cy="5" r="4" stroke="#D97706" strokeWidth="1.2"/>
                      <path d="M5 3v2.5" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="5" cy="7" r="0.6" fill="#D97706"/>
                    </svg>
                    Indicative only
                  </div>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {indicativeLoans.map((loan) => {
                  const loanSym = loan.currency === "GBP" ? "£" : "$";
                  return (
                    <div key={loan.assetId} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#111827" }}>{loan.assetName}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{loan.assetType}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold" style={{ color: "#1647E8", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                            {fmt(loan.loanCapacity, loanSym)}
                          </div>
                          <div className="text-xs" style={{ color: "#D1D5DB" }}>capacity</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Est. value</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#111827" }}>{fmt(loan.estimatedValue, loanSym)}</div>
                        </div>
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Rate (indicative)</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#111827" }}>{loan.estimatedRate}%</div>
                        </div>
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Annual service</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#111827" }}>{fmt(loan.annualDebtService, loanSym)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-3 text-xs" style={{ backgroundColor: "#FFFBEB", borderTop: "1px solid #FDE68A", color: "#D97706" }}>
                Indicative only — contact Arca for live lender terms and confirmed loan offers.
              </div>
            </div>
          )}

          {/* ── Financing (demo mode) ── */}
          {!isRealUser && loans.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Financing Summary</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{loans.length} active loan{loans.length !== 1 ? "s" : ""} across portfolio</div>
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {loans.map((loan) => {
                  const loanSym = loan.currency === "GBP" ? "£" : "$";
                  const daysToMaturity = Math.round((new Date(loan.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const matColor = daysToMaturity <= 60 ? "#DC2626" : daysToMaturity <= 180 ? "#D97706" : "#0A8A4C";
                  return (
                    <div key={loan.assetId} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#111827" }}>{loan.assetName}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{loan.lender} · {loan.rateType === "fixed" ? "Fixed" : loan.rateReference}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold" style={{ color: "#1647E8", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                            {fmt(loan.outstandingBalance, loanSym)}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: matColor }}>
                            {daysToMaturity > 0 ? `${Math.round(daysToMaturity / 30)}m to maturity` : "Matured"}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Rate</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#111827" }}>{loan.interestRate}%</div>
                        </div>
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>ICR</div>
                          <div className="font-semibold mt-0.5" style={{ color: loan.icr < loan.icrCovenant ? "#DC2626" : "#111827" }}>{loan.icr.toFixed(2)}x</div>
                        </div>
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>LTV</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#111827" }}>{loan.currentLTV}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Asset Breakdown ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div className="text-sm font-semibold" style={{ color: "#111827" }}>Asset-Level Breakdown</div>
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {portfolio.assets.map((asset) => {
                const insOverpay = asset.insurancePremium - asset.marketInsurance;
                const energyOverpay = asset.energyCost - asset.marketEnergyCost;
                const addIncome = asset.additionalIncomeOpportunities.reduce((s, o) => s + o.annualIncome, 0);
                const assetOpp = insOverpay + energyOverpay + addIncome;
                const g2nA = Math.round((asset.netIncome / asset.grossIncome) * 100);
                const expiringCount = asset.leases.filter((l) => l.status === "expiring_soon" || l.daysToExpiry < 90).length;

                return (
                  <div key={asset.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#111827" }}>{asset.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {asset.location} · {asset.type} · {asset.sqft.toLocaleString()} sqft · {asset.occupancy}% occupied · G2N {g2nA}%
                        </div>
                      </div>
                      {assetOpp > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                            {fmt(assetOpp, sym)}/yr
                          </div>
                          <div className="text-xs" style={{ color: "#D1D5DB" }}>opportunity</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {insOverpay > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Insurance</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#F5A94A" }}>−{fmt(insOverpay, sym)}/yr</div>
                        </div>
                      )}
                      {energyOverpay > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Energy</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#F5A94A" }}>−{fmt(energyOverpay, sym)}/yr</div>
                        </div>
                      )}
                      {addIncome > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#F9FAFB" }}>
                          <div style={{ color: "#9CA3AF" }}>Add. income</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#0A8A4C" }}>+{fmt(addIncome, sym)}/yr</div>
                        </div>
                      )}
                    </div>

                    {expiringCount > 0 && (
                      <div className="mt-2 text-xs flex items-center gap-1.5" style={{ color: "#F5A94A" }}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
                          <circle cx="5.5" cy="5.5" r="4.5" stroke="#F5A94A" strokeWidth="1.2" />
                          <path d="M5.5 3.5V5.5" stroke="#F5A94A" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="5.5" cy="7.5" r="0.6" fill="#F5A94A" />
                        </svg>
                        {expiringCount} lease{expiringCount > 1 ? "s" : ""} expiring &lt;90 days
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Urgent alerts ── */}
          {(expiringLeases.length > 0 || totalFineExposure > 0) && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#FEF2F2", border: "1px solid #DC2626" }}>
              <div className="text-sm font-semibold mb-3" style={{ color: "#DC2626" }}>Immediate Actions Required</div>
              <div className="space-y-2 text-sm">
                {totalFineExposure > 0 && (
                  <div style={{ color: "#111827" }}>
                    · <span style={{ color: "#DC2626" }}>{fmt(totalFineExposure, sym)} fine exposure</span> — {expiredCompliance.length} compliance certificates expiring
                  </div>
                )}
                {expiringLeases.slice(0, 3).map((lease) => {
                  const asset = portfolio.assets.find((a) => a.leases.some((l) => l.id === lease.id));
                  return (
                    <div key={lease.id} style={{ color: "#111827" }}>
                      · <span style={{ color: "#F5A94A" }}>{lease.tenant}</span> — lease expires in {lease.daysToExpiry} days ({asset?.name})
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Why Act Now ── */}
          {(expiredCompliance.length > 0 || expiringLeases.length > 0 || nearTermLoans.length > 0) && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Why Act Now</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Time-sensitive items that increase cost of delay</div>
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {expiredCompliance.length > 0 && (
                  <div className="px-6 py-3 flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FEF2F2" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2v3" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/>
                        <circle cx="5" cy="7.5" r="0.7" fill="#DC2626"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "#DC2626" }}>
                        {expiredCompliance.length} compliance certificate{expiredCompliance.length > 1 ? "s" : ""} expired / expiring
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        {fmt(totalFineExposure, sym)} fine exposure — RealHQ files renewals at no extra cost
                      </div>
                    </div>
                  </div>
                )}
                {expiringLeases.slice(0, 3).map((lease) => {
                  const asset = portfolio.assets.find((a) => a.leases.some((l) => l.id === lease.id));
                  return (
                    <div key={lease.id} className="px-6 py-3 flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FFFBEB" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <circle cx="5" cy="5" r="3.5" stroke="#F5A94A" strokeWidth="1.2"/>
                          <path d="M5 3v2.5" stroke="#F5A94A" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#F5A94A" }}>
                          {lease.tenant} — lease expires in {lease.daysToExpiry} days
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {asset?.name} · vacancy risk if not renewed
                        </div>
                      </div>
                    </div>
                  );
                })}
                {nearTermLoans.map((loan) => {
                  const daysToMaturity = Math.round((new Date(loan.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={loan.assetId} className="px-6 py-3 flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#fff", border: "1px solid #1647E8" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 7.5L5 2.5L8 7.5H2Z" stroke="#1647E8" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#8ba8d8" }}>
                          {loan.lender} loan matures in {daysToMaturity} days
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {fmt(loan.outstandingBalance, sym)} outstanding · refinance window opening
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#111827" }}
            >
              RealHQ recovers this on commission-only terms
            </div>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF" }}>
              No setup fees. No retainer. No contracts. RealHQ charges a success fee only when value is delivered. The total fee on the {fmt(totalOpportunity, sym)}/yr opportunity is {fmt(arcaFee, sym)}/yr — you keep the rest.
            </p>
            {!isRealUser && (
              <Link
                href={`/book?assets=${portfolio.assets.length}&company=${encodeURIComponent(portfolio.name)}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 print:hidden"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Run this on my real portfolio →
              </Link>
            )}
            <div className="mt-4 text-xs" style={{ color: "#D1D5DB" }}>
              Prepared by RealHQ · ian@realhq.com · realhq.com · Commission-only advisory{!isRealUser ? " · Demo data" : ""}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

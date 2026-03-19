"use client";


import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LineChart } from "@/components/ui/LineChart";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function WelcomeBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("welcome") !== "1") return null;
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-start gap-4"
      style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}
    >
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "#0A8A4C" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 8l4 4 7-7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-0.5" style={{ color: "#e8eef5" }}>
          Welcome to Arca — this is a demo portfolio
        </div>
        <p className="text-xs" style={{ color: "#5a7a96" }}>
          You&apos;re looking at a live FL Mixed demo portfolio (12 assets, $2.8M gross income). Arca has found{" "}
          <span style={{ color: "#F5A94A" }}>$194k</span> of opportunity. Explore below — or{" "}
          <a href="mailto:hello@arcahq.ai?subject=Run%20Arca%20on%20my%20portfolio" style={{ color: "#0A8A4C" }}>
            email us to run this on your real portfolio →
          </a>
        </p>
      </div>
    </div>
  );
}

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

export default function DashboardPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalGross = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const g2n = Math.round((totalNet / totalGross) * 100);
  const benchmarkG2N = portfolio.benchmarkG2N;
  const g2nGap = g2n - benchmarkG2N;

  const totalInsuranceOverpay = portfolio.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
  const totalEnergyOverpay = portfolio.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
  const totalAdditionalIncome = portfolio.assets
    .flatMap((a) => a.additionalIncomeOpportunities)
    .reduce((s, o) => s + o.annualIncome, 0);
  const totalOpportunity = totalInsuranceOverpay + totalEnergyOverpay + totalAdditionalIncome;

  const expiringLeases = portfolio.assets.flatMap((a) =>
    a.leases.filter((l) => l.status === "expiring_soon")
  );

  const expiredCompliance = portfolio.assets.flatMap((a) =>
    a.compliance.filter((c) => c.status === "expiring_soon" || c.status === "expired")
  );
  const totalFineExposure = expiredCompliance.reduce((s, c) => s + c.fineExposure, 0);

  const avgOccupancy = Math.round(
    portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length
  );

  // ── Top 3 Actions logic ────────────────────────────────────────
  interface Action {
    id: string;
    label: string;
    detail: string;
    value: number;
    fee: string;
    commission: number; // estimated Arca commission
    href: string;
    cta: string;
    color: string;
  }

  const candidateActions: Action[] = [];

  // 1. Insurance retender
  const insuranceOverpayPct = Math.round((totalInsuranceOverpay / portfolio.assets.reduce((s,a) => s + a.insurancePremium, 0)) * 100);
  if (insuranceOverpayPct > 15) {
    candidateActions.push({
      id: "insurance",
      label: "Insurance Retender",
      detail: `Portfolio paying ${insuranceOverpayPct}% above market`,
      value: totalInsuranceOverpay,
      fee: "15% of saving · success-only",
      commission: Math.round(totalInsuranceOverpay * 0.15),
      href: "/insurance",
      cta: "Start Retender",
      color: "#F5A94A",
    });
  }

  // 2. Energy switch
  const energyOverpayPct = Math.round((totalEnergyOverpay / portfolio.assets.reduce((s,a) => s + a.energyCost, 0)) * 100);
  if (energyOverpayPct > 10) {
    candidateActions.push({
      id: "energy",
      label: "Energy Switch",
      detail: `Energy spend ${energyOverpayPct}% above market rate`,
      value: totalEnergyOverpay,
      fee: "10% of yr 1 saving · success-only",
      commission: Math.round(totalEnergyOverpay * 0.10),
      href: "/energy",
      cta: "Switch Supplier",
      color: "#1647E8",
    });
  }

  // 3. Rent review prep — best candidate asset
  const rentReviewCandidates = portfolio.assets
    .filter((a) => {
      const ervGap = ((a.marketERV - a.passingRent) / a.passingRent) * 100;
      return ervGap > 10 && a.leases.some((l) => l.daysToExpiry <= 365 && l.daysToExpiry > 0);
    })
    .sort((a, b) => (b.marketERV - b.passingRent) * b.sqft - (a.marketERV - a.passingRent) * a.sqft);
  if (rentReviewCandidates.length > 0) {
    const best = rentReviewCandidates[0];
    const reversion = Math.round((best.marketERV - best.passingRent) * best.sqft);
    const ervGap = Math.round(((best.marketERV - best.passingRent) / best.passingRent) * 100);
    candidateActions.push({
      id: "rent-review",
      label: `Rent Review — ${best.name.split(" ").slice(0, 3).join(" ")}`,
      detail: `ERV ${ervGap}% above passing rent · lease review due`,
      value: reversion,
      fee: "8% of uplift · success-only",
      commission: Math.round(reversion * 0.08),
      href: "/rent-clock",
      cta: "Prepare Case",
      color: "#F5A94A",
    });
  }

  // 4. Income activation — best opportunity
  const bestIncome = portfolio.assets
    .flatMap((a) => a.additionalIncomeOpportunities.map((o) => ({ ...o, assetName: a.name })))
    .sort((a, b) => b.annualIncome - a.annualIncome)[0];
  if (bestIncome) {
    candidateActions.push({
      id: "income",
      label: `${bestIncome.label} — ${bestIncome.assetName.split(" ").slice(0, 3).join(" ")}`,
      detail: "Untapped income opportunity identified",
      value: bestIncome.annualIncome,
      fee: "10% of first year income · success-only",
      commission: Math.round(bestIncome.annualIncome * 0.10),
      href: "/income",
      cta: "Activate",
      color: "#0A8A4C",
    });
  }

  // 5. Compliance fix
  if (expiredCompliance.length > 0) {
    candidateActions.push({
      id: "compliance",
      label: "Compliance Renewals",
      detail: `${expiredCompliance.length} certificates expiring — ${fmt(totalFineExposure, sym)} fine risk`,
      value: totalFineExposure,
      fee: "Fixed fee · avoids fines",
      commission: totalFineExposure,
      href: "/compliance",
      cta: "Fix Now",
      color: "#f06040",
    });
  }

  // Sort by Arca commission (highest impact first), take top 3
  const top3 = candidateActions
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 3);

  const [startedActions, setStartedActions] = useState<Record<string, boolean>>({});

  const g2nTrend = [
    { label: "Apr", actual: g2n - 4, optimised: benchmarkG2N },
    { label: "May", actual: g2n - 3, optimised: benchmarkG2N },
    { label: "Jun", actual: g2n - 2, optimised: benchmarkG2N },
    { label: "Jul", actual: g2n - 3, optimised: benchmarkG2N },
    { label: "Aug", actual: g2n - 1, optimised: benchmarkG2N },
    { label: "Sep", actual: g2n - 2, optimised: benchmarkG2N },
    { label: "Oct", actual: g2n - 1, optimised: benchmarkG2N },
    { label: "Nov", actual: g2n, optimised: benchmarkG2N },
    { label: "Dec", actual: g2n + 1, optimised: benchmarkG2N },
    { label: "Jan", actual: g2n - 1, optimised: benchmarkG2N },
    { label: "Feb", actual: g2n, optimised: benchmarkG2N },
    { label: "Mar", actual: g2n, optimised: benchmarkG2N },
  ];

  return (
    <AppShell>
      <TopBar title="Dashboard" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Welcome banner for new sign-ups */}
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>

        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard
              label="Net Efficiency"
              value={`${g2n}%`}
              sub={`G2N ratio · benchmark ${benchmarkG2N}%`}
              trend={g2nGap >= 0 ? "up" : "down"}
              trendLabel={`${g2nGap >= 0 ? "+" : ""}${g2nGap}pp vs benchmark`}
              accent={g2nGap >= 0 ? "green" : "amber"}
            />
            <MetricCard
              label="Total Opportunity"
              value={fmt(totalOpportunity, sym)}
              sub="Across all buckets"
              accent="amber"
            />
            <MetricCard
              label="Gross Income"
              value={fmt(totalGross, sym)}
              sub={`Net: ${fmt(totalNet, sym)}`}
              trend="up"
              trendLabel="3.2% YoY"
              accent="blue"
            />
            <MetricCard
              label="Avg Occupancy"
              value={`${avgOccupancy}%`}
              sub={`${portfolio.assets.length} assets`}
              trend={avgOccupancy >= 90 ? "up" : "down"}
              trendLabel={avgOccupancy >= 90 ? "Strong" : "Lease review needed"}
              accent={avgOccupancy >= 90 ? "green" : "amber"}
            />
          </div>
        )}

        {/* Top 3 Actions */}
        {!loading && top3.length > 0 && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Top Actions Right Now" subtitle="Most impactful things Arca can do on your portfolio today" />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {top3.map((action, i) => {
                const started = !!startedActions[action.id];
                return (
                  <div key={action.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-[#0d1825]">
                    {/* Rank + label */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                        style={{ backgroundColor: action.color + "22", color: action.color }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>{action.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{action.detail}</div>
                      </div>
                    </div>
                    {/* Value + fee */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div
                          className="text-base font-bold"
                          style={{
                            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                            color: action.color,
                          }}
                        >
                          {fmt(action.value, sym)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>{action.fee}</div>
                      </div>
                      {started ? (
                        <div
                          className="px-4 py-2 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}
                        >
                          ✓ Instructed
                        </div>
                      ) : (
                        <button
                          onClick={() => setStartedActions(s => ({ ...s, [action.id]: true }))}
                          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                          style={{ backgroundColor: action.color, color: "#fff" }}
                        >
                          {action.cta} →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>
                Total opportunity across top 3 actions
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  color: "#F5A94A",
                }}
              >
                {fmt(top3.reduce((s, a) => s + a.value, 0), sym)}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* G2N Chart */}
            <div
              className="lg:col-span-2 rounded-xl p-5 transition-all duration-150 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Net Income Efficiency</div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>How much of your gross income reaches your pocket (trailing 12m)</div>
                </div>
                <div className="flex items-center gap-3 lg:gap-4 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                    <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "#0A8A4C" }} />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#F5A94A" }}>
                    <span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: "#F5A94A" }} />
                    Benchmark
                  </span>
                </div>
              </div>
              <LineChart
                data={g2nTrend}
                height={140}
                formatValue={(v) => `${v}%`}
              />
            </div>

            {/* Opportunity Buckets */}
            <div
              className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="text-sm font-semibold mb-4" style={{ color: "#e8eef5" }}>Opportunity Buckets</div>
              <div className="space-y-4">
                {[
                  { label: "Insurance overpay", value: totalInsuranceOverpay, color: "#F5A94A", href: "/insurance", action: "Retender" },
                  { label: "Energy overpay", value: totalEnergyOverpay, color: "#1647E8", href: "/energy", action: "Switch" },
                  { label: "Additional income", value: totalAdditionalIncome, color: "#0A8A4C", href: "/income", action: "Activate" },
                ].map((b) => {
                  const pct = Math.round((b.value / totalOpportunity) * 100);
                  return (
                    <div key={b.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: "#8ba0b8" }}>{b.label}</span>
                        <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                          {fmt(b.value, sym)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: b.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs" style={{ color: "#3d5a72" }}>{pct}% of total</span>
                        <Link href={b.href} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: b.color }}>
                          {b.action} →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Asset Ticker */}
            <div
              className="rounded-xl transition-all duration-150 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
                <SectionHeader
                  title="Portfolio Assets"
                  subtitle={`${portfolio.assets.length} assets · ${sym}${(portfolio.assets.reduce((s, a) => s + (a.valuationGBP ?? a.valuationUSD ?? 0), 0) / 1_000_000).toFixed(1)}M AUM`}
                />
              </div>
              <div className="divide-y divide-[#1a2d45]">
                {portfolio.assets.map((asset) => {
                  const g2nA = Math.round((asset.netIncome / asset.grossIncome) * 100);
                  const rentReversion = Math.round(((asset.marketERV - asset.passingRent) / asset.passingRent) * 100);
                  return (
                    <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#0d1825]">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "#e8eef5" }}>{asset.name}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: "#5a7a96" }}>{asset.location} · {asset.sqft.toLocaleString()} sqft</div>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-3 shrink-0 ml-3">
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>G2N</div>
                          <div className="text-sm font-semibold" style={{ color: g2nA >= benchmarkG2N ? "#0A8A4C" : "#F5A94A" }}>{g2nA}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>Occ</div>
                          <div className="text-sm font-semibold" style={{ color: asset.occupancy >= 90 ? "#0A8A4C" : "#F5A94A" }}>{asset.occupancy}%</div>
                        </div>
                        {rentReversion > 5 && (
                          <Badge variant="amber" className="hidden sm:inline-flex">+{rentReversion}% ERV</Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Alerts */}
            <div
              className="rounded-xl transition-all duration-150 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
                <SectionHeader
                  title="Action Required"
                  subtitle={`${expiringLeases.length + expiredCompliance.length} items need attention`}
                />
              </div>
              {(expiringLeases.length + expiredCompliance.length) === 0 ? (
                <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0f2a1c" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10L8.5 13.5L15 7" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium" style={{ color: "#0A8A4C" }}>All clear</div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>No urgent actions — portfolio is in good shape</div>
                </div>
              ) : (
                <div className="divide-y divide-[#1a2d45] overflow-y-auto" style={{ maxHeight: 340 }}>
                  {totalFineExposure > 0 && (
                    <div className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#0d1825]">
                      <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#2e0f0a" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="#f06040">
                          <path d="M6 1L11 10H1L6 1Z" />
                          <path d="M6 5V7" stroke="#0B1622" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="6" cy="8.5" r="0.5" fill="#0B1622" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#f06040" }}>
                          {fmt(totalFineExposure, sym)} fine exposure
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                          {expiredCompliance.length} compliance certificates expiring
                        </div>
                        <Link href="/compliance" className="text-xs font-medium mt-1 inline-block hover:opacity-70" style={{ color: "#f06040" }}>
                          View compliance →
                        </Link>
                      </div>
                    </div>
                  )}
                  {expiringLeases.slice(0, 5).map((lease) => {
                    const asset = portfolio.assets.find((a) => a.leases.some((l) => l.id === lease.id));
                    return (
                      <div key={lease.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#0d1825]">
                        <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#2e1e0a" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="#F5A94A" strokeWidth="1.5" />
                            <path d="M6 3.5V6.5" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="6" cy="8" r="0.5" fill="#F5A94A" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
                            {lease.tenant === "Vacant" ? "Vacant unit" : `${lease.tenant} — lease expiry`}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                            {asset?.name} · {lease.daysToExpiry} days
                          </div>
                          <Link href="/rent-clock" className="text-xs font-medium mt-1 inline-block hover:opacity-70" style={{ color: "#F5A94A" }}>
                            View Rent Clock →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {expiredCompliance.slice(0, 3).map((c) => {
                    const asset = portfolio.assets.find((a) => a.compliance.some((x) => x.id === c.id));
                    return (
                      <div key={c.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#0d1825]">
                        <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#2e0f0a" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <rect x="2" y="1.5" width="8" height="9" rx="1.5" stroke="#f06040" strokeWidth="1.5" />
                            <path d="M4 5H8M4 7H6" stroke="#f06040" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>
                            {c.certificate} expiring
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                            {asset?.name} · {c.daysToExpiry} days · {fmt(c.fineExposure, sym)} fine risk
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report CTA */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>Portfolio Intelligence Report</div>
              <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                Printable summary of all opportunities, assets, and Arca fees — share with your partners or board
              </div>
            </div>
            <Link
              href="/report"
              className="shrink-0 ml-4 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#0d1825", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              View Report →
            </Link>
          </div>
        )}
      </main>
    </AppShell>
  );
}

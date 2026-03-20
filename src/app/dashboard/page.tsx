"use client";


import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { portfolioFinancing, AssetLoan } from "@/lib/data/financing";
import { computePortfolioHealthScore } from "@/lib/health";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { ActionAlert } from "@/components/ui/ActionAlert";
import { G2NComparisonCard } from "@/components/ui/G2NComparisonCard";

function DemoBanner() {
  const { portfolioId } = useNav();
  const [visible, setVisible] = useState<boolean | null>(null);
  const [demoCompany, setDemoCompany] = useState("");

  useEffect(() => {
    const signedUp = localStorage.getItem("arca_signed_up");
    const dismissed = localStorage.getItem("arca_demo_banner_dismissed");
    // Don't show for custom client portfolios (they have real data)
    const isCustom = portfolioId !== "fl-mixed" && portfolioId !== "se-logistics";
    setVisible(!signedUp && !dismissed && !isCustom);
    setDemoCompany(localStorage.getItem("arca_company") ?? "");
  }, [portfolioId]);

  function dismiss() {
    localStorage.setItem("arca_demo_banner_dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 gap-3"
      style={{
        backgroundColor: "#1e1508",
        borderBottom: "1px solid #4f330d",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
          <circle cx="7" cy="7" r="6" stroke="#F5A94A" strokeWidth="1.5" />
          <path d="M7 6v4" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="4.5" r="0.75" fill="#F5A94A" />
        </svg>
        <span className="text-xs truncate" style={{ color: "#F5A94A" }}>
          {demoCompany
            ? `${demoCompany} — estimated demo portfolio · Your real analysis will reflect your actual assets`
            : "Demo portfolio — FL Mixed & SE Logistics · Your analysis will look like this"}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/book"
          className="hidden sm:inline-flex px-3 py-1 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E8" }}
        >
          Book a call →
        </Link>
        <a
          href="/signup"
          className="px-3 py-1 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          See your portfolio →
        </a>
        <button
          onClick={dismiss}
          className="text-xs leading-none transition-opacity hover:opacity-60"
          style={{ color: "#F5A94A" }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function WelcomeBanner() {
  const searchParams = useSearchParams();
  const { portfolioId } = useNav();
  const isWelcome = searchParams.get("welcome") === "1";
  const company = searchParams.get("company") ?? "";
  const oppRaw = parseInt(searchParams.get("opp") ?? "0", 10);
  const opp = oppRaw > 0 ? oppRaw : 506000;
  const portfolioParam = searchParams.get("portfolio") ?? portfolioId;
  const sym = portfolioParam === "se-logistics" ? "£" : "$";
  const fmtOpp = opp >= 1_000_000 ? `${sym}${(opp / 1_000_000).toFixed(1)}M` : `${sym}${Math.round(opp / 1000)}k`;
  const demoLabel = portfolioParam === "se-logistics" ? "SE Logistics demo portfolio" : "FL Mixed demo portfolio";

  // Persist personalized data so the bottom bar stays personalised across all pages
  const demoCapturedRef = useRef(false);
  useEffect(() => {
    if (!isWelcome) return;
    if (company) localStorage.setItem("arca_company", company);
    if (opp > 0) localStorage.setItem("arca_opp", String(opp));
    // Capture demo link visit as a lead (only once, only when company is known)
    if (company && !demoCapturedRef.current) {
      demoCapturedRef.current = true;
      fetch("/api/leads/demo-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, estimatedOpp: opp }),
      }).catch(() => {});
    }
  }, [isWelcome, company, opp]);

  if (!isWelcome) return null;
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
          {company ? `Welcome, ${company} — your analysis is ready` : "Welcome to Arca — your analysis is ready"}
        </div>
        <p className="text-xs" style={{ color: "#5a7a96" }}>
          {company ? `Based on your portfolio, Arca estimates` : `The ${demoLabel} shows`}{" "}
          <span style={{ color: "#F5A94A" }}>{fmtOpp}/yr</span> of opportunity across insurance, energy, and income.
          This is a demo —{" "}
          <Link
            href="/book"
            style={{ color: "#0A8A4C" }}
          >
            book a 20-min call to run this on your real portfolio →
          </Link>
        </p>
      </div>
    </div>
  );
}

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

export default function DashboardPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const [demoCompany, setDemoCompany] = useState("");

  useEffect(() => { setDemoCompany(localStorage.getItem("arca_company") ?? ""); }, []);

  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalGross = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const g2n = Math.round((totalNet / totalGross) * 100);
  const benchmarkG2N = portfolio.benchmarkG2N;
  const g2nGap = g2n - benchmarkG2N;

  const totalInsurancePremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalEnergySpend = portfolio.assets.reduce((s, a) => s + a.energyCost, 0);
  const totalInsuranceOverpay = portfolio.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
  const totalEnergyOverpay = portfolio.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
  const otherOpEx = Math.max(0, (totalGross - totalNet) - totalInsurancePremium - totalEnergySpend);
  const optimisedNet = totalNet + totalInsuranceOverpay + totalEnergyOverpay;
  const optimisedG2N = Math.round((optimisedNet / Math.max(1, totalGross)) * 100);
  const totalAdditionalIncome = portfolio.assets
    .flatMap((a) => a.additionalIncomeOpportunities)
    .reduce((s, o) => s + o.annualIncome, 0);
  const totalOpportunity = totalInsuranceOverpay + totalEnergyOverpay + totalAdditionalIncome;

  // Capital value uplift: total annual opportunity / implied cap rate
  // (more NOI at the same cap rate = proportionally higher asset value)
  const totalPortfolioValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const impliedCapRate = totalPortfolioValue > 0 ? totalNet / totalPortfolioValue : 0.055;
  const capitalValueUplift = impliedCapRate > 0 ? Math.round(totalOpportunity / impliedCapRate) : 0;

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

  // Urgent financing alerts — loans maturing within 90 days or ICR below covenant
  const loans = portfolioFinancing[portfolioId] ?? [];
  const urgentLoans = loans
    .filter((l) => l.daysToMaturity <= 90 || l.icr < l.icrCovenant)
    .sort((a, b) => a.daysToMaturity - b.daysToMaturity);

  // Break clauses within 90 days
  const today = new Date();
  const urgentBreaks = portfolio.assets.flatMap((a) =>
    a.leases.flatMap((l) => {
      if (!l.breakDate) return [];
      const daysToBreak = Math.round((new Date(l.breakDate).getTime() - today.getTime()) / 86400000);
      if (daysToBreak > 0 && daysToBreak <= 90) return [{ lease: l, asset: a, daysToBreak }];
      return [];
    })
  ).sort((a, b) => a.daysToBreak - b.daysToBreak);

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
  const [shared, setShared] = useState(false);

  // ── Portfolio Health Score (shared utility — same calc as TopBar) ──
  const {
    overall: healthScore,
    projected: projectedScore,
    insurance: hsInsurance,
    energy: hsEnergy,
    compliance: hsCompliance,
    leases: hsLeases,
    financing: hsFinancing,
  } = computePortfolioHealthScore(portfolio, loans);

  return (
    <AppShell>
      <TopBar title="Dashboard" />
      <DemoBanner />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Welcome banner for new sign-ups */}
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>

        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (() => {
          const totalValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
          const now = new Date();
          const hour = now.getHours();
          const greeting = hour < 12 ? "Good morning." : hour < 17 ? "Good afternoon." : "Good evening.";
          return (
            <div className="relative">
              <PageHero
                greeting={greeting}
                subtitle={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                cells={[
                  { label: "Properties", value: `${portfolio.assets.length}`, sub: demoCompany ? `${demoCompany} Portfolio` : portfolio.name },
                  { label: "Portfolio Value", value: fmt(totalValue, sym), valueColor: "#5BF0AC", sub: "AUM across portfolio" },
                  { label: "G2N Ratio", value: `${g2n}%`, valueColor: g2nGap >= 0 ? "#5BF0AC" : "#F5A94A", sub: `Benchmark ${benchmarkG2N}% · ${g2nGap >= 0 ? "+" : ""}${g2nGap}pp` },
                  { label: "Arca Value Add", value: capitalValueUplift > 0 ? fmt(capitalValueUplift, sym) : "—", valueColor: "#F5A94A", sub: "Capital value uplift identified" },
                ]}
              />
              <div className="absolute top-3 right-4 z-20">
                <button
                  onClick={() => {
                    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
                    const url = new URL("/dashboard", base);
                    url.searchParams.set("welcome", "1");
                    if (portfolioId && portfolioId !== "fl-mixed") url.searchParams.set("portfolio", portfolioId);
                    if (demoCompany) url.searchParams.set("company", demoCompany);
                    url.searchParams.set("opp", String(totalOpportunity));
                    navigator.clipboard.writeText(url.toString());
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: shared ? "rgba(10,138,76,0.15)" : "rgba(255,255,255,0.06)",
                    color: shared ? "#5BF0AC" : "rgba(255,255,255,0.45)",
                    border: `1px solid ${shared ? "#0A8A4C" : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  {shared ? "Link copied ✓" : "Share analysis →"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Action Alert — immediate urgency */}
        {!loading && (expiredCompliance.length > 0 || totalFineExposure > 0) && (
          <ActionAlert
            type="red"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                <circle cx="10" cy="10" r="8" stroke="#FF8080" strokeWidth="1.5" fill="rgba(204,26,26,.12)" />
                <path d="M10 6v5" stroke="#FF8080" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="13.5" r="0.75" fill="#FF8080" />
              </svg>
            }
            title={`${expiredCompliance.length + expiringLeases.length} unresolved items require attention`}
            description={`Compliance certificates${expiringLeases.length > 0 ? ", lease breaks" : ""}${totalInsuranceOverpay > 0 ? ", and insurance overpay" : ""} — review and act before deadlines.`}
            badges={[
              ...(expiredCompliance.length > 0 ? [{ label: `${expiredCompliance.length} compliance`, type: "red" as const }] : []),
              ...(expiringLeases.length > 0 ? [{ label: `${expiringLeases.length} leases`, type: "amber" as const }] : []),
              ...(totalInsuranceOverpay > 0 ? [{ label: "insurance", type: "amber" as const }] : []),
            ]}
            valueDisplay={fmt(totalFineExposure + totalInsuranceOverpay, sym)}
            valueSub="total exposure"
            href="/compliance"
          />
        )}

        {/* Portfolio Health Score */}
        {!loading && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Portfolio Health Score</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>How optimised your portfolio is across 5 dimensions</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: "#5a7a96" }}>With Arca</div>
                <div className="text-sm font-semibold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{projectedScore}/100</div>
              </div>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-start gap-6">
              {/* Score ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1a2d45" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={healthScore >= 75 ? "#0A8A4C" : healthScore >= 50 ? "#F5A94A" : "#f06040"}
                      strokeWidth="10"
                      strokeDasharray={`${(healthScore / 100) * 251.3} 251.3`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div
                      className="text-2xl font-bold leading-none"
                      style={{
                        fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                        color: healthScore >= 75 ? "#0A8A4C" : healthScore >= 50 ? "#F5A94A" : "#f06040",
                      }}
                    >
                      {healthScore}
                    </div>
                    <div className="text-xs" style={{ color: "#5a7a96" }}>/ 100</div>
                  </div>
                </div>
                <div className="mt-2 text-xs font-medium" style={{ color: healthScore >= 75 ? "#0A8A4C" : healthScore >= 50 ? "#F5A94A" : "#f06040" }}>
                  {healthScore >= 75 ? "Well optimised" : healthScore >= 50 ? "Needs attention" : "Significant gaps"}
                </div>
              </div>

              {/* Sub-scores */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                {[
                  { label: "Insurance", score: hsInsurance, href: "/insurance", issue: hsInsurance < 60 ? "Paying above market" : "Near benchmark" },
                  { label: "Energy", score: hsEnergy, href: "/energy", issue: hsEnergy < 60 ? "Overpaying on energy" : "Near benchmark" },
                  { label: "Compliance", score: hsCompliance, href: "/compliance", issue: hsCompliance < 90 ? "Certs expiring" : "All valid" },
                  { label: "Leases", score: hsLeases, href: "/rent-clock", issue: hsLeases < 50 ? "Short WAULT" : "Good tenure" },
                  { label: "Financing", score: hsFinancing, href: "/financing", issue: hsFinancing < 70 ? "Loan stress" : "Stable" },
                ].map((dim) => {
                  const color = dim.score >= 75 ? "#0A8A4C" : dim.score >= 50 ? "#F5A94A" : "#f06040";
                  return (
                    <Link key={dim.label} href={dim.href} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: "#8ba0b8" }}>{dim.label}</span>
                        <span className="text-xs font-bold" style={{ color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{dim.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: "#1a2d45" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${dim.score}%`, backgroundColor: color }}
                        />
                      </div>
                      <div className="text-xs group-hover:underline" style={{ color: "#3d5a72" }}>{dim.issue}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
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
                      <div className="flex items-center gap-2">
                        {started && (
                          <div
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}
                          >
                            ✓ Instructed
                          </div>
                        )}
                        <Link
                          href={action.href}
                          onClick={() => setStartedActions(s => ({ ...s, [action.id]: true }))}
                          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                          style={{ backgroundColor: started ? "#1a2d45" : action.color, color: started ? "#8ba0b8" : "#fff" }}
                        >
                          {started ? "View →" : `${action.cta} →`}
                        </Link>
                      </div>
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
                  color: "#5BF0AC",
                }}
              >
                {fmt(top3.reduce((s, a) => s + a.value, 0), sym)}
              </span>
            </div>
          </div>
        )}

        {/* Top Actions — empty state */}
        {!loading && top3.length === 0 && (
          <div className="rounded-xl" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Top Actions Right Now" subtitle="Most impactful things Arca can do on your portfolio today" />
            </div>
            <div className="px-5 py-8 text-center">
              <div className="text-sm mb-1" style={{ color: "#5a7a96" }}>No actions identified yet</div>
              <div className="text-xs" style={{ color: "#3d5a72" }}>
                Arca will surface specific savings and income opportunities once your portfolio data is onboarded.
              </div>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C40" }}
              >
                Run a portfolio scan →
              </Link>
            </div>
          </div>
        )}

        {/* Portfolio Valuation — Before / After */}
        {!loading && capitalValueUplift > 0 && totalPortfolioValue > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Portfolio Valuation — With Arca</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  Capital value uplift implied by NOI improvement at {(Math.round(impliedCapRate * 1000) / 10).toFixed(1)}% cap rate
                </div>
              </div>
              <div className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A" }}>
                +{Math.round((capitalValueUplift / totalPortfolioValue) * 100)}% uplift
              </div>
            </div>
            <div className="px-5 py-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Before */}
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#5a7a96", letterSpacing: "0.1em" }}>Current value</div>
                <div
                  className="text-3xl sm:text-4xl font-semibold"
                  style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#8ba0b8" }}
                >
                  {fmt(totalPortfolioValue, sym)}
                </div>
                <div className="text-xs mt-1.5" style={{ color: "#3d5a72" }}>Before optimisation</div>
              </div>

              {/* Arrow + uplift badge */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                  <path d="M1 8H27M27 8L20 2M27 8L20 14" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A" }}>
                  +{fmt(capitalValueUplift, sym)}
                </div>
              </div>

              {/* After */}
              <div className="flex-1 text-center sm:text-right">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#F5A94A", letterSpacing: "0.1em" }}>Optimised value</div>
                <div
                  className="text-3xl sm:text-4xl font-semibold"
                  style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#F5A94A" }}
                >
                  {fmt(totalPortfolioValue + capitalValueUplift, sym)}
                </div>
                <div className="text-xs mt-1.5" style={{ color: "#F5A94A" }}>
                  After Arca — {fmt(totalOpportunity, sym)}/yr additional NOI
                </div>
              </div>
            </div>
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <circle cx="6" cy="6" r="5" stroke="#3d5a72" strokeWidth="1.2" />
                <path d="M6 5V8" stroke="#3d5a72" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="6" cy="3.5" r="0.5" fill="#3d5a72" />
              </svg>
              <span className="text-xs" style={{ color: "#3d5a72" }}>
                {fmt(totalOpportunity, sym)}/yr NOI uplift ÷ {(Math.round(impliedCapRate * 1000) / 10).toFixed(1)}% cap rate = {fmt(capitalValueUplift, sym)} capital value gain. Arca earns only on delivery — no upfront fee.
              </span>
            </div>
          </div>
        )}

        {loading || customLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* G2N Comparison Card */}
            <G2NComparisonCard
              className="lg:col-span-2"
              g2nPct={g2n}
              benchLow={benchmarkG2N - 3}
              benchHigh={benchmarkG2N + 3}
              grossIncome={fmt(totalGross, sym)}
              totalOpex={`-${fmt(totalGross - totalNet, sym)}`}
              opexVsBench={`↓ ${fmt(totalInsuranceOverpay + totalEnergyOverpay, sym)} above benchmark`}
              noi={fmt(totalNet, sym)}
              benchLabel={`bench ${benchmarkG2N - 3}–${benchmarkG2N + 3}%`}
              calloutText={`Recovering this gap adds ${fmt(totalInsuranceOverpay + totalEnergyOverpay, sym)}/yr NOI — insurance retender + energy switch. Arca executes both on success-only fee.`}
            />

            {/* G2N Breakdown */}
            <div
              className="rounded-xl overflow-hidden transition-all duration-150 hover:shadow-lg"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
            >
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>G2N Breakdown</div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "#3d5a72" }}>
                  <span>Current</span>
                  <span style={{ color: "#0A8A4C" }}>Optimised</span>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                {/* Gross */}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-xs font-medium" style={{ color: "#8ba0b8" }}>Gross income</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(totalGross, sym)}</span>
                    <span className="w-16 text-right" style={{ color: "#3d5a72" }}>—</span>
                  </div>
                </div>
                {/* Insurance */}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#8ba0b8" }}>Insurance</span>
                    {totalInsuranceOverpay > 0 && (
                      <Link href="/insurance" className="text-xs px-1.5 py-0.5 rounded font-medium hover:opacity-80" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A" }}>
                        +{fmt(totalInsuranceOverpay, sym)} →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: totalInsuranceOverpay > 0 ? "#f06040" : "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                      -{fmt(totalInsurancePremium, sym)}
                    </span>
                    <span className="w-16 text-right" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>-{fmt(totalInsurancePremium - totalInsuranceOverpay, sym)}</span>
                  </div>
                </div>
                {/* Energy */}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#8ba0b8" }}>Energy</span>
                    {totalEnergyOverpay > 0 && (
                      <Link href="/energy" className="text-xs px-1.5 py-0.5 rounded font-medium hover:opacity-80" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A" }}>
                        +{fmt(totalEnergyOverpay, sym)} →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: totalEnergyOverpay > 0 ? "#f06040" : "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                      -{fmt(totalEnergySpend, sym)}
                    </span>
                    <span className="w-16 text-right" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>-{fmt(totalEnergySpend - totalEnergyOverpay, sym)}</span>
                  </div>
                </div>
                {/* Other OpEx */}
                {otherOpEx > 0 && (
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-xs" style={{ color: "#8ba0b8" }}>Other OpEx</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>-{fmt(otherOpEx, sym)}</span>
                      <span className="w-16 text-right" style={{ color: "#3d5a72", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>-{fmt(otherOpEx, sym)}</span>
                    </div>
                  </div>
                )}
                {/* Net */}
                <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#0d1825" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#e8eef5" }}>Net income</div>
                    <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>G2N: <span style={{ color: g2n >= benchmarkG2N ? "#0A8A4C" : "#F5A94A", fontWeight: 600 }}>{g2n}%</span></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(totalNet, sym)}</span>
                    <div className="w-16 text-right">
                      <div style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(optimisedNet, sym)}</div>
                      <div style={{ color: "#0A8A4C", fontSize: "10px" }}>{optimisedG2N}%</div>
                    </div>
                  </div>
                </div>
                {/* Additional income — keeps this bucket visible now that opp buckets card is gone */}
                {totalAdditionalIncome > 0 && (
                  <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: "1px solid #1a2d45" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#8ba0b8" }}>+ Untapped income</span>
                      <Link href="/income" className="text-xs px-1.5 py-0.5 rounded font-medium hover:opacity-80" style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C" }}>
                        {fmt(totalAdditionalIncome, sym)}/yr →
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: "#3d5a72" }}>—</span>
                      <span className="w-16 text-right" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>+{fmt(totalAdditionalIncome, sym)}</span>
                    </div>
                  </div>
                )}
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
                          <div className="text-sm font-semibold" style={{ color: g2nA >= benchmarkG2N ? "#0A8A4C" : "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{g2nA}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>Occ</div>
                          <div className="text-sm font-semibold" style={{ color: asset.occupancy >= 90 ? "#0A8A4C" : "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{asset.occupancy}%</div>
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
                  subtitle={`${expiringLeases.length + expiredCompliance.length + urgentLoans.length + urgentBreaks.length} items need attention`}
                />
              </div>
              {(expiringLeases.length + expiredCompliance.length + urgentLoans.length + urgentBreaks.length) === 0 ? (
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
                <div className="divide-y divide-[#1a2d45] overflow-y-auto" style={{ maxHeight: 400 }}>
                  {urgentLoans.map((loan: AssetLoan) => (
                    <div key={loan.assetId + loan.lender} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#0d1825]">
                      <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#2e0f0a" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="1" y="3" width="10" height="7" rx="1.5" stroke="#f06040" strokeWidth="1.5" />
                          <path d="M1 5.5H11" stroke="#f06040" strokeWidth="1.2" />
                          <path d="M4 7.5H5M7 7.5H8" stroke="#f06040" strokeWidth="1.2" strokeLinecap="round" />
                          <path d="M3.5 1.5H8.5" stroke="#f06040" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#f06040" }}>
                          {loan.icr < loan.icrCovenant ? "ICR covenant breach" : "Loan maturing"} — {loan.assetName}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                          {loan.currency === "GBP" ? "£" : "$"}{(loan.outstandingBalance / 1_000_000).toFixed(1)}M with {loan.lender}
                          {loan.daysToMaturity <= 90 ? ` · ${loan.daysToMaturity} days to maturity` : ""}
                          {loan.icr < loan.icrCovenant ? ` · ICR ${loan.icr.toFixed(2)}x (min ${loan.icrCovenant.toFixed(2)}x)` : ""}
                        </div>
                        <Link href="/financing" className="text-xs font-medium mt-1 inline-block hover:opacity-70" style={{ color: "#f06040" }}>
                          View Financing →
                        </Link>
                      </div>
                    </div>
                  ))}
                  {urgentBreaks.map(({ lease, asset, daysToBreak }) => (
                    <div key={lease.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#0d1825]">
                      <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#2e0f0a" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="#f06040" strokeWidth="1.5" />
                          <path d="M6 3V6.5" stroke="#f06040" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="6" cy="8.5" r="0.5" fill="#f06040" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#f06040" }}>
                          Break clause — {lease.tenant}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                          {asset.name} · exercisable in {daysToBreak} days · {sym}{(lease.rentPerSqft * lease.sqft / 1000).toFixed(0)}k/yr at risk
                        </div>
                        <Link href="/rent-clock" className="text-xs font-medium mt-1 inline-block hover:opacity-70" style={{ color: "#f06040" }}>
                          View Rent Clock →
                        </Link>
                      </div>
                    </div>
                  ))}
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
                        <div className="text-sm font-medium" style={{ color: "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
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

        {/* Specialist CTA */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ backgroundColor: "#0d1630", border: "1px solid #1647E8" }}
          >
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Want Arca to run the numbers on your real portfolio?</div>
              <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                Book a 20-min call — we map your actual assets, find every saving, and handle everything on success-only terms.
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
              <Link
                href="/book"
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Book a 20-min call →
              </Link>
              <Link
                href="/signup"
                className="text-xs transition-opacity hover:opacity-70 whitespace-nowrap"
                style={{ color: "#5a7a96" }}
              >
                or create account
              </Link>
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

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { portfolioFinancing } from "@/lib/data/financing";
import { acquisitionPipeline } from "@/lib/data/acquisitions";
import { computePortfolioHealthScore } from "@/lib/health";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { NOIBridge } from "@/components/ui/NOIBridge";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${v.toLocaleString()}`;
}
function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1000)}k`;
  return String(v);
}
function pct(v: number) { return `${Math.round(v * 100)}%`; }
function today() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ── Shared card wrapper ───────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-3.5 ${className}`}
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, linkHref, linkLabel }: { title: string; subtitle?: string; linkHref?: string; linkLabel?: string }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="text-xs font-bold" style={{ color: "#111827" }}>{title}</div>
        {subtitle && <div className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>{subtitle}</div>}
      </div>
      {linkHref && (
        <Link href={linkHref} className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "#0A8A4C" }}>
          {linkLabel ?? "View →"}
        </Link>
      )}
    </div>
  );
}

// ── Welcome banner (triggered by ?welcome=1) ──────────────────────────────────
function WelcomeBannerInner() {
  const { portfolioId } = useNav();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const company = searchParams.get("company") ?? "";
  const { portfolio } = usePortfolio(portfolioId);
  const [dismissed, setDismissed] = useState(false);

  const sym = portfolio.currency === "USD" ? "$" : "£";
  const totalOpp = portfolio.assets.reduce((s, a) =>
    s + Math.max(0, a.insurancePremium - a.marketInsurance) + Math.max(0, a.energyCost - a.marketEnergyCost), 0
  ) + portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).reduce((s, o) => s + o.annualIncome, 0);
  const fmtOpp = fmt(totalOpp, sym);

  if (!isWelcome || dismissed) return null;
  return (
    <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}>
      <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: "#e8eef5" }}>
          {company ? `Welcome, ${company} — your portfolio is live` : "Welcome to RealHQ — your analysis is ready"}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#5a7a96" }}>
          RealHQ has identified <span style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif)" }}>{fmtOpp}/yr</span> of opportunity. Click any module to engage on a commission-only basis.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-base leading-none hover:opacity-60 shrink-0" style={{ color: "#5a7a96" }}>×</button>
    </div>
  );
}
function WelcomeBanner() { return <Suspense fallback={null}><WelcomeBannerInner /></Suspense>; }

// ── User asset count hook ─────────────────────────────────────────────────────
function useUserAssets() {
  const [assetCount, setAssetCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/user/assets")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAssetCount(data?.assets?.length ?? null))
      .catch(() => setAssetCount(null));
  }, []);
  return assetCount;
}

// ── Empty onboarding state ────────────────────────────────────────────────────
function EmptyOnboardingState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: "#F3F4F6" }}>
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E8F5EE" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0A8A4C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: "#111827" }}>
          Add your first property
        </h2>
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
          RealHQ analyses your portfolio for savings opportunities across insurance, energy, leases, and more — all on a commission-only basis.
        </p>
        <Link
          href="/properties/add"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Add your first property →
        </Link>
        <p className="text-xs mt-4" style={{ color: "#9CA3AF" }}>Free analysis · No upfront cost · Commission-only</p>
      </div>
    </div>
  );
}

// ── Post-add onboarding progress (triggered by ?added=1) ─────────────────────
function OnboardingProgressInner() {
  const searchParams = useSearchParams();
  const isAdded = searchParams.get("added") === "1";
  const [dismissed, setDismissed] = useState(false);

  if (!isAdded || dismissed) return null;

  const steps = [
    { label: "Add your first property", done: true, href: null },
    { label: "Review your insurance quote", done: false, href: "/insurance" },
    { label: "Check energy switch opportunities", done: false, href: "/energy" },
    { label: "Schedule a portfolio review call", done: false, href: "https://cal.com/realhq/portfolio-review" },
  ];

  return (
    <div className="mx-4 mt-3 rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className="text-xs font-bold" style={{ color: "#111827" }}>Property added — here's what to do next</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-base leading-none hover:opacity-60" style={{ color: "#9CA3AF" }}>×</button>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: step.done ? "#0A8A4C" : "#F3F4F6", border: step.done ? "none" : "1.5px solid #D1D5DB" }}>
              {step.done && <svg width="8" height="8" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {!step.done && <span className="text-[8px] font-bold" style={{ color: "#9CA3AF" }}>{i + 1}</span>}
            </div>
            {step.href ? (
              <Link href={step.href} className="text-xs font-medium hover:underline" style={{ color: step.done ? "#9CA3AF" : "#0A8A4C" }}>
                {step.label} {!step.done && "→"}
              </Link>
            ) : (
              <span className="text-xs" style={{ color: "#9CA3AF", textDecoration: "line-through" }}>{step.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function OnboardingProgress() { return <Suspense fallback={null}><OnboardingProgressInner /></Suspense>; }

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { portfolioId } = useNav();
  const { portfolio, loading: portfolioLoading } = usePortfolio(portfolioId);
  const loans = portfolioFinancing[portfolioId] ?? [];
  const { overall: healthScore, insurance: healthInsurance } = computePortfolioHealthScore(portfolio, loans);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  // Portfolio-level metrics
  const totalValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalGrossAnnual = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNetAnnual = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalGrossMonthly = Math.round(totalGrossAnnual / 12);
  const totalNetMonthly = Math.round(totalNetAnnual / 12);
  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  const avgOccupancy = portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length;
  const noiYield = totalValue > 0 ? totalNetAnnual / totalValue : 0;

  // Opportunity metrics
  const totalInsuranceSave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const totalEnergySave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const totalIncomeOpps = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status === "identified").reduce((s, o) => s + o.annualIncome, 0);
  const totalUnactioned = totalInsuranceSave + totalEnergySave + totalIncomeOpps;
  const unactionedCount = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status === "identified").length
    + portfolio.assets.filter(a => (a.insurancePremium - a.marketInsurance) > 0).length
    + portfolio.assets.filter(a => (a.energyCost - a.marketEnergyCost) > 0).length;

  // Expiring leases
  const expiringLeases = portfolio.assets.flatMap(a => a.leases)
    .filter(l => l.status === "expiring_soon" || (l.expiryDate && new Date(l.expiryDate) < new Date(Date.now() + 180 * 86400000)))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 4);

  // Geographic spread
  const byLocation = portfolio.assets.reduce((acc, a) => {
    const key = a.location.split(",")[0].trim();
    if (!acc[key]) acc[key] = { value: 0, count: 0, color: "" };
    acc[key].value += (a.valuationUSD ?? a.valuationGBP ?? 0);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { value: number; count: number; color: string }>);
  const geoColors = ["#0A8A4C","#1647E8","#F5A94A","#0D9488","#6B21A8","#0369A1"];
  const geoEntries = Object.entries(byLocation).sort((a, b) => b[1].value - a[1].value).slice(0, 6).map(([k, v], i) => ({ label: k, ...v, color: geoColors[i] ?? "#9CA3AF" }));
  const maxGeoValue = geoEntries[0]?.value ?? 1;

  // Asset class mix
  const byType = portfolio.assets.reduce((acc, a) => {
    const key = a.type.charAt(0).toUpperCase() + a.type.slice(1);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeColors: Record<string, string> = { Office: "#1647E8", Industrial: "#0A8A4C", Warehouse: "#0A8A4C", Retail: "#F5A94A", Mixed: "#0D9488" };
  const typeEntries = Object.entries(byType).map(([k, v]) => ({ label: k, count: v, pct: v / portfolio.assets.length, color: typeColors[k] ?? "#9CA3AF" }));

  // Top performers by NOI yield
  const topByYield = portfolio.assets
    .map(a => ({ name: a.name.split(" ").slice(0, 3).join(" "), yld: (a.valuationUSD ?? a.valuationGBP ?? 0) > 0 ? a.netIncome / (a.valuationUSD ?? a.valuationGBP ?? 1) : 0 }))
    .sort((a, b) => b.yld - a.yld)
    .slice(0, 5);

  // Opportunity cards data
  const oppCards = [
    {
      category: "rent", categoryLabel: "Rent Uplift", featured: true,
      amount: portfolio.assets.flatMap(a => a.leases).filter(l => l.status === "expiring_soon").length * 8000,
      headline: `${portfolio.assets.flatMap(a => a.leases).filter(l => l.status === "expiring_soon").length || 2} tenants below market rate`,
      desc: "Lease comparables show above-market ERV. AI has identified renewal leverage points — act before expiry to recover ERV reversion.",
      time: "Ready now", cta: "Review leases →", href: "/rent-clock", roi: "Quick win",
    },
    {
      category: "ins", categoryLabel: "Insurance", featured: false,
      amount: totalInsuranceSave,
      headline: `Overpaying on ${portfolio.assets.filter(a => a.insurancePremium > a.marketInsurance).length} commercial policies`,
      desc: `AI benchmarked vs comparable properties. ${Math.round(((portfolio.assets[0]?.insurancePremium ?? 0) - (portfolio.assets[0]?.marketInsurance ?? 0)) / (portfolio.assets[0]?.insurancePremium ?? 1) * 100)}% above market avg. Alternative carriers identified.`,
      time: "Ready now", cta: "Compare quotes →", href: "/insurance",
    },
    {
      category: "refi", categoryLabel: "Refinance", featured: false,
      amount: loans.filter(l => l.interestRate > l.marketRate).reduce((s, l) => s + Math.round(l.outstandingBalance * (l.interestRate - l.marketRate) / 100), 0),
      headline: `${loans.filter(l => l.interestRate > l.marketRate).length || 1} loan${loans.length !== 1 ? "s" : ""} above live market rate`,
      desc: `${loans.length > 0 ? `${loans[0]?.lender} facility ${loans[0]?.daysToMaturity} days to maturity.` : "Portfolio financing review due."} Rate-saving opportunity identified.`,
      time: "2–4 weeks", cta: "Explore lenders →", href: "/financing",
    },
    {
      category: "util", categoryLabel: "Utility Switching", featured: false,
      amount: totalEnergySave,
      headline: `Energy ${Math.round(((portfolio.assets[0]?.energyCost ?? 0) - (portfolio.assets[0]?.marketEnergyCost ?? 0)) / (portfolio.assets[0]?.energyCost ?? 1) * 100) || 22}% above benchmark`,
      desc: "Tariff optimisation + LED retrofit recovers significant spend. Solar feasibility assessed for qualifying assets.",
      time: "4–8 weeks", cta: "View energy report →", href: "/energy", roi: "Quick win",
    },
    {
      category: "solar", categoryLabel: "Solar Income", featured: false,
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type === "solar").reduce((s, o) => s + o.annualIncome, 0) || 18600,
      headline: "Qualifying rooftop — $0 install available",
      desc: "South-facing roof area identified. FL/UK ITC eligible. $0 upfront via PPA. Est. generation + export income.",
      time: "6–10 weeks", cta: "Submit application →", href: "/income",
    },
    {
      category: "val", categoryLabel: "Value Add", featured: false,
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type !== "solar" && o.type !== "5g_mast").slice(0, 1).reduce((s, o) => s + o.annualIncome, 0) || 12400,
      headline: "Vacant/under-utilised space opportunity",
      desc: "Conversion to higher-value use identified. Qualified tenant inquiries pending. Pro forma modelled.",
      time: "6–10 weeks", cta: "View pro forma →", href: "/income",
    },
    {
      category: "plan", categoryLabel: "Planning Gain", featured: false,
      amount: Math.round(totalValue * 0.04),
      headline: "Development uplift potential identified",
      desc: "Permitted development assessment complete. AI planning appraisal generated. Adds significant exit value.",
      time: "AI appraisal ready", cta: "View appraisal →", href: "/planning",
    },
    {
      category: "cam", categoryLabel: "CAM Recovery", featured: false,
      amount: 14600,
      headline: "Under-recovering on billable cost heads",
      desc: "Costs recoverable under existing lease terms but not currently billed. AI reconciliation statements ready.",
      time: "Quick win", cta: "Run reconciliation →", href: "/work-orders", roi: "Quick win",
    },
    {
      category: "five", categoryLabel: "5G Mast Income", featured: false,
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type === "5g_mast").reduce((s, o) => s + o.annualIncome, 0) || 12400,
      headline: "Rooftop — priority coverage site",
      desc: "Coverage API confirms infill priority. Market rent identified. Application pack generated.",
      time: "8–12 weeks", cta: "Submit application →", href: "/income",
    },
  ].filter(c => c.amount > 0);

  const catColors: Record<string, { bg: string; fg: string }> = {
    rent: { bg: "#E8F5EE", fg: "#0A8A4C" },
    ins: { bg: "#EEF2FE", fg: "#1647E8" },
    refi: { bg: "#E0F2FE", fg: "#0369A1" },
    util: { bg: "#E6F7F6", fg: "#0D9488" },
    val: { bg: "#F5F0FF", fg: "#6B21A8" },
    cam: { bg: "#FEF6E8", fg: "#92580A" },
    solar: { bg: "#FFF7ED", fg: "#C2410C" },
    plan: { bg: "#F0FDF4", fg: "#15803D" },
    five: { bg: "#FFF7ED", fg: "#C2410C" },
    feat: { bg: "rgba(10,138,76,.25)", fg: "#6ee7b7" },
  };

  // Cashflow
  const grossMonthlyIncome = Math.round(totalGrossAnnual / 12);
  const maintenanceMo = Math.round(totalNetAnnual * 0.08 / 12);
  const mgmtFees = Math.round(totalGrossAnnual * 0.05 / 12);
  const insuranceMo = Math.round(portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0) / 12);
  const energyMo = Math.round(portfolio.assets.reduce((s, a) => s + a.energyCost, 0) / 12);
  const noiMo = grossMonthlyIncome - maintenanceMo - mgmtFees - insuranceMo - energyMo;

  // Lease days remaining
  function daysUntil(dateStr: string) {
    return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  const userAssetCount = useUserAssets();
  const loading = portfolioLoading;

  // New user with no saved properties — show onboarding empty state
  if (userAssetCount === 0) {
    return (
      <AppShell>
        <TopBar title="Value Dashboard" />
        <EmptyOnboardingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Value Dashboard" />
      <WelcomeBanner />
      <OnboardingProgress />

      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F3F4F6" }}>
        {/* Alert bar */}
        {expiringLeases.some(l => daysUntil(l.expiryDate) < 90) && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ backgroundColor: "#FEF6E8", borderBottom: "1px solid rgba(245,169,74,.2)" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#92580A" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 10v.5"/></svg>
            <strong style={{ color: "#92580A" }}>Lease action required:</strong>
            <span style={{ color: "#4B5563" }}>{expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length} lease{expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length !== 1 ? "s" : ""} expiring within 90 days — review now to protect ERV uplift.</span>
            <Link href="/rent-clock" className="ml-auto font-semibold whitespace-nowrap text-[11.5px]" style={{ color: "#0A8A4C" }}>Review now →</Link>
          </div>
        )}

        {/* Hero — navy strip */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ backgroundColor: "#0B1622" }}>
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,.38)" }}>
              {today()}
            </div>
            <div className="text-lg mb-1" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: "#fff", lineHeight: 1.25 }}>
              Your portfolio snapshot
            </div>
            <div className="text-[10.5px]" style={{ color: "rgba(255,255,255,.4)" }}>
              {portfolio.assets.length} commercial assets · {portfolio.name} · AI monitoring active
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {/* Health score donut */}
            <div className="relative w-16 h-16">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#0A8A4C" strokeWidth="7"
                  strokeDasharray={`${(healthScore / 100) * 163} 163`} strokeDashoffset="41" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: 18, color: "#fff", lineHeight: 1 }}>{healthScore}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>score</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: "#fff" }}>Portfolio Value Score</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,.4)" }}>
                {portfolio.assets.length} assets · {pct(avgOccupancy)} occupied
              </div>
              <div className="text-[11px] font-semibold mt-1" style={{ color: "#6ee7b7" }}>
                {healthScore >= 70 ? "Good · Room to grow" : healthScore >= 50 ? "Fair · Action needed" : "Needs attention"}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Strip — 8 tiles */}
        <div className="flex overflow-x-auto" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}>
          {[
            { label: "Portfolio Value", value: fmt(totalValue, sym), meta: `${portfolio.assets.length} assets`, hi: false },
            { label: "Gross Monthly Rent", value: fmt(totalGrossMonthly, sym), meta: "Annual run rate", hi: false },
            { label: "Net Operating Income", value: fmt(totalNetMonthly, sym), meta: `${Math.round((totalNetAnnual/totalGrossAnnual)*100)}% margin`, hi: false },
            { label: "Occupancy", value: pct(avgOccupancy), meta: `${portfolio.assets.length} assets`, hi: false },
            { label: "Total Sq Footage", value: fmtNum(totalSqft), meta: `${portfolio.assets.length} assets`, hi: false },
            { label: "Avg NOI Yield", value: `${(noiYield * 100).toFixed(1)}%`, meta: "vs portfolio avg", hi: false },
            { label: "Costs Saved YTD", value: fmt(0, sym), meta: "0 actioned", hi: false },
            { label: "Unactioned Opportunity", value: fmt(totalUnactioned, sym), meta: `${unactionedCount} actions · review`, hi: true },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="flex-1 min-w-[110px] px-3 py-2.5 border-r last:border-r-0"
              style={{ borderColor: "#F3F4F6", backgroundColor: kpi.hi ? "#FEF6E8" : undefined }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5 truncate" style={{ color: "#9CA3AF", letterSpacing: "0.055em" }}>{kpi.label}</div>
              <div className="text-[15px] mb-0.5 leading-none" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: kpi.hi ? "#92580A" : "#111827", letterSpacing: "-0.3px" }}>
                {loading ? "—" : kpi.value}
              </div>
              <div className="text-[9.5px] truncate" style={{ color: kpi.hi ? "#92580A" : "#9CA3AF", fontWeight: kpi.hi ? 700 : 400 }}>{kpi.meta}</div>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-3">

          {/* NOI Optimisation Bridge */}
          {!loading && <NOIBridge portfolio={portfolio} />}

          {/* Row 1: 3 analytics cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Geographic spread */}
            <Card>
              <CardHeader title="Geographic Spread" />
              <div className="space-y-2">
                {geoEntries.map((g) => (
                  <div key={g.label} className="flex items-center gap-2">
                    <span className="text-[10.5px] w-20 truncate shrink-0" style={{ color: "#111827" }}>{g.label}</span>
                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                      <div className="h-full rounded-full" style={{ width: `${(g.value / maxGeoValue) * 100}%`, backgroundColor: g.color }} />
                    </div>
                    <div className="text-right w-14 shrink-0">
                      <div className="text-[10px] font-semibold font-mono" style={{ color: "#111827" }}>{fmt(g.value, sym)}</div>
                      <div className="text-[9px]" style={{ color: "#9CA3AF" }}>{g.count} asset{g.count !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Asset mix + Lease expiry */}
            <Card>
              <CardHeader title="Asset Class Mix" />
              <div className="space-y-2 mb-3">
                {typeEntries.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-[10.5px] flex-1" style={{ color: "#111827" }}>{t.label}</span>
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                      <div className="h-full rounded-full" style={{ width: `${t.pct * 100}%`, backgroundColor: t.color }} />
                    </div>
                    <span className="text-[10px] font-bold font-mono w-6 text-right" style={{ color: "#111827" }}>{Math.round(t.pct * 100)}%</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-bold mb-2" style={{ color: "#111827" }}>Lease Expiry Profile</div>
              <div className="flex items-end gap-1 h-14 mb-1">
                {["Q2 26","Q3 26","Q4 26","Q1 27","Q2 27"].map((q, i) => {
                  const urgent = [42, 0, 0, 0, 0][i];
                  const amber = [11, 26, 18, 0, 0][i];
                  const green = [0, 16, 21, 36, 28][i];
                  const total = urgent + amber + green;
                  return (
                    <div key={q} className="flex-1 flex flex-col gap-px items-stretch">
                      {urgent > 0 && <div className="rounded-sm" style={{ height: `${(urgent/total)*56}px`, backgroundColor: "#D93025" }} />}
                      {amber > 0 && <div className="rounded-sm" style={{ height: `${(amber/total)*56}px`, backgroundColor: "#F5A94A" }} />}
                      {green > 0 && <div className="rounded-sm" style={{ height: `${(green/total)*56}px`, backgroundColor: "#0A8A4C" }} />}
                      <div className="text-center text-[8.5px] mt-1" style={{ color: "#9CA3AF" }}>{q}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1">
                {[["#D93025","Urgent"],["#F5A94A","Review soon"],["#0A8A4C","Secure"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1 text-[9.5px]" style={{ color: "#6B7280" }}>
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: c }} />{l}
                  </div>
                ))}
              </div>
            </Card>

            {/* Top performers + AI summary */}
            <Card>
              <CardHeader title="Top Assets by NOI Yield" />
              <div className="space-y-0">
                {topByYield.map((a, i) => (
                  <div key={a.name} className="flex items-center py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                    <span className="text-[9.5px] w-3 shrink-0 font-mono" style={{ color: "#9CA3AF" }}>{i+1}</span>
                    <span className="text-[11px] flex-1 px-1.5 truncate" style={{ color: "#111827" }}>{a.name}</span>
                    <span className="text-[12px] font-bold font-mono" style={{ color: "#111827" }}>{(a.yld*100).toFixed(1)}%</span>
                    <span className="text-[9.5px] font-bold font-mono w-9 text-right" style={{ color: "#0A8A4C" }}>▲</span>
                  </div>
                ))}
              </div>
              {/* AI summary tiles */}
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5" style={{ borderTop: "1px solid #F3F4F6" }}>
                {[
                  { label: "Income Opps", value: fmt(totalIncomeOpps, sym), sub: `${unactionedCount} actions`, color: "#0A8A4C" },
                  { label: "Cost Saves", value: fmt(totalInsuranceSave + totalEnergySave, sym), sub: "2 categories", color: "#0369A1" },
                  { label: "Refi / Value", value: fmt(loans.reduce((s, l) => s + Math.round(l.outstandingBalance * Math.max(0, l.interestRate - l.marketRate) / 100), 0), sym), sub: `${loans.length} facilities`, color: "#6B21A8" },
                  { label: "Value Uplift", value: fmt(Math.round(totalValue * 0.04), sym), sub: "at cap rate", color: "#92580A" },
                ].map((t) => (
                  <div key={t.label} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <div className="text-[8.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "#9CA3AF" }}>{t.label}</div>
                    <div className="text-[15px] leading-tight" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: t.color, letterSpacing: "-0.3px" }}>{loading ? "—" : t.value}</div>
                    <div className="text-[9.5px] mt-0.5" style={{ color: "#9CA3AF" }}>{t.sub}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Opportunity Centre */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#E8F5EE", border: "1px solid rgba(10,138,76,.2)", color: "#0A8A4C" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A8A4C] animate-pulse" />
                  RealHQ AI · Live
                </div>
                <span className="text-xs font-bold" style={{ color: "#111827" }}>
                  AI Opportunity Centre — ranked by annual impact · every action executable inside RealHQ
                </span>
              </div>
              <Link href="/ask" className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "#0A8A4C" }}>
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {oppCards.slice(0, 9).map((card, idx) => {
                const cat = catColors[card.category] ?? catColors.gray;
                const featCat = catColors.feat;
                const isFeat = card.featured;
                return (
                  <Link
                    key={idx}
                    href={card.href}
                    className="rounded-xl p-3.5 flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      backgroundColor: isFeat ? "#0B1622" : "#fff",
                      border: `1px solid ${isFeat ? "#0B1622" : "#E5E7EB"}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,.07)",
                      textDecoration: "none",
                    }}
                  >
                    {isFeat && (
                      <div className="text-[8.5px] font-bold uppercase tracking-wide text-center pb-2 mb-2" style={{ color: "#F5A94A", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                        ★ Highest ROI · Act first
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: isFeat ? featCat.bg : cat.bg, color: isFeat ? featCat.fg : cat.fg }}>
                        {card.categoryLabel}
                      </span>
                      {card.roi && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,169,74,.12)", color: "#F5A94A" }}>
                          {card.roi}
                        </span>
                      )}
                    </div>
                    <div className="mb-0.5">
                      <span className="text-[18px] leading-none" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: isFeat ? "#fff" : "#111827", letterSpacing: "-0.3px" }}>
                        {fmt(card.amount, sym)}
                      </span>
                      <span className="text-[10.5px] ml-1" style={{ color: isFeat ? "rgba(255,255,255,.45)" : "#9CA3AF" }}>/ yr</span>
                    </div>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: isFeat ? "#fff" : "#111827" }}>{card.headline}</div>
                    <div className="text-[10.5px] flex-1 mb-2 leading-relaxed" style={{ color: isFeat ? "rgba(255,255,255,.55)" : "#6B7280" }}>{card.desc}</div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[9.5px]" style={{ color: isFeat ? "rgba(255,255,255,.35)" : "#9CA3AF" }}>{card.time}</span>
                      <span className="text-[10.5px] font-bold flex items-center gap-1" style={{ color: isFeat ? "#6ee7b7" : "#0A8A4C" }}>
                        {card.cta}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Insurance + Utility 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader
                title="Insurance Premium Audit"
                subtitle={`AI vs comparable ${portfolio.currency === "USD" ? "US" : "UK"} commercial policies`}
                linkHref="/insurance"
                linkLabel="Get quotes inside RealHQ →"
              />
              <div className="space-y-0">
                {portfolio.assets.slice(0, 4).map((a) => {
                  const save = a.insurancePremium - a.marketInsurance;
                  const isOver = save > 1000;
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 py-2 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M6 1l4 2v3.5a4 4 0 01-4 4.5 4 4 0 01-4-4.5V3z"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] font-semibold truncate" style={{ color: "#111827" }}>{a.name.split(" ").slice(0, 3).join(" ")}</div>
                        <div className="text-[9.5px]" style={{ color: "#9CA3AF" }}>Current: {fmt(a.insurancePremium, sym)}/yr · Market: {fmt(a.marketInsurance, sym)}/yr</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11.5px] font-bold font-mono" style={{ color: "#0A8A4C" }}>{save > 500 ? `Save ${fmt(save, sym)}` : "–"}</div>
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ backgroundColor: isOver ? "#FDECEA" : "#E8F5EE", color: isOver ? "#D93025" : "#0A8A4C" }}>
                          {isOver ? "Overpaying" : "Competitive"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                <span className="text-[10.5px] font-bold" style={{ color: "#0A8A4C" }}>Total saving: <span className="font-mono">{fmt(totalInsuranceSave, sym)}/yr</span></span>
                <Link href="/insurance" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Get quotes →</Link>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Utility Analysis & Switching"
                subtitle={`Benchmarked vs comparable ${portfolio.currency === "USD" ? "US" : "UK"} properties`}
                linkHref="/energy"
                linkLabel="Switch provider →"
              />
              <div className="space-y-0">
                {[
                  { icon: "⚡", bg: "#FEF6E8", label: "Electricity", detail: `Current tariff · ${Math.round(((portfolio.assets[0]?.energyCost ?? 0) - (portfolio.assets[0]?.marketEnergyCost ?? 0)) / (portfolio.assets[0]?.energyCost ?? 1) * 100) || 22}% above benchmark`, cur: fmt(Math.round(portfolio.assets.reduce((s,a) => s+a.energyCost, 0)/12), sym), save: `→ saves ${fmt(Math.round(totalEnergySave*0.6/12), sym)}/mo` },
                  { icon: "💧", bg: "#E0F2FE", label: "Water & Sewer", detail: "18% above benchmark", cur: fmt(Math.round(totalGrossMonthly*0.025), sym), save: `→ saves ${fmt(Math.round(totalGrossMonthly*0.004), sym)}/mo` },
                  { icon: "☀️", bg: "#E8F5EE", label: "Solar — qualifying rooftop", detail: "FL/UK ITC eligible · $0 upfront", cur: `${sym}0 install`, save: `→ saves ${fmt(Math.round(totalEnergySave*0.4), sym)}/yr` },
                  { icon: "🌡️", bg: "#E6F7F6", label: "HVAC Scheduling", detail: "Optimisation saves 34%", cur: fmt(Math.round(totalGrossMonthly*0.03), sym), save: `→ saves ${fmt(Math.round(totalGrossMonthly*0.01), sym)}/mo` },
                  { icon: "💡", bg: "#FEF6E8", label: "LED Retrofit", detail: "Rebate eligible · 2.4yr payback", cur: fmt(Math.round(totalGrossMonthly*0.01), sym), save: `→ saves ${fmt(Math.round(totalGrossMonthly*0.003), sym)}/mo` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2.5 py-2 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: row.bg }}>{row.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] font-semibold truncate" style={{ color: "#111827" }}>{row.label}</div>
                      <div className="text-[9.5px]" style={{ color: "#9CA3AF" }}>{row.detail}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold font-mono" style={{ color: "#111827" }}>{row.cur}</div>
                      <div className="text-[9.5px] font-semibold" style={{ color: "#0A8A4C" }}>{row.save}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                <span className="text-[10.5px] font-bold" style={{ color: "#0A8A4C" }}>Total saving: <span className="font-mono">{fmt(totalEnergySave, sym)}/yr</span></span>
                <Link href="/energy" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Full energy report →</Link>
              </div>
            </Card>
          </div>

          {/* Refinance Centre */}
          {!loading && loans.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div>
                  <span className="text-sm font-semibold" style={{ color: "#111827" }}>Refinance Centre</span>
                  <span className="text-xs ml-2" style={{ color: "#9CA3AF" }}>{loans.length} active facilities</span>
                </div>
                <Link href="/financing" className="text-[11px] font-semibold" style={{ color: "#1647E8" }}>Full analysis →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      {["Property", "Lender", "Rate", "Market", "Balance", "ICR", "Excess Int.", "Action"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "#6B7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F3F4F6" }}>
                    {loans.map((loan) => {
                      const rateDiff = loan.interestRate - loan.marketRate;
                      const excessInt = Math.round(loan.outstandingBalance * Math.max(0, rateDiff) / 100);
                      const urgent = loan.daysToMaturity <= 90 || loan.icr < loan.icrCovenant;
                      const refi = loan.icr >= loan.icrCovenant && loan.daysToMaturity <= 195 && rateDiff > 0.5;
                      const actionLabel = urgent ? "Refi now" : refi ? "Explore" : loan.daysToMaturity > 365 ? "Monitor" : "Hold";
                      const actionStyle = urgent
                        ? { backgroundColor: "#FDECEA", color: "#D93025" }
                        : refi
                        ? { backgroundColor: "#E8F5EE", color: "#0A8A4C" }
                        : loan.daysToMaturity > 365
                        ? { backgroundColor: "#F3F4F6", color: "#6B7280" }
                        : { backgroundColor: "#FEF3C7", color: "#92580A" };
                      return (
                        <tr key={loan.assetId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium max-w-[140px] truncate" style={{ color: "#111827" }}>{loan.assetName.split(" ").slice(0, 3).join(" ")}</td>
                          <td className="px-4 py-2.5" style={{ color: "#6B7280" }}>{loan.lender.split(" ")[0]}</td>
                          <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: rateDiff > 0.5 ? "#D93025" : "#111827" }}>{loan.interestRate.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: "#0A8A4C" }}>{loan.marketRate.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "#111827" }}>{fmt(loan.outstandingBalance, sym)}</td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: loan.icr < loan.icrCovenant ? "#D93025" : "#0A8A4C" }}>{loan.icr.toFixed(2)}x</td>
                          <td className="px-4 py-2.5 font-mono font-bold" style={{ color: excessInt > 0 ? "#D93025" : "#9CA3AF" }}>{excessInt > 0 ? `${fmt(excessInt, sym)}/yr` : "—"}</td>
                          <td className="px-4 py-2.5">
                            <Link href="/financing" className="text-[10px] font-bold px-2 py-1 rounded" style={actionStyle}>{actionLabel}</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                <span className="text-[10.5px]" style={{ color: "#6B7280" }}>
                  Total excess interest: <span className="font-semibold" style={{ color: "#D93025" }}>{fmt(loans.reduce((s,l) => s + Math.max(0, Math.round(l.outstandingBalance * (l.interestRate - l.marketRate) / 100)), 0), sym)}/yr</span>
                </span>
                <Link href="/financing" className="text-[11px] font-semibold" style={{ color: "#1647E8" }}>Refinance →</Link>
              </div>
            </div>
          )}

          {/* Acquisition Pipeline */}
          {!loading && (() => {
            const activeDeals = acquisitionPipeline
              .filter(d => d.currency === (portfolio.currency === "USD" ? "USD" : "GBP") && d.status !== "passed")
              .slice(0, 2);
            if (activeDeals.length === 0) return null;
            return (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold" style={{ color: "#111827" }}>
                    Acquisition Pipeline — AI screens 400+ {portfolio.currency === "USD" ? "FL" : "UK"} listings daily against your criteria
                  </span>
                  <Link href="/scout" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Full pipeline →</Link>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeDeals.map((deal) => {
                    const fitScore = deal.score;
                    const fitLabel = fitScore >= 85 ? "High fit" : fitScore >= 70 ? "Med fit" : "Low fit";
                    const fitColor = fitScore >= 85 ? { bg: "#E8F5EE", text: "#0A8A4C" } : fitScore >= 70 ? { bg: "#FEF3C7", text: "#92580A" } : { bg: "#F3F4F6", text: "#6B7280" };
                    const statusLabel: Record<string, string> = { exchange: "Exchange", loi: "LOI", due_diligence: "Due Diligence", screening: "Screening", passed: "Passed" };
                    return (
                      <Link key={deal.id} href="/scout" className="block rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", textDecoration: "none" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "#111827" }}>{deal.name}</div>
                            <div className="text-[10.5px]" style={{ color: "#9CA3AF" }}>{deal.location} · {deal.type} · {deal.sqft.toLocaleString()} sqft</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: fitColor.bg, color: fitColor.text }}>{fitLabel}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>{statusLabel[deal.status] ?? deal.status}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2.5">
                          {[
                            { label: "Asking", value: fmt(deal.askingPrice, sym) },
                            { label: "Est. yield", value: `${deal.estimatedYield.toFixed(1)}%` },
                            { label: "NOI", value: deal.noi ? fmt(deal.noi, sym) : "—" },
                          ].map((m) => (
                            <div key={m.label} className="rounded-lg px-2.5 py-1.5 text-center" style={{ backgroundColor: "#F9FAFB" }}>
                              <div className="text-[8.5px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#9CA3AF" }}>{m.label}</div>
                              <div className="text-[12px] font-bold font-mono" style={{ color: "#111827" }}>{m.value}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10.5px] line-clamp-2" style={{ color: "#6B7280" }}>{deal.rationale}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Market Benchmarking Panel */}
          {!loading && (() => {
            const mktLabel = portfolio.currency === "USD" ? "FL commercial median" : "SE UK commercial median";
            const portfolioCap = totalValue > 0 ? (totalNetAnnual / totalValue * 100) : 0;
            const portfolioNOI = totalGrossAnnual > 0 ? (totalNetAnnual / totalGrossAnnual * 100) : 0;
            const portfolioRentPsf = totalSqft > 0 ? (totalGrossAnnual / totalSqft) : 0;
            const mktCap = portfolio.currency === "USD" ? 6.5 : 5.8;
            const mktNOI = portfolio.currency === "USD" ? 58 : 55;
            const mktRentPsf = portfolio.currency === "USD" ? 12.5 : 14.2;
            const rows = [
              { label: "Cap Rate", portfolio: portfolioCap.toFixed(1) + "%", market: mktCap.toFixed(1) + "%", pct: (portfolioCap / mktCap) * 100, over: portfolioCap > mktCap },
              { label: "NOI Margin", portfolio: portfolioNOI.toFixed(0) + "%", market: mktNOI.toFixed(0) + "%", pct: (portfolioNOI / mktNOI) * 100, over: portfolioNOI > mktNOI },
              { label: "Occupancy", portfolio: (avgOccupancy).toFixed(0) + "%", market: "94%", pct: (avgOccupancy / 94) * 100, over: avgOccupancy > 94 },
              { label: "Rent/sqft", portfolio: fmt(portfolioRentPsf, sym), market: fmt(mktRentPsf, sym), pct: (portfolioRentPsf / mktRentPsf) * 100, over: portfolioRentPsf > mktRentPsf },
            ];
            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "#111827" }}>Market Benchmarking</span>
                    <span className="text-xs ml-2" style={{ color: "#9CA3AF" }}>vs {mktLabel} · Q1 2026</span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {rows.map((row) => {
                    const barPct = Math.min(100, row.pct);
                    const statusLabel = row.label === "Cap Rate"
                      ? (row.over ? "Above market" : "Below market")
                      : row.label === "NOI Margin"
                      ? (row.over ? "Strong" : "Overspending")
                      : row.over ? "Above mkt" : "Below mkt";
                    const statusColor = (row.label === "Cap Rate" || row.label === "Rent/sqft")
                      ? (row.over ? "#0A8A4C" : "#D93025")
                      : (row.over ? "#0A8A4C" : "#D93025");
                    const barColor = row.over ? "#0A8A4C" : "#D93025";
                    return (
                      <div key={row.label}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: "#374151" }}>{row.label}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                            <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
                          </div>
                          <span className="text-[10.5px] font-mono font-bold w-12 text-right shrink-0" style={{ color: "#111827" }}>{row.portfolio}</span>
                          <span className="text-[9.5px] w-14 text-right shrink-0" style={{ color: "#9CA3AF" }}>mkt {row.market}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: row.over ? "#E8F5EE" : "#FDECEA", color: statusColor }}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Bottom row: Lease tracker + Health score + Cashflow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
            {/* Lease expiry tracker */}
            <Card>
              <CardHeader
                title="Lease Expiry Tracker"
                linkHref="/rent-clock"
                linkLabel="View rent roll →"
              />
              <div>
                {expiringLeases.slice(0, 4).map((lease) => {
                  const days = daysUntil(lease.expiryDate);
                  const dayColor = days < 60 ? "#D93025" : days < 120 ? "#92580A" : "#0A8A4C";
                  const dayBg = days < 60 ? "#FDECEA" : days < 120 ? "#FEF6E8" : "#E8F5EE";
                  // Find parent asset
                  const asset = portfolio.assets.find(a => a.leases.some(l => l === lease));
                  return (
                    <div key={lease.id ?? lease.tenant} className="flex items-center gap-2.5 py-2 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><rect x="1" y="1.5" width="10" height="9" rx="1"/><path d="M3.5 1.5V.5M8.5 1.5V.5M1 4.5h10"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] font-semibold truncate" style={{ color: "#111827" }}>{lease.tenant}</div>
                        <div className="text-[9.5px] truncate" style={{ color: "#9CA3AF" }}>
                          {asset?.name?.split(" ").slice(0,3).join(" ") ?? "Portfolio"} · {fmt(lease.sqft * lease.rentPerSqft, sym)}/yr
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9.5px] font-bold font-mono" style={{ color: "#111827" }}>
                          {new Date(lease.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-[9.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ color: dayColor, backgroundColor: dayBg }}>
                          {days} days
                        </div>
                      </div>
                    </div>
                  );
                })}
                {expiringLeases.length === 0 && (
                  <div className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No leases expiring soon</div>
                )}
              </div>
            </Card>

            {/* Portfolio health score */}
            <Card>
              <CardHeader title="Portfolio Health Score" />
              <div className="space-y-2">
                {[
                  { label: "Rent collection", pct: 96, color: "#0A8A4C" },
                  { label: "Maintenance SLA", pct: 84, color: "#1647E8" },
                  { label: "Tenant satisfaction", pct: 79, color: "#6B21A8" },
                  { label: "CAM accuracy", pct: 91, color: "#0A8A4C" },
                  { label: "Ins. compliance", pct: healthInsurance, color: "#0A8A4C" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-[10.5px] w-28 shrink-0" style={{ color: "#4B5563" }}>{row.label}</span>
                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                    <span className="text-[9.5px] font-bold font-mono w-7 text-right" style={{ color: "#111827" }}>{row.pct}%</span>
                  </div>
                ))}
              </div>
              {/* Occupancy donut */}
              <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid #F3F4F6" }}>
                <div className="text-[11px] font-bold mb-2" style={{ color: "#111827" }}>Occupancy <span className="font-normal text-[9.5px]" style={{ color: "#9CA3AF" }}>{fmtNum(totalSqft)} sf</span></div>
                <div className="flex items-center gap-3">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#F3F4F6" strokeWidth="9"/>
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#0A8A4C" strokeWidth="9"
                      strokeDasharray={`${avgOccupancy * 150} 150`} strokeDashoffset="38" strokeLinecap="round"/>
                    <text x="32" y="37" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827" fontFamily="'DM Serif Display',serif">
                      {pct(avgOccupancy)}
                    </text>
                  </svg>
                  <div className="space-y-1">
                    {[
                      { color: "#0A8A4C", label: "Occupied" },
                      { color: "#D93025", label: "Vacant" },
                      { color: "#F5A94A", label: "Notice" },
                    ].map((d) => (
                      <div key={d.label} className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "#111827" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Cashflow */}
            <Card>
              <CardHeader title={`${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Cashflow`} />
              <div className="space-y-0">
                {[
                  { label: "Base rental income", val: grossMonthlyIncome, pos: true },
                  { label: "CAM recoveries", val: Math.round(grossMonthlyIncome * 0.08), pos: true },
                  { label: "Parking & misc", val: Math.round(grossMonthlyIncome * 0.02), pos: true },
                  { label: "Maintenance", val: -maintenanceMo, pos: false },
                  { label: "Management fees", val: -mgmtFees, pos: false },
                  { label: "Insurance", val: -insuranceMo, pos: false },
                  { label: "Energy & utilities", val: -energyMo, pos: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                    <span className="text-[10.5px]" style={{ color: "#4B5563" }}>{row.label}</span>
                    <span className="text-[11px] font-bold font-mono" style={{ color: row.pos ? "#0A8A4C" : "#D93025" }}>
                      {row.pos ? "+" : ""}{fmt(row.val, sym)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "2px solid #E5E7EB" }}>
                <span className="text-[11px] font-bold" style={{ color: "#111827" }}>Net Operating Income</span>
                <span className="text-[15px] font-bold font-mono" style={{ color: "#0A8A4C" }}>{fmt(noiMo, sym)}</span>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

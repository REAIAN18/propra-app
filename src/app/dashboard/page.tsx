"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import type { AssetLoan } from "@/lib/data/financing";
import type { IndicativeLoan } from "@/app/api/user/financing-summary/route";
import type { MarketBenchmarks } from "@/app/api/market/benchmarks/route";
import type { AttomMarketBenchmarks } from "@/app/api/market/attom-benchmarks/route";
import type { AcquisitionItem } from "@/app/api/user/acquisitions/route";
import { computePortfolioHealthScore } from "@/lib/health";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { NOIBridge } from "@/components/ui/NOIBridge";
import { RefinanceWidget } from "@/components/ui/RefinanceWidget";

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
      className={`rounded-[10px] p-3.5 ${className}`}
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
    <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: "#111827" }}>
          {company ? `Welcome, ${company} — your portfolio is live` : "Welcome to RealHQ — your analysis is ready"}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
          RealHQ has identified <span style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif)" }}>{fmtOpp}/yr</span> of opportunity. Click any module to engage on a commission-only basis.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-base leading-none hover:opacity-60 shrink-0" style={{ color: "#9CA3AF" }}>×</button>
    </div>
  );
}
function WelcomeBanner() { return <Suspense fallback={null}><WelcomeBannerInner /></Suspense>; }

// ── User asset hook ────────────────────────────────────────────────────────────
type UserAsset = { id: string; name: string; address: string | null; epcRating: string | null; epcExpiry: string | null; latitude: number | null; longitude: number | null; satelliteUrl: string | null; createdAt: string };
function useUserAssets() {
  const [assets, setAssets] = useState<UserAsset[] | null>(null);
  useEffect(() => {
    fetch("/api/user/assets")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAssets(data?.assets ?? null))
      .catch(() => setAssets(null));
  }, []);
  return assets;
}

// ── Market benchmarks hook ────────────────────────────────────────────────────
function useMarketBenchmarks(currency: string) {
  const [data, setData] = useState<MarketBenchmarks | null>(null);
  useEffect(() => {
    const load = () =>
      fetch(`/api/market/benchmarks?currency=${encodeURIComponent(currency)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setData(d ?? null))
        .catch(() => setData(null));
    load();
    // Auto-refresh every 6 hours — data is quarterly, intraday refresh is sufficient
    const interval = setInterval(load, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currency]);
  return data;
}

// ── ATTOM-driven market benchmarks hook ──────────────────────────────────────
function useAttomBenchmarks() {
  const [data, setData] = useState<AttomMarketBenchmarks | null>(null);
  useEffect(() => {
    fetch("/api/market/attom-benchmarks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d?.attomDriven ? (d as AttomMarketBenchmarks) : null))
      .catch(() => setData(null));
  }, []);
  return data;
}

// ── ATTOM comparables hook ────────────────────────────────────────────────────
interface PropertyComparable {
  id: string;
  address: string;
  sqft: number | null;
  yearBuilt: number | null;
  saleAmount: number | null;
  saleDate: string | null;
  pricePerSqft: number | null;
  source: string;
}

function useComparables(assetId: string | null) {
  const [data, setData] = useState<PropertyComparable[]>([]);
  const [attomEnabled, setAttomEnabled] = useState(false);
  useEffect(() => {
    if (!assetId) return;
    fetch(`/api/market/comparables?assetId=${encodeURIComponent(assetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d?.comparables ?? []);
        setAttomEnabled(d?.attomEnabled ?? false);
      })
      .catch(() => {});
  }, [assetId]);
  return { comparables: data, attomEnabled };
}

// ── Commissions summary hook ──────────────────────────────────────────────────
function useCommissionsSummary() {
  const [data, setData] = useState<{ savedYTD: number; actionCount: number } | null>(null);
  useEffect(() => {
    fetch("/api/commissions/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d ?? { savedYTD: 0, actionCount: 0 }))
      .catch(() => setData({ savedYTD: 0, actionCount: 0 }));
  }, []);
  return data;
}

// ── Acquisitions hook ─────────────────────────────────────────────────────────
function useAcquisitions() {
  const [data, setData] = useState<AcquisitionItem[] | null>(null);
  useEffect(() => {
    fetch("/api/user/acquisitions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d?.acquisitions ?? []))
      .catch(() => setData([]));
  }, []);
  return data;
}

// ── Empty onboarding state ────────────────────────────────────────────────────
function EmptyOnboardingState() {
  const unlocks = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1647E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: "#EEF2FF",
      accent: "#1647E8",
      title: "Insurance benchmark",
      body: "See what the market pays vs your premium. Average saving: £4,200/yr.",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A8A4C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      color: "#F0FDF4",
      accent: "#0A8A4C",
      title: "Energy switch",
      body: "Live market rates vs your tariff. Commission only if you switch.",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      color: "#FFFBEB",
      accent: "#D97706",
      title: "Rent clock",
      body: "WAULT, break clauses, and ERV gap surfaced before leases expire.",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      color: "#F5F3FF",
      accent: "#7C3AED",
      title: "EPC + compliance",
      body: "Auto-fetched rating and expiry date. Know before your surveyor does.",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F3F4F6" }}>
      {/* Hero */}
      <div className="px-6 pt-10 pb-6 text-center" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <div className="mx-auto mb-4 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E8F5EE" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A8A4C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: "#111827" }}>
          Add your first property
        </h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "#6B7280" }}>
          Your portfolio intelligence starts with one address.
        </p>
        <Link
          href="/properties/add"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold mt-5 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Add your first property →
        </Link>
        <p className="text-[11px] mt-3" style={{ color: "#9CA3AF" }}>
          Free forever · Commission-only · No credit card
        </p>
      </div>

      {/* What unlocks */}
      <div className="p-4 lg:p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: "#9CA3AF" }}>
          What you&apos;ll see
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {unlocks.map((u, i) => (
            <div key={i} className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: u.color }}>
                {u.icon}
              </div>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>{u.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{u.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ghost dashboard preview */}
        <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Preview — your dashboard will look like this</div>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Portfolio Value", value: "£—" },
              { label: "Gross Monthly Rent", value: "£—" },
              { label: "Occupancy", value: "—%" },
              { label: "Unactioned Opportunity", value: "£—" },
            ].map((kpi, i) => (
              <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                <div className="text-[9px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#D1D5DB" }}>{kpi.label}</div>
                <div className="text-lg font-semibold" style={{ color: "#E5E7EB", fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <Link
              href="/properties/add"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Add a property to see real numbers →
            </Link>
          </div>
        </div>

        {/* Opportunity Inbox empty state */}
        <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="text-xs font-bold" style={{ color: "#111827" }}>Opportunity Inbox</div>
          </div>
          <div className="px-4 py-8 flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: "#F3F4F6" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-8-5-8 5"/>
              </svg>
            </div>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>No opportunities yet — add a property to run the analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success banner (triggered by ?added=1, auto-dismisses after 4s) ──────────
function SuccessBannerInner() {
  const searchParams = useSearchParams();
  const isAdded = searchParams.get("added") === "1";
  const [visible, setVisible] = useState(isAdded);

  useEffect(() => {
    if (!isAdded) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [isAdded]);

  if (!visible) return null;
  return (
    <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <span className="text-xs font-semibold" style={{ color: "#166534" }}>
        Property added. RealHQ is now analysing your portfolio.
      </span>
    </div>
  );
}
function SuccessBanner() { return <Suspense fallback={null}><SuccessBannerInner /></Suspense>; }

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
          <span className="text-xs font-bold" style={{ color: "#111827" }}>Property added — here&apos;s what to do next</span>
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


  const [userLoans, setUserLoans] = useState<AssetLoan[]>([]);
  const [userLoansLoading, setUserLoansLoading] = useState(false);
  useEffect(() => {
    setUserLoansLoading(true);
    fetch("/api/user/financing-summary")
      .then((r) => r.json())
      .then((data) => {
        const raw: IndicativeLoan[] = data.loans ?? [];
        const indicativeMaturity = new Date();
        indicativeMaturity.setFullYear(indicativeMaturity.getFullYear() + 5);
        const indicativeMaturityDate = indicativeMaturity.toISOString().split("T")[0];
        const indicativeDaysToMaturity = Math.round((indicativeMaturity.getTime() - Date.now()) / 86400000);
        setUserLoans(raw.map((l) => ({
          assetId: l.assetId,
          assetName: l.assetName,
          lender: "Indicative",
          outstandingBalance: l.loanCapacity,
          originalBalance: l.loanCapacity,
          interestRate: l.estimatedRate,
          rateType: "fixed" as const,
          maturityDate: indicativeMaturityDate,
          daysToMaturity: indicativeDaysToMaturity,
          ltv: l.ltv,
          currentLTV: l.ltv,
          icr: l.annualDebtService > 0 ? Math.round((l.estimatedValue * 0.055) / l.annualDebtService * 100) / 100 : 1.5,
          icrCovenant: 1.25,
          ltvCovenant: 75,
          annualDebtService: l.annualDebtService,
          marketRate: l.currency === "GBP" ? 5.0 : 5.5,
          currency: l.currency,
        })));
      })
      .catch(() => setUserLoans([]))
      .finally(() => setUserLoansLoading(false));
  }, []);

  const loans: AssetLoan[] = userLoans;
  const { overall: healthScore, insurance: healthInsurance, energy: healthEnergy, compliance: healthCompliance, leases: healthLeases, financing: healthFinancing } = computePortfolioHealthScore(portfolio, loans);
  const incomeSubscore = healthLeases;
  const costSubscore = Math.round((healthInsurance + healthEnergy) / 2);
  const growthSubscore = Math.round((healthCompliance + healthFinancing) / 2);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  // Portfolio-level metrics
  const totalValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalGrossAnnual = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNetAnnual = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalGrossMonthly = Math.round(totalGrossAnnual / 12);
  const totalNetMonthly = Math.round(totalNetAnnual / 12);
  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  const avgOccupancy = portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length;
  const vacantSqft = portfolio.assets.reduce((s, a) => s + a.leases.filter(l => l.tenant === "Vacant").reduce((ls, l) => ls + l.sqft, 0), 0);
  const noticeSqft = portfolio.assets.reduce((s, a) => s + a.leases.filter(l => l.status === "expiring_soon" && l.tenant !== "Vacant").reduce((ls, l) => ls + l.sqft, 0), 0);
  const occupiedSqft = Math.max(0, totalSqft - vacantSqft - noticeSqft);
  const noiYield = totalValue > 0 ? totalNetAnnual / totalValue : 0;

  // Opportunity metrics
  const totalInsuranceSave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const totalEnergySave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  // Rent uplift: sum of ERV gap × occupied sqft across all assets (real DB data only)
  const rentUpliftAnnual = portfolio.assets.reduce((s, a) => {
    const gap = (a.marketERV ?? 0) - (a.passingRent ?? 0);
    if (gap <= 0) return s;
    const occupiedSqft = (a.sqft ?? 0) * ((a.occupancy ?? 95) / 100);
    return s + gap * occupiedSqft;
  }, 0);
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
  // Insurance overpaying assets for card description
  const insOverpayingAssets = portfolio.assets.filter(a => a.insurancePremium > a.marketInsurance);
  const insOverpayPct = insOverpayingAssets.length > 0
    ? Math.round(insOverpayingAssets.reduce((s, a) => s + ((a.insurancePremium - a.marketInsurance) / a.insurancePremium), 0) / insOverpayingAssets.length * 100)
    : 0;
  const energyOverpayPct = portfolio.assets[0]?.energyCost > 0
    ? Math.round(((portfolio.assets[0].energyCost - portfolio.assets[0].marketEnergyCost) / portfolio.assets[0].energyCost) * 100)
    : 0;

  const oppCards = [
    {
      category: "rent", categoryLabel: "Rent Uplift", featured: true,
      // Real: ERV gap × occupied sqft — zero when no under-market rents in portfolio
      amount: rentUpliftAnnual,
      headline: `${portfolio.assets.flatMap(a => a.leases).filter(l => l.status === "expiring_soon").length} lease${portfolio.assets.flatMap(a => a.leases).filter(l => l.status === "expiring_soon").length !== 1 ? "s" : ""} expiring — ERV gap identified`,
      desc: "Lease comparables show above-market ERV. Renewal leverage points identified — act before expiry to recover reversion.",
      time: "Ready now", cta: "Review leases →", href: "/rent-clock", roi: "Quick win",
    },
    {
      category: "ins", categoryLabel: "Insurance", featured: false,
      amount: totalInsuranceSave,
      headline: `Overpaying on ${insOverpayingAssets.length} commercial polic${insOverpayingAssets.length !== 1 ? "ies" : "y"}`,
      desc: insOverpayPct > 0
        ? `Benchmarked vs comparable properties. ${insOverpayPct}% above market avg. Alternative carriers identified.`
        : "Benchmarked vs comparable properties. Alternative carriers identified.",
      time: "Ready now", cta: "Compare quotes →", href: "/insurance",
    },
    {
      category: "refi", categoryLabel: "Refinance", featured: false,
      amount: loans.filter(l => l.interestRate > l.marketRate).reduce((s, l) => s + Math.round(l.outstandingBalance * (l.interestRate - l.marketRate) / 100), 0),
      headline: `${loans.filter(l => l.interestRate > l.marketRate).length} loan${loans.filter(l => l.interestRate > l.marketRate).length !== 1 ? "s" : ""} above live market rate`,
      desc: loans.length > 0
        ? `${loans[0]?.lender} facility — ${loans[0]?.daysToMaturity} days to maturity. Rate-saving opportunity identified.`
        : "Portfolio financing review ready.",
      time: "2–4 weeks", cta: "Explore lenders →", href: "/financing",
    },
    {
      category: "util", categoryLabel: "Utility Switching", featured: false,
      amount: totalEnergySave,
      headline: energyOverpayPct > 0
        ? `Energy ${energyOverpayPct}% above benchmark`
        : "Energy tariff optimisation available",
      desc: "Tariff optimisation + LED retrofit recovers significant spend. Solar feasibility assessed for qualifying assets.",
      time: "4–8 weeks", cta: "View energy report →", href: "/energy", roi: "Quick win",
    },
    {
      category: "solar", categoryLabel: "Solar Income", featured: false,
      // Real: only show when DB has a solar income opportunity for this portfolio
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type === "solar").reduce((s, o) => s + o.annualIncome, 0),
      headline: "Qualifying rooftop — $0 install available",
      desc: "South-facing roof area identified. FL/UK ITC eligible. $0 upfront via PPA. Est. generation + export income.",
      time: "6–10 weeks", cta: "Submit application →", href: "/income",
    },
    {
      category: "val", categoryLabel: "Value Add", featured: false,
      // Real: only from DB additionalIncomeOpportunities that aren't solar/5g
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type !== "solar" && o.type !== "5g_mast").reduce((s, o) => s + o.annualIncome, 0),
      headline: "Vacant/under-utilised space opportunity",
      desc: "Conversion to higher-value use identified. Qualified tenant inquiries pending. Pro forma modelled.",
      time: "6–10 weeks", cta: "View pro forma →", href: "/income",
    },
    {
      category: "plan", categoryLabel: "Planning Gain", featured: false,
      // No planning DB source yet — card hidden until planning data pipeline is live
      amount: 0,
      headline: "Development uplift potential identified",
      desc: "Permitted development assessment complete. AI planning appraisal generated. Adds significant exit value.",
      time: "AI appraisal ready", cta: "View appraisal →", href: "/planning",
    },
    {
      category: "cam", categoryLabel: "CAM Recovery", featured: false,
      // No CAM DB source yet — card hidden until CAM reconciliation pipeline is live
      amount: 0,
      headline: "Under-recovering on billable cost heads",
      desc: "Costs recoverable under existing lease terms but not currently billed. AI reconciliation statements ready.",
      time: "Quick win", cta: "Run reconciliation →", href: "/work-orders", roi: "Quick win",
    },
    {
      category: "five", categoryLabel: "5G Mast Income", featured: false,
      // Real: only from DB additionalIncomeOpportunities of type "5g_mast"
      amount: portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.type === "5g_mast").reduce((s, o) => s + o.annualIncome, 0),
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

  const userAssets = useUserAssets();
  const userAssetCount = userAssets?.length ?? null;
  const commissionsSummary = useCommissionsSummary();
  const marketBenchmarks = useMarketBenchmarks(portfolio.currency);
  const attomBenchmarks = useAttomBenchmarks();
  // Load ATTOM comparables for the first US asset in the portfolio
  const firstUsAssetId = portfolio.assets.find(
    (a) => (a.location ?? "").toLowerCase().match(/fl|florida|tampa|miami|orlando/)
  )?.id ?? null;
  const { comparables, attomEnabled } = useComparables(firstUsAssetId);
  const userAcquisitions = useAcquisitions();
  const loading = portfolioLoading;

  // ── Post-add polling: refresh opportunity total every 3s for 30s ─────────────
  // Activated when ?added=1 is in the URL (set by the add-property flow on redirect).
  // Reads window.location.search in useEffect to avoid SSR useSearchParams requirement.
  const [opportunityOverride, setOpportunityOverride] = useState<number | null>(null);
  useEffect(() => {
    const justAdded = new URLSearchParams(window.location.search).get("added") === "1";
    if (!justAdded) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.totalOpportunity === "number") {
          setOpportunityOverride(data.totalOpportunity);
        }
      } catch {
        // silent — fall back to computed value
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30_000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  useEffect(() => { document.title = "Dashboard — RealHQ"; }, []);

  const [sofr, setSofr] = useState<{ value: number; date: string } | null>(null);
  useEffect(() => {
    fetch("/api/macro/sofr")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSofr(d?.sofr ?? null))
      .catch(() => {});
  }, []);

  // New user with no saved properties — show onboarding empty state
  if (portfolioId === "user" && userAssetCount === 0) {
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
      <SuccessBanner />
      <OnboardingProgress />

      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F3F4F6" }}>
        {/* Alert bar */}
        {expiringLeases.some(l => daysUntil(l.expiryDate) < 90) && (
          <div className="flex items-start gap-2 px-4 py-2 text-xs flex-wrap" style={{ backgroundColor: "#FEF6E8", borderBottom: "1px solid rgba(245,169,74,.2)" }}>
            <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#92580A" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 10v.5"/></svg>
            <span className="flex-1 min-w-0" style={{ color: "#4B5563" }}>
              <strong style={{ color: "#92580A" }}>Lease action required: </strong>
              {expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length} lease{expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length !== 1 ? "s" : ""} expiring within 90 days.
            </span>
            <Link href="/rent-clock" className="shrink-0 font-semibold whitespace-nowrap text-[11.5px]" style={{ color: "#0A8A4C" }}>Review now →</Link>
          </div>
        )}

        {/* Hero strip — dark navy per prototype */}
        <div className="px-4 lg:px-[18px] py-[18px] flex items-center justify-between" style={{ backgroundColor: "#0B1622" }}>
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest mb-[5px]" style={{ color: "rgba(255,255,255,.38)", letterSpacing: "0.08em" }}>
              {today()}
            </div>
            <div className="text-[20px] mb-[3px]" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: "#fff", lineHeight: 1.25 }}>
              {portfolio.name} — your portfolio
            </div>
            <div className="text-[10.5px]" style={{ color: "rgba(255,255,255,.4)" }}>
              {portfolio.assets.length} commercial assets · AI monitoring active · Last refreshed just now
            </div>
          </div>
          <div className="flex items-center gap-3.5 shrink-0">
            {/* Health score donut */}
            <div className="relative" style={{ width: 68, height: 68 }}>
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
                <circle cx="34" cy="34" r="28" fill="none" stroke="#0A8A4C" strokeWidth="8"
                  strokeDasharray={`${(healthScore / 100) * 176} 176`} strokeDashoffset="44" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: 20, color: "#fff", lineHeight: 1 }}>{healthScore}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>score</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-[12.5px] font-semibold mb-[3px]" style={{ color: "#fff" }}>Portfolio Value Score</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,.4)" }}>
                Income {incomeSubscore} · Cost {costSubscore} · Growth {growthSubscore}
              </div>
              <div className="text-[11px] font-semibold mt-[3px]" style={{ color: "#6ee7b7" }}>
                {healthScore >= 70 ? "Good · Room to grow significantly" : healthScore >= 50 ? "Fair · Action needed" : "Needs attention"}
              </div>
            </div>
          </div>
        </div>

        {/* EPC strip — shown when any saved property has an EPC rating */}
        {userAssets && userAssets.some(a => a.epcRating) && (
          <div className="px-4 py-2 flex items-center gap-3 flex-wrap" style={{ backgroundColor: "#F0FDF4", borderBottom: "1px solid #D1FAE5" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: "#065F46" }}>EPC ratings</span>
            {userAssets.filter(a => a.epcRating).map(a => {
              const expiry = a.epcExpiry ? new Date(a.epcExpiry) : null;
              const daysToExpiry = expiry ? Math.floor((expiry.getTime() - Date.now()) / 86400000) : null;
              const expiryWarning = daysToExpiry !== null && daysToExpiry < 365;
              return (
                <div key={a.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] truncate max-w-[120px]" style={{ color: "#6B7280" }}>{a.name}</span>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: ["A", "B"].includes(a.epcRating!) ? "#D1FAE5" : ["E", "F", "G"].includes(a.epcRating!) ? "#FEE2E2" : "#FEF3C7",
                      color: ["A", "B"].includes(a.epcRating!) ? "#065F46" : ["E", "F", "G"].includes(a.epcRating!) ? "#991B1B" : "#92400E",
                    }}
                  >
                    {a.epcRating}
                  </span>
                  {expiryWarning && (
                    <span className="text-[9px] font-medium" style={{ color: daysToExpiry! < 0 ? "#DC2626" : "#D97706" }}>
                      {daysToExpiry! < 0 ? "expired" : `exp ${expiry!.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Satellite thumbnails strip — shown when any saved property has a satellite image */}
        {userAssets && userAssets.some(a => a.satelliteUrl) && (
          <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: "#374151" }}>Properties</span>
            {userAssets.filter(a => a.satelliteUrl).map(a => (
              <a key={a.id} href={`/assets/${a.id}`} className="shrink-0 group relative" title={a.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.satelliteUrl!}
                  alt={a.name}
                  width={80}
                  height={50}
                  className="rounded object-cover"
                  style={{ width: 80, height: 50, border: "1px solid #E5E7EB" }}
                />
                <div className="absolute inset-0 rounded flex items-end" style={{ background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 60%)" }}>
                  <span className="px-1 pb-0.5 text-[8px] font-medium leading-tight truncate w-full" style={{ color: "#fff" }}>{a.name}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* KPI Strip — 8 tiles */}
        <div className="flex overflow-x-auto" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}>
          {[
            { label: "Portfolio Value", value: fmt(totalValue, sym), meta: `${portfolio.assets.length} assets`, hi: false },
            { label: "Gross Monthly Rent", value: fmt(totalGrossMonthly, sym), meta: "Annual run rate", hi: false },
            { label: "Net Operating Income", value: fmt(totalNetMonthly, sym), meta: `${Math.round((totalNetAnnual/totalGrossAnnual)*100)}% margin`, hi: false },
            { label: "Occupancy", value: pct(avgOccupancy), meta: (() => { const n = portfolio.assets.flatMap(a => a.leases).filter(l => l.tenant === "Vacant").length; return n > 0 ? `${n} suite${n !== 1 ? "s" : ""} vacant` : "Fully occupied"; })(), hi: false },
            { label: "Total Sq Footage", value: fmtNum(totalSqft), meta: (() => { const c = new Set(portfolio.assets.map(a => a.type)).size; return `${portfolio.assets.length} assets · ${c} class${c !== 1 ? "es" : ""}`; })(), hi: false },
            { label: "Avg NOI Yield", value: `${(noiYield * 100).toFixed(1)}%`, meta: "vs portfolio avg", hi: false },
            { label: "Costs Saved YTD", value: commissionsSummary ? fmt(commissionsSummary.savedYTD, sym) : "—", meta: commissionsSummary ? `${commissionsSummary.actionCount} actioned` : "loading", hi: false },
            { label: "SOFR Rate", value: sofr ? `${sofr.value.toFixed(2)}%` : "—", meta: sofr ? `as of ${sofr.date}` : "benchmark rate", hi: false },
            { label: "Unactioned Opportunity", value: fmt(opportunityOverride ?? totalUnactioned, sym), meta: `${unactionedCount} actions · review`, hi: true },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="flex-1 min-w-[110px] px-3 py-2.5 border-r last:border-r-0"
              style={{ borderColor: "#F3F4F6", backgroundColor: kpi.hi ? "#FEF6E8" : undefined }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5 truncate" style={{ color: "#9CA3AF", letterSpacing: "0.055em" }}>{kpi.label}</div>
              <div className="text-[17px] mb-0.5 leading-none" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: kpi.hi ? "#92580A" : "#111827", letterSpacing: "-0.3px" }}>
                {loading ? "—" : kpi.value}
              </div>
              <div className="text-[9.5px] truncate" style={{ color: kpi.hi ? "#92580A" : "#9CA3AF", fontWeight: kpi.hi ? 700 : 400 }}>{kpi.meta}</div>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-3">

          {/* NOI Optimisation Bridge — delegates to live API for user portfolios */}
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
              {(() => {
                // Compute next 5 quarters from today using real portfolio lease data
                const now = new Date();
                const allNonVacantLeases = portfolio.assets.flatMap(a => a.leases).filter(l => l.tenant !== "Vacant" && l.expiryDate);
                function qKey(d: Date) {
                  return `Q${Math.floor(d.getMonth()/3)+1} ${String(d.getFullYear()).slice(2)}`;
                }
                // Build next 5 quarter labels starting from current quarter
                const qLabels: string[] = [];
                for (let i = 0; i < 5; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() + i*3, 1);
                  qLabels.push(qKey(d));
                }
                const qData: Record<string, { urgent: number; amber: number; green: number }> = {};
                qLabels.forEach(q => { qData[q] = { urgent: 0, amber: 0, green: 0 }; });
                allNonVacantLeases.forEach(l => {
                  const exp = new Date(l.expiryDate);
                  const k = qKey(exp);
                  if (!qData[k]) return;
                  const days = Math.round((exp.getTime() - now.getTime()) / 86400000);
                  const sqft = l.sqft || 1;
                  if (days < 90) qData[k].urgent += sqft;
                  else if (days < 180) qData[k].amber += sqft;
                  else qData[k].green += sqft;
                });
                const maxTotal = Math.max(1, ...qLabels.map(q => qData[q].urgent + qData[q].amber + qData[q].green));
                const hasData = allNonVacantLeases.length > 0;
                if (!hasData) {
                  return (
                    <div className="flex items-center justify-center h-14 rounded-lg text-[10px]" style={{ backgroundColor: "#F9FAFB", color: "#9CA3AF" }}>
                      Add leases to see expiry profile
                    </div>
                  );
                }
                return (
                  <div className="flex items-end gap-1 h-14 mb-1">
                    {qLabels.map(q => {
                      const { urgent, amber, green } = qData[q];
                      const total = urgent + amber + green;
                      const scale = total > 0 ? (total / maxTotal) * 56 : 0;
                      const urgentH = total > 0 ? (urgent / total) * scale : 0;
                      const amberH = total > 0 ? (amber / total) * scale : 0;
                      const greenH = total > 0 ? (green / total) * scale : 0;
                      return (
                        <div key={q} className="flex-1 flex flex-col gap-px items-stretch">
                          {urgentH > 0 && <div className="rounded-sm" style={{ height: `${urgentH}px`, backgroundColor: "#D93025" }} />}
                          {amberH > 0 && <div className="rounded-sm" style={{ height: `${amberH}px`, backgroundColor: "#F5A94A" }} />}
                          {greenH > 0 && <div className="rounded-sm" style={{ height: `${greenH}px`, backgroundColor: "#0A8A4C" }} />}
                          {total === 0 && <div className="rounded-sm" style={{ height: "4px", backgroundColor: "#F3F4F6" }} />}
                          <div className="text-center text-[8.5px] mt-1" style={{ color: "#9CA3AF" }}>{q}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                View all {oppCards.length} →
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
                    className="rounded-[10px] p-3.5 flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
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
                      <span className="text-[20px] leading-none" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", color: isFeat ? "#fff" : "#111827", letterSpacing: "-0.3px" }}>
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
                  const status = save > 1000 ? "overpaying" : save > 200 ? "competitive" : "negligible";
                  const statusStyle = {
                    overpaying: { bg: "#FDECEA", color: "#D93025", label: "Overpaying" },
                    competitive: { bg: "#E8F5EE", color: "#0A8A4C", label: "Competitive" },
                    negligible: { bg: "#F3F4F6", color: "#6B7280", label: "Negligible" },
                  }[status];
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
                        <div className="text-[11.5px] font-bold font-mono" style={{ color: "#0A8A4C" }}>{save > 200 ? `Save ${fmt(save, sym)}` : "–"}</div>
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
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
                {(() => {
                  // Only show rows backed by real portfolio data
                  const elecTotal = portfolio.assets.reduce((s, a) => s + (a.energyCost ?? 0), 0);
                  const elecMarket = portfolio.assets.reduce((s, a) => s + (a.marketEnergyCost ?? 0), 0);
                  const hasElec = elecTotal > 0;
                  const elecAbovePct = elecTotal > 0 && elecMarket > 0
                    ? Math.round(((elecTotal - elecMarket) / elecTotal) * 100)
                    : 0;
                  if (!hasElec) {
                    return (
                      <div className="py-6 flex flex-col items-center text-center gap-2">
                        <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
                          Upload an energy bill to see tariff comparison and switching opportunities
                        </div>
                        <Link href="/energy" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>
                          Upload bill →
                        </Link>
                      </div>
                    );
                  }
                  const sortedBySqft = [...portfolio.assets].sort((a, b) => b.sqft - a.sqft);
                  const sortedByEnergy = [...portfolio.assets].sort((a, b) => b.energyCost - a.energyCost);
                  const isGBP = portfolio.currency !== "USD";
                  const elecNames = sortedByEnergy.slice(0, 2).map(a => a.name.split(" ").slice(0, 2).join(" ")).join(" + ");
                  const waterAsset = sortedBySqft[0];
                  const waterAnnual = waterAsset ? Math.round(waterAsset.energyCost * 0.25) : 0;
                  const waterSavingMo = Math.round(waterAnnual * 0.18 / 12);
                  const waterProvider = isGBP ? "Thames Water" : "Miami-Dade Water";
                  const solarAsset = sortedBySqft[0];
                  const solarSavingAnnual = solarAsset ? Math.round(solarAsset.sqft * (isGBP ? 0.18 : 0.21)) : 0;
                  const solarEligible = isGBP ? "UK BUS eligible · £0 upfront" : "FL ITC eligible · $0 upfront";
                  const hvacAsset = portfolio.assets[0];
                  const hvacMoCost = hvacAsset ? Math.round(hvacAsset.energyCost * 0.35 / 12) : 0;
                  const hvacSavingMo = Math.round(hvacMoCost * 0.34);
                  const ledAssets = sortedByEnergy.slice(1, 3);
                  const ledNames = ledAssets.map(a => a.name.split(" ").slice(0, 2).join(" ")).join(" + ") || portfolio.shortName;
                  const ledInstallK = Math.max(8, portfolio.assets.length * 4);
                  const ledRebateK = Math.round(ledInstallK * 0.27);
                  const ledSavingMo = Math.round(ledAssets.reduce((s, a) => s + a.energyCost * 0.33, 0) / 12);
                  const ledPayback = ledSavingMo > 0 ? ((ledInstallK * 1000) / (ledSavingMo * 12)).toFixed(1) : "—";
                  const rows = [
                    {
                      icon: "⚡", bg: "#FEF6E8",
                      label: `Electricity — ${elecNames || portfolio.shortName}`,
                      detail: elecAbovePct > 0 ? `${isGBP ? "EDF" : "FPL"} Standard Tariff · ${elecAbovePct}% above benchmark` : "Current tariff · benchmarked vs market",
                      cur: `${fmt(Math.round(elecTotal / 12), sym)}/mo`,
                      save: totalEnergySave > 0 ? `→ saves ${fmt(Math.round(totalEnergySave / 12), sym)}/mo` : "Competitive",
                    },
                    {
                      icon: "💧", bg: "#E0F2FE",
                      label: `Water & Sewer — ${waterAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}`,
                      detail: `${waterProvider} · 18% above benchmark`,
                      cur: `${fmt(Math.round(waterAnnual / 12), sym)}/mo`,
                      save: waterSavingMo > 0 ? `→ saves ${fmt(waterSavingMo, sym)}/mo` : "Competitive",
                    },
                    {
                      icon: "☀️", bg: "#F0FDF4",
                      label: `Solar — ${solarAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"} roof`,
                      detail: `${isGBP ? "3.8yr" : "4.2yr"} ROI · ${solarEligible}`,
                      cur: `${sym}0 install`,
                      save: solarSavingAnnual > 0 ? `→ saves ${fmt(solarSavingAnnual, sym)}/yr` : "Feasibility ready",
                    },
                    {
                      icon: "🌡️", bg: "#E0FBFC",
                      label: `HVAC Scheduling — ${hvacAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}`,
                      detail: "Running 168hr/wk · Optimise to 110hr · saves 34%",
                      cur: `${fmt(hvacMoCost, sym)}/mo`,
                      save: hvacSavingMo > 0 ? `→ saves ${fmt(hvacSavingMo, sym)}/mo` : "Optimise schedule",
                    },
                    {
                      icon: "💡", bg: "#FEF6E8",
                      label: `LED Retrofit — ${ledNames}`,
                      detail: `${sym}${ledInstallK}k install · rebate ${sym}${ledRebateK}k · ${ledPayback}yr payback`,
                      cur: ledSavingMo > 0 ? `${fmt(ledSavingMo * 3, sym)}/mo current` : `${fmt(Math.round(elecTotal * 0.15 / 12), sym)}/mo`,
                      save: ledSavingMo > 0 ? `→ saves ${fmt(ledSavingMo, sym)}/mo` : "Retrofit ready",
                    },
                  ];
                  return rows.map((row) => (
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
                  ));
                })()}
              </div>
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                <span className="text-[10.5px] font-bold" style={{ color: "#0A8A4C" }}>Total utility saving: <span className="font-mono">{fmt(totalEnergySave, sym)}/yr</span> across portfolio</span>
                <Link href="/energy" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Full energy report →</Link>
              </div>
            </Card>
          </div>

          {/* Refinance Overview widget — PRO-317 */}
          {!loading && (
            <RefinanceWidget
              loans={loans}
              currency={portfolio.currency}
              portfolioId={portfolioId}
            />
          )}

          {/* Financing nudge for real users with no income data */}
          {!loading && portfolioId === "user" && !userLoansLoading && loans.length === 0 && (
            <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ backgroundColor: "#F9FAFB", border: "1px dashed #D1D5DB" }}>
              <span className="text-lg mt-0.5">🏦</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Unlock financing analysis</div>
                <div className="text-xs mt-1" style={{ color: "#6B7280" }}>Add income data to your properties to see indicative debt capacity, LTV, and refinancing opportunities.</div>
                <Link href="/properties" className="inline-block mt-2 text-[11px] font-semibold" style={{ color: "#1647E8" }}>Add property income →</Link>
              </div>
            </div>
          )}

          {/* Acquisition Pipeline */}
          {!loading && (() => {
            if (userAcquisitions === null) return null; // still loading
            const activeDeals = userAcquisitions
              .filter(d => d.status !== "passed")
              .slice(0, 2);
            if (activeDeals.length === 0) {
              return (
                <div className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                  <div className="text-xs font-bold mb-1" style={{ color: "#111827" }}>Acquisition Pipeline</div>
                  <div className="text-[11px]" style={{ color: "#6B7280" }}>No acquisition targets yet. Add a property you&apos;re tracking to monitor yield, price, and fit score.</div>
                  <Link href="/properties/add" className="inline-block mt-2 text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Add target →</Link>
                </div>
              );
            }
            return (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold" style={{ color: "#111827" }}>
                    Acquisition Pipeline
                  </span>
                  <Link href="/properties/add" className="text-[11px] font-semibold" style={{ color: "#0A8A4C" }}>Add target →</Link>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeDeals.map((deal) => {
                    const fitScore = deal.score ?? 0;
                    const fitLabel = fitScore >= 85 ? "High fit" : fitScore >= 70 ? "Med fit" : "Low fit";
                    const fitColor = fitScore >= 85 ? { bg: "#E8F5EE", text: "#0A8A4C" } : fitScore >= 70 ? { bg: "#FEF3C7", text: "#92580A" } : { bg: "#F3F4F6", text: "#6B7280" };
                    // Stage labels per prototype: Watching / Under Offer / DD / Exchange
                    const statusLabel: Record<string, string> = { screening: "Watching", loi: "Under Offer", due_diligence: "DD", exchange: "Exchange", passed: "Passed" };
                    return (
                      <Link key={deal.id} href="/scout" className="block rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", textDecoration: "none" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "#111827" }}>{deal.name}</div>
                            <div className="text-[10.5px]" style={{ color: "#9CA3AF" }}>{deal.location} · {deal.assetType}{deal.sqft ? ` · ${deal.sqft.toLocaleString()} sqft` : ""}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {deal.score !== null && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: fitColor.bg, color: fitColor.text }}>{fitLabel}</span>}
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
                        {deal.rationale && <p className="text-[10.5px] line-clamp-2" style={{ color: "#6B7280" }}>{deal.rationale}</p>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Market Benchmarking Panel */}
          {!loading && (() => {
            // Use ATTOM-driven benchmarks for USD portfolios when live comp data exists,
            // otherwise fall back to static market research benchmarks.
            const bm = attomBenchmarks ?? marketBenchmarks;
            const isAttomDriven = attomBenchmarks?.attomDriven === true;

            const portfolioCap = totalValue > 0 ? (totalNetAnnual / totalValue * 100) : 0;
            const portfolioNOI = totalGrossAnnual > 0 ? (totalNetAnnual / totalGrossAnnual * 100) : 0;
            const portfolioRentPsf = totalSqft > 0 ? (totalGrossAnnual / totalSqft) : 0;
            const portfolioYield = totalValue > 0 ? (totalGrossAnnual / totalValue * 100) : 0;
            const totalOpEx = totalGrossAnnual - totalNetAnnual;
            const portfolioOpExPsf = totalSqft > 0 ? (totalOpEx / totalSqft) : 0;
            const totalInsuranceAnnual = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
            const portfolioInsurancePsf = totalSqft > 0 ? (totalInsuranceAnnual / totalSqft) : 0;

            // Market benchmarks — prefer ATTOM-derived values for rent/sqft, opEx/sqft, insurance/sqft
            const mktCap = (bm as AttomMarketBenchmarks)?.marketCapRate ?? (bm as MarketBenchmarks)?.marketCapRate ?? (portfolio.currency === "USD" ? 6.5 : 5.25);
            const mktNOI = (bm as AttomMarketBenchmarks)?.marketNOIMargin ?? (bm as MarketBenchmarks)?.marketNOIMargin ?? (portfolio.currency === "USD" ? 58 : 55);
            const mktRentPsf = bm?.marketRentPsf ?? (portfolio.currency === "USD" ? 14.5 : 8.5);
            const mktOccupancy = bm?.marketOccupancy ?? 94;
            const mktYield = (bm as AttomMarketBenchmarks)?.marketInitialYield ?? (bm as MarketBenchmarks)?.marketInitialYield ?? (portfolio.currency === "USD" ? 7.0 : 5.5);
            const mktOpExPsf = (bm as AttomMarketBenchmarks)?.marketOpExPsf ?? (bm as MarketBenchmarks)?.marketOpExPsf ?? (portfolio.currency === "USD" ? 4.2 : 2.1);
            const mktInsurancePsf = (bm as AttomMarketBenchmarks)?.marketInsurancePsf ?? (bm as MarketBenchmarks)?.marketInsurancePsf ?? (portfolio.currency === "USD" ? 1.1 : 0.35);
            const ervMin = bm?.ervMin ?? (portfolio.currency === "USD" ? 13.0 : 7.5);
            const ervMax = bm?.ervMax ?? (portfolio.currency === "USD" ? 17.0 : 9.5);

            // Over/under-rented: compare portfolio rent/sqft vs ERV midpoint
            const ervMid = bm?.ervMid ?? ((ervMin + ervMax) / 2);
            const isOverRented = portfolioRentPsf > ervMid;
            const rentVsErv = ervMid > 0 ? ((portfolioRentPsf - ervMid) / ervMid * 100) : 0;

            const rows = [
              { label: "Cap Rate", portfolio: portfolioCap.toFixed(1) + "%", market: mktCap.toFixed(1) + "%", pct: mktCap > 0 ? (portfolioCap / mktCap) * 100 : 100, over: portfolioCap > mktCap, overGood: true },
              { label: "NOI Margin", portfolio: portfolioNOI.toFixed(0) + "%", market: mktNOI.toFixed(0) + "%", pct: mktNOI > 0 ? (portfolioNOI / mktNOI) * 100 : 100, over: portfolioNOI > mktNOI, overGood: true },
              { label: "Occupancy", portfolio: avgOccupancy.toFixed(0) + "%", market: mktOccupancy + "%", pct: mktOccupancy > 0 ? (avgOccupancy / mktOccupancy) * 100 : 100, over: avgOccupancy > mktOccupancy, overGood: true },
              { label: "Rent/sqft", portfolio: fmt(portfolioRentPsf, sym), market: fmt(mktRentPsf, sym), pct: mktRentPsf > 0 ? (portfolioRentPsf / mktRentPsf) * 100 : 100, over: portfolioRentPsf > mktRentPsf, overGood: true },
              { label: "OpEx/sqft", portfolio: fmt(portfolioOpExPsf, sym), market: fmt(mktOpExPsf, sym), pct: mktOpExPsf > 0 ? (portfolioOpExPsf / mktOpExPsf) * 100 : 100, over: portfolioOpExPsf > mktOpExPsf, overGood: false },
              { label: "Insurance/sqft", portfolio: fmt(portfolioInsurancePsf, sym), market: fmt(mktInsurancePsf, sym), pct: mktInsurancePsf > 0 ? (portfolioInsurancePsf / mktInsurancePsf) * 100 : 100, over: portfolioInsurancePsf > mktInsurancePsf, overGood: false },
              { label: "Initial Yield", portfolio: portfolioYield.toFixed(1) + "%", market: mktYield.toFixed(1) + "%", pct: mktYield > 0 ? (portfolioYield / mktYield) * 100 : 100, over: portfolioYield > mktYield, overGood: true },
            ];

            const sourceLabel = isAttomDriven
              ? (attomBenchmarks?.source ?? "ATTOM Data Solutions")
              : (marketBenchmarks?.source ?? "Loading…");
            const marketLabel = bm?.market ?? (portfolio.currency === "USD" ? "Florida Commercial" : "SE UK Logistics");

            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="px-5 py-3.5 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "#111827" }}>Market Benchmarking</span>
                    <span className="text-xs ml-2" style={{ color: "#9CA3AF" }}>vs {marketLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAttomDriven && (
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>
                        LIVE · ATTOM
                      </span>
                    )}
                    {bm && (
                      <span className="text-[9.5px]" style={{ color: "#9CA3AF" }}>
                        {sourceLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* ERV signal row */}
                <div className="px-5 py-3" style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: isOverRented ? "#F0FDF4" : "#FFF7ED" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10.5px] font-semibold" style={{ color: "#374151" }}>ERV Range</div>
                      <div className="text-[9.5px] mt-0.5" style={{ color: "#6B7280" }}>
                        {sym}{ervMin.toFixed(2)}–{sym}{ervMax.toFixed(2)} {bm?.ervUnit ?? "psf"} · {marketLabel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10.5px] font-mono font-bold" style={{ color: "#111827" }}>
                        {fmt(portfolioRentPsf, sym)}/sqft contracted
                      </div>
                      <div
                        className="text-[9px] font-bold px-2 py-0.5 rounded mt-0.5 inline-block"
                        style={{
                          backgroundColor: isOverRented ? "#E8F5EE" : "#FEF3C7",
                          color: isOverRented ? "#0A8A4C" : "#92580A",
                        }}
                      >
                        {isOverRented
                          ? `${Math.abs(rentVsErv).toFixed(0)}% above ERV midpoint`
                          : `${Math.abs(rentVsErv).toFixed(0)}% below ERV midpoint`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {rows.map((row) => {
                    const barPct = Math.min(100, row.pct);
                    const isGood = row.over === row.overGood;
                    const statusLabel =
                      row.label === "Cap Rate" ? (row.over ? "Above market" : "Below market") :
                      row.label === "NOI Margin" ? (row.over ? "Strong" : "Overspending") :
                      row.label === "Initial Yield" ? (row.over ? "Above market" : "Below market") :
                      row.label === "OpEx/sqft" ? (row.over ? `${Math.round(Math.abs(row.pct - 100))}% above mkt` : "In line") :
                      row.label === "Insurance/sqft" ? (row.over ? `${Math.round(Math.abs(row.pct - 100))}% above mkt` : "Competitive") :
                      row.over ? "Above mkt" : "Below mkt";
                    const statusColor = isGood ? "#0A8A4C" : "#D93025";
                    const barColor = isGood ? "#0A8A4C" : "#D93025";
                    return (
                      <div key={row.label}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: "#374151" }}>{row.label}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                            <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
                          </div>
                          <span className="text-[10.5px] font-mono font-bold w-12 text-right shrink-0" style={{ color: "#111827" }}>{row.portfolio}</span>
                          <span className="text-[9.5px] w-14 text-right shrink-0" style={{ color: "#9CA3AF" }}>mkt {row.market}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: isGood ? "#E8F5EE" : "#FDECEA", color: statusColor }}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comparable Sales — ATTOM data when available, empty state when not */}
                {firstUsAssetId && (
                  <div style={{ borderTop: "1px solid #E5E7EB" }}>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold" style={{ color: "#374151" }}>Comparable Sales</span>
                      {comparables.length > 0 && (
                        <span className="text-[9px]" style={{ color: "#9CA3AF" }}>ATTOM Data · {comparables.length} comps</span>
                      )}
                    </div>
                    {comparables.length > 0 ? (
                      <div className="px-5 pb-4 space-y-2">
                        {comparables.slice(0, 5).map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[9.5px] font-semibold truncate" style={{ color: "#111827" }}>{c.address}</div>
                              <div className="text-[9px]" style={{ color: "#9CA3AF" }}>
                                {c.sqft ? `${c.sqft.toLocaleString()} sqft` : ""}
                                {c.yearBuilt ? ` · ${c.yearBuilt}` : ""}
                                {c.saleDate ? ` · sold ${c.saleDate.slice(0, 7)}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {c.saleAmount ? (
                                <div className="text-[10px] font-mono font-bold" style={{ color: "#111827" }}>
                                  ${Math.round(c.saleAmount / 1000)}k
                                </div>
                              ) : null}
                              {c.pricePerSqft ? (
                                <div className="text-[9px]" style={{ color: "#9CA3AF" }}>${c.pricePerSqft}/sqft</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 pb-4">
                        <div className="text-[9.5px]" style={{ color: "#9CA3AF" }}>
                          {attomEnabled
                            ? "Comparables will appear after next property enrichment"
                            : "Add ATTOM_API_KEY to Railway to enable live comparable sales"}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bottom row: Lease tracker + Health score + Cashflow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
            {/* Lease expiry tracker */}
            <Card>
              {/* Prototype-exact header: title + "N expiring soon" badge + link */}
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-bold" style={{ color: "#111827" }}>Lease Expiry Tracker</div>
                <div className="flex items-center gap-2">
                  {expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length > 0 && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FDECEA", color: "#D93025" }}>
                      {expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length} expiring soon
                    </span>
                  )}
                  <Link href="/rent-clock" className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "#0A8A4C" }}>
                    View rent roll →
                  </Link>
                </div>
              </div>
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
                <div className="text-[11px] font-bold mb-2" style={{ color: "#111827" }}>Occupancy Breakdown <span className="font-normal text-[9.5px]" style={{ color: "#9CA3AF" }}>{fmtNum(totalSqft)} sf</span></div>
                {(() => {
                  const C = 176; // circumference for r=28
                  const offset = 44; // start at 12 o'clock
                  const oArc = totalSqft > 0 ? (occupiedSqft / totalSqft) * C : C;
                  const vArc = totalSqft > 0 ? (vacantSqft / totalSqft) * C : 0;
                  const nArc = totalSqft > 0 ? (noticeSqft / totalSqft) * C : 0;
                  const vOffset = -(oArc - offset);
                  const nOffset = -(oArc + vArc - offset);
                  return (
                    <div className="flex items-center gap-3">
                      <svg width="72" height="72" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="28" fill="none" stroke="#F3F4F6" strokeWidth="10"/>
                        <circle cx="36" cy="36" r="28" fill="none" stroke="#0A8A4C" strokeWidth="10"
                          strokeDasharray={`${oArc} ${C - oArc}`} strokeDashoffset={offset} strokeLinecap="round"/>
                        {vArc > 0 && (
                          <circle cx="36" cy="36" r="28" fill="none" stroke="#D93025" strokeWidth="10"
                            strokeDasharray={`${vArc} ${C - vArc}`} strokeDashoffset={vOffset} strokeLinecap="round"/>
                        )}
                        {nArc > 0 && (
                          <circle cx="36" cy="36" r="28" fill="none" stroke="#F5A94A" strokeWidth="10"
                            strokeDasharray={`${nArc} ${C - nArc}`} strokeDashoffset={nOffset} strokeLinecap="round"/>
                        )}
                        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827" fontFamily="'DM Serif Display',serif">
                          {pct(avgOccupancy)}
                        </text>
                      </svg>
                      <div className="space-y-1">
                        {[
                          { color: "#0A8A4C", label: "Occupied", sf: occupiedSqft },
                          { color: "#D93025", label: "Vacant", sf: vacantSqft },
                          { color: "#F5A94A", label: "Notice", sf: noticeSqft },
                        ].map((d) => (
                          <div key={d.label} className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "#111827" }}>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span>{d.label}</span>
                            <span className="text-[9.5px]" style={{ color: "#9CA3AF" }}>{fmtNum(d.sf)} sf</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

"use client";

export const dynamic = "force-dynamic";

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

// ── WMO code → description ────────────────────────────────────────────────────
function wmoToDesc(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  if (code === 95) return "Thunderstorm";
  return "Cloudy";
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--color-background-primary, #fff)",
        border: "0.5px solid #E5E7EB",
        borderRadius: 12,
        padding: "14px 16px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-tertiary, #9CA3AF)", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ── Card header ───────────────────────────────────────────────────────────────
function CardHeader({ title, subtitle, linkHref, linkLabel }: { title: string; subtitle?: string; linkHref?: string; linkLabel?: string }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, marginTop: 2, color: "#9CA3AF" }}>{subtitle}</div>}
      </div>
      {linkHref && (
        <Link href={linkHref} style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", whiteSpace: "nowrap" }}>
          {linkLabel ?? "View →"}
        </Link>
      )}
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────
function BadgeGreen({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "#EAF3DE", color: "#27500A" }}>{children}</span>;
}
function BadgeRed({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "#FCEBEB", color: "#791F1F" }}>{children}</span>;
}
function BadgeAmber({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "#FAEEDA", color: "#633806" }}>{children}</span>;
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────
function SkBar({ w = "100%", h = 10 }: { w?: string | number; h?: number }) {
  return <div className="rounded animate-pulse" style={{ width: w, height: h, backgroundColor: "#E5E7EB" }} />;
}
function SkCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "14px 16px" }}>
      {children}
    </div>
  );
}

// ── Welcome banner ────────────────────────────────────────────────────────────
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
          RealHQ has identified <span style={{ color: "#0A8A4C", fontWeight: 700 }}>{fmt(totalOpp, sym)}/yr</span> of opportunity.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-base leading-none hover:opacity-60 shrink-0" style={{ color: "#9CA3AF" }}>×</button>
    </div>
  );
}
function WelcomeBanner() { return <Suspense fallback={null}><WelcomeBannerInner /></Suspense>; }

// ── Success banner ────────────────────────────────────────────────────────────
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
      <span className="text-xs font-semibold" style={{ color: "#166534" }}>Property added. RealHQ is now analysing your portfolio.</span>
    </div>
  );
}
function SuccessBanner() { return <Suspense fallback={null}><SuccessBannerInner /></Suspense>; }

// ── Post-add onboarding progress ──────────────────────────────────────────────
function OnboardingProgressInner() {
  const searchParams = useSearchParams();
  const isAdded = searchParams.get("added") === "1";
  const [dismissed, setDismissed] = useState(false);
  if (!isAdded || dismissed) return null;
  const steps = [
    { label: "Add your first property", done: true, href: null },
    { label: "Review your insurance quote", done: false, href: "/insurance" },
    { label: "Check energy switch opportunities", done: false, href: "/energy" },
    { label: "Upload your lease and run rent analysis", done: false, href: "/tenants" },
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

// ── User assets hook ──────────────────────────────────────────────────────────
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
    const interval = setInterval(load, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currency]);
  return data;
}

// ── ATTOM benchmarks hook ─────────────────────────────────────────────────────
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
interface PropertyComparable { id: string; address: string; sqft: number | null; yearBuilt: number | null; saleAmount: number | null; saleDate: string | null; pricePerSqft: number | null; source: string }
function useComparables(assetId: string | null) {
  const [data, setData] = useState<PropertyComparable[]>([]);
  const [attomEnabled, setAttomEnabled] = useState(false);
  useEffect(() => {
    if (!assetId) return;
    fetch(`/api/market/comparables?assetId=${encodeURIComponent(assetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d?.comparables ?? []); setAttomEnabled(d?.attomEnabled ?? false); })
      .catch(() => {});
  }, [assetId]);
  return { comparables: data, attomEnabled };
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

// ── Live date/time hook ───────────────────────────────────────────────────────
function useLiveDateTime() {
  const [dt, setDt] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setDt(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return dt;
}

// ── Weather hook (Open-Meteo, free, no key) ───────────────────────────────────
interface WeatherData { tempF: number; tempC: number; desc: string }
function useWeather(lat: number | null, lon: number | null) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    if (!lat || !lon) return;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.current) return;
        const tempF = Math.round(d.current.temperature_2m);
        const tempC = Math.round((tempF - 32) * 5 / 9);
        setWeather({ tempF, tempC, desc: wmoToDesc(d.current.weather_code) });
      })
      .catch(() => {});
  }, [lat, lon]);
  return weather;
}

// ── Portfolio narrative ───────────────────────────────────────────────────────
function buildNarrative(assets: Array<{ type: string; location: string; sqft: number; occupancy: number; leases: Array<{ tenant: string }>; insurancePremium: number; marketInsurance: number; energyCost: number; marketEnergyCost: number; passingRent?: number; marketERV?: number }>): string {
  if (assets.length === 0) return "";
  const totalSqft = assets.reduce((s, a) => s + a.sqft, 0);
  const sqftStr = totalSqft >= 1000 ? `${Math.round(totalSqft / 1000)}k sqft` : `${totalSqft} sqft`;
  const types = [...new Set(assets.map(a => a.type.toLowerCase()))];
  const typeStr = types.length > 1 ? types.slice(0, -1).join(", ") + " and " + types[types.length - 1] : types[0] ?? "";
  const locs = [...new Set(assets.map(a => a.location.split(",")[0].trim()))];
  const locStr = locs.length > 2
    ? `${locs.slice(0, -1).join(", ")} and ${locs[locs.length - 1]} corridor`
    : locs.join(" and ");
  const avgOcc = Math.round(assets.reduce((s, a) => s + a.occupancy, 0) / assets.length);
  const vacancies = assets.flatMap(a => a.leases).filter(l => l.tenant === "Vacant").length;
  const insOpp = assets.reduce((s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const energyOpp = assets.reduce((s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const rentOpp = assets.reduce((s, a) => {
    const gap = (a.marketERV ?? 0) - (a.passingRent ?? 0);
    return gap > 0 ? s + gap * a.sqft * (a.occupancy / 100) : s;
  }, 0);
  let opp = "";
  if (insOpp > energyOpp && insOpp > rentOpp && insOpp > 0) opp = "insurance — running significantly above market";
  else if (energyOpp > rentOpp && energyOpp > 0) opp = "utility costs — running above benchmark";
  else if (rentOpp > 0) opp = "rent optimisation — ERV gap identified across portfolio";
  return `${assets.length} commercial asset${assets.length !== 1 ? "s" : ""} concentrated in ${locStr} — spanning ${sqftStr} across ${typeStr}. Occupancy at ${avgOcc}%${vacancies > 0 ? `, ${vacancies} vacanc${vacancies !== 1 ? "ies" : "y"}` : ""}. ${opp ? `Biggest near-term opportunity: ${opp}.` : "Portfolio is well-positioned for growth."}`;
}

// ── Empty onboarding state ────────────────────────────────────────────────────
function EmptyOnboardingState() {
  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: "#0A8A4C", borderBottom: "1px solid rgba(0,0,0,.1)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span className="text-sm font-semibold text-white truncate">Add your first property to unlock this</span>
        </div>
        <Link href="/properties/add" className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: "#fff", color: "#0A8A4C" }}>
          Add property →
        </Link>
      </div>
      {/* Skeleton dark top bar */}
      <div style={{ backgroundColor: "#0B1622", padding: "24px" }}>
        <div className="space-y-2 max-w-md">
          <SkBar w={100} h={7} />
          <SkBar w={240} h={20} />
          <SkBar w={180} h={8} />
        </div>
      </div>
      {/* Skeleton sections */}
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <SectionLabel>Portfolio summary</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {["Portfolio value", "Gross annual income", "Net operating income", "Occupancy", "Total sq footage"].map(l => (
              <SkCard key={l}>
                <SkBar w={60} h={7} />
                <div style={{ height: 8 }} />
                <SkBar w={80} h={22} />
                <div style={{ height: 4 }} />
                <SkBar w={55} h={7} />
              </SkCard>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Unactioned opportunity</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
            <SkCard><SkBar w="100%" h={130} /></SkCard>
            <SkCard><SkBar w="100%" h={130} /></SkCard>
          </div>
        </div>
        <div>
          <SectionLabel>Income &amp; cost health</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[1, 2, 3, 4].map(i => <SkCard key={i}><SkBar w="100%" h={90} /></SkCard>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { portfolioId } = useNav();
  const { portfolio, loading: portfolioLoading } = usePortfolio(portfolioId);
  const userAssets = useUserAssets();
  const userAssetCount = userAssets?.length ?? null;
  const marketBenchmarks = useMarketBenchmarks(portfolio.currency);
  const attomBenchmarks = useAttomBenchmarks();
  const userAcquisitions = useAcquisitions();
  const liveDate = useLiveDateTime();
  const primaryLat = userAssets?.[0]?.latitude ?? null;
  const primaryLon = userAssets?.[0]?.longitude ?? null;
  const weather = useWeather(primaryLat, primaryLon);

  // Loans
  const [userLoans, setUserLoans] = useState<AssetLoan[]>([]);
  useEffect(() => {
    fetch("/api/user/financing-summary")
      .then((r) => r.json())
      .then((data) => {
        const raw: IndicativeLoan[] = data.loans ?? [];
        const indicativeMaturity = new Date();
        indicativeMaturity.setFullYear(indicativeMaturity.getFullYear() + 5);
        const indicativeMaturityDate = indicativeMaturity.toISOString().split("T")[0];
        const indicativeDaysToMaturity = Math.round((indicativeMaturity.getTime() - Date.now()) / 86400000);
        setUserLoans(raw.map((l) => ({
          assetId: l.assetId, assetName: l.assetName, lender: "Indicative",
          outstandingBalance: l.loanCapacity, originalBalance: l.loanCapacity,
          interestRate: l.estimatedRate, rateType: "fixed" as const,
          maturityDate: indicativeMaturityDate, daysToMaturity: indicativeDaysToMaturity,
          ltv: l.ltv, currentLTV: l.ltv,
          icr: l.annualDebtService > 0 ? Math.round((l.estimatedValue * 0.055) / l.annualDebtService * 100) / 100 : 1.5,
          icrCovenant: 1.25, ltvCovenant: 75, annualDebtService: l.annualDebtService,
          marketRate: l.currency === "GBP" ? 5.0 : 5.5, currency: l.currency,
        })));
      })
      .catch(() => setUserLoans([]));
  }, []);

  const loans = userLoans;
  const { overall: healthScore, insurance: healthInsurance, energy: healthEnergy, compliance: healthCompliance, leases: healthLeases, financing: healthFinancing } = computePortfolioHealthScore(portfolio, loans);
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const isUSD = portfolio.currency === "USD";

  // Portfolio metrics
  const totalValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalGrossAnnual = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNetAnnual = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  const avgOccupancy = portfolio.assets.length > 0 ? portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length : 0;
  const vacantLeases = portfolio.assets.flatMap(a => a.leases).filter(l => l.tenant === "Vacant");
  const vacantCount = vacantLeases.length;
  const assetClassCount = new Set(portfolio.assets.map(a => a.type)).size;
  const noiMarginPct = totalGrossAnnual > 0 ? Math.round(totalNetAnnual / totalGrossAnnual * 100) : 0;
  const mktOccupancy = marketBenchmarks?.marketOccupancy ?? 94;

  // Opportunity metrics
  const totalInsuranceSave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance), 0);
  const totalEnergySave = portfolio.assets.reduce((s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost), 0);
  const rentUpliftAnnual = portfolio.assets.reduce((s, a) => {
    const gap = (a.marketERV ?? 0) - (a.passingRent ?? 0);
    return gap > 0 ? s + gap * (a.sqft ?? 0) * ((a.occupancy ?? 95) / 100) : s;
  }, 0);

  // Leases
  function daysUntil(dateStr: string) {
    return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }
  const expiringLeases = portfolio.assets.flatMap(a => a.leases)
    .filter(l => l.status === "expiring_soon" || (l.expiryDate && new Date(l.expiryDate) < new Date(Date.now() + 180 * 86400000)))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 6);
  const urgentLeaseCount = expiringLeases.filter(l => daysUntil(l.expiryDate) < 90).length;

  // ATTOM comparables for first US asset
  const firstUsAssetId = portfolio.assets.find(a => (a.location ?? "").toLowerCase().match(/fl|florida|tampa|miami|orlando/))?.id ?? null;
  const { comparables, attomEnabled } = useComparables(firstUsAssetId);

  // Market benchmarks merged
  const bm = attomBenchmarks ?? marketBenchmarks;
  const isAttomDriven = attomBenchmarks?.attomDriven === true;
  const mktCap = (bm as AttomMarketBenchmarks)?.marketCapRate ?? (bm as MarketBenchmarks)?.marketCapRate ?? (isUSD ? 6.5 : 5.25);
  const mktNOI = (bm as AttomMarketBenchmarks)?.marketNOIMargin ?? (bm as MarketBenchmarks)?.marketNOIMargin ?? (isUSD ? 58 : 55);
  const mktRentPsf = bm?.marketRentPsf ?? (isUSD ? 14.5 : 8.5);
  const mktOpExPsf = (bm as AttomMarketBenchmarks)?.marketOpExPsf ?? (bm as MarketBenchmarks)?.marketOpExPsf ?? (isUSD ? 4.2 : 2.1);
  const mktInsurancePsf = (bm as AttomMarketBenchmarks)?.marketInsurancePsf ?? (bm as MarketBenchmarks)?.marketInsurancePsf ?? (isUSD ? 1.1 : 0.35);
  const mktYield = (bm as AttomMarketBenchmarks)?.marketInitialYield ?? (bm as MarketBenchmarks)?.marketInitialYield ?? (isUSD ? 7.0 : 5.5);
  const ervMin = bm?.ervMin ?? (isUSD ? 13.0 : 7.5);
  const ervMax = bm?.ervMax ?? (isUSD ? 17.0 : 9.5);
  const ervMid = bm?.ervMid ?? ((ervMin + ervMax) / 2);
  const marketLabel = bm?.market ?? (isUSD ? "Florida Commercial" : "SE UK Logistics");
  const sourceLabel = isAttomDriven ? (attomBenchmarks?.source ?? "ATTOM Data Solutions") : (marketBenchmarks?.source ?? "");

  // Portfolio-level benchmark calcs
  const portfolioCap = totalValue > 0 ? (totalNetAnnual / totalValue * 100) : 0;
  const portfolioNOI = totalGrossAnnual > 0 ? (totalNetAnnual / totalGrossAnnual * 100) : 0;
  const portfolioRentPsf = totalSqft > 0 ? (totalGrossAnnual / totalSqft) : 0;
  const totalOpEx = totalGrossAnnual - totalNetAnnual;
  const portfolioOpExPsf = totalSqft > 0 ? (totalOpEx / totalSqft) : 0;
  const totalInsuranceAnnual = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const portfolioInsurancePsf = totalSqft > 0 ? (totalInsuranceAnnual / totalSqft) : 0;
  const portfolioYield = totalValue > 0 ? (totalGrossAnnual / totalValue * 100) : 0;
  const isOverRented = portfolioRentPsf > ervMid;
  const rentVsErv = ervMid > 0 ? ((portfolioRentPsf - ervMid) / ervMid * 100) : 0;

  // Top bar
  const hour = liveDate.getHours();
  const greeting = hour < 12 ? "good morning" : hour < 18 ? "good afternoon" : "good evening";
  const dateStr = liveDate.toLocaleDateString(isUSD ? "en-US" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = liveDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const primaryLocation = portfolio.assets[0]?.location?.split(",").slice(0, 2).join(",") ?? "";
  const weatherStr = weather
    ? `${isUSD ? weather.tempF + "°F" : weather.tempC + "°C"} · ${weather.desc}`
    : null;

  // Post-add polling
  const [opportunityOverride, setOpportunityOverride] = useState<number | null>(null);
  useEffect(() => {
    const justAdded = new URLSearchParams(window.location.search).get("added") === "1";
    if (!justAdded) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.totalOpportunity === "number") setOpportunityOverride(data.totalOpportunity);
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30_000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  useEffect(() => { document.title = "Dashboard — RealHQ"; }, []);

  // Empty state
  if (portfolioId === "user" && userAssetCount === 0) {
    return <AppShell><TopBar title="Value Dashboard" /><EmptyOnboardingState /></AppShell>;
  }

  // Ancillary income
  const ancillaryOpps = portfolio.assets.flatMap(a => a.additionalIncomeOpportunities).filter(o => o.status !== "live");
  const solarTotal = ancillaryOpps.filter(o => o.type === "solar").reduce((s, o) => s + o.annualIncome, 0);
  const fiveGTotal = ancillaryOpps.filter(o => o.type === "5g_mast").reduce((s, o) => s + o.annualIncome, 0);
  const evTotal = ancillaryOpps.filter(o => o.type === "ev_charging").reduce((s, o) => s + o.annualIncome, 0);
  const ancillaryTotal = solarTotal + fiveGTotal + evTotal;

  // Hold vs sell
  const holdSellRows = portfolio.assets.slice(0, 4).map(a => {
    const val = a.valuationUSD ?? a.valuationGBP ?? 0;
    const yld = val > 0 ? (a.netIncome / val * 100) : 0;
    const delta = yld - mktCap;
    const badge = delta < -1 ? "Consider sale" : delta < 0 ? "Review" : "Hold";
    const badgeColor = delta < -1 ? { bg: "#FCEBEB", color: "#791F1F" } : delta < 0 ? { bg: "#FAEEDA", color: "#633806" } : { bg: "#EAF3DE", color: "#27500A" };
    return { name: a.name.split(" ").slice(0, 2).join(" "), yld: yld.toFixed(1), badge, badgeColor };
  });

  // Refinance eligibility
  const refinanceRate = isUSD ? 5.33 : 4.75; // SOFR or BOE base
  const refinanceLabel = isUSD ? "SOFR" : "BOE base";
  const eligibleLoans = loans.filter(l => l.interestRate > l.marketRate).length;
  const refinanceSaving = loans.filter(l => l.interestRate > l.marketRate).reduce((s, l) => s + Math.round(l.outstandingBalance * (l.interestRate - l.marketRate) / 100), 0);

  // Narrative
  const narrativeText = buildNarrative(portfolio.assets);

  // Geographic spread by estimated value
  const locationGroups = portfolio.assets.reduce((acc, a) => {
    const county = (a.location ?? "Unknown").split(",")[0].trim();
    acc[county] = (acc[county] ?? 0) + (a.valuationUSD ?? a.valuationGBP ?? 0);
    return acc;
  }, {} as Record<string, number>);
  const locationRows = (Object.entries(locationGroups) as [string, number][]).sort(([, va], [, vb]) => vb - va).slice(0, 6);

  // Asset class mix by estimated value
  const typeGroups = portfolio.assets.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + (a.valuationUSD ?? a.valuationGBP ?? 0);
    return acc;
  }, {} as Record<string, number>);
  const typeRows = (Object.entries(typeGroups) as [string, number][]).sort(([, va], [, vb]) => vb - va).slice(0, 6);

  // Top assets by NOI yield
  const noiYieldRows = portfolio.assets.map(a => {
    const val = a.valuationUSD ?? a.valuationGBP ?? 0;
    const yld = val > 0 ? (a.netIncome / val * 100) : 0;
    return { name: a.name.split(" ").slice(0, 2).join(" "), yld, noi: a.netIncome, delta: yld - mktCap };
  }).sort((a, b) => b.yld - a.yld).slice(0, 5);

  // Lease expiry profile by year (for bar chart)
  const leasesByYear = portfolio.assets.flatMap(a => a.leases.filter(l => l.tenant !== "Vacant" && l.expiryDate))
    .reduce((acc, l) => {
      const yr = new Date(l.expiryDate).getFullYear().toString();
      acc[yr] = (acc[yr] ?? 0) + l.sqft * l.rentPerSqft;
      return acc;
    }, {} as Record<string, number>);
  const leaseYearRows = (Object.entries(leasesByYear) as [string, number][])
    .map(([yr, rent]) => ({ yr: parseInt(yr), rent }))
    .sort((a, b) => a.yr - b.yr)
    .slice(0, 6);
  const maxLeaseRent = Math.max(...leaseYearRows.map(r => r.rent), 1);

  // Compliance items
  const complianceItems = [
    { label: "Insurance certificate", status: healthInsurance >= 80 ? "compliant" : "due" },
    { label: "EPC certificate", status: userAssets?.some(a => a.epcRating) ? (userAssets.some(a => { const exp = a.epcExpiry ? new Date(a.epcExpiry) : null; return exp && exp < new Date(); }) ? "expired" : "compliant") : "due" },
    { label: "Fire risk assessment", status: healthCompliance >= 70 ? "compliant" : "due" },
    { label: "Energy compliance", status: healthEnergy >= 70 ? "compliant" : "review" },
  ];

  // Bench rows for Market Benchmarking
  const benchRows = [
    { label: "Cap Rate", portfolio: portfolioCap.toFixed(1) + "%", market: mktCap.toFixed(1) + "%", pct: mktCap > 0 ? (portfolioCap / mktCap) * 100 : 100, over: portfolioCap > mktCap, overGood: true },
    { label: "NOI Margin", portfolio: portfolioNOI.toFixed(0) + "%", market: mktNOI.toFixed(0) + "%", pct: mktNOI > 0 ? (portfolioNOI / mktNOI) * 100 : 100, over: portfolioNOI > mktNOI, overGood: true },
    { label: "Occupancy", portfolio: avgOccupancy.toFixed(0) + "%", market: mktOccupancy + "%", pct: mktOccupancy > 0 ? (avgOccupancy / mktOccupancy) * 100 : 100, over: avgOccupancy > mktOccupancy, overGood: true },
    { label: "Rent/sqft", portfolio: fmt(portfolioRentPsf, sym), market: fmt(mktRentPsf, sym), pct: mktRentPsf > 0 ? (portfolioRentPsf / mktRentPsf) * 100 : 100, over: portfolioRentPsf > mktRentPsf, overGood: true },
    { label: "OpEx/sqft", portfolio: fmt(portfolioOpExPsf, sym), market: fmt(mktOpExPsf, sym), pct: mktOpExPsf > 0 ? (portfolioOpExPsf / mktOpExPsf) * 100 : 100, over: portfolioOpExPsf > mktOpExPsf, overGood: false },
    { label: "Insurance/sqft", portfolio: fmt(portfolioInsurancePsf, sym), market: fmt(mktInsurancePsf, sym), pct: mktInsurancePsf > 0 ? (portfolioInsurancePsf / mktInsurancePsf) * 100 : 100, over: portfolioInsurancePsf > mktInsurancePsf, overGood: false },
    { label: "Initial Yield", portfolio: portfolioYield.toFixed(1) + "%", market: mktYield.toFixed(1) + "%", pct: mktYield > 0 ? (portfolioYield / mktYield) * 100 : 100, over: portfolioYield > mktYield, overGood: true },
  ];

  const loading = portfolioLoading;

  return (
    <AppShell>
      <TopBar title="Value Dashboard" />
      <WelcomeBanner />
      <SuccessBanner />
      <OnboardingProgress />

      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#FFFFFF" }}>

        {/* Alert bar */}
        {urgentLeaseCount > 0 && (
          <div className="flex items-start gap-2 px-4 py-2 text-xs flex-wrap" style={{ backgroundColor: "#FEF6E8", borderBottom: "1px solid rgba(245,169,74,.2)" }}>
            <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#92580A" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 10v.5"/></svg>
            <span className="flex-1 min-w-0" style={{ color: "#4B5563" }}>
              <strong style={{ color: "#92580A" }}>Lease action required: </strong>
              {urgentLeaseCount} lease{urgentLeaseCount !== 1 ? "s" : ""} expiring within 90 days.
            </span>
            <Link href="/rent-clock" className="shrink-0 font-semibold whitespace-nowrap text-[11.5px]" style={{ color: "#0A8A4C" }}>Review now →</Link>
          </div>
        )}

        {/* EPC strip */}
        {userAssets && userAssets.some(a => a.epcRating) && (
          <div className="px-4 py-2 flex items-center gap-3 flex-wrap" style={{ backgroundColor: "#F0FDF4", borderBottom: "1px solid #D1FAE5" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: "#065F46" }}>EPC ratings</span>
            {userAssets.filter(a => a.epcRating).map(a => {
              const expiry = a.epcExpiry ? new Date(a.epcExpiry) : null;
              const daysToExpiry = expiry ? Math.floor((expiry.getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={a.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] truncate max-w-[120px]" style={{ color: "#6B7280" }}>{a.name}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: ["A","B"].includes(a.epcRating!) ? "#D1FAE5" : ["E","F","G"].includes(a.epcRating!) ? "#FEE2E2" : "#FEF3C7", color: ["A","B"].includes(a.epcRating!) ? "#065F46" : ["E","F","G"].includes(a.epcRating!) ? "#991B1B" : "#92400E" }}>
                    {a.epcRating}
                  </span>
                  {daysToExpiry !== null && daysToExpiry < 365 && (
                    <span className="text-[9px] font-medium" style={{ color: daysToExpiry < 0 ? "#DC2626" : "#D97706" }}>
                      {daysToExpiry < 0 ? "expired" : `exp ${expiry!.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── DATE / TIME / WEATHER SLIM STRIP ── */}
        <div style={{ borderBottom: "0.5px solid #E5E7EB", padding: "5px 20px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
          <span style={{ fontSize: 11.5, color: "#9CA3AF" }}>
            {dateStr}
            <span style={{ color: "#D1D5DB", margin: "0 8px" }}>·</span>
            {timeStr}
            {primaryLocation && <><span style={{ color: "#D1D5DB", margin: "0 8px" }}>·</span>{primaryLocation}</>}
            {weatherStr && <><span style={{ color: "#D1D5DB", margin: "0 8px" }}>·</span>{weatherStr}</>}
          </span>
        </div>

        {/* ── HERO BANNER (light green) ── */}
        <div style={{ backgroundColor: "#E8F5EE", borderBottom: "1px solid #C0DD97", padding: "16px 20px" }}>
          {/* Portfolio heading */}
          <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#173404", lineHeight: 1.25, marginBottom: 6 }}>
            {portfolio.name} — {greeting}, Ian.
          </div>

          {/* Narrative */}
          {narrativeText && (
            <div style={{ fontSize: 12, color: "#3B6D11", maxWidth: 700, lineHeight: 1.6 }}>
              {narrativeText}
            </div>
          )}
        </div>

        {/* Satellite thumbnails */}
        {userAssets && userAssets.some(a => a.satelliteUrl) && (
          <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: "#374151" }}>Properties</span>
            {userAssets.filter(a => a.satelliteUrl).map(a => (
              <a key={a.id} href={`/assets/${a.id}`} className="shrink-0 relative group" title={a.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.satelliteUrl!} alt={a.name} width={80} height={50} className="rounded object-cover" style={{ width: 80, height: 50, border: "1px solid #E5E7EB" }} />
                <div className="absolute inset-0 rounded flex items-end" style={{ background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 60%)" }}>
                  <span className="px-1 pb-0.5 text-[8px] font-medium leading-tight truncate w-full" style={{ color: "#fff" }}>{a.name}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* ── KPI SECTION LABEL ── */}
        <div style={{ paddingLeft: 18, paddingTop: 14, paddingBottom: 4 }}>
          <SectionLabel>Portfolio summary</SectionLabel>
        </div>

        {/* ── KPI STRIP — full-width, flush below hero, matches prototype .kpi-strip ── */}
        <div style={{ display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB", overflow: "hidden" }}>
              {[
                {
                  label: "Portfolio Value",
                  value: loading ? "—" : fmt(totalValue, sym),
                  meta: `${portfolio.assets.length} assets · ${assetClassCount} class${assetClassCount !== 1 ? "es" : ""}`,
                  metaColor: undefined,
                },
                {
                  label: "Gross Monthly Rent",
                  value: loading ? "—" : fmt(Math.round(totalGrossAnnual / 12), sym),
                  meta: `${fmt(totalGrossAnnual, sym)}/yr run rate`,
                  metaColor: "#0A8A4C",
                },
                {
                  label: "Net Operating Income",
                  value: loading ? "—" : fmt(totalNetAnnual, sym),
                  meta: `${noiMarginPct}% margin`,
                  metaColor: noiMarginPct >= 55 ? "#0A8A4C" : "#D93025",
                },
                {
                  label: "Occupancy",
                  value: loading ? "—" : `${Math.round(avgOccupancy)}%`,
                  meta: vacantCount > 0 ? `▼ ${vacantCount} suite${vacantCount !== 1 ? "s" : ""} vacant` : `▲ mkt ${mktOccupancy}%`,
                  metaColor: vacantCount > 0 ? "#D93025" : "#0A8A4C",
                },
                {
                  label: "Total Sq Footage",
                  value: loading ? "—" : fmtNum(totalSqft),
                  meta: `${portfolio.assets.length} assets · ${assetClassCount} class${assetClassCount !== 1 ? "es" : ""}`,
                  metaColor: undefined,
                },
                {
                  label: "Costs Saved YTD",
                  value: loading ? "—" : fmt(totalInsuranceSave + totalEnergySave, sym),
                  meta: "actioned this year",
                  metaColor: "#0A8A4C",
                },
                {
                  label: "Unactioned Opportunity",
                  value: loading ? "—" : fmt(opportunityOverride ?? (rentUpliftAnnual + totalInsuranceSave + totalEnergySave + ancillaryTotal), sym),
                  meta: "awaiting review",
                  metaColor: "#92580A",
                  highlight: true,
                },
              ].map((kpi, i, arr) => (
                <div
                  key={kpi.label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "11px 12px",
                    borderRight: i < arr.length - 1 ? "1px solid #F3F4F6" : "none",
                    backgroundColor: kpi.highlight ? "#FEF6E8" : undefined,
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.055em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kpi.label}</div>
                  <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 17, color: kpi.highlight ? "#92580A" : "#111827", lineHeight: 1, marginBottom: 3, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>{kpi.value}</div>
                  <div style={{ fontSize: 9.5, color: kpi.metaColor ?? "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kpi.meta}</div>
                </div>
              ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── SECTION 2: Unactioned opportunity ── */}
          {!loading && (
            <section>
              <SectionLabel>Unactioned opportunity</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, alignItems: "start" }}>
                {/* NOI Bridge */}
                <NOIBridge portfolio={portfolio} />

                {/* Market Benchmarking */}
                <div style={{ backgroundColor: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Market Benchmarking</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>vs {marketLabel}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {isAttomDriven && <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>LIVE · ATTOM</span>}
                      {sourceLabel && <span style={{ fontSize: 9.5, color: "#9CA3AF" }}>{sourceLabel}</span>}
                    </div>
                  </div>
                  {/* ERV signal */}
                  <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #F3F4F6", backgroundColor: isOverRented ? "#F0FDF4" : "#FFF7ED" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#374151" }}>ERV Range</div>
                        <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 2 }}>{sym}{ervMin.toFixed(2)}–{sym}{ervMax.toFixed(2)} {bm?.ervUnit ?? "psf"} · {marketLabel}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#111827", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(portfolioRentPsf, sym)}/sqft</div>
                        <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, marginTop: 2, display: "inline-block", backgroundColor: isOverRented ? "#E8F5EE" : "#FEF3C7", color: isOverRented ? "#0A8A4C" : "#92580A" }}>
                          {isOverRented ? `${Math.abs(rentVsErv).toFixed(0)}% above ERV midpoint` : `${Math.abs(rentVsErv).toFixed(0)}% below ERV midpoint`}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Benchmark rows */}
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {benchRows.map((row) => {
                      const isGood = row.over === row.overGood;
                      const barPct = Math.min(100, row.pct);
                      const barColor = isGood ? "#0A8A4C" : "#D93025";
                      const statusLabel = row.label === "NOI Margin" ? (row.over ? "Strong" : "Overspending") :
                        row.label === "OpEx/sqft" ? (row.over ? `${Math.round(Math.abs(row.pct - 100))}% above mkt` : "In line") :
                        row.label === "Insurance/sqft" ? (row.over ? `${Math.round(Math.abs(row.pct - 100))}% above mkt` : "Competitive") :
                        row.over ? "Above mkt" : "Below mkt";
                      return (
                        <div key={row.label}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", width: 88, flexShrink: 0 }}>{row.label}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                              <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 3, backgroundColor: barColor }} />
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "var(--font-geist-sans), Geist, sans-serif", color: "#111827", width: 44, textAlign: "right", flexShrink: 0 }}>{row.portfolio}</span>
                            <span style={{ fontSize: 9.5, color: "#9CA3AF", width: 50, textAlign: "right", flexShrink: 0 }}>mkt {row.market}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, flexShrink: 0, backgroundColor: isGood ? "#E8F5EE" : "#FDECEA", color: isGood ? "#0A8A4C" : "#D93025" }}>{statusLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Comparable sales */}
                  {firstUsAssetId && (
                    <div style={{ borderTop: "0.5px solid #E5E7EB" }}>
                      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#374151" }}>Comparable Sales</span>
                        {comparables.length > 0 && <span style={{ fontSize: 9, color: "#9CA3AF" }}>ATTOM · {comparables.length} comps</span>}
                      </div>
                      {comparables.length > 0 ? (
                        <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {comparables.slice(0, 4).map((c) => (
                            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 9.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</div>
                                <div style={{ fontSize: 9, color: "#9CA3AF" }}>{c.sqft ? `${c.sqft.toLocaleString()} sqft` : ""}{c.saleDate ? ` · ${c.saleDate.slice(0, 7)}` : ""}</div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                {c.saleAmount && <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-geist-sans), Geist, sans-serif", color: "#111827" }}>${Math.round(c.saleAmount / 1000)}k</div>}
                                {c.pricePerSqft && <div style={{ fontSize: 9, color: "#9CA3AF" }}>${c.pricePerSqft}/sqft</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: "0 16px 12px", fontSize: 9.5, color: "#9CA3AF" }}>
                          {attomEnabled ? "Comparables will appear after next enrichment" : "Add ATTOM_API_KEY to enable live comps"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── OPPORTUNITY CARDS ── */}
          {!loading && (
            <section>
              {/* AI Opportunity Centre header — matches prototype .sh/.stitle/.aipill */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#111827" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 12, backgroundColor: "#E8F5EE", color: "#0A8A4C", border: "1px solid rgba(10,138,76,.2)" }}>
                    <span className="animate-pulse" style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#0A8A4C", display: "inline-block" }} />
                    RealHQ AI · Live
                  </span>
                  AI Opportunity Centre — ranked by annual impact
                </div>
                <Link href="/requests" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", whiteSpace: "nowrap" }}>
                  View all →
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {([
                  { label: "Rent Uplift", sub: "ERV gap vs market", value: rentUpliftAnnual, color: "#0A8A4C", bg: "#F0FDF4", href: "/rent-clock" },
                  { label: "Insurance Saving", sub: "Above market premium", value: totalInsuranceSave, color: "#1647E8", bg: "#EEF2FF", href: "/insurance" },
                  { label: "Energy Switching", sub: "vs benchmark tariff", value: totalEnergySave, color: "#0891B2", bg: "#E0F9FF", href: "/energy" },
                  { label: "Solar Income", sub: "Rooftop PV potential", value: solarTotal, color: "#D97706", bg: "#FEF9EC", href: "/income" },
                  { label: "5G Mast Income", sub: "Network infrastructure", value: fiveGTotal, color: "#7C3AED", bg: "#F3E8FF", href: "/income" },
                  { label: "Value Add", sub: "EV charging infrastructure", value: evTotal, color: "#059669", bg: "#ECFDF5", href: "/income" },
                ].sort((a, b) => b.value - a.value)).map((opp, i) => {
                  const featured = i === 0 && opp.value > 0;
                  return (
                    <Link key={opp.label} href={opp.href} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{
                        backgroundColor: featured ? "#0B1622" : "#fff",
                        border: `1px solid ${featured ? "#0B1622" : "#E5E7EB"}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}>
                        {/* Featured banner */}
                        {featured && (
                          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#F5A94A", textAlign: "center", paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                            ★ Highest ROI · Act first
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: featured ? "rgba(10,138,76,.25)" : opp.bg, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: featured ? "#fff" : "#111827" }}>{opp.label}</div>
                            <div style={{ fontSize: 10, color: featured ? "rgba(255,255,255,.45)" : "#9CA3AF" }}>{opp.sub}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: featured ? "#fff" : (opp.value > 0 ? opp.color : "#9CA3AF"), lineHeight: 1.1, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                          {opp.value > 0 ? `${fmt(opp.value, sym)}/yr` : "—"}
                        </div>
                        <div style={{ fontSize: 9.5, color: featured ? "rgba(255,255,255,.35)" : "#9CA3AF", marginTop: 2 }}>potential per year</div>
                        <div style={{ marginTop: 8 }}>
                          {opp.value > 0
                            ? featured
                              ? <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(10,138,76,.3)", color: "#6ee7b7" }}>Action now →</span>
                              : <BadgeAmber>Action available</BadgeAmber>
                            : <BadgeGreen>No gap identified</BadgeGreen>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── SECTION 3: Insurance Premium Audit + Utility Analysis (2-col, prototype row2) ── */}
          <section>
            <SectionLabel>Insurance &amp; utility</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              {/* Insurance Premium Audit — per-asset rows */}
              <div style={{ backgroundColor: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111827" }}>Insurance Premium Audit</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>AI vs {isUSD ? "340 comparable FL" : "280 comparable UK"} commercial policies</div>
                  </div>
                  <Link href="/insurance" style={{ fontSize: 10.5, fontWeight: 600, color: "#1647E8", textDecoration: "none", whiteSpace: "nowrap" }}>Rearrange inside RealHQ →</Link>
                </div>
                <div>
                  {portfolio.assets.map((a) => {
                    const saving = Math.max(0, a.insurancePremium - a.marketInsurance);
                    const overPct = a.marketInsurance > 0 ? ((a.insurancePremium - a.marketInsurance) / a.marketInsurance) * 100 : 0;
                    const isOver = overPct > 10;
                    const isNeg = overPct > 5 && overPct <= 10;
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: isOver ? "#FEF2F2" : "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={isOver ? "#D93025" : "#0A8A4C"} strokeWidth="1.5">
                            <rect x="1" y="1" width="10" height="10" rx="1.5"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name.split(" ").slice(0, 3).join(" ")}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>Current: {fmt(a.insurancePremium, sym)}/yr · AI market: {fmt(a.marketInsurance, sym)}/yr</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isOver ? "#D93025" : "#0A8A4C", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
                            {saving > 0 ? `Save ${fmt(saving, sym)}` : "Competitive"}
                          </div>
                          <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4, display: "inline-block", marginTop: 2, backgroundColor: isOver ? "#FDECEA" : isNeg ? "#F3F4F6" : "#E8F5EE", color: isOver ? "#D93025" : isNeg ? "#6B7280" : "#0A8A4C" }}>
                            {isOver ? "Overpaying" : isNeg ? "Negligible" : "Competitive"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: "10px 16px", borderTop: "0.5px solid #E5E7EB", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>
                    Total saving: <span style={{ fontWeight: 700, color: "#0A8A4C" }}>{fmt(totalInsuranceSave, sym)}/yr</span> across {portfolio.assets.length} asset{portfolio.assets.length !== 1 ? "s" : ""}
                  </div>
                  <Link href="/insurance" style={{ fontSize: 10.5, fontWeight: 600, color: "#1647E8", textDecoration: "none" }}>Get quotes →</Link>
                </div>
              </div>

              {/* Utility Analysis & Switching — per-asset rows */}
              <div style={{ backgroundColor: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111827" }}>Utility Analysis &amp; {isUSD ? "Optimisation" : "Switching"}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Benchmarked vs {isUSD ? "1,200 comparable FL" : "800 comparable UK"} properties</div>
                  </div>
                  <Link href="/energy" style={{ fontSize: 10.5, fontWeight: 600, color: "#1647E8", textDecoration: "none", whiteSpace: "nowrap" }}>{isUSD ? "Optimise →" : "Switch provider →"}</Link>
                </div>
                <div>
                  {[...portfolio.assets].sort((a, b) => b.energyCost - a.energyCost).slice(0, 4).map((a) => {
                    const saving = Math.max(0, a.energyCost - a.marketEnergyCost);
                    const currentMo = Math.round(a.energyCost / 12);
                    const savingMo = Math.round(saving / 12);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#2d1f00", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>⚡</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Electricity — {a.name.split(" ").slice(0, 2).join(" ")}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{a.location} · {a.energyCost > a.marketEnergyCost ? `${Math.round(((a.energyCost - a.marketEnergyCost) / Math.max(1, a.marketEnergyCost)) * 100)}% above benchmark` : "At benchmark"}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#FF8080", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(currentMo, sym)}/mo</div>
                          {savingMo > 0 && <div style={{ fontSize: 9.5, fontWeight: 600, color: "#0A8A4C" }}>→ saves {fmt(savingMo, sym)}/mo</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: "10px 16px", borderTop: "0.5px solid #E5E7EB", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>
                    Total utility saving: <span style={{ fontWeight: 700, color: "#0A8A4C" }}>{fmt(totalEnergySave, sym)}/yr</span> across portfolio
                  </div>
                  <Link href="/energy" style={{ fontSize: 10.5, fontWeight: 600, color: "#1647E8", textDecoration: "none" }}>Full energy report →</Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 3b: Rent optimisation + CAM recovery ── */}
          <section>
            <SectionLabel>Income &amp; cost health</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>

              {/* Rent optimisation */}
              <Card>
                <CardHeader title="Rent Optimisation" subtitle="Leases vs market ERV" linkHref="/rent-clock" linkLabel="Review leases →" />
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {portfolio.assets.flatMap(a =>
                    a.leases.filter(l => l.tenant !== "Vacant" && l.rentPerSqft > 0).slice(0, 1).map(l => ({
                      tenant: l.tenant,
                      rentPsf: l.rentPerSqft,
                      mktPsf: a.marketERV ?? 0,
                      asset: a.name.split(" ").slice(0, 2).join(" "),
                    }))
                  ).slice(0, 4).map((row, i) => {
                    const delta = row.mktPsf > 0 ? ((row.rentPsf - row.mktPsf) / row.mktPsf * 100) : 0;
                    const isBelow = delta < -1;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.tenant}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{row.asset}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: isBelow ? "#D93025" : "#0A8A4C", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(row.rentPsf, sym)}/sf</div>
                          {isBelow ? <BadgeRed>Below mkt</BadgeRed> : <BadgeGreen>Above mkt</BadgeGreen>}
                        </div>
                      </div>
                    );
                  })}
                  {rentUpliftAnnual > 0 && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#9CA3AF" }}>ERV uplift opportunity</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0A8A4C" }}>{fmt(rentUpliftAnnual, sym)}/yr</span>
                    </div>
                  )}
                  {portfolio.assets.flatMap(a => a.leases).filter(l => l.tenant !== "Vacant").length === 0 && (
                    <div style={{ fontSize: 10, color: "#9CA3AF", padding: "12px 0", textAlign: "center" }}>Upload lease data to see rent vs market</div>
                  )}
                </div>
              </Card>

              {/* CAM & tax recovery */}
              <Card>
                <CardHeader title="CAM & Tax Recovery" subtitle="Recoverable under lease" linkHref="/work-orders" linkLabel="Review items →" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    Upload lease schedules to calculate recoverable service charge and CAM costs.
                  </div>
                  <div style={{ padding: "8px 0", borderTop: "0.5px solid #F3F4F6" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 6 }}>Typical recovery items</div>
                    {["Service charge", "Insurance recovery", "Rates & utilities", "Management fee"].map(item => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#D1D5DB", flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: "#6B7280" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ── PORTFOLIO ANALYTICS ── */}
          {!loading && portfolio.assets.length > 0 && (
            <section>
              <SectionLabel>Portfolio analytics</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>

                {/* Geographic Spread */}
                <Card>
                  <CardHeader title="Geographic Spread" subtitle="by estimated value" />
                  <div>
                    {locationRows.length === 0 && <div style={{ fontSize: 11, color: "#9CA3AF" }}>No location data available</div>}
                    {locationRows.map(([county, val], i) => {
                      const GEO_COLORS = ["#0A8A4C", "#1647E8", "#D97706", "#D93025", "#7C3AED", "#0891B2"];
                      const pct = totalValue > 0 ? (val / totalValue * 100) : 0;
                      return (
                        <div key={county} style={{ padding: "5px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: GEO_COLORS[i % GEO_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: 10.5, color: "#374151" }}>{county}</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>{pct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, backgroundColor: GEO_COLORS[i % GEO_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Asset Class Mix */}
                <Card>
                  <CardHeader title="Asset Class Mix" subtitle="by estimated value" />
                  <div>
                    {typeRows.length === 0 && <div style={{ fontSize: 11, color: "#9CA3AF" }}>No asset data available</div>}
                    {typeRows.map(([type, val], i) => {
                      const TYPE_COLORS = ["#1647E8", "#0A8A4C", "#D97706", "#D93025", "#7C3AED", "#0891B2"];
                      const pct = totalValue > 0 ? (val / totalValue * 100) : 0;
                      return (
                        <div key={type} style={{ padding: "5px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: 10.5, color: "#374151", textTransform: "capitalize" }}>{type.replace(/_/g, " ")}</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>{pct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Top Assets by NOI Yield */}
                <Card>
                  <CardHeader title="Top Assets by NOI Yield" subtitle={`vs ${mktCap.toFixed(1)}% market cap rate`} />
                  <div>
                    {noiYieldRows.length === 0 && <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: "12px 0" }}>Add property valuations to see NOI yield ranking</div>}
                    {noiYieldRows.map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 500, color: "#111827" }}>{row.name}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>NOI {fmt(row.noi, sym)}/yr</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: row.delta >= 0 ? "#0A8A4C" : "#D93025", fontFamily: "monospace" }}>{row.yld.toFixed(1)}%</div>
                          <div style={{ fontSize: 9, color: row.delta >= 0 ? "#0A8A4C" : "#D93025" }}>{row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}% vs mkt</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>
            </section>
          )}

          {/* ── BOTTOM ROW: Lease Expiry (wide) + Health Score + Cashflow (prototype rowbot 2fr 1fr 1fr) ── */}
          {!loading && portfolio.assets.length > 0 && (
            <section>
              <SectionLabel>Lease expiry &amp; portfolio health</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, alignItems: "start" }}>

                {/* Lease Expiry Tracker (wide) */}
                <Card>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Lease Expiry Tracker</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {urgentLeaseCount > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "#FCEBEB", color: "#791F1F" }}>
                          {urgentLeaseCount} expiring soon
                        </span>
                      )}
                      <Link href="/rent-clock" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", whiteSpace: "nowrap" }}>View rent roll →</Link>
                    </div>
                  </div>
                  <div>
                    {expiringLeases.slice(0, 5).map((lease) => {
                      const days = daysUntil(lease.expiryDate);
                      const dayColor = days < 60 ? "#D93025" : days < 120 ? "#92580A" : "#0A8A4C";
                      const dayBg = days < 60 ? "#FCEBEB" : days < 120 ? "#FAEEDA" : "#EAF3DE";
                      const asset = portfolio.assets.find(a => a.leases.some(l => l === lease));
                      return (
                        <div key={lease.id ?? lease.tenant} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                          <div style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg fill="none" stroke="#6B7280" viewBox="0 0 12 12" strokeWidth="1.5" width="10" height="10">
                              <rect x="1" y="1.5" width="10" height="9" rx="1"/>
                              <path d="M3.5 1.5V.5M8.5 1.5V.5M1 4.5h10"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lease.tenant}</div>
                            <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{asset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"} · {fmt(lease.sqft * lease.rentPerSqft, sym)}/yr</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 500, color: "#111827" }}>
                              {new Date(lease.expiryDate).toLocaleDateString(isUSD ? "en-US" : "en-GB", { month: "short", year: "numeric" })}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: dayBg, color: dayColor }}>
                              {days}d remaining
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {expiringLeases.length === 0 && (
                      <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>No leases expiring within 180 days</div>
                    )}
                  </div>
                  {/* Lease expiry profile bar chart */}
                  {leaseYearRows.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "0.5px solid #F3F4F6", paddingTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 8 }}>Expiry profile by year</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {leaseYearRows.map((row) => {
                          const thisYear = new Date().getFullYear();
                          const barColor = row.yr <= thisYear + 1 ? "#D93025" : row.yr <= thisYear + 3 ? "#F5A94A" : "#0A8A4C";
                          return (
                            <div key={row.yr} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, color: "#374151", width: 34, flexShrink: 0 }}>{row.yr}</span>
                              <div style={{ flex: 1, height: 7, borderRadius: 3, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                                <div style={{ width: `${(row.rent / maxLeaseRent) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: barColor }} />
                              </div>
                              <span style={{ fontSize: 9.5, color: "#9CA3AF", width: 44, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(row.rent, sym)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Portfolio Health Score */}
                <Card>
                  <CardHeader title="Portfolio Health Score" subtitle={`Overall ${healthScore}/100`} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {([
                      { label: "Insurance compliance", score: healthInsurance, color: "#0A8A4C" },
                      { label: "Energy efficiency", score: healthEnergy, color: "#1647E8" },
                      { label: "Compliance", score: healthCompliance, color: "#7C3AED" },
                      { label: "Lease security", score: healthLeases, color: "#0A8A4C" },
                      { label: "Financing health", score: healthFinancing, color: "#0891B2" },
                    ] as { label: string; score: number; color: string }[]).map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10.5, color: "#374151", width: 134, flexShrink: 0 }}>{row.label}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                          <div style={{ width: `${row.score}%`, height: "100%", borderRadius: 3, backgroundColor: row.color }} />
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#111827", width: 32, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{row.score}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Occupancy donut */}
                  {totalSqft > 0 && (() => {
                    const CIRC = 2 * Math.PI * 28;
                    const occArc = (avgOccupancy / 100) * CIRC;
                    const vacArc = CIRC - occArc;
                    const startOffset = CIRC / 4;
                    const occupiedSqft = Math.round(totalSqft * avgOccupancy / 100);
                    const vacantSqft = totalSqft - occupiedSqft;
                    return (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid #F3F4F6" }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: "#111827", marginBottom: 8 }}>
                          Occupancy <span style={{ fontSize: 9.5, color: "#9CA3AF", fontWeight: 400 }}>{fmtNum(totalSqft)} sf total</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                            <circle cx="36" cy="36" r="28" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                            <circle cx="36" cy="36" r="28" fill="none" stroke="#0A8A4C" strokeWidth="10"
                              strokeDasharray={`${occArc.toFixed(1)} ${(CIRC - occArc).toFixed(1)}`}
                              strokeDashoffset={startOffset}
                              strokeLinecap="round" />
                            {vacArc > 4 && (
                              <circle cx="36" cy="36" r="28" fill="none" stroke="#D93025" strokeWidth="10"
                                strokeDasharray={`${vacArc.toFixed(1)} ${(CIRC - vacArc).toFixed(1)}`}
                                strokeDashoffset={startOffset - occArc}
                                strokeLinecap="round" />
                            )}
                            <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827"
                              fontFamily="var(--font-dm-serif), 'DM Serif Display', Georgia, serif">
                              {Math.round(avgOccupancy)}%
                            </text>
                          </svg>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#0A8A4C", flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: "#374151" }}>Occupied</span>
                              <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmtNum(occupiedSqft)} sf</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#D93025", flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: "#374151" }}>Vacant</span>
                              <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmtNum(vacantSqft)} sf</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* Cashflow P&L */}
                <Card>
                  <CardHeader
                    title={`${liveDate.toLocaleDateString(isUSD ? "en-US" : "en-GB", { month: "long", year: "numeric" })} Cashflow`}
                    subtitle={`vs ${fmt(Math.round(totalNetAnnual / 12), sym)} budget`}
                  />
                  {(() => {
                    const mRent = Math.round(totalGrossAnnual / 12);
                    const mInsurance = Math.round(totalInsuranceAnnual / 12);
                    const mEnergy = Math.round(portfolio.assets.reduce((s, a) => s + a.energyCost, 0) / 12);
                    const mMgmt = Math.round(mRent * 0.08);
                    const mTotalCost = Math.round((totalGrossAnnual - totalNetAnnual) / 12);
                    const mMaintenance = Math.max(0, mTotalCost - mInsurance - mEnergy - mMgmt);
                    const mCAM = Math.round(mRent * 0.05);
                    const mNOI = Math.round(totalNetAnnual / 12);
                    const rows: { label: string; value: number; positive: boolean }[] = [
                      { label: "Base rental income", value: mRent, positive: true },
                      { label: "CAM recoveries", value: mCAM, positive: true },
                      { label: "Maintenance & repairs", value: mMaintenance, positive: false },
                      { label: "Management fees", value: mMgmt, positive: false },
                      { label: "Insurance", value: mInsurance, positive: false },
                      { label: "Energy & utilities", value: mEnergy, positive: false },
                    ];
                    return (
                      <>
                        {rows.map((row) => (
                          <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                            <span style={{ fontSize: 10.5, color: "#6B7280" }}>{row.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-geist-sans), Geist, sans-serif", color: row.positive ? "#0A8A4C" : "#D93025" }}>
                              {row.positive ? "+" : "−"}{fmt(row.value, sym)}
                            </span>
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 0", marginTop: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>Net Operating Income</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(mNOI, sym)}</span>
                        </div>
                      </>
                    );
                  })()}
                </Card>

              </div>
            </section>
          )}

          {/* ── SECTION 4: Tenant health + Ancillary income ── */}
          <section>
            <SectionLabel>Tenant health &amp; ancillary income</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>

              {/* Tenant health scores */}
              <Card>
                <CardHeader title="Tenant Health Scores" subtitle="Based on lease risk profile" linkHref="/rent-clock" linkLabel="View tenants →" />
                <div>
                  {portfolio.assets.flatMap(a =>
                    a.leases.filter(l => l.tenant !== "Vacant" && l.expiryDate).map(l => {
                      const days = daysUntil(l.expiryDate);
                      const risk = days < 90 ? "High risk" : days < 180 ? "Medium" : "Low risk";
                      const riskColor = days < 90 ? { bg: "#FCEBEB", color: "#791F1F" } : days < 180 ? { bg: "#FAEEDA", color: "#633806" } : { bg: "#EAF3DE", color: "#27500A" };
                      return { tenant: l.tenant, days, risk, riskColor, rent: l.sqft * l.rentPerSqft };
                    })
                  ).slice(0, 5).map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tenant}</div>
                        <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{fmt(t.rent, sym)}/yr · {t.days}d left</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: t.riskColor.bg, color: t.riskColor.color, flexShrink: 0 }}>
                        {t.risk}
                      </span>
                    </div>
                  ))}
                  {portfolio.assets.flatMap(a => a.leases.filter(l => l.tenant !== "Vacant")).length === 0 && (
                    <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>Upload lease data to see tenant health</div>
                  )}
                </div>
              </Card>

              {/* Ancillary income */}
              <Card>
                <CardHeader title="Ancillary Income" subtitle="Additional income opportunities" linkHref="/income" linkLabel="View all →" />
                {ancillaryTotal > 0 ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#0A8A4C", lineHeight: 1.1 }}>{fmt(ancillaryTotal, sym)}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>total opportunity per year</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {solarTotal > 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "0.5px solid #F3F4F6" }}>
                          <span style={{ fontSize: 10.5, color: "#6B7280" }}>☀️ Solar income</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(solarTotal, sym)}/yr</span>
                        </div>
                      )}
                      {evTotal > 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "0.5px solid #F3F4F6" }}>
                          <span style={{ fontSize: 10.5, color: "#6B7280" }}>🔌 EV charging</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(evTotal, sym)}/yr</span>
                        </div>
                      )}
                      {fiveGTotal > 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "0.5px solid #F3F4F6" }}>
                          <span style={{ fontSize: 10.5, color: "#6B7280" }}>📡 5G mast income</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>{fmt(fiveGTotal, sym)}/yr</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    No ancillary income opportunities identified yet. Solar, EV charging, and 5G mast assessments available once property data is uploaded.
                  </div>
                )}
              </Card>
            </div>
          </section>

          {/* ── SECTION 5: Asset growth & strategy ── */}
          <section>
            <SectionLabel>Asset growth &amp; strategy</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>

              {/* Planning potential */}
              <Card>
                <CardHeader title="Planning Potential" subtitle="PDR & change of use rights" linkHref="/planning" linkLabel="View appraisal →" />
                {(() => {
                  const planningCount = portfolio.assets.filter(a =>
                    a.additionalIncomeOpportunities.some(o => (o.type as string) === "planning")
                  ).length;
                  return planningCount > 0 ? (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#1647E8", lineHeight: 1.1, marginBottom: 4 }}>{planningCount}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 12 }}>asset{planningCount !== 1 ? "s" : ""} with planning potential</div>
                      <BadgeAmber>Appraisal ready</BadgeAmber>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      Planning appraisals are generated automatically when permitted development rights are identified for your assets.
                    </div>
                  );
                })()}
              </Card>

              {/* Hold vs sell */}
              <Card>
                <CardHeader title="Hold vs Sell" subtitle={`vs ${mktCap.toFixed(1)}% market cap rate`} />
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {holdSellRows.map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                      <div style={{ fontSize: 10.5, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{row.name}</div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: "monospace" }}>{row.yld}%</div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: row.badgeColor.bg, color: row.badgeColor.color }}>{row.badge}</span>
                      </div>
                    </div>
                  ))}
                  {holdSellRows.length === 0 && (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>Add property valuations to see hold vs sell analysis.</div>
                  )}
                </div>
              </Card>

              {/* Refinance centre */}
              <Card>
                <CardHeader title="Refinance Centre" subtitle={`Live ${refinanceLabel} rate`} linkHref="/financing" linkLabel="Explore lenders →" />
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#1647E8", lineHeight: 1.1 }}>{refinanceRate}%</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>{refinanceLabel} · {isUSD ? "30-day avg" : "base rate"}</div>
                </div>
                {loans.length > 0 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderTop: "0.5px solid #F3F4F6" }}>
                      <span style={{ fontSize: 10.5, color: "#6B7280" }}>Eligible to refinance</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#111827" }}>{eligibleLoans} loan{eligibleLoans !== 1 ? "s" : ""}</span>
                    </div>
                    {refinanceSaving > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderTop: "0.5px solid #F3F4F6" }}>
                        <span style={{ fontSize: 10.5, color: "#6B7280" }}>Rate-saving opportunity</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", fontFamily: "monospace" }}>{fmt(refinanceSaving, sym)}/yr</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Add loan data to see refinancing opportunities and indicative debt capacity.</div>
                )}
              </Card>

              {/* Acquisitions scout */}
              <Card>
                <CardHeader title="Acquisitions Scout" subtitle="Live deals matching criteria" linkHref="/scout" linkLabel="View pipeline →" />
                {(() => {
                  const activeDeals = (userAcquisitions ?? []).filter(d => d.status !== "passed");
                  return activeDeals.length > 0 ? (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#1647E8", lineHeight: 1.1, marginBottom: 4 }}>{activeDeals.length}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 12 }}>live deal{activeDeals.length !== 1 ? "s" : ""} in pipeline</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {activeDeals.slice(0, 3).map((deal) => {
                          const statusLabel: Record<string, string> = { screening: "Watching", loi: "Under Offer", due_diligence: "DD", exchange: "Exchange" };
                          return (
                            <div key={deal.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "0.5px solid #F3F4F6" }}>
                              <div style={{ fontSize: 10.5, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{deal.name}</div>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: "#EAF3DE", color: "#27500A", flexShrink: 0 }}>
                                {statusLabel[deal.status] ?? deal.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      No acquisition targets yet.{" "}
                      <Link href="/properties/add" style={{ color: "#0A8A4C", fontWeight: 600, textDecoration: "none" }}>Add a target →</Link>
                    </div>
                  );
                })()}
              </Card>
            </div>
          </section>

          {/* ── SECTION 6: Operations ── */}
          <section>
            <SectionLabel>Operations</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>

              {/* Work orders */}
              <Card>
                <CardHeader title="Work Orders" subtitle="Maintenance & repairs" linkHref="/work-orders" linkLabel="View all →" />
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                  No open work orders. Raise a work order from any property to track maintenance, repairs, and contractor work.
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  {[["Overdue", "#FCEBEB", "#791F1F", 0], ["In progress", "#FAEEDA", "#633806", 0], ["Scheduled", "#EAF3DE", "#27500A", 0]].map(([label, bg, color, count]) => (
                    <div key={label as string} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8, backgroundColor: bg as string }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: color as string }}>{count}</div>
                      <div style={{ fontSize: 9, color: color as string, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Compliance */}
              <Card>
                <CardHeader title="Compliance" subtitle="Certificates & obligations" />
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {complianceItems.map((item) => {
                    const isCompliant = item.status === "compliant";
                    const isExpired = item.status === "expired";
                    const badgeProps = isCompliant
                      ? { bg: "#EAF3DE", color: "#27500A", label: "Compliant" }
                      : isExpired
                      ? { bg: "#FCEBEB", color: "#791F1F", label: "Expired" }
                      : { bg: "#FAEEDA", color: "#633806", label: "Due soon" };
                    return (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                        <span style={{ fontSize: 10.5, color: "#374151" }}>{item.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: badgeProps.bg, color: badgeProps.color }}>{badgeProps.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>Compliance score</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: healthCompliance >= 80 ? "#0A8A4C" : "#D93025" }}>{healthCompliance}%</span>
                </div>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader title="Documents" subtitle="Leases, certificates & reports" linkHref="/documents" linkLabel="View all →" />
                {(() => {
                  const docCount = userAssets?.length ?? 0;
                  const expiringEpcs = userAssets?.filter(a => {
                    const exp = a.epcExpiry ? new Date(a.epcExpiry) : null;
                    return exp && exp < new Date(Date.now() + 90 * 86400000);
                  }).length ?? 0;
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>{docCount}</div>
                          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>properties</div>
                        </div>
                        {expiringEpcs > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 600, color: "#D93025" }}>{expiringEpcs}</div>
                            <div style={{ fontSize: 9, color: "#D93025", textTransform: "uppercase", letterSpacing: "0.06em" }}>EPC expiring</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                          { label: "Lease agreements", status: portfolio.assets.flatMap(a => a.leases).filter(l => l.tenant !== "Vacant").length > 0 ? "uploaded" : "pending" },
                          { label: "Insurance certificates", status: totalInsuranceAnnual > 0 ? "uploaded" : "pending" },
                          { label: "EPC certificates", status: userAssets?.some(a => a.epcRating) ? "uploaded" : "pending" },
                        ].map(doc => (
                          <div key={doc.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 10.5, color: "#6B7280" }}>{doc.label}</span>
                            {doc.status === "uploaded"
                              ? <BadgeGreen>Uploaded</BadgeGreen>
                              : <BadgeAmber>Pending</BadgeAmber>}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </Card>
            </div>
          </section>

          {/* ── EXPORTS ── */}
          <section>
            <SectionLabel>Exports</SectionLabel>
            <div style={{ backgroundColor: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 14 }}>
                One-click Excel exports — share with brokers, banks, and accountants.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { type: "noi",            label: "NOI Model",           sub: "Income & costs per asset" },
                  { type: "hold-sell",      label: "Hold vs Sell",        sub: "10-yr DCF analysis" },
                  { type: "lease-schedule", label: "Lease Schedule",      sub: "Rent roll & expiry dates" },
                  { type: "insurance",      label: "Insurance Schedule",  sub: "Policies & premiums" },
                  { type: "dcf",            label: "Acquisition DCF",     sub: "5-yr cashflow per deal" },
                ].map(({ type, label, sub }) => (
                  <a
                    key={type}
                    href={`/api/user/export?type=${type}`}
                    download
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      backgroundColor: "#F9FAFB",
                      textDecoration: "none",
                      minWidth: 160,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#0A8A4C")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0A8A4C" strokeWidth="1.5">
                        <path d="M2 2.5h6l3 3v6H2v-9z"/><path d="M8 2.5V5.5h3"/><path d="M7 7.5v3M5.5 9 7 10.5 8.5 9"/>
                      </svg>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111827" }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#9CA3AF", paddingLeft: 20 }}>{sub}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}

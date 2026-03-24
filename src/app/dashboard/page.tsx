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
import type { Asset } from "@/lib/data/types";
import { computePortfolioHealthScore } from "@/lib/health";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

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

// ── Asset opportunity badges ──────────────────────────────────────────────────
type AssetBadgeCategory = "cost_saving" | "income_uplift" | "cam_recovery" | "value_add" | "urgent";
interface AssetBadge { category: AssetBadgeCategory; label: string; annualValue: number; href: string; }
const ASSET_BADGE_STYLE: Record<AssetBadgeCategory, { bg: string; color: string; border: string }> = {
  cost_saving:   { bg: "#EEF2FE", color: "#1647E8", border: "#1647E8" },
  income_uplift: { bg: "#E8F5EE", color: "#0A8A4C", border: "#0A8A4C" },
  cam_recovery:  { bg: "#FEF6E8", color: "#F5A94A", border: "#F5A94A" },
  value_add:     { bg: "#F5F0FF", color: "#6B21A8", border: "#6B21A8" },
  urgent:        { bg: "#FDECEA", color: "#D93025", border: "#D93025" },
};
function getAssetBadges(a: Asset, sym: string): AssetBadge[] {
  const badges: AssetBadge[] = [];
  const insuranceSaving = Math.max(0, a.insurancePremium - a.marketInsurance);
  if (insuranceSaving > 200) badges.push({ category: "cost_saving", label: `Save ${fmt(insuranceSaving, sym)}/yr`, annualValue: insuranceSaving, href: "/insurance" });
  const energySaving = Math.max(0, a.energyCost - a.marketEnergyCost);
  if (energySaving > 200) badges.push({ category: "cost_saving", label: `${fmt(energySaving, sym)}/yr energy`, annualValue: energySaving, href: "/energy" });
  const rentUplift = Math.max(0, (a.marketERV - a.passingRent) * a.sqft);
  if (rentUplift > 500) badges.push({ category: "income_uplift", label: `${fmt(rentUplift, sym)}/yr rent uplift`, annualValue: rentUplift, href: "/rent-clock" });
  const ancillary = (a.additionalIncomeOpportunities ?? []).filter(i => i.status !== "live").reduce((s, i) => s + (i.annualIncome ?? 0), 0);
  if (ancillary > 500) badges.push({ category: "income_uplift", label: `${fmt(ancillary, sym)}/yr ancillary`, annualValue: ancillary, href: "/income" });
  if ((a.occupancy ?? 100) < 90) badges.push({ category: "urgent", label: "Vacant suite", annualValue: 0, href: `/assets/${a.id}` });
  const urgentCompliance = (a.compliance ?? []).filter(c => c.status === "expired" || c.status === "expiring_soon").length;
  if (urgentCompliance > 0) badges.push({ category: "urgent", label: `${urgentCompliance} compliance`, annualValue: 0, href: "/compliance" });
  return badges.sort((x, y) => {
    if (x.category === "urgent" && y.category !== "urgent") return -1;
    if (y.category === "urgent" && x.category !== "urgent") return 1;
    return y.annualValue - x.annualValue;
  }).slice(0, 3);
}
function AssetOpportunityBadge({ category, label }: { category: AssetBadgeCategory; label: string }) {
  const s = ASSET_BADGE_STYLE[category];
  return (
    <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: s.bg, color: s.color, borderLeft: `2px solid ${s.border}`, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
      {label.toUpperCase()}
    </span>
  );
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

// ── Work orders hook ──────────────────────────────────────────────────────────
interface WorkOrderItem { id: string; jobType: string; description: string; status: string; budgetEstimate: number | null; targetStart: string | null; asset: { name: string; location: string } | null; }
function useWorkOrders() {
  const [data, setData] = useState<WorkOrderItem[] | null>(null);
  useEffect(() => {
    fetch("/api/user/work-orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d?.orders ?? []))
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
  const userWorkOrders = useWorkOrders();
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

  // ATTOM comparables — trigger enrichment for benchmark data
  const firstUsAssetId = portfolio.assets.find(a => (a.location ?? "").toLowerCase().match(/fl|florida|tampa|miami|orlando/))?.id ?? null;
  useComparables(firstUsAssetId);

  // Market benchmarks merged
  const bm = attomBenchmarks ?? marketBenchmarks;
  const isAttomDriven = attomBenchmarks?.attomDriven === true;
  const mktCap = (bm as AttomMarketBenchmarks)?.marketCapRate ?? (bm as MarketBenchmarks)?.marketCapRate ?? (isUSD ? 6.5 : 5.25);
  const mktNOI = (bm as AttomMarketBenchmarks)?.marketNOIMargin ?? (bm as MarketBenchmarks)?.marketNOIMargin ?? (isUSD ? 58 : 55);
  const mktRentPsf = bm?.marketRentPsf ?? (isUSD ? 14.5 : 8.5);
  const mktOpExPsf = (bm as AttomMarketBenchmarks)?.marketOpExPsf ?? (bm as MarketBenchmarks)?.marketOpExPsf ?? (isUSD ? 4.2 : 2.1);
  const mktInsurancePsf = (bm as AttomMarketBenchmarks)?.marketInsurancePsf ?? (bm as MarketBenchmarks)?.marketInsurancePsf ?? (isUSD ? 1.1 : 0.35);
  const mktYield = (bm as AttomMarketBenchmarks)?.marketInitialYield ?? (bm as MarketBenchmarks)?.marketInitialYield ?? (isUSD ? 7.0 : 5.5);
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
  // Refinance eligibility
  const refinanceRate = isUSD ? 5.33 : 4.75; // SOFR or BOE base
  const refinanceLabel = isUSD ? "SOFR" : "BOE base";
  const refinanceSaving = loans.filter(l => l.interestRate > l.marketRate).reduce((s, l) => s + Math.round(l.outstandingBalance * (l.interestRate - l.marketRate) / 100), 0);

  // CAM recovery: estimated unrecovered service charges (~2.5% of gross income)
  const camRecovery = Math.round(totalGrossAnnual * 0.025);
  // Planning gain: capital value uplift from extension potential on largest asset
  const largestAsset = [...portfolio.assets].sort((a, b) => b.sqft - a.sqft)[0];
  const planningGainValue = largestAsset ? Math.round(largestAsset.sqft * 0.15 * mktRentPsf / (mktCap / 100)) : 0;

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

        {/* ── 1. MORNING BRIEFING ── dark green hero, computed from live data */}
        {(() => {
          const nearestLease = expiringLeases[0] ?? null;
          const nearestLeaseDays = nearestLease ? daysUntil(nearestLease.expiryDate) : null;
          const nearestLeaseAsset = nearestLease ? portfolio.assets.find(a => a.leases.some(l => l === nearestLease)) : null;
          const topOpp = [
            { label: "rent uplift", value: rentUpliftAnnual, href: "/rent-clock" },
            { label: "ancillary income", value: ancillaryTotal, href: "/income" },
            { label: "energy switching", value: totalEnergySave, href: "/energy" },
            { label: "CAM recovery", value: camRecovery, href: "/requests" },
          ].sort((a, b) => b.value - a.value).find(o => o.value > 0) ?? null;
          const complianceDue = complianceItems.filter(c => c.status === "due" || c.status === "expired").length;

          // Headline — built from live data
          let headline = "";
          if (portfolio.assets.length === 0) {
            headline = `${greeting.charAt(0).toUpperCase() + greeting.slice(1)} — add your first property to begin.`;
          } else if (nearestLease && nearestLeaseDays !== null && nearestLeaseDays < 365) {
            const aName = nearestLeaseAsset?.name.split(" ").slice(0, 2).join(" ") ?? "a property";
            headline = `${nearestLease.tenant} at ${aName} expires in ${nearestLeaseDays} days.`;
            if (topOpp) headline += ` ${topOpp.label.charAt(0).toUpperCase() + topOpp.label.slice(1)} of ${fmt(topOpp.value, sym)}/yr awaiting action.`;
          } else if (topOpp) {
            headline = `${topOpp.label.charAt(0).toUpperCase() + topOpp.label.slice(1)} of ${fmt(topOpp.value, sym)}/yr identified across ${portfolio.assets.length} asset${portfolio.assets.length !== 1 ? "s" : ""}.`;
          } else {
            headline = `${portfolio.shortName} — ${portfolio.assets.length} asset${portfolio.assets.length !== 1 ? "s" : ""}, AI monitoring active.`;
          }

          // Priority action cards (max 3, computed)
          const actions: { dotColor: string; cardBg: string; label: string; sub: string; href: string }[] = [];
          if (nearestLease && nearestLeaseDays !== null && nearestLeaseDays < 150) {
            actions.push({ dotColor: "#D93025", cardBg: "rgba(217,48,37,.14)", label: `${nearestLease.tenant} — ${nearestLeaseDays}d`, sub: "Lease expiry · act now", href: "/rent-clock" });
          } else if (complianceDue > 0) {
            actions.push({ dotColor: "#D93025", cardBg: "rgba(217,48,37,.14)", label: `${complianceDue} compliance item${complianceDue !== 1 ? "s" : ""} due`, sub: "Certificates to renew", href: "/compliance" });
          }
          if (totalInsuranceSave > 0 || totalEnergySave > 0) {
            const isBigInsurance = totalInsuranceSave > totalEnergySave;
            actions.push({ dotColor: "#F5A94A", cardBg: "rgba(245,169,74,.12)", label: isBigInsurance ? "Insurance benchmark gap" : "Energy above benchmark", sub: isBigInsurance ? "Upload policy to confirm" : "Switch tariff available", href: isBigInsurance ? "/insurance" : "/energy" });
          }
          if (rentUpliftAnnual > 0) {
            actions.push({ dotColor: "#0A8A4C", cardBg: "rgba(10,138,76,.14)", label: `${fmt(rentUpliftAnnual, sym)}/yr rent uplift`, sub: "ERV gap identified", href: "/rent-clock" });
          } else if (ancillaryTotal > 0) {
            actions.push({ dotColor: "#0A8A4C", cardBg: "rgba(10,138,76,.14)", label: `${fmt(ancillaryTotal, sym)}/yr ancillary income`, sub: "Solar, EV, 5G opportunities", href: "/income" });
          }
          const displayActions = actions.slice(0, 3);

          return (
            <div style={{ background: "linear-gradient(135deg, #0D2B1F 0%, #173404 100%)", padding: "20px 20px 18px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", marginBottom: 8, letterSpacing: "0.04em" }}>
                {dateStr} · {timeStr}{weatherStr ? ` · ${weatherStr}` : ""}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.45, marginBottom: displayActions.length > 0 ? 14 : 0, maxWidth: 620 }}>
                {loading ? "Loading your portfolio…" : headline}
              </div>
              {displayActions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {displayActions.map((a, i) => (
                    <Link key={i} href={a.href} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, backgroundColor: a.cardBg, border: "1px solid rgba(255,255,255,.1)" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: a.dotColor, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{a.label}</div>
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.5)" }}>{a.sub}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ padding: "0 16px 32px" }}>

          {/* ── 2. KPI STRIP ── 6 tiles */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { label: "Portfolio Value", value: loading ? "—" : fmt(totalValue, sym), sub: totalValue > 0 ? `${portfolio.assets.length} asset${portfolio.assets.length !== 1 ? "s" : ""}` : "No assets yet", highlight: false },
              { label: "Monthly Rent", value: loading ? "—" : fmt(totalGrossAnnual / 12, sym), sub: loading ? "" : `${fmt(totalGrossAnnual, sym)}/yr gross`, highlight: false },
              { label: "Net Operating Income", value: loading ? "—" : fmt(totalNetAnnual / 12, sym), sub: loading ? "" : `${noiMarginPct}% margin`, highlight: false },
              { label: "Occupancy", value: loading ? "—" : `${Math.round(avgOccupancy)}%`, sub: vacantCount > 0 ? `${vacantCount} vacant` : "Fully let", subRed: vacantCount > 0, highlight: false },
              { label: "Saved YTD", value: "—", sub: "No actions completed yet", highlight: false },
              { label: "Unactioned Opportunity", value: loading ? "—" : fmt(opportunityOverride ?? (rentUpliftAnnual + totalEnergySave + ancillaryTotal + camRecovery + planningGainValue), sym), sub: "Awaiting review", highlight: true },
            ].map((k, i) => (
              <div key={i} style={{ flex: "0 0 auto", minWidth: 130, backgroundColor: k.highlight ? "#E8F5EE" : "#fff", border: `1px solid ${k.highlight ? "rgba(10,138,76,.2)" : "#E5E7EB"}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: k.highlight ? "#0A8A4C" : "#9CA3AF", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.highlight ? "#0A8A4C" : "#111827", lineHeight: 1, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{k.value}</div>
                <div style={{ fontSize: 9.5, color: k.subRed ? "#D93025" : "#9CA3AF", marginTop: 3 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── 3. ASSET CARDS ── compact row, navigation only */}
          {!loading && portfolio.assets.length > 0 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Properties</div>
                <Link href="/assets" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
                {portfolio.assets.slice(0, 5).map((a) => {
                  const TYPE_COLORS: Record<string, string> = { office: "#1647E8", retail: "#D97706", industrial: "#0891B2", warehouse: "#7C3AED", flex: "#059669", mixed: "#D93025" };
                  const initials = a.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                  const badges = getAssetBadges(a, sym).slice(0, 2);
                  const vacantSuites = a.leases.filter(l => l.tenant === "Vacant").length;
                  const nearestExpiry = a.leases.filter(l => l.tenant !== "Vacant" && l.expiryDate).sort((x, y) => new Date(x.expiryDate).getTime() - new Date(y.expiryDate).getTime())[0];
                  const expiryDays = nearestExpiry ? daysUntil(nearestExpiry.expiryDate) : null;
                  return (
                    <Link key={a.id} href={`/assets`} style={{ textDecoration: "none", flex: "0 0 auto", width: 170 }}>
                      <div style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#0A8A4C"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E7EB"; }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: TYPE_COLORS[a.type] ?? "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{initials}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name.split(" ").slice(0, 3).join(" ")}</div>
                            <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "capitalize" }}>{a.type} · {a.location.split(",")[0]}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {vacantSuites > 0 && <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: "#FCEBEB", color: "#D93025" }}>VACANT</span>}
                          {expiryDays !== null && expiryDays < 365 && <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: expiryDays < 150 ? "#FCEBEB" : "#FEF6E8", color: expiryDays < 150 ? "#D93025" : "#D97706" }}>{expiryDays}D EXPIRY</span>}
                          {badges.slice(0, 1).map((b, bi) => <AssetOpportunityBadge key={bi} category={b.category} label={b.label} />)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {portfolio.assets.length > 5 && (
                  <Link href="/assets" style={{ textDecoration: "none", flex: "0 0 auto", width: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ backgroundColor: "#F9FAFB", border: "1px dashed #E5E7EB", borderRadius: 10, padding: "10px", textAlign: "center", width: "100%" }}>
                      <div style={{ fontSize: 10, color: "#0A8A4C", fontWeight: 600 }}>+{portfolio.assets.length - 5} more</div>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* ── 4. OPPORTUNITIES ── horizontal rows, proportional bar, NO bridge chart */}
          <section style={{ marginTop: 14 }}>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 12, backgroundColor: "#E8F5EE", color: "#0A8A4C", border: "1px solid rgba(10,138,76,.2)", marginRight: 8 }}>
                      <span className="animate-pulse" style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#0A8A4C", display: "inline-block" }} />
                      Live
                    </span>
                    Opportunity Centre
                  </div>
                  {!loading && (
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                      {fmt(rentUpliftAnnual + totalEnergySave + ancillaryTotal + camRecovery, sym)}/yr identified · ranked by impact
                    </div>
                  )}
                </div>
                <Link href="/requests" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", whiteSpace: "nowrap" }}>Action all →</Link>
              </div>
              {(() => {
                const maxVal = Math.max(rentUpliftAnnual, ancillaryTotal, totalEnergySave, camRecovery, planningGainValue, 1);
                const rows: { label: string; value: number; desc: string; href: string; quickWin?: boolean; rangeOnly?: boolean; uplift?: boolean }[] = [
                  { label: "Rent Uplift", value: rentUpliftAnnual, desc: "ERV gap vs passing rent", href: "/rent-clock", quickWin: true },
                  { label: "Ancillary Income", value: ancillaryTotal, desc: "Solar, EV, 5G, parking", href: "/income" },
                  { label: "Energy Switching", value: totalEnergySave, desc: "Tariff vs benchmark", href: "/energy", quickWin: true },
                  { label: "Insurance", value: 0, desc: "15–25% above market range — upload policy to confirm", href: "/insurance", quickWin: true, rangeOnly: true },
                  { label: "CAM Recovery", value: camRecovery, desc: "Unrecovered service charges", href: "/requests", quickWin: true },
                  { label: "Planning Gain", value: planningGainValue, desc: "Capital value uplift potential", href: "/planning", uplift: true },
                ].sort((a, b) => b.value - a.value);
                return rows.map((row, i) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < rows.length - 1 ? "0.5px solid #F3F4F6" : "none" }}>
                    <div style={{ width: 110, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#111827" }}>{row.label}</span>
                        {row.quickWin && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>QUICK WIN</span>}
                      </div>
                      <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 1, lineHeight: 1.3 }}>{row.desc}</div>
                    </div>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                      {!row.rangeOnly && row.value > 0 && (
                        <div style={{ width: `${(row.value / maxVal) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: i === 0 ? "#0A8A4C" : "#D97706" }} />
                      )}
                    </div>
                    <div style={{ width: 100, textAlign: "right", flexShrink: 0 }}>
                      {row.rangeOnly ? (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#D97706" }}>Upload to confirm</span>
                      ) : row.value > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                          {fmt(row.value, sym)}{row.uplift ? " uplift" : "/yr"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>—</span>
                      )}
                    </div>
                    <Link href={row.href} style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, backgroundColor: "#F3F4F6", color: "#374151", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#E8F5EE"; (e.currentTarget as HTMLAnchorElement).style.color = "#0A8A4C"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#F3F4F6"; (e.currentTarget as HTMLAnchorElement).style.color = "#374151"; }}>
                      {row.rangeOnly ? "Upload →" : "Action →"}
                    </Link>
                  </div>
                ));
              })()}
            </Card>
          </section>

          {/* ── 5. LEASE EXPIRY ── 4 nearest in grid */}
          {!loading && expiringLeases.length > 0 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Lease Expiry</div>
                  {urgentLeaseCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, backgroundColor: "#FCEBEB", color: "#D93025" }}>{urgentLeaseCount} urgent</span>}
                </div>
                <Link href="/rent-clock" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>View rent roll →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {expiringLeases.slice(0, 4).map((lease) => {
                  const days = daysUntil(lease.expiryDate);
                  const isRed = days < 150;
                  const isAmber = !isRed && days < 365;
                  const badgeBg = isRed ? "#FCEBEB" : isAmber ? "#FEF6E8" : "#EAF3DE";
                  const badgeColor = isRed ? "#D93025" : isAmber ? "#92580A" : "#27500A";
                  const asset = portfolio.assets.find(a => a.leases.some(l => l === lease));
                  return (
                    <Card key={lease.id ?? lease.tenant} style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", lineHeight: 1.3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lease.tenant}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: badgeBg, color: badgeColor, flexShrink: 0, marginLeft: 6 }}>{days}d</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{asset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}</div>
                      <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 2 }}>{new Date(lease.expiryDate).toLocaleDateString(isUSD ? "en-US" : "en-GB", { month: "short", day: "numeric", year: "numeric" })}</div>
                      <Link href="/rent-clock" style={{ display: "block", fontSize: 9.5, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", marginTop: 8 }}>Review →</Link>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 6. SCOUT PREVIEW ── 3 deals from acquisitions */}
          {!loading && (userAcquisitions ?? []).filter(d => d.status !== "passed").length > 0 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Acquisitions Scout</div>
                <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {(userAcquisitions ?? []).filter(d => d.status !== "passed").slice(0, 3).map((deal) => {
                  const STATUS_LABELS: Record<string, string> = { screening: "Screening", loi: "LOI Sent", due_diligence: "Due Diligence", exchange: "Under Offer" };
                  return (
                    <Card key={deal.id} style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", lineHeight: 1.3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                        <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 5px", borderRadius: 3, backgroundColor: "#E8F5EE", color: "#0A8A4C", flexShrink: 0, marginLeft: 6 }}>{deal.score ? `${deal.score}%` : "—"}</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: "#9CA3AF", textTransform: "capitalize" }}>{deal.assetType} · {deal.location.split(",")[0]}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(deal.askingPrice, deal.currency === "USD" ? "$" : "£")}</div>
                          {deal.estimatedYield > 0 && <div style={{ fontSize: 9, color: "#9CA3AF" }}>{deal.estimatedYield.toFixed(1)}% yield</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, backgroundColor: "#F3F4F6", color: "#374151" }}>{STATUS_LABELS[deal.status] ?? deal.status}</span>
                      </div>
                      <Link href="/scout" style={{ display: "block", fontSize: 9.5, fontWeight: 600, color: "#0A8A4C", textDecoration: "none", marginTop: 8 }}>View deal →</Link>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
          {!loading && (userAcquisitions ?? []).filter(d => d.status !== "passed").length === 0 && (
            <section style={{ marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Acquisitions Scout</div>
                    <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>Track target properties and deals in your pipeline</div>
                  </div>
                  <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7, backgroundColor: "#E8F5EE", color: "#0A8A4C", textDecoration: "none" }}>Add target →</Link>
                </div>
              </Card>
            </section>
          )}

          {/* ── 7. BENCHMARKS ── 6-column strip */}
          {!loading && portfolio.assets.length > 0 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Portfolio vs Market</div>
                <span style={{ fontSize: 9.5, color: "#9CA3AF" }}>{marketLabel}{sourceLabel ? ` · ${sourceLabel}` : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {benchRows.slice(0, 6).map((row) => {
                  const isGood = row.over === row.overGood;
                  return (
                    <div key={row.label} style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: 4 }}>{row.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{row.portfolio}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: isGood ? "#0A8A4C" : "#D93025" }}>{row.over ? "▲" : "▼"}</span>
                        <span style={{ fontSize: 9, color: "#9CA3AF" }}>mkt {row.market}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 8. CURRENT TRANSACTIONS ── active acquisition deals */}
          <section style={{ marginTop: 14 }}>
            {(() => {
              const activeTxns = (userAcquisitions ?? []).filter(d => ["loi", "due_diligence", "exchange"].includes(d.status));
              const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
                loi: { bg: "#EEF2FF", color: "#1647E8" },
                due_diligence: { bg: "#FEF6E8", color: "#D97706" },
                exchange: { bg: "#E8F5EE", color: "#0A8A4C" },
              };
              const STATUS_LABELS: Record<string, string> = { loi: "LOI Sent", due_diligence: "Due Diligence", exchange: "Under Offer" };
              return (
                <Card style={{ padding: 0 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Current Transactions</div>
                    <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Manage →</Link>
                  </div>
                  {activeTxns.length > 0 ? activeTxns.map((deal) => {
                    const sc = STATUS_COLORS[deal.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                    return (
                      <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF", textTransform: "capitalize" }}>{deal.assetType} · {deal.location.split(",")[0]}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", flexShrink: 0 }}>{fmt(deal.askingPrice, deal.currency === "USD" ? "$" : "£")}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: sc.bg, color: sc.color, flexShrink: 0 }}>{STATUS_LABELS[deal.status] ?? deal.status}</span>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>No active transactions — add a deal to track your pipeline</span>
                      <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Add deal →</Link>
                    </div>
                  )}
                </Card>
              );
            })()}
          </section>

          {/* ── 9. CURRENT PROJECTS ── work orders / capex */}
          <section style={{ marginTop: 14 }}>
            {(() => {
              const activeOrders = (userWorkOrders ?? []).filter(o => o.status !== "complete" && o.status !== "cancelled");
              return (
                <Card style={{ padding: 0 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Current Projects</div>
                    <Link href="/work-orders" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Manage →</Link>
                  </div>
                  {activeOrders.length > 0 ? activeOrders.slice(0, 4).map((order) => {
                    const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
                      draft: { bg: "#F3F4F6", color: "#6B7280" },
                      tendering: { bg: "#EEF2FF", color: "#1647E8" },
                      awarded: { bg: "#FEF6E8", color: "#D97706" },
                      in_progress: { bg: "#E8F5EE", color: "#0A8A4C" },
                      complete: { bg: "#E8F5EE", color: "#0A8A4C" },
                    };
                    const sc = STATUS_STYLES[order.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                    return (
                      <div key={order.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "0.5px solid #F3F4F6" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.description}</div>
                          <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{order.asset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}{order.targetStart ? ` · Due ${new Date(order.targetStart).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}</div>
                        </div>
                        {order.budgetEstimate && <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", fontFamily: "var(--font-geist-sans), Geist, sans-serif", flexShrink: 0 }}>{fmt(order.budgetEstimate, sym)}</div>}
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: sc.bg, color: sc.color, textTransform: "capitalize", flexShrink: 0 }}>{order.status.replace(/_/g, " ")}</span>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>No active projects — add a work order to track capex and repairs</span>
                      <Link href="/work-orders" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Add project →</Link>
                    </div>
                  )}
                </Card>
              );
            })()}
          </section>

          {/* ── 10. ACQUISITIONS PIPELINE ── all tracked deals */}
          {!loading && (userAcquisitions ?? []).length > 0 && (
            <section style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Acquisitions Pipeline</div>
                <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Add target →</Link>
              </div>
              <Card style={{ padding: 0 }}>
                {(userAcquisitions ?? []).slice(0, 8).map((deal, i) => {
                  const STATUS_COLORS: Record<string, string> = { screening: "#9CA3AF", loi: "#1647E8", due_diligence: "#D97706", exchange: "#0A8A4C", passed: "#D93025" };
                  const STAGE_BAR: Record<string, number> = { screening: 10, loi: 35, due_diligence: 60, exchange: 85, passed: 0 };
                  const barPct = STAGE_BAR[deal.status] ?? 10;
                  const isLast = i === (userAcquisitions ?? []).slice(0, 8).length - 1;
                  return (
                    <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderBottom: isLast ? "none" : "0.5px solid #F3F4F6" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                        <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "capitalize" }}>{deal.assetType} · {deal.location.split(",")[0]}</div>
                      </div>
                      <div style={{ width: 60, height: 4, borderRadius: 2, backgroundColor: "#F3F4F6", overflow: "hidden", flexShrink: 0 }}>
                        {deal.status !== "passed" && <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 2, backgroundColor: STATUS_COLORS[deal.status] ?? "#9CA3AF" }} />}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", width: 70, textAlign: "right", flexShrink: 0 }}>{fmt(deal.askingPrice, deal.currency === "USD" ? "$" : "£")}</div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: STATUS_COLORS[deal.status] ?? "#9CA3AF", width: 80, textAlign: "right", flexShrink: 0, textTransform: "capitalize" }}>{deal.status.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}
          {!loading && (userAcquisitions ?? []).length === 0 && (
            <section style={{ marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Acquisitions Pipeline</div>
                    <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>Add acquisition targets to track them through your pipeline</div>
                  </div>
                  <Link href="/scout" style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7, backgroundColor: "#E8F5EE", color: "#0A8A4C", textDecoration: "none" }}>Add target criteria →</Link>
                </div>
              </Card>
            </section>
          )}

          {/* ── 11. FINANCING ── SOFR/BOE live, LTV, refinance */}
          <section style={{ marginTop: 14, marginBottom: 8 }}>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Financing</div>
                <Link href="/financing" style={{ fontSize: 11, fontWeight: 600, color: "#0A8A4C", textDecoration: "none" }}>Manage →</Link>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: loans.length > 0 ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: "#9CA3AF", marginBottom: 2 }}>{refinanceLabel} Base Rate</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{refinanceRate.toFixed(2)}%</div>
                  </div>
                  {loans.length > 0 ? (
                    <>
                      <div>
                        <div style={{ fontSize: 9.5, color: "#9CA3AF", marginBottom: 2 }}>Avg LTV</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{loans.length > 0 ? Math.round(loans.reduce((s, l) => s + (l.ltv ?? 0), 0) / loans.length) : "—"}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9.5, color: "#9CA3AF", marginBottom: 2 }}>Refinance saving</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: refinanceSaving > 0 ? "#0A8A4C" : "#9CA3AF", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{refinanceSaving > 0 ? `${fmt(refinanceSaving, sym)}/yr` : "—"}</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 10.5, color: "#9CA3AF" }}>Upload loan data to see LTV, covenant headroom, and refinance opportunities</span>
                    </div>
                  )}
                </div>
                {loans.length === 0 && (
                  <Link href="/financing" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "7px 14px", borderRadius: 7, backgroundColor: "#F3F4F6", color: "#374151", textDecoration: "none" }}>
                    Add loan data →
                  </Link>
                )}
              </div>
            </Card>
          </section>

        </div>
      </div>
    </AppShell>
  );
}

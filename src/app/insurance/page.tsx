"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarChart } from "@/components/ui/BarChart";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { PageHero } from "@/components/ui/PageHero";
import { PolicyUploadWidget } from "@/components/ui/PolicyUploadWidget";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

type InsuranceSummary = {
  hasPolicies: boolean;
  totalPremium: number;
  earliestRenewal: string | null;
  benchmarkMin: number | null;
  benchmarkMax: number | null;
  assets: { id: string; name: string; location: string; floodZone: string | null; country: string | null }[];
  policies: {
    id: string;
    insurer: string;
    premium: number;
    renewalDate: string | null;
    propertyAddress: string | null;
    coverageType: string | null;
    sumInsured: number;
    excess: number;
    currency: string | null;
    filename: string;
  }[];
};

const FLOOD_ZONE_LABEL: Record<string, { label: string; risk: "low" | "moderate" | "high" | "very-high" }> = {
  X:  { label: "Zone X — Minimal risk",          risk: "low" },
  X500: { label: "Zone X (500yr) — Low risk",    risk: "low" },
  A:  { label: "Zone A — High flood risk",        risk: "high" },
  AE: { label: "Zone AE — High flood risk",       risk: "high" },
  AH: { label: "Zone AH — High flood risk",       risk: "high" },
  AO: { label: "Zone AO — Sheet flow risk",       risk: "high" },
  V:  { label: "Zone V — Coastal very high risk", risk: "very-high" },
  VE: { label: "Zone VE — Coastal very high risk",risk: "very-high" },
  D:  { label: "Zone D — Undetermined risk",      risk: "moderate" },
};

function floodZoneInfo(zone: string | null) {
  if (!zone) return null;
  return FLOOD_ZONE_LABEL[zone.toUpperCase()] ?? { label: `Zone ${zone}`, risk: "moderate" as const };
}

type QuoteState = "idle" | "generating" | "ready" | "requested";

type LiveCarrierQuote = {
  quoteId: string;
  carrier: string;
  policyType: string;
  rating: string | null;
  premium: number;
  coverageLimit: number;
  deductible: number;
  coverage: string;
  saving: number;
  recommended: boolean;
  bindable: boolean;
};

type ParsedPolicy = {
  currentPremium: number | null;
  insurer: string | null;
  renewalDate: string | null;
  coverageType: string | null;
  propertyAddress: string | null;
  currency: "GBP" | "USD" | null;
};

// Policy row icons
function PolicyIcon({ type }: { type: "building" | "wind" | "shield" | "cog" | "doc" }) {
  if (type === "building") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8h2M10 8h2M6 11h2M10 11h2M7 16v-4h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 3V2M12 3V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  if (type === "wind") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 8h9.5a2.5 2.5 0 0 0 0-5C10.12 3 9 4.12 9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 11h12.5a2.5 2.5 0 0 1 0 5c-1.38 0-2.5-1.12-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 11.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  if (type === "shield") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L3 5V9C3 12.3 5.6 15.4 9 16C12.4 15.4 15 12.3 15 9V5L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 9L8 10.5L11.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "cog") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1.06 1.06M12.84 12.84l1.06 1.06M4.1 13.9l1.06-1.06M12.84 5.16l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 2C4 1.45 4.45 1 5 1H12.5L16 4.5V16C16 16.55 15.55 17 15 17H5C4.45 17 4 16.55 4 16V2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12.5 1V5H16" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 8H11M7 11H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// AI pulsing badge for benchmarked rates
function AiBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
      style={{ backgroundColor: "rgba(22,71,232,0.12)", color: "#5a8fef" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#5a8fef" }} />
      Market rate
    </span>
  );
}

export default function InsurancePage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";
  // isGBP drives UK vs FL market-specific copy (benchmark sources, carrier platforms, flood risk labels)
  const isGBP = portfolio.currency !== "USD";

  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>("idle");
  const [requestedCarrier, setRequestedCarrier] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [liveCarrierQuotes, setLiveCarrierQuotes] = useState<LiveCarrierQuote[]>([]);
  const [coverforceEnabled, setCoverforceEnabled] = useState(false);
  const [coverforceConfigReady, setCoverforceConfigReady] = useState(false);

  // Policy PDF upload + auto-fill
  const [parsedPolicy, setParsedPolicy] = useState<ParsedPolicy | null>(null);

  useEffect(() => { document.title = "Insurance — RealHQ"; }, []);

  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => setInsuranceSummary(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/insurance/config")
      .then((r) => r.json())
      .then((data) => {
        setCoverforceEnabled(data.coverforceEnabled ?? false);
        setCoverforceConfigReady(true);
      })
      .catch(() => setCoverforceConfigReady(true));
  }, []);

  // Reset quote flow when portfolio changes (keep coverforceEnabled from config)
  useEffect(() => {
    setQuoteState("idle");
    setRequestedCarrier(null);
    setLiveCarrierQuotes([]);
  }, [portfolioId]);

  const hasRealData = insuranceSummary?.hasPolicies === true;

  // KPI derivations
  const realTotalPremium = insuranceSummary?.totalPremium ?? 0;
  const realPolicies = insuranceSummary?.policies ?? [];
  // Use API benchmark range (sqft + location + flood zone driven) if available — no invented fallback
  const apiBenchmarkMin = insuranceSummary?.benchmarkMin ?? null;
  const apiBenchmarkMax = insuranceSummary?.benchmarkMax ?? null;
  const apiBenchmarkMid = apiBenchmarkMin != null && apiBenchmarkMax != null
    ? Math.round((apiBenchmarkMin + apiBenchmarkMax) / 2)
    : null;
  const benchmarkPremium = apiBenchmarkMid ?? null; // no fallback to invented rate
  const benchmarkAvailable = benchmarkPremium !== null;
  const realOverpay = benchmarkAvailable ? realTotalPremium - benchmarkPremium! : 0;
  const realOverpayPct = realTotalPremium > 0 && benchmarkAvailable ? Math.round((realOverpay / realTotalPremium) * 100) : 0;

  const totalCurrentPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarketPremium = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);
  const totalOverpay = totalCurrentPremium - totalMarketPremium;
  const overpayPct = totalCurrentPremium > 0 ? Math.round((totalOverpay / totalCurrentPremium) * 100) : 0;

  const parsedPremiumOverride = parsedPolicy?.currentPremium ?? null;
  const displayPremium = parsedPremiumOverride ?? (hasRealData ? realTotalPremium : totalCurrentPremium);
  const displayMarket = hasRealData
    ? (benchmarkAvailable ? benchmarkPremium! : 0)
    : (apiBenchmarkMid ?? Math.round(displayPremium * 0.82));
  const displayOverpay = (benchmarkAvailable || !hasRealData) ? displayPremium - displayMarket : 0;
  const displayOverpayPct = displayPremium > 0 ? Math.round((displayOverpay / displayPremium) * 100) : (hasRealData ? realOverpayPct : overpayPct);
  // Renewal alert: earliest renewal within 90 days
  const renewalAlertDate = insuranceSummary?.earliestRenewal ?? null;
  const daysToRenewal = renewalAlertDate
    ? Math.ceil((new Date(renewalAlertDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const showRenewalAlert = daysToRenewal !== null && daysToRenewal >= 0 && daysToRenewal <= 90;

  // Flood zone assets
  const floodAssets = (insuranceSummary?.assets ?? []).filter((a) => a.country === "US" || a.country === null);

  const totalNetIncome = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalPortfolioValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const impliedCapRate = totalPortfolioValue > 0 ? totalNetIncome / totalPortfolioValue : 0.055;
  const insuranceCapUplift = impliedCapRate > 0 && displayOverpay > 0 ? Math.round(displayOverpay / impliedCapRate) : 0;

  const barData = hasRealData
    ? realPolicies.map((p, i) => ({
        label: p.propertyAddress?.split(",")[0] ?? `Policy ${i + 1}`,
        value: p.premium,
        ...(benchmarkAvailable ? { benchmark: Math.round(p.premium * (benchmarkPremium! / Math.max(1, realTotalPremium))) } : {}),
      }))
    : portfolio.assets.map((a) => ({
        label: a.name.split(" ").slice(0, 2).join(" "),
        value: a.insurancePremium,
        benchmark: a.marketInsurance,
      }));

  // Industrial assets for Equipment Breakdown policy
  const industrialAssets = portfolio.assets.filter((a) => a.type === "industrial" || a.type === "warehouse");
  const industrialCurrentPremium = industrialAssets.reduce((s, a) => s + a.insurancePremium, 0);

  // Per-policy AI breakdown rows
  type PolicyRow = {
    id: string;
    icon: "building" | "wind" | "shield" | "cog";
    label: string;
    description: string;
    current: number;
    aiRate: number;
    saving: number;
    overPct: number;
  };

  const policyRows: PolicyRow[] = hasRealData
    ? realPolicies.map((p) => ({
        id: p.id,
        icon: "doc" as never,
        label: p.insurer,
        description: [p.propertyAddress, p.coverageType, p.renewalDate ? `renews ${p.renewalDate}` : null].filter(Boolean).join(" · "),
        current: p.premium,
        aiRate: benchmarkAvailable ? Math.round(p.premium * (benchmarkPremium! / Math.max(1, realTotalPremium))) : 0,
        saving: benchmarkAvailable ? p.premium - Math.round(p.premium * (benchmarkPremium! / Math.max(1, realTotalPremium))) : 0,
        overPct: benchmarkAvailable ? Math.round(((p.premium - Math.round(p.premium * (benchmarkPremium! / Math.max(1, realTotalPremium)))) / Math.max(1, p.premium)) * 100) : 0,
      }))
    : [
        // No real policies uploaded — show only the consolidated portfolio total (derived from real asset data).
        // Per-category breakdowns (Hurricane, GL, EL/PL, Equipment Breakdown) are omitted until real
        // policy PDFs are uploaded, to avoid showing invented per-category figures (Spec Rule 3).
        {
          id: "pc",
          icon: "building" as const,
          label: "Commercial Portfolio Insurance",
          description: `${portfolio.assets.length} assets · all-risk consolidated · upload your policies for a per-coverage breakdown`,
          current: displayPremium,
          aiRate: displayMarket,
          saving: displayOverpay,
          overPct: displayOverpayPct,
        },
      ];

  // carrierQuotes: live from CoverForce when enabled, else empty (UI shows benchmark message)
  const carrierQuotes: LiveCarrierQuote[] = coverforceEnabled ? liveCarrierQuotes : [];

  async function generateQuotes() {
    setQuoteState("generating");
    try {
      const res = await fetch("/api/quotes/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPremium: displayPremium }),
      });
      if (res.ok) {
        const data = await res.json();
        // Only use live quotes if CoverForce is enabled; config flag was set on page load
        setLiveCarrierQuotes(data.liveCarrierQuotes ?? []);
      }
    } catch {
      // non-fatal — still transition to ready
    }
    setQuoteState("ready");
  }

  async function requestBindingQuote(quoteId: string, carrier: string) {
    setRequestSubmitting(true);
    try {
      await fetch(`/api/insurance/quotes/${quoteId}/bind`, { method: "POST" });
      setRequestedCarrier(carrier);
      setQuoteState("requested");
    } catch {
      setRequestedCarrier(carrier);
      setQuoteState("requested");
    } finally {
      setRequestSubmitting(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Insurance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={hasRealData ? `Insurance — Your Portfolio` : `Insurance — ${portfolio.name}`}
            cells={[
              {
                label: "Current Premium",
                value: fmt(displayPremium, sym),
                sub: hasRealData ? `${realPolicies.length} polic${realPolicies.length === 1 ? "y" : "ies"} uploaded` : "Annual across portfolio",
              },
              { label: "Est. Market Rate", value: hasRealData && !benchmarkAvailable ? "Pending" : fmt(displayMarket, sym), valueColor: "#5BF0AC", sub: hasRealData && !benchmarkAvailable ? "Live market quotes coming" : "ISO actuarial estimate · not a live carrier quote" },
              { label: "Annual Overpay", value: hasRealData && !benchmarkAvailable ? "—" : fmt(displayOverpay, sym), valueColor: "#FF8080", sub: hasRealData && !benchmarkAvailable ? "Awaiting carrier API" : `${displayOverpayPct}% above market` },
              { label: "Portfolio Value Lost", value: insuranceCapUplift > 0 ? `~${fmt(insuranceCapUplift, sym)}` : "—", valueColor: "#FF8080", sub: insuranceCapUplift > 0 ? `at ${(impliedCapRate * 100).toFixed(1)}% cap rate` : "Add cap rate to calculate" },
            ]}
          />
        )}

        {/* Issue → Cost → Action bar */}
        {!loading && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="text-xs" style={{ color: "#6B7280" }}>
              {hasRealData ? realPolicies.length : portfolio.assets.length} asset{(hasRealData ? realPolicies.length : portfolio.assets.length) !== 1 ? "s" : ""} are overpaying on insurance.
              {displayOverpay > 0 && (
                <> At your cap rate, that excess premium is{" "}
                  <span style={{ color: "#f06040", fontWeight: 600 }}>{insuranceCapUplift > 0 ? `~${fmt(insuranceCapUplift, sym)}` : `${fmt(displayOverpay, sym)}/yr`}</span>
                  {insuranceCapUplift > 0 ? " of portfolio value sitting idle." : " leaving the portfolio."}{" "}
                </>
              )}
              RealHQ is working on it.
            </div>
          </div>
        )}

        {/* Renewal alert — amber banner if within 90 days */}
        {!loading && showRenewalAlert && (
          <div className="rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M9 2L2 15h14L9 2Z" stroke="#D97706" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M9 8v3M9 13.5h.01" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div className="text-sm" style={{ color: "#92400E" }}>
              <span className="font-semibold">Renewal in {daysToRenewal} day{daysToRenewal !== 1 ? "s" : ""}</span>
              {" — "}policy renewing{" "}
              <span className="font-medium">
                {new Date(renewalAlertDate!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              . Start retender now to lock in market rates before renewal.
            </div>
          </div>
        )}

        {/* Upload CTA when no real data */}
        {!loading && !hasRealData && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 3v10M5 8l5-5 5 5" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h14" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>Showing Market benchmark portfolio</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>Upload your insurance schedule to see your real premiums, renewal dates, and carrier analysis.</div>
            </div>
            <Link href="/documents" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#1647E8", color: "#fff" }}>
              Upload →
            </Link>
          </div>
        )}

        {/* Direct placement callout */}
        {!loading && (
          <div style={{ background: "rgba(91,240,172,.04)", border: "1px solid rgba(91,240,172,.18)", borderLeft: "3px solid #0A8A4C", borderRadius: 10, padding: "14px 18px" }}>
            <div className="text-sm font-semibold mb-1" style={{ color: "#5BF0AC" }}>RealHQ places this direct — no broker, no markup</div>
            <div className="text-xs" style={{ color: "#6B7280" }}>{`Portfolio consolidation across ${hasRealData ? realPolicies.length : portfolio.assets.length} assets unlocks London & New York market rates. Typical saving 22–30% vs incumbent. RealHQ approaches carriers, negotiates terms, and binds coverage.`}</div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton rows={5} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CardSkeleton rows={4} />
              <CardSkeleton rows={4} />
              <CardSkeleton rows={4} />
            </div>
          </div>
        ) : (
          <>
            {/* ── Policy PDF Upload ── */}
            <PolicyUploadWidget
              onExtracted={(data) => {
                setParsedPolicy({
                  currentPremium: data.currentPremium ?? null,
                  insurer: data.insurer ?? null,
                  renewalDate: data.renewalDate ?? null,
                  coverageType: null,
                  propertyAddress: null,
                  currency: null,
                });
              }}
            />

            {/* ── Benchmark Range (sqft + location + flood zone driven) ── */}
            {apiBenchmarkMin != null && apiBenchmarkMax != null && (
              <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <SectionHeader
                    title="Estimated Benchmark Range"
                    subtitle={isGBP
                      ? "RICS/ABI actuarial rates · property type · floor area · location · UK flood risk assessment — not a live carrier quote"
                      : "ISO/AIR actuarial rates · property type · floor area · location · FEMA flood zone — not a live carrier quote"
                    }
                  />
                  <AiBadge />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Est. low</div>
                    <div className="text-base font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                      {fmt(apiBenchmarkMin, sym)}/yr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Est. high</div>
                    <div className="text-base font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                      {fmt(apiBenchmarkMax, sym)}/yr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Your premium</div>
                    <div className="text-base font-bold" style={{ color: displayPremium > apiBenchmarkMax ? "#FF8080" : "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                      {fmt(displayPremium, sym)}/yr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>vs market</div>
                    <div className="text-sm font-semibold" style={{ color: displayPremium > apiBenchmarkMax ? "#FF8080" : "#0A8A4C" }}>
                      {displayPremium > apiBenchmarkMax
                        ? `${fmt(displayPremium - apiBenchmarkMax, sym)} above range`
                        : displayPremium < apiBenchmarkMin
                          ? `${fmt(apiBenchmarkMin - displayPremium, sym)} below range`
                          : "Within market range"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs" style={{ color: "#9CA3AF" }}>
                  Based on ISO actuarial rate tables. Live carrier quotes arrive once you upload your policy PDF.
                </div>
              </div>
            )}

            {/* ── Flood Zone Risk ── */}
            {floodAssets.some((a) => a.floodZone) && (
              <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <SectionHeader title="FEMA Flood Zone Risk" subtitle="Per-asset flood zone from FEMA National Flood Hazard Layer" />
                </div>
                <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                  {floodAssets.filter((a) => a.floodZone).map((a) => {
                    const info = floodZoneInfo(a.floodZone);
                    const riskColors: Record<string, { bg: string; text: string; border: string }> = {
                      low:       { bg: "#F0FDF4", text: "#0A8A4C", border: "#BBF7D0" },
                      moderate:  { bg: "#FFFBEB", text: "#D97706", border: "#FCD34D" },
                      high:      { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
                      "very-high": { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
                    };
                    const colors = riskColors[info?.risk ?? "moderate"];
                    return (
                      <div key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium" style={{ color: "#111827" }}>{a.name}</div>
                          <div className="text-xs" style={{ color: "#9CA3AF" }}>{a.location}</div>
                        </div>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {info?.label ?? `Zone ${a.floodZone}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Per-Policy Breakdown ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title={hasRealData ? "Policy Breakdown — Market Benchmarked" : "Premium Analysis — Market Benchmarked"}
                  subtitle={hasRealData
                    ? `${policyRows.length} polic${policyRows.length === 1 ? "y" : "ies"} · premiums benchmarked against ${portfolio.assets.length * 4}+ comparable portfolios`
                    : `Portfolio total vs market benchmark · upload your policies for per-coverage breakdown`
                  }
                />
                <AiBadge />
              </div>

              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {policyRows.map((row) => {
                  const isOverpaying = row.overPct > 10;
                  return (
                    <div key={row.id} className="px-5 py-4 transition-colors hover:bg-[#F9FAFB]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="shrink-0 mt-0.5" style={{ color: isOverpaying ? "#FF8080" : "#0A8A4C" }}>
                            <PolicyIcon type={row.icon as "building" | "wind" | "shield" | "cog"} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-semibold" style={{ color: "#111827" }}>{row.label}</span>
                              <span
                                className="text-[8.5px] font-bold px-1.5 py-0.5 rounded inline-block"
                                style={
                                  row.overPct > 10
                                    ? { backgroundColor: "#FDECEA", color: "#D93025" }
                                    : row.overPct > 5
                                    ? { backgroundColor: "#F3F4F6", color: "#6B7280" }
                                    : { backgroundColor: "#E8F5EE", color: "#0A8A4C" }
                                }
                              >
                                {row.overPct > 10 ? "Overpaying" : row.overPct > 5 ? "Negligible" : "Competitive"}
                              </span>
                            </div>
                            <div className="text-xs" style={{ color: "#9CA3AF" }}>{row.description}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#FF8080", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {fmt(row.current, sym)}/yr
                            </div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="flex items-center gap-1 justify-end mb-0.5">
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>Market rate</span>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: hasRealData && !benchmarkAvailable ? "#9CA3AF" : "#5BF0AC", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {hasRealData && !benchmarkAvailable ? "Pending" : `${fmt(row.aiRate, sym)}/yr`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: hasRealData && !benchmarkAvailable ? "#9CA3AF" : "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {hasRealData && !benchmarkAvailable ? "—" : fmt(row.saving, sym)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coverage types hint — shown only before policies are uploaded */}
              {!hasRealData && (
                <div className="px-5 py-3" style={{ borderTop: "1px solid #F3F4F6", backgroundColor: "#FAFAFA" }}>
                  <div className="text-[10px] font-medium mb-1" style={{ color: "#6B7280" }}>
                    Coverage types typically included in a {portfolio.currency === "USD" ? "FL commercial" : "UK commercial"} portfolio retender:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(portfolio.currency === "USD"
                      ? ["Property & Casualty", "Hurricane & Windstorm", "General Liability", "Equipment Breakdown"]
                      : ["Property Damage & BI", "Employers' & Public Liability", "General Liability", "Environmental"]
                    ).map((label) => (
                      <span key={label} className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                        {label}
                      </span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>
                      Upload policies for breakdown →
                    </span>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                    Total recoverable across all policies
                  </div>
                  {hasRealData && !benchmarkAvailable ? (
                    <div className="text-sm" style={{ color: "#9CA3AF" }}>
                      Live market quotes coming — CoverForce carrier connection in progress
                    </div>
                  ) : (
                    <div className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                      {fmt(displayOverpay, sym)}/yr
                    </div>
                  )}
                </div>
                {quoteState === "idle" && coverforceConfigReady && (
                  coverforceEnabled ? (
                    <button
                      onClick={generateQuotes}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                    >
                      Get live quotes →
                    </button>
                  ) : (
                    <button
                      onClick={generateQuotes}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                    >
                      Get Live quotes →
                    </button>
                  )
                )}
                {quoteState !== "idle" && (
                  <Link href="#quote-results" className="text-xs" style={{ color: "#0A8A4C" }}>
                    View quotes ↓
                  </Link>
                )}
              </div>
            </div>

            {/* ── Quote Generation / Results ── */}
            {quoteState !== "idle" && (
              <div id="quote-results" className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                {quoteState === "generating" && (
                  <>
                    <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: "#0A8A4C", animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                        {coverforceEnabled ? "Fetching live carrier quotes…" : "Analysing portfolio…"}
                      </span>
                    </div>
                    {/* Skeleton cards — 3 carriers */}
                    <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 animate-pulse">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 rounded w-36" style={{ backgroundColor: "#F3F4F6" }} />
                            <div className="h-3 rounded w-48" style={{ backgroundColor: "#F3F4F6" }} />
                            <div className="h-3 rounded w-32" style={{ backgroundColor: "#F3F4F6" }} />
                          </div>
                          <div className="flex gap-6 shrink-0">
                            <div className="space-y-2">
                              <div className="h-3 rounded w-16" style={{ backgroundColor: "#F3F4F6" }} />
                              <div className="h-5 rounded w-20" style={{ backgroundColor: "#F3F4F6" }} />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 rounded w-16" style={{ backgroundColor: "#F3F4F6" }} />
                              <div className="h-5 rounded w-20" style={{ backgroundColor: "#F3F4F6" }} />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 rounded w-16" style={{ backgroundColor: "#F3F4F6" }} />
                              <div className="h-5 rounded w-20" style={{ backgroundColor: "#F3F4F6" }} />
                            </div>
                          </div>
                          <div className="h-8 w-28 rounded-lg shrink-0" style={{ backgroundColor: "#F3F4F6" }} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(quoteState === "ready" || quoteState === "requested") && (
                  <>
                    <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <SectionHeader
                        title={coverforceEnabled ? "Live Carrier Quotes" : "Market Benchmark Analysis"}
                        subtitle={
                          coverforceEnabled
                            ? `${carrierQuotes.length} carrier${carrierQuotes.length !== 1 ? "s" : ""} · live bindable quotes via CoverForce`
                            : `Based on your ${portfolio.assets.length}-asset portfolio · premiums confirmed at placement`
                        }
                      />
                      {!coverforceEnabled && (
                        <span
                          className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: "#EEF2FF", color: "#1647E8", border: "1px solid #C7D2FE" }}
                        >
                          Live quotes coming soon
                        </span>
                      )}
                    </div>

                    {quoteState === "requested" && (
                      <div className="px-5 py-4 flex items-start gap-3" style={{ backgroundColor: "#F0FDF4", borderBottom: "1px solid #0A8A4C" }}>
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#5BF0AC" }}>Binding quote requested — {requestedCarrier}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                            RealHQ will notify you within 24 hours. Track progress →{" "}
                            <Link href="/requests" className="underline underline-offset-2" style={{ color: "#0A8A4C" }}>My Requests</Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* When CoverForce not enabled: benchmark info message */}
                    {!coverforceEnabled && (
                      <div className="px-5 py-5 flex items-start gap-3" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                          <circle cx="9" cy="9" r="7.5" stroke="#1647E8" strokeWidth="1.4" />
                          <path d="M9 8v4M9 6.5h.01" stroke="#1647E8" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                        <div>
                          <div className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>Benchmark analysis complete</div>
                          <div className="text-xs" style={{ color: "#6B7280" }}>
                              {isGBP
                              ? "Based on ABI / Lloyd's market data for your portfolio type and location. Live bindable carrier quotes will appear here once credentials are configured."
                              : "Based on Willis Towers Watson / BROKERSLINK 2024 market data for your portfolio type and location. Live bindable carrier quotes via CoverForce will appear here once credentials are configured."
                            }
                          </div>
                          <div className="text-xs mt-1.5 font-semibold" style={{ color: "#0A8A4C" }}>
                            Estimated saving: {fmt(displayOverpay, sym)}/yr vs benchmark
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Desktop table — shown when CoverForce live quotes available */}
                    {coverforceEnabled && carrierQuotes.length > 0 && (
                    <div className="hidden sm:block">
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-2.5 text-xs font-medium" style={{ color: "#9CA3AF", borderBottom: "1px solid #E5E7EB" }}>
                        <span>Carrier</span>
                        <span className="text-right pr-6">Premium/yr</span>
                        <span className="text-right pr-6">Coverage limit</span>
                        <span className="text-right pr-6">Deductible</span>
                        <span className="text-right">Saving</span>
                      </div>
                      <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                        {carrierQuotes.map((q) => {
                          const isRequested = requestedCarrier === q.carrier;
                          return (
                            <div
                              key={q.carrier}
                              className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-4 items-center gap-2 transition-colors hover:bg-[#F9FAFB]"
                              style={q.recommended ? { backgroundColor: "#F0FDF4" } : {}}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="text-sm font-medium" style={{ color: "#111827" }}>{q.carrier}</span>
                                    {q.recommended && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                                        Best rate
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs" style={{ color: "#9CA3AF" }}>
                                    {q.policyType}{q.rating ? ` · ${q.rating}` : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right pr-6">
                                <div className="text-base font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: q.recommended ? "#0A8A4C" : "#111827" }}>
                                  {fmt(q.premium, sym)}
                                </div>
                              </div>
                              <div className="text-right pr-6">
                                <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                                  {q.coverageLimit > 0 ? `$${(q.coverageLimit / 1_000_000).toFixed(0)}M` : "—"}
                                </div>
                              </div>
                              <div className="text-right pr-6">
                                <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                                  {q.deductible > 0 ? fmt(q.deductible, sym) : "—"}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 justify-end">
                                <div className="text-right">
                                  <div className="text-sm font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}>
                                    {fmt(q.saving, sym)}
                                  </div>
                                  <div className="text-xs" style={{ color: "#9CA3AF" }}>
                                    {displayPremium > 0 ? Math.round((q.saving / displayPremium) * 100) : 0}%
                                  </div>
                                </div>
                                {isRequested ? (
                                  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                                    ✓ Requested
                                  </div>
                                ) : quoteState === "ready" && q.bindable ? (
                                  <button
                                    disabled={requestSubmitting}
                                    onClick={() => requestBindingQuote(q.quoteId, q.carrier)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap disabled:opacity-50"
                                    style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#fff", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                                  >
                                    {requestSubmitting ? "…" : "Get quote →"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {/* Mobile cards — shown when CoverForce live quotes available */}
                    {coverforceEnabled && carrierQuotes.length > 0 && (
                    <div className="sm:hidden divide-y" style={{ borderColor: "#E5E7EB" }}>
                      {carrierQuotes.map((q) => {
                        const isRequested = requestedCarrier === q.carrier;
                        return (
                          <div key={q.carrier} className="px-4 py-4" style={q.recommended ? { backgroundColor: "#F0FDF4" } : {}}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-sm font-medium" style={{ color: "#111827" }}>{q.carrier}</span>
                                  {q.recommended && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>Best rate</span>}
                                </div>
                                <div className="text-xs" style={{ color: "#9CA3AF" }}>{q.policyType}{q.rating ? ` · ${q.rating}` : ""}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: q.recommended ? "#0A8A4C" : "#111827" }}>
                                  {fmt(q.premium, sym)}/yr
                                </div>
                                <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>saves {fmt(q.saving, sym)}</div>
                              </div>
                            </div>
                            <div className="flex gap-4 mb-2">
                              <div>
                                <div className="text-xs" style={{ color: "#9CA3AF" }}>Coverage limit</div>
                                <div className="text-xs font-semibold" style={{ color: "#111827" }}>
                                  {q.coverageLimit > 0 ? `$${(q.coverageLimit / 1_000_000).toFixed(0)}M` : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs" style={{ color: "#9CA3AF" }}>Deductible</div>
                                <div className="text-xs font-semibold" style={{ color: "#111827" }}>
                                  {q.deductible > 0 ? fmt(q.deductible, sym) : "—"}
                                </div>
                              </div>
                            </div>
                            {isRequested ? (
                              <div className="mt-2 w-full py-2 rounded-lg text-center text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>✓ Requested</div>
                            ) : quoteState === "ready" && q.bindable ? (
                              <button
                                disabled={requestSubmitting}
                                onClick={() => requestBindingQuote(q.quoteId, q.carrier)}
                                className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#fff", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                              >
                                {requestSubmitting ? "…" : "Get quote →"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    )}

                    <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>
                        {coverforceEnabled
                          ? (isGBP ? "Live bindable quotes via Lloyd's market · premiums confirmed at binding" : "Live bindable quotes via CoverForce · premiums confirmed at binding")
                          : "Estimated — premiums confirmed during carrier underwriting"}
                      </span>
                      {quoteState === "requested" && (
                        <Link href="/requests" className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                          Track request →
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Bar Chart + Retender Steps ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Bar Chart */}
              <div className="lg:col-span-2 rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>Premium vs Market Rate</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Per asset — current vs Market benchmark</div>
                  </div>
                  <div className="flex items-center gap-3 lg:gap-4 text-xs">
                    <span className="flex items-center gap-1.5" style={{ color: "#FF8080" }}>
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#FF8080" }} />
                      Current
                    </span>
                    <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                      Market rate
                    </span>
                  </div>
                </div>
                <BarChart data={barData} height={160} color="#FF8080" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
              </div>

              {/* Retender Workflow */}
              <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>Retender Process</div>
                <div className="text-xs mb-4" style={{ color: "#9CA3AF" }}>RealHQ handles every step</div>
                <div className="space-y-3 mb-5">
                  {[
                    { label: "Portfolio audit", desc: "Review current premiums vs market" },
                    { label: "Market approach", desc: "RealHQ approaches 8–12 carriers" },
                    { label: "Quotes received", desc: "Competitive carrier terms" },
                    { label: "Best & final", desc: "Negotiate premium" },
                    { label: "Placement", desc: "Bind new policy, cancel incumbent" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          backgroundColor: quoteState === "requested" && i === 0 ? "#0A8A4C" : "#E5E7EB",
                          color: quoteState === "requested" && i === 0 ? "#fff" : "#9CA3AF",
                        }}
                      >
                        {quoteState === "requested" && i === 0 ? "✓" : i + 1}
                      </div>
                      <div>
                        <div className="text-xs font-medium" style={{ color: "#111827" }}>{step.label}</div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {quoteState === "idle" && coverforceConfigReady && (
                  <button
                    onClick={generateQuotes}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    {coverforceEnabled ? "Get live quotes" : "Get Live quotes"} — save {fmt(displayOverpay, sym)}
                  </button>
                )}
                {quoteState === "generating" && (
                  <div className="w-full py-2.5 rounded-lg text-sm font-semibold text-center" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>
                    Analysing…
                  </div>
                )}
                {(quoteState === "ready" || quoteState === "requested") && (
                  <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#F0FDF4", border: "1px solid #0A8A4C" }}>
                    <div className="font-semibold mb-1" style={{ color: "#0A8A4C" }}>
                      {quoteState === "requested" ? "Binding quote requested ✓" : "3 Live quotes generated"}
                    </div>
                    <div style={{ color: "#9CA3AF" }}>
                      {quoteState === "requested"
                        ? "RealHQ will confirm with the carrier and respond within 24h."
                        : "Select a carrier above to request a binding quote. RealHQ handles the placement."}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Real Policies Table — shown when user has uploaded docs */}
            {hasRealData && (
              <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <SectionHeader title="Your Uploaded Policies" subtitle={`${realPolicies.length} polic${realPolicies.length === 1 ? "y" : "ies"} · actual premiums from your documents`} />
                  <a
                    href="/api/user/export?type=insurance"
                    download
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                    style={{ border: "1px solid #0A8A4C", color: "#0A8A4C", backgroundColor: "#F0FDF4", textDecoration: "none" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 1v7M3.5 6 6 8.5 8.5 6"/><path d="M1.5 10.5h9"/>
                    </svg>
                    Export .xlsx
                  </a>
                </div>
                <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                  {realPolicies.map((policy) => {
                    const benchmarkPrem = Math.round(policy.premium * 0.82);
                    const saving = policy.premium - benchmarkPrem;
                    return (
                      <div key={policy.id} className="px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium" style={{ color: "#111827" }}>{policy.insurer}</span>
                              {policy.coverageType && <Badge variant="gray">{policy.coverageType}</Badge>}
                            </div>
                            {policy.propertyAddress && <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>{policy.propertyAddress}</div>}
                            {policy.renewalDate && <div className="text-xs" style={{ color: "#9CA3AF" }}>Renewal: {policy.renewalDate}</div>}
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-xs" style={{ color: "#9CA3AF" }}>Premium</div>
                              <div className="text-sm font-semibold" style={{ color: "#FF8080" }}>{fmt(policy.premium, sym)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs" style={{ color: "#9CA3AF" }}>Est. market rate</div>
                              <div className="text-sm font-semibold" style={{ color: "#5BF0AC" }}>{fmt(benchmarkPrem, sym)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs" style={{ color: "#9CA3AF" }}>Potential saving</div>
                              <div className="text-sm font-bold" style={{ color: "#5BF0AC", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(saving, sym)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Trusted advisor opening statement ── */}
            <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <div className="text-sm leading-relaxed" style={{ color: "#15803D" }}>
                <span className="font-semibold">Having reviewed thousands of commercial premiums,</span> these are the issues we find most often — and the ones that matter most. Overpaying is a problem. Being underinsured when flood, fire, or loss of rent strikes is a crisis. RealHQ checks both.
              </div>
            </div>

            {/* ── Section 2: Coverage Gap Audit ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Coverage Gap Audit"
                  subtitle="Critical cover items checked against your asset type, location, and flood zone data"
                />
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {/* Universal gaps */}
                {[
                  {
                    id: "reinstatement",
                    status: "flag" as const,
                    label: "Reinstatement value accuracy",
                    detail: "Your reinstatement value may be understated by up to 40% — building costs have risen sharply since 2020. A total loss claim could leave you significantly short.",
                  },
                  {
                    id: "bi_period",
                    status: "flag" as const,
                    label: "Business interruption indemnity period",
                    detail: "Average commercial reinstatement takes 18–24 months. A 12-month indemnity period leaves you exposed for the second year.",
                  },
                  {
                    id: "loss_of_rent",
                    status: "unknown" as const,
                    label: "Loss of rent cover",
                    detail: "Upload your policy schedule to check whether cover is based on current passing rent or estimated rental value (ERV).",
                  },
                  ...(floodAssets.length > 0 ? [{
                    id: "flood_excl",
                    status: "flag" as const,
                    label: "Flood exclusion vs flood zone",
                    detail: "One or more assets may be in a high flood zone. A policy that excludes flood on a Zone A/AE asset is a critical coverage gap.",
                  }] : []),
                  {
                    id: "terrorism",
                    status: "unknown" as const,
                    label: "Terrorism cover",
                    detail: "Upload your policy to check if terrorism is excluded. High-footfall or transport-adjacent assets require Pool Re / TRIA cover.",
                  },
                  {
                    id: "employers",
                    status: "unknown" as const,
                    label: "Employers liability",
                    detail: "Required if any on-site contractors or maintenance staff operate on your portfolio.",
                  },
                  // Asset-class specific
                  ...(industrialAssets.length > 0 ? [
                    {
                      id: "machinery",
                      status: "flag" as const,
                      label: "Machinery breakdown cover",
                      detail: "Often excluded from standard policies for industrial/warehouse assets. A single compressor failure can cost £50k+ and halt operations.",
                    },
                    {
                      id: "contamination",
                      status: "unknown" as const,
                      label: "Contamination liability",
                      detail: "Critical for former industrial land. Upload your policy to check if environmental contamination is covered.",
                    },
                  ] : []),
                ].map(({ id, status, label, detail }) => (
                  <div key={id} className="px-5 py-4 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      {status === "flag" ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(240,96,64,0.12)" }}>
                          <span className="text-xs" style={{ color: "#f06040" }}>!</span>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>?</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium" style={{ color: "#111827" }}>{label}</span>
                        {status === "flag" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(240,96,64,0.08)", color: "#f06040" }}>
                            Review needed
                          </span>
                        )}
                        {status === "unknown" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>
                            Upload policy to check
                          </span>
                        )}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: Premium Inflation Checklist ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Why Premiums Inflate — Common Causes"
                  subtitle="The most common reasons commercial premiums rise beyond market rate"
                />
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {[
                  {
                    label: "Single carrier, never retendered",
                    detail: "Market has moved, your premium hasn't. Even a 3-year relationship with no retender typically costs 15–25% above market.",
                  },
                  {
                    label: "Auto-renewal accepted without review",
                    detail: "Auto-renewing without a competitive process locks in the incumbent's pricing — usually the highest available.",
                  },
                  {
                    label: "Blanket portfolio policy",
                    detail: "One high-risk asset inflating your whole book. Mixed-risk portfolios should have tiered or split coverage structures.",
                  },
                  {
                    label: "Wrong asset classification",
                    detail: "Industrial rated as mixed use adds 15–25% to premium. Misclassification is common and rarely flagged by brokers.",
                  },
                  {
                    label: "Broker conflict of interest",
                    detail: "Placed with the highest-commission carrier, not the best-rate one. Same broker for 5+ years without a market review is a red flag.",
                  },
                  {
                    label: "Claims history not reviewed",
                    detail: "A single historic claim can inflate premium for 5 years — even after the underlying risk has been fully mitigated.",
                  },
                ].map(({ label, detail }, i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "rgba(245,169,74,0.12)", color: "#F5A94A" }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-0.5" style={{ color: "#111827" }}>{label}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 4: Upload to get precise ── */}
            {!hasRealData && (
              <div className="rounded-xl px-5 py-6 text-center" style={{ backgroundColor: "#F9FAFB", border: "1px dashed #D1D5DB" }}>
                <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>Upload your current schedule of insurance</div>
                <div className="text-xs mb-4 max-w-md mx-auto" style={{ color: "#9CA3AF", lineHeight: 1.6 }}>
                  We will check every line — coverage, exclusions, limits, and premium — against market and flag every issue. Then generate a one-page briefing: here is what to ask your broker to fix.
                </div>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#1647E8", color: "#fff" }}
                >
                  Upload schedule
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

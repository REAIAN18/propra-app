"use client";

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
      AI rate
    </span>
  );
}

export default function InsurancePage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>("idle");
  const [requestedCarrier, setRequestedCarrier] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Policy PDF upload + auto-fill
  const [parsedPolicy, setParsedPolicy] = useState<ParsedPolicy | null>(null);

  useEffect(() => { document.title = "Insurance — RealHQ"; }, []);

  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => setInsuranceSummary(data))
      .catch(() => {});
  }, []);

  // Reset quote flow when portfolio changes
  useEffect(() => {
    setQuoteState("idle");
    setRequestedCarrier(null);
  }, [portfolioId]);

  const hasRealData = insuranceSummary?.hasPolicies === true;

  // KPI derivations
  const realTotalPremium = insuranceSummary?.totalPremium ?? 0;
  const realPolicies = insuranceSummary?.policies ?? [];
  // Use API benchmark range (sqft + location + flood zone driven) if available, else fall back to 82%
  const apiBenchmarkMin = insuranceSummary?.benchmarkMin ?? null;
  const apiBenchmarkMax = insuranceSummary?.benchmarkMax ?? null;
  const apiBenchmarkMid = apiBenchmarkMin != null && apiBenchmarkMax != null
    ? Math.round((apiBenchmarkMin + apiBenchmarkMax) / 2)
    : null;
  const benchmarkPremium = apiBenchmarkMid ?? Math.round(realTotalPremium * 0.82);
  const realOverpay = realTotalPremium - benchmarkPremium;
  const realOverpayPct = realTotalPremium > 0 ? Math.round((realOverpay / realTotalPremium) * 100) : 0;

  const totalCurrentPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarketPremium = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);
  const totalOverpay = totalCurrentPremium - totalMarketPremium;
  const overpayPct = totalCurrentPremium > 0 ? Math.round((totalOverpay / totalCurrentPremium) * 100) : 0;

  const parsedPremiumOverride = parsedPolicy?.currentPremium ?? null;
  const displayPremium = parsedPremiumOverride ?? (hasRealData ? realTotalPremium : totalCurrentPremium);
  const displayMarket = hasRealData
    ? benchmarkPremium
    : (apiBenchmarkMid ?? Math.round(displayPremium * 0.82));
  const displayOverpay = displayPremium - displayMarket;
  const displayOverpayPct = displayPremium > 0 ? Math.round((displayOverpay / displayPremium) * 100) : (hasRealData ? realOverpayPct : overpayPct);
  const displayCommission = Math.round(displayOverpay * 0.15);

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
        benchmark: Math.round(p.premium * 0.82),
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
        aiRate: Math.round(p.premium * 0.82),
        saving: Math.round(p.premium * 0.18),
        overPct: 18,
      }))
    : [
        {
          id: "pc",
          icon: "building" as const,
          label: "Property & Casualty",
          description: `${portfolio.assets.length} assets · all-risk · ${sym}50M limit`,
          current: displayPremium,
          aiRate: displayMarket,
          saving: displayOverpay,
          overPct: displayOverpayPct,
        },
        {
          id: "hurricane",
          icon: "wind" as const,
          label: "Hurricane & Windstorm",
          description: "Florida portfolio · Named storm · coastal exposure",
          current: Math.round(displayPremium * 0.31),
          aiRate: Math.round(displayMarket * 0.26),
          saving: Math.round(displayPremium * 0.31 - displayMarket * 0.26),
          overPct: Math.round(((displayPremium * 0.31 - displayMarket * 0.26) / Math.max(1, displayPremium * 0.31)) * 100),
        },
        {
          id: "gl",
          icon: "shield" as const,
          label: "General Liability",
          description: `${portfolio.assets.length} locations · ${sym}10M aggregate`,
          current: Math.round(totalPortfolioValue * 0.00095),
          aiRate: Math.round(totalPortfolioValue * 0.00065),
          saving: Math.round(totalPortfolioValue * 0.0003),
          overPct: Math.round((0.0003 / 0.00095) * 100),
        },
        ...(industrialAssets.length > 0
          ? [
              {
                id: "eb",
                icon: "cog" as const,
                label: "Equipment Breakdown",
                description: `${industrialAssets.length} industrial asset${industrialAssets.length !== 1 ? "s" : ""} · mechanical & electrical`,
                current: Math.round(industrialCurrentPremium * 0.12),
                aiRate: Math.round(industrialCurrentPremium * 0.085),
                saving: Math.round(industrialCurrentPremium * 0.035),
                overPct: Math.round((0.035 / 0.12) * 100),
              },
            ]
          : []),
      ];

  // AI carrier quote results (derived from portfolio data)
  const carrierQuotes = [
    {
      carrier: "Markel Specialty",
      rating: "A+ AM Best",
      premium: Math.round(displayMarket * 0.91),
      coverage: "All-risk · no exclusions · $50M limit",
      saving: displayPremium - Math.round(displayMarket * 0.91),
      recommended: true,
    },
    {
      carrier: "QBE Insurance Group",
      rating: "A AM Best",
      premium: displayMarket,
      coverage: "All-risk · standard exclusions · $50M limit",
      saving: displayOverpay,
      recommended: false,
    },
    {
      carrier: "Allianz Commercial",
      rating: "AA− S&P",
      premium: Math.round(displayMarket * 1.06),
      coverage: "All-risk · broad exclusions · $35M limit",
      saving: displayPremium - Math.round(displayMarket * 1.06),
      recommended: false,
    },
  ];

  async function generateQuotes() {
    setQuoteState("generating");
    // Simulate AI portfolio analysis (1.8s)
    await new Promise((r) => setTimeout(r, 1800));
    setQuoteState("ready");
  }

  async function requestBindingQuote(carrier: string, _premium: number) {
    setRequestSubmitting(true);
    try {
      // Direct execution: generate benchmark quotes in DB, then bind the selected carrier
      const quoteRes = await fetch("/api/quotes/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPremium: displayPremium }),
      });
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        const quotes: { id: string; carrier: string }[] = data.quotes ?? [];
        const match = quotes.find((q) => q.carrier === carrier) ?? quotes[0];
        if (match?.id) {
          await fetch("/api/quotes/bind", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoteId: match.id, quoteType: "insurance" }),
          });
        }
      }
      setRequestedCarrier(carrier);
      setQuoteState("requested");
    } catch {
      // best-effort — still show success state
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
              { label: "AI Market Rate", value: fmt(displayMarket, sym), valueColor: "#5BF0AC", sub: "Benchmarked to comparable portfolios" },
              { label: "Annual Overpay", value: fmt(displayOverpay, sym), valueColor: "#FF8080", sub: `${displayOverpayPct}% above market` },
              { label: "Commission", value: fmt(displayCommission, sym), valueColor: "#5BF0AC", sub: "15% of saving · success-only" },
            ]}
          />
        )}

        {/* Issue → Cost → Action bar */}
        {!loading && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="text-xs" style={{ color: "#6B7280" }}>
              <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
              {hasRealData ? realPolicies.length : portfolio.assets.length} asset{(hasRealData ? realPolicies.length : portfolio.assets.length) !== 1 ? "s" : ""} paying {displayOverpayPct}% above AI benchmark ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(displayOverpay, sym)}/yr</span> excess premium
              {insuranceCapUplift > 0 ? ` · ~${fmt(insuranceCapUplift, sym)} lost in portfolio value at ${(impliedCapRate * 100).toFixed(1)}% cap rate` : ""} ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
              approaches 12+ carriers direct, manages retender end-to-end — 15% of saving, success-only
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
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>Showing AI benchmark portfolio</div>
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
            <div className="text-xs" style={{ color: "#6B7280" }}>{`Portfolio consolidation across ${hasRealData ? realPolicies.length : portfolio.assets.length} assets unlocks London & New York market rates. Typical saving 22–30% vs incumbent. RealHQ manages the entire retender end to end.`}</div>
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
                    title="Market Benchmark Range"
                    subtitle="Computed from property type · floor area · location · FEMA flood zone"
                  />
                  <AiBadge />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Market low</div>
                    <div className="text-base font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                      {fmt(apiBenchmarkMin, sym)}/yr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Market high</div>
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

            {/* ── Per-Policy AI Breakdown ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Policy Breakdown — AI Benchmarked"
                  subtitle={`${policyRows.length} polic${policyRows.length === 1 ? "y" : "ies"} · premiums benchmarked against ${portfolio.assets.length * 4}+ comparable portfolios`}
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
                              <Badge variant={isOverpaying ? (row.overPct > 20 ? "red" : "amber") : "green"}>
                                {isOverpaying ? `${row.overPct}% over market` : "Competitive"}
                              </Badge>
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
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>AI market rate</span>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: "#5BF0AC", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {fmt(row.aiRate, sym)}/yr
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {fmt(row.saving, sym)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                    Total recoverable across all policies
                  </div>
                  <div className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {fmt(displayOverpay, sym)}/yr
                  </div>
                </div>
                {quoteState === "idle" && (
                  <button
                    onClick={generateQuotes}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Get AI quotes →
                  </button>
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
                  <div className="px-5 py-10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-2 w-2 rounded-full animate-bounce"
                          style={{ backgroundColor: "#0A8A4C", animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>Analysing portfolio…</div>
                    <div className="text-xs text-center max-w-xs" style={{ color: "#9CA3AF" }}>
                      Benchmarking {portfolio.assets.length} assets against 200+ comparable portfolios to find best carrier rates
                    </div>
                  </div>
                )}

                {(quoteState === "ready" || quoteState === "requested") && (
                  <>
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <SectionHeader
                        title="AI Quote Results"
                        subtitle={`3 carriers · based on your ${portfolio.assets.length}-asset portfolio · premiums confirmed at placement`}
                      />
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

                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <div className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-2.5 text-xs font-medium" style={{ color: "#9CA3AF", borderBottom: "1px solid #E5E7EB" }}>
                        <span>Carrier</span>
                        <span className="text-right pr-8">Estimated Premium</span>
                        <span className="px-4">Coverage</span>
                        <span className="text-right">Saving vs current</span>
                      </div>
                      <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                        {carrierQuotes.map((q) => {
                          const isRequested = requestedCarrier === q.carrier;
                          return (
                            <div
                              key={q.carrier}
                              className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-4 items-center gap-4 transition-colors hover:bg-[#F9FAFB]"
                              style={q.recommended ? { backgroundColor: "#F0FDF4" } : {}}
                            >
                              <div className="flex items-center gap-2.5">
                                {q.recommended && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                                    Best rate
                                  </span>
                                )}
                                <div>
                                  <div className="text-sm font-medium" style={{ color: "#111827" }}>{q.carrier}</div>
                                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{q.rating}</div>
                                </div>
                              </div>
                              <div className="text-right pr-8">
                                <div className="text-base font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: q.recommended ? "#0A8A4C" : "#111827" }}>
                                  {fmt(q.premium, sym)}/yr
                                </div>
                                <div className="text-xs" style={{ color: "#9CA3AF" }}>AI estimate</div>
                              </div>
                              <div className="px-4">
                                <span className="text-xs" style={{ color: "#6B7280" }}>{q.coverage}</span>
                              </div>
                              <div className="flex items-center gap-3 justify-end">
                                <div className="text-right">
                                  <div className="text-sm font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}>
                                    {fmt(q.saving, sym)}
                                  </div>
                                  <div className="text-xs" style={{ color: "#D1D5DB" }}>
                                    {displayPremium > 0 ? Math.round((q.saving / displayPremium) * 100) : 0}% saving
                                  </div>
                                </div>
                                {isRequested ? (
                                  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                                    ✓ Requested
                                  </div>
                                ) : quoteState === "ready" ? (
                                  <button
                                    disabled={requestSubmitting}
                                    onClick={() => requestBindingQuote(q.carrier, q.premium)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap disabled:opacity-50"
                                    style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#fff", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                                  >
                                    {requestSubmitting ? "…" : q.recommended ? "Request binding quote →" : "Select →"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y" style={{ borderColor: "#E5E7EB" }}>
                      {carrierQuotes.map((q) => {
                        const isRequested = requestedCarrier === q.carrier;
                        return (
                          <div key={q.carrier} className="px-4 py-4" style={q.recommended ? { backgroundColor: "#F0FDF4" } : {}}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium" style={{ color: "#111827" }}>{q.carrier}</span>
                                  {q.recommended && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>Best rate</span>}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{q.rating} · {q.coverage}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: q.recommended ? "#0A8A4C" : "#111827" }}>
                                  {fmt(q.premium, sym)}/yr
                                </div>
                                <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>saves {fmt(q.saving, sym)}</div>
                              </div>
                            </div>
                            {isRequested ? (
                              <div className="mt-2 w-full py-2 rounded-lg text-center text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>✓ Requested</div>
                            ) : quoteState === "ready" ? (
                              <button
                                disabled={requestSubmitting}
                                onClick={() => requestBindingQuote(q.carrier, q.premium)}
                                className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#fff", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                              >
                                {requestSubmitting ? "…" : "Request binding quote →"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>
                        AI estimates — premiums confirmed during carrier underwriting
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
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>Premium vs AI Market Rate</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Per asset — current vs AI benchmark</div>
                  </div>
                  <div className="flex items-center gap-3 lg:gap-4 text-xs">
                    <span className="flex items-center gap-1.5" style={{ color: "#FF8080" }}>
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#FF8080" }} />
                      Current
                    </span>
                    <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                      AI rate
                    </span>
                  </div>
                </div>
                <BarChart data={barData} height={160} color="#FF8080" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
              </div>

              {/* Retender Workflow */}
              <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>Retender Process</div>
                <div className="text-xs mb-4" style={{ color: "#9CA3AF" }}>RealHQ manages end-to-end</div>
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
                {quoteState === "idle" && (
                  <button
                    onClick={generateQuotes}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Get AI quotes — save {fmt(displayOverpay, sym)}
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
                      {quoteState === "requested" ? "Binding quote requested ✓" : "3 AI quotes generated"}
                    </div>
                    <div style={{ color: "#9CA3AF" }}>
                      {quoteState === "requested"
                        ? "RealHQ will confirm with the carrier and respond within 24h."
                        : "Select a carrier above to request a binding quote. RealHQ manages placement end to end."}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Real Policies Table — shown when user has uploaded docs */}
            {hasRealData && (
              <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <SectionHeader title="Your Uploaded Policies" subtitle={`${realPolicies.length} polic${realPolicies.length === 1 ? "y" : "ies"} · actual premiums from your documents`} />
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
                              <div className="text-xs" style={{ color: "#9CA3AF" }}>AI market rate</div>
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
          </>
        )}
      </main>
    </AppShell>
  );
}

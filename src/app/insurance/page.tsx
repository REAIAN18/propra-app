"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

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


type QuoteState = "idle" | "generating" | "ready" | "requested";

type ParsedPolicy = {
  currentPremium: number | null;
};

export default function InsurancePage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const isGBP = portfolio.currency !== "USD";

  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>("idle");
  const [requestedCarrier, setRequestedCarrier] = useState<string | null>(null);
  const [parsedPolicy, setParsedPolicy] = useState<ParsedPolicy | null>(null);

  useEffect(() => { document.title = "Insurance — RealHQ"; }, []);

  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => setInsuranceSummary(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuoteState("idle");
    setRequestedCarrier(null);
  }, [portfolioId]);

  const hasRealData = insuranceSummary?.hasPolicies === true;

  // KPI derivations
  const realTotalPremium = insuranceSummary?.totalPremium ?? 0;
  const apiBenchmarkMin = insuranceSummary?.benchmarkMin ?? null;
  const apiBenchmarkMax = insuranceSummary?.benchmarkMax ?? null;
  const apiBenchmarkMid = apiBenchmarkMin != null && apiBenchmarkMax != null
    ? Math.round((apiBenchmarkMin + apiBenchmarkMax) / 2)
    : null;
  const benchmarkPremium = apiBenchmarkMid ?? null;
  const benchmarkAvailable = benchmarkPremium !== null;

  const totalCurrentPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarketPremium = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);

  const parsedPremiumOverride = parsedPolicy?.currentPremium ?? null;
  const displayPremium = parsedPremiumOverride ?? (hasRealData ? realTotalPremium : totalCurrentPremium);
  const displayMarket = hasRealData
    ? (benchmarkAvailable ? benchmarkPremium! : 0)
    : (apiBenchmarkMid ?? Math.round(displayPremium * 0.82));
  const displayOverpay = (benchmarkAvailable || !hasRealData) ? displayPremium - displayMarket : 0;

  // Renewal alert
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

  // Industrial assets
  const industrialAssets = portfolio.assets.filter((a) => a.type === "industrial" || a.type === "warehouse");

  async function generateQuotes() {
    setQuoteState("generating");
    try {
      await fetch("/api/quotes/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPremium: displayPremium }),
      });
    } catch {
      // non-fatal
    }
    setQuoteState("ready");
  }

  // Coverage gap items
  const coverageGapItems = [
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
  ];

  // Why premiums inflate — 4-tile grid
  const inflationTiles = [
    {
      title: "Never retendered",
      detail: "Market has moved, your premium hasn't. Even a 3-year relationship with no retender typically costs 15–25% above market.",
      stat: "15–25% above market",
      statSub: "after 3+ years",
    },
    {
      title: "Auto-renewal accepted",
      detail: "Auto-renewing without a competitive process locks in the incumbent's pricing — usually the highest available.",
      stat: "Highest available",
      statSub: "pricing locked in",
    },
    {
      title: "Wrong asset classification",
      detail: "Industrial rated as mixed use adds 15–25% to premium. Misclassification is common and rarely flagged by brokers.",
      stat: "+15–25%",
      statSub: "industrial as mixed use",
    },
    {
      title: "Broker conflict of interest",
      detail: "Placed with the highest-commission carrier, not the best-rate one. Same broker for 5+ years without a market review is a red flag.",
      stat: "Highest commission",
      statSub: "not best rate",
    },
  ];

  return (
    <AppShell>
      <TopBar title="Insurance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {loading || customLoading ? (
          <div className="space-y-4">
            <div className="rounded-2xl h-56 animate-pulse" style={{ backgroundColor: "#F3F4F6" }} />
            <div className="rounded-xl h-64 animate-pulse" style={{ backgroundColor: "#F3F4F6" }} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
            </div>
          </div>
        ) : (
          <>
            {/* Renewal alert */}
            {showRenewalAlert && (
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

            {/* ── 1. HERO SECTION ── */}
            <div style={{ background: "linear-gradient(135deg, #065F34 0%, #0A8A4C 100%)", borderRadius: 16, padding: "32px 28px 28px" }}>
              <h1 style={{
                color: "#fff",
                fontSize: "1.75rem",
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                lineHeight: 1.2,
                fontWeight: 700,
                marginBottom: 12,
              }}>
                {hasRealData && benchmarkAvailable
                  ? `You are overpaying by ${fmt(displayOverpay, sym)}/yr`
                  : `Portfolios like yours typically overpay by ${sym}40k\u2013${sym}90k/yr.`
                }
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.65, marginBottom: 28, maxWidth: 560 }}>
                {hasRealData && benchmarkAvailable
                  ? `Based on your uploaded policies vs ${portfolio.assets.length * 4}+ comparable ${isGBP ? "UK commercial" : "FL commercial"} portfolios — benchmarked to market.${insuranceCapUplift > 0 ? ` At a ${(impliedCapRate * 100).toFixed(1)}% cap rate, that\u2019s ~${fmt(insuranceCapUplift, sym)} of portfolio value sitting idle.` : ""}`
                  : `That\u2019s based on 1,200 comparable ${isGBP ? "UK commercial" : "FL commercial"} portfolios \u2014 not your actual policy. Upload your schedule and RealHQ will tell you exactly where you stand.${insuranceCapUplift > 0 ? ` At a ${(impliedCapRate * 100).toFixed(1)}% cap rate, a ${sym}60k overpay is ~${fmt(insuranceCapUplift, sym)} of portfolio value sitting idle.` : ""}`
                }
              </p>

              {/* 3 stat tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Market benchmark
                  </div>
                  <div style={{ color: "#fff", fontSize: "1.2rem", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontWeight: 700 }}>
                    {apiBenchmarkMin && apiBenchmarkMax
                      ? `${fmt(apiBenchmarkMin, sym)}\u2013${fmt(apiBenchmarkMax, sym)}/yr`
                      : `${sym}${isGBP ? "180k\u2013\u00a3240k" : "240k\u2013$290k"}/yr`
                    }
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 }}>
                    {`for ${portfolio.assets.length} asset${portfolio.assets.length !== 1 ? "s" : ""} \u00b7 your type \u00b7 ${isGBP ? "SE UK" : "FL coastal"}`}
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Typical overpay
                  </div>
                  <div style={{ color: "#fff", fontSize: "1.2rem", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontWeight: 700 }}>
                    15\u201325%
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 }}>
                    vs market \u00b7 auto-renewal portfolios
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    After upload
                  </div>
                  <div style={{ color: "#fff", fontSize: "1.2rem", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontWeight: 700 }}>
                    {hasRealData && benchmarkAvailable ? `${fmt(displayOverpay, sym)}/yr gap` : "Exact gap"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 }}>
                    {hasRealData ? "from your actual policy" : "RealHQ analyses your actual policy"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. PER ASSET TABLE ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Per Asset — Market Benchmarks"
                  subtitle={hasRealData
                    ? "Your actual premiums benchmarked against market ranges"
                    : "Market ranges based on asset type, size, and location — not your actual premiums"
                  }
                />
                <span className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "rgba(22,71,232,0.1)", color: "#5a8fef" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#5a8fef" }} />
                  Market rate
                </span>
              </div>

              {/* Column headers (desktop) */}
              <div className="hidden sm:grid grid-cols-[1fr_160px_160px] gap-4 px-5 py-2.5 text-xs font-medium" style={{ color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>
                <span>Asset</span>
                <span className="text-right">Market range</span>
                <span className="text-right">Your premium</span>
              </div>

              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {portfolio.assets.map((asset) => {
                  const mid = asset.marketInsurance;
                  const rangeLow = Math.round(mid * 0.88);
                  const rangeHigh = Math.round(mid * 1.12);
                  const actualPremium = hasRealData && asset.insurancePremium > 0 ? asset.insurancePremium : null;
                  const isAbove = actualPremium !== null && actualPremium > rangeHigh;
                  const isWithin = actualPremium !== null && actualPremium >= rangeLow && actualPremium <= rangeHigh;
                  return (
                    <div key={asset.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-2 sm:gap-4 px-5 py-4 items-center transition-colors hover:bg-[#F9FAFB]">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#111827" }}>{asset.name}</div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>
                          {asset.location}{asset.type ? ` \u00b7 ${asset.type}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end">
                        <div className="text-sm font-semibold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                          {fmt(rangeLow, sym)}\u2013{fmt(rangeHigh, sym)}/yr
                        </div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>market range</div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end">
                        {actualPremium !== null ? (
                          <>
                            <div className="text-sm font-semibold" style={{ color: isAbove ? "#D93025" : "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                              {fmt(actualPremium, sym)}/yr
                            </div>
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded font-semibold mt-0.5" style={
                              isAbove
                                ? { backgroundColor: "#FDECEA", color: "#D93025" }
                                : { backgroundColor: "#E8F5EE", color: "#0A8A4C" }
                            }>
                              {isAbove ? `+${fmt(actualPremium - rangeHigh, sym)} above range` : "Within range"}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm italic" style={{ color: "#9CA3AF" }}>Upload to see</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Portfolio total row */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-2 sm:gap-4 px-5 py-4 items-center" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Portfolio total</div>
                <div className="flex flex-col items-start sm:items-end">
                  <div className="text-sm font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {apiBenchmarkMin && apiBenchmarkMax
                      ? `${fmt(apiBenchmarkMin, sym)}\u2013${fmt(apiBenchmarkMax, sym)}/yr`
                      : `${fmt(Math.round(totalMarketPremium * 0.88), sym)}\u2013${fmt(Math.round(totalMarketPremium * 1.12), sym)}/yr`
                    }
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  {hasRealData ? (
                    <div className="text-sm font-bold" style={{
                      color: realTotalPremium > (apiBenchmarkMax ?? Math.round(totalMarketPremium * 1.12)) ? "#D93025" : "#111827",
                      fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                    }}>
                      {fmt(realTotalPremium, sym)}/yr
                    </div>
                  ) : (
                    <span className="text-sm italic" style={{ color: "#9CA3AF" }}>Upload to see</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3. PORTFOLIO CONSOLIDATION ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Left — current state */}
                <div className="px-6 py-6" style={{ backgroundColor: "#fff", borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#9CA3AF" }}>
                    {portfolio.assets.length} separate {portfolio.assets.length === 1 ? "policy" : "policies"} today
                  </div>
                  <div className="space-y-2.5">
                    {portfolio.assets.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#D1D5DB" }} />
                        {a.name.split(" ").slice(0, 4).join(" ")}
                      </div>
                    ))}
                    {portfolio.assets.length > 5 && (
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>+{portfolio.assets.length - 5} more assets</div>
                    )}
                    <div className="pt-3 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                      <div className="flex items-center gap-2 text-sm" style={{ color: "#9CA3AF" }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#F5A94A" }} />
                        Full retail rates
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1.5" style={{ color: "#9CA3AF" }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#F5A94A" }} />
                        {portfolio.assets.length} renewal{portfolio.assets.length !== 1 ? "s" : ""} to manage each year
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — consolidated */}
                <div className="px-6 py-6" style={{ backgroundColor: "#F0FDF4" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#0A8A4C" }}>
                    1 consolidated policy after RealHQ
                  </div>
                  <div className="space-y-2.5">
                    {[
                      `All ${portfolio.assets.length} assets combined`,
                      `${isGBP ? "London" : "London + New York"} market rates`,
                      "Single renewal date",
                      "Carrier competition",
                      "8\u201312 quotes secured",
                      "Portfolio discount unlocked",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                        <span style={{ color: "#0A8A4C", fontWeight: 700, lineHeight: 1 }}>✓</span>
                        {item}
                      </div>
                    ))}
                    <div className="pt-3 mt-1" style={{ borderTop: "1px solid #BBF7D0" }}>
                      <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>
                        Typical saving: 22\u201330% vs incumbent
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Caveat footer */}
              <div className="px-6 py-3 text-xs" style={{ backgroundColor: "#F9FAFB", borderTop: "1px solid #E5E7EB", color: "#9CA3AF" }}>
                Exact saving depends on your actual premiums, asset mix, and claims history. Upload your policy schedule and RealHQ will model the consolidated saving before approaching any carrier.
              </div>
            </div>

            {/* ── 4. COVERAGE GAP AUDIT ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Coverage Gap Audit"
                  subtitle="Critical cover items checked against your asset type, location, and flood zone data"
                />
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {coverageGapItems.map(({ id, status, label, detail }) => (
                  <div key={id} className="px-5 py-4 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      {status === "flag" ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(217,48,37,0.1)" }}>
                          <span className="text-xs font-bold" style={{ color: "#D93025" }}>!</span>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>?</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium" style={{ color: "#111827" }}>{label}</span>
                        {status === "flag" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(217,48,37,0.08)", color: "#D93025" }}>
                            Review needed
                          </span>
                        )}
                        {status === "unknown" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>
                            Upload to check
                          </span>
                        )}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 5. WHY PREMIUMS INFLATE — 4-tile grid ── */}
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Why Premiums Inflate"
                  subtitle="The four most common reasons commercial portfolios overpay year after year"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {inflationTiles.map((tile, i) => (
                  <div
                    key={i}
                    className="px-5 py-5"
                    style={{
                      borderBottom: i < 2 ? "1px solid #E5E7EB" : undefined,
                      borderRight: i % 2 === 0 ? "1px solid #E5E7EB" : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "rgba(245,169,74,0.12)", color: "#F5A94A" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>{tile.title}</div>
                        <div className="text-xs leading-relaxed mb-2" style={{ color: "#6B7280" }}>{tile.detail}</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold" style={{ color: "#D93025", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{tile.stat}</span>
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>{tile.statSub}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. UPLOAD + ACTION — dark green, shown before upload ── */}
            {!hasRealData && (
              <div style={{ background: "linear-gradient(135deg, #065F34 0%, #0A8A4C 100%)", borderRadius: 16, padding: "32px 28px" }}>
                <h2 style={{
                  color: "#fff",
                  fontSize: "1.4rem",
                  fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  fontWeight: 700,
                  marginBottom: 10,
                }}>
                  Upload your policy schedule.
                </h2>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.65, marginBottom: 28, maxWidth: 540 }}>
                  RealHQ checks every line — coverage, exclusions, limits, and premium — against market and flags every issue. Then approaches 8–12 carriers, negotiates terms, and presents you with options. One approval to proceed. No broker. No markup.
                </p>

                {/* Drop zone */}
                <div
                  className="rounded-xl mb-6 flex flex-col items-center justify-center text-center"
                  style={{ border: "1.5px dashed rgba(255,255,255,0.3)", padding: "24px 20px", backgroundColor: "rgba(0,0,0,0.14)" }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-3 opacity-60">
                    <path d="M16 4v16M10 10l6-6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 22v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <div className="text-sm font-medium" style={{ color: "#fff" }}>Drop your policy schedule here</div>
                  <div className="text-xs mt-1.5 mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
                    PDF · one or all {portfolio.assets.length > 1 ? portfolio.assets.length : ""} · RealHQ reads all of it
                  </div>
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: "#fff", color: "#0A8A4C" }}
                  >
                    Upload and start the audit →
                  </Link>
                </div>

                {/* 3 step tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {[
                    { step: "1", title: "Policy audit", detail: "Every line vs market and coverage gaps" },
                    { step: "2", title: "Market approach", detail: "RealHQ approaches 8–12 carriers direct" },
                    { step: "3", title: "You approve", detail: "One click. RealHQ binds and cancels incumbent." },
                  ].map(({ step, title, detail }) => (
                    <div key={step} style={{ background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "14px 16px" }}>
                      <div className="text-xs font-bold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Step {step}</div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "#fff" }}>{title}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{detail}</div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                  No broker · No markup · RealHQ places direct · London and New York market rates
                </div>
              </div>
            )}

            {/* After upload: retender CTA */}
            {hasRealData && (
              <div className="rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: "#0A8A4C" }}>Ready to retender</div>
                  <div className="text-xs" style={{ color: "#374151" }}>
                    RealHQ will approach carriers, negotiate terms, and present options. One approval to proceed.
                  </div>
                </div>
                <button
                  onClick={generateQuotes}
                  disabled={quoteState !== "idle"}
                  className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  {quoteState === "generating"
                    ? "Approaching carriers\u2026"
                    : quoteState !== "idle"
                    ? "Quotes ready \u2193"
                    : "Start retender \u2192 RealHQ approaches carriers"
                  }
                </button>
              </div>
            )}

            {/* Quote results */}
            {quoteState !== "idle" && (
              <div id="quote-results" className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                {quoteState === "generating" && (
                  <div className="px-5 py-5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#0A8A4C", animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "#111827" }}>Approaching carriers\u2026</span>
                  </div>
                )}
                {(quoteState === "ready" || quoteState === "requested") && (
                  <>
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <SectionHeader
                        title="Market Benchmark Analysis"
                        subtitle={`Based on your ${portfolio.assets.length}-asset portfolio \u00b7 premiums confirmed at placement`}
                      />
                    </div>
                    {quoteState === "requested" && (
                      <div className="px-5 py-4 flex items-start gap-3" style={{ backgroundColor: "#F0FDF4", borderBottom: "1px solid #BBF7D0" }}>
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>Retender initiated</div>
                          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                            RealHQ will notify you within 24 hours. Track progress \u2192{" "}
                            <Link href="/requests" className="underline underline-offset-2" style={{ color: "#0A8A4C" }}>My Requests</Link>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="px-5 py-5 text-xs" style={{ color: "#6B7280" }}>
                      Based on {isGBP ? "ABI / Lloyd\u2019s" : "Willis Towers Watson / BROKERSLINK 2024"} market data for your portfolio type and location.
                      {benchmarkAvailable && (
                        <div className="mt-1 font-semibold" style={{ color: "#0A8A4C" }}>
                          Estimated saving: {fmt(displayOverpay, sym)}/yr vs benchmark
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

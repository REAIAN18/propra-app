"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { PageHero } from "@/components/ui/PageHero";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { PolicyUploadWidget } from "@/components/ui/PolicyUploadWidget";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

// Plausible supplier names for tariff comparison

type EnergySummary = {
  hasBills: boolean;
  totalAnnualSpend: number;
  avgUnitRate: number;
  benchmarkRate: number | null;  // ¢/kWh from EIA; null until first fetch
  benchmarkDate: string | null;  // "YYYY-MM" period
  bills: {
    id: string;
    supplier: string;
    accountNumber: string | null;
    billingPeriod: string | null;
    totalCost: number;
    unitRate: number;
    consumption: number;
    filename: string;
  }[];
};

type LiveEnergyQuote = {
  id: string;
  supplier: string;
  quotedRate: number;
  quotedCost: number;
  annualSaving: number;
  dataSource: string;
  status: string;
};

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const [switchStarted, setSwitchStarted] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState<LiveEnergyQuote[]>([]);
  const [switchingQuoteId, setSwitchingQuoteId] = useState<string | null>(null);
  const [switchedQuoteId, setSwitchedQuoteId] = useState<string | null>(null);
  const [billExtracted, setBillExtracted] = useState<{
    supplier?: string;
    annualSpend?: number;
    unitRate?: number;
    annualUsage?: number;
  } | null>(null);
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [energySummary, setEnergySummary] = useState<EnergySummary | null>(null);
  const [utilSubmitted, setUtilSubmitted] = useState<Record<string, boolean>>({});

  function handleSwitchIntent(context?: { assetName?: string; assetLocation?: string; supplier?: string; annualSpend?: number; assetId?: string }) {
    setSwitchStarted(true);
    setLiveQuotes([]);
    // Fetch live tariff quotes; if propertyId known use the GET route, else POST
    if (context?.assetId) {
      fetch(`/api/energy/quotes?propertyId=${context.assetId}`)
        .then((r) => r.json())
        .then((data) => setLiveQuotes(data.quotes ?? []))
        .catch(() => {});
    } else {
      fetch("/api/quotes/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSupplier: context?.supplier,
          currentCost: context?.annualSpend,
          location: context?.assetLocation ?? context?.assetName,
        }),
      })
        .then((r) => r.json())
        .then((data) => setLiveQuotes(data.quotes ?? []))
        .catch(() => {});
    }
  }

  async function confirmSwitch(quoteId: string) {
    setSwitchingQuoteId(quoteId);
    try {
      const res = await fetch(`/api/energy/quotes/${quoteId}/switch`, { method: "POST" });
      if (res.ok) {
        setSwitchedQuoteId(quoteId);
        setLiveQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: "switched" } : q));
      }
    } catch {
      // non-fatal
    } finally {
      setSwitchingQuoteId(null);
    }
  }

  useEffect(() => { document.title = "Energy Optimisation — RealHQ"; }, []);

  useEffect(() => {
    fetch("/api/user/energy-summary")
      .then((r) => r.json())
      .then((data) => setEnergySummary(data))
      .catch(() => {});
  }, []);

  const hasRealData = energySummary?.hasBills === true;
  const realTotalSpend = energySummary?.totalAnnualSpend ?? 0;
  const realAvgRate = energySummary?.avgUnitRate ?? 0;
  // Live EIA FL commercial rate in ¢/kWh (0.0952 = 9.52¢). Null until EIA_API_KEY is set and fetch has run.
  const realBenchmarkRate = energySummary?.benchmarkRate ?? null;
  const benchmarkDate = energySummary?.benchmarkDate ?? null;
  const realSupplier = energySummary?.bills?.[0]?.supplier ?? "Unknown";

  const totalCurrentEnergy = portfolio.assets.reduce((s, a) => s + a.energyCost, 0);
  const totalMarketEnergy = portfolio.assets.reduce((s, a) => s + a.marketEnergyCost, 0);
  const totalOverpay = totalCurrentEnergy - totalMarketEnergy;
  const overpayPct = totalCurrentEnergy > 0 ? Math.round((totalOverpay / totalCurrentEnergy) * 100) : 0;

  const totalNetIncome = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalPortfolioValue = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const impliedCapRate = totalPortfolioValue > 0 ? totalNetIncome / totalPortfolioValue : 0.055;
  const energyCapUplift = impliedCapRate > 0 && totalOverpay > 0 ? Math.round(totalOverpay / impliedCapRate) : 0;

  const isGBP = portfolio.currency !== "USD";
  // FL utilities (FPL / Duke Energy / TECO) are regulated monopolies — tariff switching is not available.
  // UK assets use Octopus / EDF / BG / E.ON supplier switching. HH-metered UK assets (>100MWh/yr) need bespoke tender.
  const canSwitch = isGBP;
  const rateUnit = isGBP ? "p/kWh" : "¢/kWh";
  const benchmarkSource = isGBP ? "Ofgem UK commercial avg" : "EIA FL commercial avg";
  const marketLabel = isGBP ? "UK Market Average" : "FL Market Average";
  const marketSourceDetail = isGBP
    ? "All UK commercial electricity suppliers · Ofgem data"
    : "All FL commercial electricity suppliers · EIA data";
  const marketSectionSubtitle = isGBP
    ? `Ofgem UK commercial avg${benchmarkDate ? ` · ${benchmarkDate}` : ""} · Source: Office of Gas and Electricity Markets`
    : `EIA FL commercial avg${benchmarkDate ? ` · ${benchmarkDate}` : ""} · Source: U.S. Energy Information Administration`;

  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  const estKwhPerSqft = portfolio.assets[0]?.type === "warehouse" ? 9.2 : 18.4;
  const benchmarkKwhPerSqft = portfolio.assets[0]?.type === "warehouse" ? 7.5 : 14.8;

  // Per-utility derived data
  const sortedByEnergy = [...portfolio.assets].sort((a, b) => b.energyCost - a.energyCost);
  const sortedBySqft = [...portfolio.assets].sort((a, b) => b.sqft - a.sqft);

  const elecTopAssets = sortedByEnergy.slice(0, 2);
  const elecNames = elecTopAssets.map(a => a.name.split(" ").slice(0, 2).join(" ")).join(" + ");
  const elecCurrentMo = Math.round(totalCurrentEnergy / 12);
  const elecSavingMo = Math.round(totalOverpay / 12);
  const elecTariff = billExtracted?.supplier ?? energySummary?.bills?.[0]?.supplier ?? "Current tariff";

  const totalUtilitySaving = totalOverpay;

  const anomalies = portfolio.assets
    .map((a) => ({
      ...a,
      overpayPct: Math.round(((a.energyCost - a.marketEnergyCost) / Math.max(1, a.marketEnergyCost)) * 100),
      saving: a.energyCost - a.marketEnergyCost,
    }))
    .filter((a) => a.overpayPct > 30)
    .sort((a, b) => b.saving - a.saving);


  return (
    <AppShell>
      <TopBar title="Energy Optimisation" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={`Energy — ${hasRealData ? "Your Portfolio" : portfolio.name}`}
            cells={[
              {
                label: "Annual Spend",
                value: hasRealData ? fmt(realTotalSpend, sym) : fmt(totalCurrentEnergy, sym),
                sub: hasRealData ? `${energySummary!.bills.length} bills uploaded` : "Across portfolio",
              },
              {
                label: "Market Rate",
                value: hasRealData
                  ? (realBenchmarkRate != null ? `${(realBenchmarkRate * 100).toFixed(1)}${rateUnit}` : "Loading…")
                  : isGBP ? fmt(totalMarketEnergy, sym) : (realBenchmarkRate != null ? `${(realBenchmarkRate * 100).toFixed(1)}${rateUnit}` : "9–12¢/kWh"),
                valueColor: "#0A8A4C",
                sub: realBenchmarkRate != null ? benchmarkSource : `${isGBP ? "UK" : "FL"} commercial range`,
              },
              {
                label: "Your Rate",
                value: hasRealData
                  ? (realAvgRate > 0 ? `${(realAvgRate * 100).toFixed(1)}${rateUnit}` : "—")
                  : isGBP ? fmt(totalOverpay, sym) : "Upload bill",
                valueColor: hasRealData
                  ? (realBenchmarkRate != null && realAvgRate > realBenchmarkRate ? "#FF8080" : "#0A8A4C")
                  : isGBP ? "#FF8080" : "#1647E8",
                sub: hasRealData
                  ? (realBenchmarkRate != null && realAvgRate > realBenchmarkRate ? `Above ${benchmarkSource}` : "At or below market")
                  : isGBP ? `${overpayPct}% above market` : "to see your exact rate",
              },
              {
                label: hasRealData ? "Supplier" : "Anomalies",
                value: hasRealData ? realSupplier.split(" ")[0] : String(anomalies.length),
                valueColor: hasRealData ? "#F5A94A" : (anomalies.length > 0 ? "#F5A94A" : "#0A8A4C"),
                sub: hasRealData ? "current incumbent" : (anomalies.length > 0 ? "assets 30%+ over benchmark" : "none detected"),
              },
            ]}
          />
        )}

        {/* Issue → Cost → RealHQ Action bar */}
        {!loading && (
          <div className="rounded-xl px-5 py-3.5" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="text-xs" style={{ color: "#6B7280" }}>
              {hasRealData
                ? `${energySummary!.bills.length} asset${energySummary!.bills.length !== 1 ? "s" : ""} running ${(realAvgRate * 100).toFixed(1)}${rateUnit}${realBenchmarkRate != null ? ` against a ${(realBenchmarkRate * 100).toFixed(1)}${rateUnit} benchmark` : " — awaiting benchmark data"}.`
                : `${anomalies.length > 0 ? `${anomalies.length} asset${anomalies.length !== 1 ? "s" : ""} 30%+ above benchmark — ` : ""}portfolio paying ${overpayPct}% above market rate.`}{" "}
              {energyCapUplift > 0 && !hasRealData && (
                <>At your cap rate, that is <span style={{ color: "#f06040", fontWeight: 600 }}>~{fmt(energyCapUplift, sym)}</span> in portfolio value. </>
              )}
              {canSwitch
                ? "RealHQ is identifying where the waste is."
                : "RealHQ is identifying HVAC waste and demand charge reduction opportunities."}
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title={canSwitch
              ? "RealHQ switches the supplier contract — no action needed from you"
              : "RealHQ manages all energy cost reductions — no action needed from you"}
            body={canSwitch
              ? "Portfolio volume unlocks commercial tariffs. Saving 22–28% vs incumbent. RealHQ handles usage audit, supplier negotiation and contract placement."
              : "FL utilities are regulated monopolies — tariff switching is not available. RealHQ reduces costs five ways: tariff schedule review (FPL has 15+ commercial schedules), zero-upfront solar PPA, demand charge reduction, LED/HVAC retrofit with rebate management, and unclaimed FPL/Duke/TECO efficiency rebates."}
          />
        )}

        {/* FL "5 ways to save" card — shown when supplier switching is not available */}
        {!loading && !canSwitch && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <div className="text-sm font-semibold" style={{ color: "#111827" }}>5 ways RealHQ reduces your energy costs in Florida</div>
            </div>
            {[
              { num: 1, title: "Tariff restructuring", desc: "FPL has 15+ commercial tariff schedules. Most owners are on the wrong one. Moving to a demand-based or time-of-use tariff saves 10–20% with the same supplier, no contract change needed.", saving: "10–20%", cta: "Review tariff →", hint: "RealHQ reviews all available FPL/Duke/TECO tariffs for your assets" },
              { num: 2, title: "Solar PPA", desc: "Florida has exceptional solar irradiance. A Power Purchase Agreement means zero upfront cost, a fixed rate below your FPL tariff, and an immediate monthly saving from day one.", saving: "$42k+/yr", cta: "Model PPA →", hint: "RealHQ models a PPA for each roof at current FL irradiance" },
              { num: 3, title: "Demand charge reduction", desc: "40–60% of Florida commercial bills are demand charges, not consumption. Identifying and reducing peak demand events through HVAC scheduling or battery storage cuts the bill significantly.", saving: "Up to 25%", cta: "Analyse demand →", hint: "Upload bills for RealHQ to identify peak demand events" },
              { num: 4, title: "LED and HVAC retrofit", desc: "Lighting and HVAC account for 70%+ of commercial energy use. LED and controls upgrades reduce consumption 20–40% and qualify for FPL, Duke, and Tampa Electric rebates.", saving: "20–40%", cta: "RealHQ commissions audit →", hint: "Free · no commitment until you approve the works" },
              { num: 5, title: "Utility rebate programmes", desc: "FPL, Duke Energy Florida, and Tampa Electric all run commercial efficiency rebate programmes worth $50k–$200k per site. Most commercial owners never claim them.", saving: "$50k+", cta: "Check rebates →", hint: "RealHQ identifies all rebates available for your assets" },
            ].map((way, i) => (
              <div key={way.num} className="flex items-start gap-4 px-5 py-4" style={{ borderBottom: i < 4 ? "1px solid #F9FAFB" : "none" }}>
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0FDF4" }}>
                  <span className="text-sm font-semibold" style={{ color: "#059669" }}>{way.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>{way.title}</div>
                  <div className="text-xs mb-3 leading-relaxed" style={{ color: "#6B7280" }}>{way.desc}</div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: "#0A8A4C", color: "#fff" }}>{way.cta}</button>
                    <span className="text-xs" style={{ color: "#9CA3AF", fontStyle: "italic" }}>{way.hint}</span>
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold" style={{ color: "#059669" }}>{way.saving}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live tariff quotes panel — shown after switch intent (UK only) */}
        {!loading && canSwitch && switchStarted && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#111827" }}>Live Tariff Comparison</div>
                  <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {liveQuotes.length > 0
                      ? `${liveQuotes.length} suppliers · sorted by annual saving`
                      : "Loading live rates…"}
                  </div>
                </div>
                {switchedQuoteId && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>
                    Switch confirmed ✓
                  </span>
                )}
              </div>
            </div>
            {liveQuotes.length === 0 && (
              <div className="px-5 py-6 text-center text-sm" style={{ color: "#9CA3AF" }}>
                Fetching live supplier rates…
              </div>
            )}
            {liveQuotes.length > 0 && (
              <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
                {liveQuotes.slice(0, 5).map((q) => {
                  const isSwitched = q.status === "switched" || q.id === switchedQuoteId;
                  const isSwitching = switchingQuoteId === q.id;
                  const saving = q.annualSaving ?? 0;
                  return (
                    <div key={q.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: "#111827" }}>{q.supplier}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            backgroundColor: q.dataSource === "live_api" ? "rgba(10,138,76,0.1)" : "rgba(22,71,232,0.08)",
                            color: q.dataSource === "live_api" ? "#0A8A4C" : "#1647E8",
                          }}>
                            {q.dataSource === "live_api" ? "live" : q.dataSource === "live_db" ? "daily sync" : "benchmark"}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {q.quotedRate.toFixed(1)}p/kWh · {sym}{q.quotedCost.toLocaleString()}/yr
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold" style={{ color: saving > 0 ? "#0A8A4C" : "#6B7280" }}>
                          {saving > 0 ? `saves ${sym}${Math.round(saving).toLocaleString()}/yr` : "no saving"}
                        </div>
                      </div>
                      <div className="shrink-0 w-28 text-right">
                        {isSwitched ? (
                          <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Switched ✓</span>
                        ) : (
                          <button
                            onClick={() => confirmSwitch(q.id)}
                            disabled={isSwitching || !!switchedQuoteId}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                          >
                            {isSwitching ? "Switching…" : "Confirm switch →"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-3" style={{ borderTop: "1px solid #F3F4F6" }}>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {canSwitch
                  ? liveQuotes.some((q) => q.dataSource === "live_api")
                    ? "Octopus rate: live (Octopus Energy API). Other rates: Ofgem market data."
                    : "Rates derived from Ofgem published market data · updated daily."
                  : "Benchmark derived from EIA Form 861 commercial electricity data · updated quarterly."}
              </p>
            </div>
          </div>
        )}

        {/* PDF upload widget — auto-fill from energy bill */}
        {!loading && !hasRealData && (
          <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>
              Upload your latest energy bill to auto-fill
            </p>
            <p className="text-xs mb-4" style={{ color: "#9CA3AF" }}>
              Claude reads your bill and pre-fills supplier, annual spend, unit rate and usage
            </p>
            <PolicyUploadWidget
              documentType="energy"
              onExtracted={(data) => {
                setBillExtracted(data);
              }}
            />
            {billExtracted && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                {billExtracted.supplier && (
                  <div className="text-xs" style={{ color: "#6B7280" }}>
                    Supplier: <span className="font-semibold" style={{ color: "#111827" }}>{billExtracted.supplier}</span>
                  </div>
                )}
                {billExtracted.annualSpend != null && (
                  <div className="text-xs" style={{ color: "#6B7280" }}>
                    Annual spend: <span className="font-semibold" style={{ color: "#FF8080" }}>{sym}{billExtracted.annualSpend.toLocaleString()}</span>
                  </div>
                )}
                {billExtracted.unitRate != null && (
                  <div className="text-xs" style={{ color: "#6B7280" }}>
                    Unit rate: <span className="font-semibold" style={{ color: "#111827" }}>{billExtracted.unitRate}p/kWh</span>
                  </div>
                )}
                {canSwitch ? (
                  <button
                    onClick={() => handleSwitchIntent({
                      supplier: billExtracted.supplier,
                      annualSpend: billExtracted.annualSpend,
                    })}
                    className="sm:ml-auto px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}
                  >
                    Switch supplier →
                  </button>
                ) : (
                  <Link
                    href="/requests"
                    className="sm:ml-auto px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}
                  >
                    See optimisation options →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Real bills table */}
        {!loading && hasRealData && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="Your Energy Bills"
                subtitle={`${energySummary!.bills.length} bill${energySummary!.bills.length === 1 ? "" : "s"} uploaded · avg ${(realAvgRate * 100).toFixed(2)}${rateUnit}${realBenchmarkRate != null ? ` vs ${(realBenchmarkRate * 100).toFixed(2)}${rateUnit} ${benchmarkSource}` : ""}`}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {energySummary!.bills.map((bill) => {
                const aboveBenchmark = bill.unitRate > 0 && realBenchmarkRate != null && bill.unitRate > realBenchmarkRate;
                return (
                  <div key={bill.id} className="px-5 py-4 flex items-start justify-between gap-4 transition-colors hover:bg-[#F9FAFB]">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium mb-0.5" style={{ color: "#111827" }}>{bill.supplier}</div>
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>
                        {bill.billingPeriod && <span>{bill.billingPeriod}</span>}
                        {bill.accountNumber && <span> · Acct {bill.accountNumber}</span>}
                      </div>
                      {bill.consumption > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                          {bill.consumption.toLocaleString()} kWh consumed
                        </div>
                      )}
                      <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>{bill.filename}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold" style={{ color: "#FF8080", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {fmt(bill.totalCost, sym)}
                      </div>
                      {bill.unitRate > 0 && (
                        <div className="text-xs" style={{ color: aboveBenchmark ? "#FF8080" : "#0A8A4C" }}>
                          {(bill.unitRate * 100).toFixed(2)}{rateUnit} {aboveBenchmark ? "↑ above market" : "✓ at market"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Live Market Rate Comparison ── */}
        {!loading && realBenchmarkRate != null && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="Live Market Rate Comparison"
                subtitle={marketSectionSubtitle}
              />
              <span
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                style={{ backgroundColor: "rgba(22,71,232,0.12)", color: "#5a8fef" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#5a8fef" }} />
                Live
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {/* Your current rate (from uploaded bill or portfolio) */}
              {hasRealData && realAvgRate > 0 && (
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{realSupplier}</div>
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>Your current supplier · from uploaded bill</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Your rate</div>
                      <div className="text-base font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: realAvgRate > realBenchmarkRate ? "#FF8080" : "#0A8A4C" }}>
                        {(realAvgRate * 100).toFixed(2)}{rateUnit}
                      </div>
                    </div>
                    {realAvgRate > realBenchmarkRate && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
                        +{((realAvgRate - realBenchmarkRate) * 100).toFixed(2)}{rateUnit} above market
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Market Average (EIA/Ofgem live) */}
              <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ backgroundColor: "#F0FDF4" }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: "#111827" }}>{marketLabel}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{marketSourceDetail}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Market avg</div>
                    <div className="text-base font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}>
                      {(realBenchmarkRate * 100).toFixed(2)}{rateUnit}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}>
                    Best available
                  </span>
                </div>
              </div>
              {/* Annual saving estimate */}
              {hasRealData && realAvgRate > realBenchmarkRate && realTotalSpend > 0 && (
                <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ backgroundColor: "#F9FAFB" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                      {canSwitch ? "Estimated annual saving if switched to market rate" : "Estimated annual saving vs EIA benchmark"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                      {canSwitch ? "Based on your uploaded bill · actual saving confirmed at switch" : "Based on your uploaded bill · saving realised through demand management and HVAC optimisation"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}>
                      {fmt(Math.max(0, Math.round(realTotalSpend * (1 - realBenchmarkRate / Math.max(realAvgRate, 0.001)))), sym)}/yr
                    </div>
                    {canSwitch ? (
                      <button
                        onClick={() => handleSwitchIntent({ supplier: realSupplier, annualSpend: realTotalSpend })}
                        className="mt-1 text-xs font-semibold transition-opacity hover:opacity-80"
                        style={{ color: "#0A8A4C" }}
                      >
                        See switching options →
                      </button>
                    ) : (
                      <Link href="/requests" className="mt-1 text-xs font-semibold hover:opacity-80" style={{ color: "#0A8A4C" }}>
                        See optimisation options →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ranked anomaly cards */}
        {!loading && anomalies.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFBEB" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0">
                <path d="M10 2L18 16H2L10 2Z" stroke="#D97706" strokeWidth="1.5" />
                <path d="M10 8V11" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="13.5" r="0.75" fill="#D97706" />
              </svg>
              <span className="text-xs font-bold" style={{ color: "#92400E" }}>
                {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} detected — ranked by saving
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {anomalies.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FEF6E8", color: "#92580A" }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{a.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        {a.location} · {a.overpayPct}% above benchmark · {fmt(a.energyCost, sym)}/yr current
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px]" style={{ color: "#9CA3AF" }}>Potential saving</div>
                      <div className="text-base font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {fmt(a.saving, sym)}/yr
                      </div>
                    </div>
                    {canSwitch ? (
                      <button
                        onClick={() => handleSwitchIntent({ assetName: a.name, assetLocation: a.location, annualSpend: a.energyCost })}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#FEF6E8", color: "#92580A", border: "1px solid #FDE68A" }}
                      >
                        Action this →
                      </button>
                    ) : (
                      <Link
                        href="/requests"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: "#FEF6E8", color: "#92580A", border: "1px solid #FDE68A" }}
                      >
                        Review with RealHQ →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consumption heatmap — 7×24 grid */}
        {!loading && (() => {
          const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          const HOURS = Array.from({ length: 24 }, (_, i) => i);
          return (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#111827" }}>Consumption Profile</div>
                  <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Hourly pattern — Mon–Sun × 24h</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>Connect meter to see data</span>
                </div>
              </div>
              <div className="px-5 pt-4 pb-5 overflow-x-auto">
                {/* Hour labels */}
                <div className="flex mb-1" style={{ marginLeft: 30 }}>
                  {HOURS.filter(h => h % 3 === 0).map(h => (
                    <div key={h} className="text-[8.5px] font-mono" style={{ width: `${100 / 8}%`, color: "#9CA3AF" }}>{h}h</div>
                  ))}
                </div>
                {/* Grid rows */}
                <div className="space-y-0.5">
                  {DAYS.map((day, di) => (
                    <div key={day} className="flex items-center gap-0.5">
                      <div className="text-[9px] font-semibold shrink-0 text-right" style={{ width: 26, color: "#9CA3AF" }}>{day}</div>
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="rounded-[2px] flex-1 bg-neutral-100"
                          style={{ height: 14, minWidth: 8 }}
                          title={`${day} ${h}:00`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>Intensity:</span>
                  {[["Low", "#D1FAE5"], ["Mid", "#FDE68A"], ["High", "#FEE2E2"]].map(([lbl, bg]) => (
                    <div key={lbl} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: bg }} />
                      <span className="text-[10px]" style={{ color: "#6B7280" }}>{lbl}</span>
                    </div>
                  ))}
                  <span className="text-[10px] ml-auto" style={{ color: "#9CA3AF" }}>Connect smart meter to see real data</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Utility Analysis */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                  {canSwitch ? "Utility Analysis & Switching" : "Energy Optimisation"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Benchmarked vs {isGBP ? "800 comparable UK" : "1,200 comparable FL"} properties</div>
              </div>
              <Link href="/requests" className="text-xs font-medium" style={{ color: "#1647E8" }}>View requests →</Link>
            </div>

            {/* Utility rows */}
            {[
              {
                key: "electricity",
                icon: "⚡",
                iconBg: "#2d1f00",
                name: `Electricity — ${elecNames || portfolio.shortName}`,
                detail: `${elecTariff} · ${overpayPct}% above benchmark`,
                currentLabel: fmt(elecCurrentMo, sym) + "/mo",
                savingLabel: `→ saves ${fmt(elecSavingMo, sym)}/mo`,
                ctaLabel: canSwitch ? "Switch →" : "RealHQ will review →",
                context: { assetName: portfolio.shortName, supplier: elecTariff, annualSpend: totalCurrentEnergy },
              },
            ].map((row) => (
              <div key={row.key} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F9FAFB] transition-colors" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: row.iconBg }}>{row.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{row.name}</div>
                  <div className="text-[10.5px] truncate" style={{ color: "#9CA3AF" }}>{row.detail}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs font-semibold" style={{ color: "#FF8080" }}>{row.currentLabel}</div>
                  <div className="text-[10.5px] font-medium" style={{ color: "#0A8A4C" }}>{row.savingLabel}</div>
                </div>
                {utilSubmitted[row.key] ? (
                  <span className="shrink-0 text-[10.5px] font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>Submitted ✓</span>
                ) : (
                  <button
                    onClick={() => {
                      if (canSwitch) handleSwitchIntent(row.context);
                      setUtilSubmitted(s => ({ ...s, [row.key]: true }));
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}
                  >
                    {row.ctaLabel}
                  </button>
                )}
              </div>
            ))}

            {/* Pending-state rows — water requires real bill data */}
            {[
              { key: "water", icon: "💧", iconBg: "#001828", label: "Water & Sewer", pending: "Upload a water bill to see real spend and benchmark comparison.", tenderCategory: null, tenderJobKey: null },
            ].map((row) => (
              <div key={row.key} className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #E5E7EB", opacity: row.tenderCategory ? 1 : 0.6 }}>
                <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: row.iconBg }}>{row.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "#111827" }}>{row.label}</div>
                  <div className="text-[10.5px]" style={{ color: "#9CA3AF" }}>{row.pending}</div>
                </div>
                {row.tenderCategory ? (
                  <Link
                    href={`/work-orders?category=${row.tenderCategory}&jobKey=${row.tenderJobKey}&from=energy&ref=${row.key}`}
                    className="shrink-0 text-[10.5px] px-2.5 py-1.5 rounded-lg font-semibold hover:opacity-90"
                    style={{ backgroundColor: "#EEF2FF", color: "#1647E8", border: "1px solid #C7D2FE" }}
                  >
                    Instruct Installer →
                  </Link>
                ) : (
                  <span className="shrink-0 text-[10.5px] px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>Pending data</span>
                )}
              </div>
            ))}

            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "#F9FAFB" }}>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>
                Total utility saving: <span className="font-semibold" style={{ color: "#0A8A4C" }}>{fmt(totalUtilitySaving, sym)}/yr</span> across portfolio
              </div>
              <Link href="/requests" className="text-xs font-semibold" style={{ color: "#1647E8" }}>Full energy report →</Link>
            </div>
          </div>
        )}


        {/* Asset Breakdown */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Asset Energy Breakdown" subtitle={`${totalSqft.toLocaleString()} sqft total · est. ${estKwhPerSqft} vs ${benchmarkKwhPerSqft} kWh/sqft benchmark`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {portfolio.assets
                .slice()
                .sort((a, b) => (b.energyCost - b.marketEnergyCost) - (a.energyCost - a.marketEnergyCost))
                .map((asset) => {
                  const overpay = asset.energyCost - asset.marketEnergyCost;
                  const pct = Math.round((overpay / asset.energyCost) * 100);
                  const isAnomaly = pct > 30;
                  return (
                    <div key={asset.id} className="px-5 py-4 transition-colors hover:bg-[#F9FAFB]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link href={`/assets/${asset.id}`} className="text-sm font-medium hover:underline underline-offset-2" style={{ color: "#111827" }}>{asset.name}</Link>
                            {isAnomaly && <Badge variant="red">Anomaly</Badge>}
                            {asset.meterType === "hh" && <Badge variant="amber">HH metered</Badge>}
                            <Badge variant={pct > 30 ? "red" : pct > 20 ? "amber" : "gray"}>{pct}% above market</Badge>
                            {asset.epcRating && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: ["A", "B"].includes(asset.epcRating) ? "#D1FAE5" : ["E", "F", "G"].includes(asset.epcRating) ? "#FEE2E2" : "#FEF3C7",
                                  color: ["A", "B"].includes(asset.epcRating) ? "#065F46" : ["E", "F", "G"].includes(asset.epcRating) ? "#991B1B" : "#92400E",
                                }}
                              >
                                EPC {asset.epcRating}
                              </span>
                            )}
                          </div>
                          <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>
                            {asset.location} · {asset.sqft.toLocaleString()} sqft · est. {(asset.energyCost / asset.sqft).toFixed(1)} {sym}/sqft/yr
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5E7EB", maxWidth: 240 }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct * 2)}%`, backgroundColor: "#F5A94A" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#9CA3AF" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#FF8080" }}>{fmt(asset.energyCost, sym)}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#9CA3AF" }}>Market</div>
                            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketEnergyCost, sym)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#9CA3AF" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(overpay, sym)}</div>
                            {!hasRealData && !isGBP && (
                              <Link href="#bill-upload" className="text-[10px] hover:underline" style={{ color: "#1647E8" }}>Upload bill to compare</Link>
                            )}
                          </div>
                          {asset.meterType === "hh" ? (
                            <button
                              onClick={() => handleSwitchIntent({ assetName: asset.name, assetLocation: asset.location, annualSpend: asset.energyCost })}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                              style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92580A" }}
                            >
                              Tender →
                            </button>
                          ) : canSwitch ? (
                            <button
                              onClick={() => handleSwitchIntent({ assetName: asset.name, assetLocation: asset.location, annualSpend: asset.energyCost })}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                              style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE", color: "#1647E8" }}
                            >
                              Switch →
                            </button>
                          ) : (
                            <Link
                              href="/requests"
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                              style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE", color: "#1647E8" }}
                            >
                              See options →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                {canSwitch ? "Total annual saving on switch" : "Total annual optimisation opportunity"}
              </span>
              <span className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(totalOverpay, sym)}</span>
            </div>
          </div>
        )}
        {/* Bottom upload CTA — FL no-data */}
        {!loading && !hasRealData && !isGBP && (
          <div id="bill-upload" className="rounded-xl px-5 py-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>
              Upload a utility bill to unlock exact analysis
            </p>
            <p className="text-xs mb-4" style={{ color: "#9CA3AF" }}>
              RealHQ reads your bill and compares your exact rate to the EIA Florida commercial benchmark
            </p>
            <PolicyUploadWidget
              documentType="energy"
              onExtracted={(data) => setBillExtracted(data)}
            />
          </div>
        )}
      </main>
    </AppShell>
  );
}

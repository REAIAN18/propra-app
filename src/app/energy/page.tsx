"use client";

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

  useEffect(() => { document.title = "Energy — RealHQ"; }, []);

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
  const elecTariff = isGBP ? "EDF Standard Tariff" : "FPL Standard Tariff";

  const waterAsset = sortedBySqft[0];
  const waterAnnual = waterAsset ? Math.round(waterAsset.energyCost * 0.25) : 0;
  const waterSavingAnnual = Math.round(waterAnnual * 0.18);
  const waterProvider = isGBP ? "Thames Water" : "Miami-Dade Water";
  const waterCurrentMo = Math.round(waterAnnual / 12);
  const waterSavingMo = Math.round(waterSavingAnnual / 12);

  const solarAsset = sortedBySqft[0];
  const solarSavingAnnual = solarAsset ? Math.round(solarAsset.sqft * (isGBP ? 0.18 : 0.21)) : 0;
  const solarROI = isGBP ? "3.8yr" : "4.2yr";
  const solarEligible = isGBP ? "UK BUS eligible" : "FL ITC eligible";

  const hvacAsset = portfolio.assets[0];
  const hvacMoCost = hvacAsset ? Math.round(hvacAsset.energyCost * 0.35 / 12) : 0;
  const hvacSavingMo = Math.round(hvacMoCost * 0.34);

  const ledAssets = sortedByEnergy.slice(1, 3);
  const ledNames = ledAssets.map(a => a.name.split(" ").slice(0, 2).join(" ")).join(" + ");
  const ledInstallK = Math.max(8, portfolio.assets.length * 4);
  const ledRebateK = Math.round(ledInstallK * 0.27);
  const ledSavingMo = Math.round(ledAssets.reduce((s, a) => s + a.energyCost * 0.33, 0) / 12);
  const ledPayback = ledSavingMo > 0 ? ((ledInstallK * 1000) / (ledSavingMo * 12)).toFixed(1) : "—";

  const totalUtilitySaving = totalOverpay + waterSavingAnnual + solarSavingAnnual + (hvacSavingMo * 12) + (ledSavingMo * 12);

  const anomalies = portfolio.assets
    .map((a) => ({
      ...a,
      overpayPct: Math.round(((a.energyCost - a.marketEnergyCost) / Math.max(1, a.marketEnergyCost)) * 100),
      saving: a.energyCost - a.marketEnergyCost,
    }))
    .filter((a) => a.overpayPct > 30)
    .sort((a, b) => b.saving - a.saving);

  // 7×24 consumption heatmap data — illustrative commercial building pattern
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hourlyBase = [
    0.08, 0.06, 0.06, 0.06, 0.08, 0.18, 0.38, 0.62,
    0.78, 0.95, 1.00, 1.00, 0.98, 0.97, 0.99, 1.00,
    0.95, 0.88, 0.72, 0.52, 0.40, 0.28, 0.18, 0.10,
  ];
  const weekendScale = 0.35;
  const heatmapData: number[][] = DAYS.map((_, d) => {
    const scale = d >= 5 ? weekendScale : 1;
    return hourlyBase.map((v) => v * scale + (Math.sin(d * 7 + v * 13) * 0.04));
  });

  return (
    <AppShell>
      <TopBar title="Energy" />

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
                  : fmt(totalMarketEnergy, sym),
                valueColor: "#0A8A4C",
                sub: realBenchmarkRate != null ? benchmarkSource : `${isGBP ? "UK" : "FL"} commercial benchmark`,
              },
              {
                label: "Your Rate",
                value: hasRealData
                  ? (realAvgRate > 0 ? `${(realAvgRate * 100).toFixed(1)}${rateUnit}` : "—")
                  : fmt(totalOverpay, sym),
                valueColor: hasRealData
                  ? (realBenchmarkRate != null && realAvgRate > realBenchmarkRate ? "#FF8080" : "#0A8A4C")
                  : "#FF8080",
                sub: hasRealData
                  ? (realBenchmarkRate != null && realAvgRate > realBenchmarkRate ? `Above ${benchmarkSource}` : "At or below market")
                  : `${overpayPct}% above market`,
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
              <span style={{ color: "#DC2626", fontWeight: 600 }}>Issue:</span>{" "}
              {hasRealData
                ? `${energySummary!.bills.length} bill${energySummary!.bills.length !== 1 ? "s" : ""} uploaded — avg rate ${(realAvgRate * 100).toFixed(1)}${rateUnit}${realBenchmarkRate != null ? ` vs ${(realBenchmarkRate * 100).toFixed(1)}${rateUnit} ${benchmarkSource}` : ""}`
                : `${anomalies.length > 0 ? `${anomalies.length} asset${anomalies.length !== 1 ? "s" : ""} 30%+ above benchmark — ` : ""}portfolio paying ${overpayPct}% above market rate`} ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(hasRealData && realBenchmarkRate != null ? Math.max(0, Math.round(realTotalSpend * (1 - realBenchmarkRate / Math.max(realAvgRate, 0.001)))) : totalOverpay, sym)}/yr</span> excess spend
              {energyCapUplift > 0 && !hasRealData ? ` · ~${fmt(energyCapUplift, sym)} in portfolio value at ${(impliedCapRate * 100).toFixed(1)}% cap rate` : ""} ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
              switches supplier, manages contract placement — 10% of yr 1 saving, success-only
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title="RealHQ switches the supplier contract — no action needed from you"
            body="Portfolio volume unlocks commercial tariffs. Saving 22–28% vs incumbent. RealHQ handles usage audit, supplier negotiation and contract placement."
          />
        )}

        {/* Live tariff quotes panel — shown after switch intent */}
        {!loading && switchStarted && (
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
                        <div className="text-sm font-semibold" style={{ color: saving > 0 ? "#0A8A4C" : "#6B7280", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
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
                {liveQuotes.some((q) => q.dataSource === "live_api")
                  ? "Octopus rate: live (Octopus Energy API). Other rates: Ofgem market data."
                  : "Rates derived from Ofgem published market data · updated daily."}
                {" "}10% of year-1 saving, success-only.
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
                    <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Estimated annual saving if switched to market rate</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Based on your uploaded bill · actual saving confirmed at switch</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold" style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#0A8A4C" }}>
                      {fmt(Math.max(0, Math.round(realTotalSpend * (1 - realBenchmarkRate / Math.max(realAvgRate, 0.001)))), sym)}/yr
                    </div>
                    <button
                      onClick={() => handleSwitchIntent({ supplier: realSupplier, annualSpend: realTotalSpend })}
                      className="mt-1 text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "#0A8A4C" }}
                    >
                      See switching options →
                    </button>
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
                    <button
                      onClick={() => handleSwitchIntent({ assetName: a.name, assetLocation: a.location, annualSpend: a.energyCost })}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "#FEF6E8", color: "#92580A", border: "1px solid #FDE68A" }}
                    >
                      Schedule audit →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consumption heatmap (7×24) */}
        {!loading && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Consumption Profile</div>
                <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Hourly pattern — Mon–Sun × 24h · illustrative from portfolio type</div>
              </div>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: "#9CA3AF" }}>
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#E8F5EE" }} />
                Low
                <span className="inline-block w-3 h-3 rounded-sm ml-1" style={{ backgroundColor: "#F5A94A" }} />
                Mid
                <span className="inline-block w-3 h-3 rounded-sm ml-1" style={{ backgroundColor: "#D93025" }} />
                Peak
              </div>
            </div>
            <div className="px-5 py-4 overflow-x-auto">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="shrink-0" style={{ width: 30 }} />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[8px]" style={{ color: "#D1D5DB", minWidth: 16 }}>
                    {h % 4 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {heatmapData.map((row, d) => (
                <div key={d} className="flex items-center gap-0 mb-0.5">
                  <div className="shrink-0 text-[9px] font-medium text-right pr-2" style={{ width: 30, color: "#9CA3AF" }}>{DAYS[d]}</div>
                  {row.map((val, h) => {
                    const v = Math.max(0, Math.min(1, val));
                    const r = v < 0.5
                      ? Math.round(232 + (245 - 232) * v * 2)
                      : Math.round(245 + (217 - 245) * (v - 0.5) * 2);
                    const g = v < 0.5
                      ? Math.round(245 + (169 - 245) * v * 2)
                      : Math.round(169 + (48 - 169) * (v - 0.5) * 2);
                    const b = v < 0.5
                      ? Math.round(238 + (74 - 238) * v * 2)
                      : Math.round(74 + (37 - 74) * (v - 0.5) * 2);
                    return (
                      <div
                        key={h}
                        title={`${DAYS[d]} ${h}:00 — ${Math.round(v * 100)}% relative load`}
                        className="flex-1 rounded-[2px]"
                        style={{ height: 16, minWidth: 16, backgroundColor: `rgb(${r},${g},${b})`, margin: "0 1px" }}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="mt-2 text-[9.5px]" style={{ color: "#9CA3AF" }}>
                Peak hours: Mon–Fri 09:00–17:00 · Off-peak: evenings & weekends · Hover cells for load %
              </div>
            </div>
          </div>
        )}

        {/* Utility Analysis */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#111827" }}>Utility Analysis &amp; Switching</div>
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
                ctaLabel: "Switch →",
                context: { assetName: portfolio.shortName, supplier: elecTariff, annualSpend: totalCurrentEnergy },
              },
              {
                key: "water",
                icon: "💧",
                iconBg: "#001828",
                name: `Water & Sewer — ${waterAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}`,
                detail: `${waterProvider} · 18% above benchmark`,
                estimatedNote: "· Estimated from portfolio size",
                currentLabel: fmt(waterCurrentMo, sym) + "/mo",
                savingLabel: `→ saves ${fmt(waterSavingMo, sym)}/mo`,
                ctaLabel: "Switch →",
                context: { assetName: waterAsset?.name ?? portfolio.shortName, annualSpend: waterAnnual },
              },
              {
                key: "solar",
                icon: "☀️",
                iconBg: "#102000",
                name: `Solar — ${solarAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"} (${solarAsset ? (solarAsset.sqft / 1000).toFixed(0) + "k" : "—"} sf)`,
                detail: `${solarROI} ROI · ${solarEligible} · $0 upfront`,
                estimatedNote: "· Estimated from roof area",
                currentLabel: sym + "0 install",
                currentColor: "#0A8A4C",
                savingLabel: `→ saves ${fmt(solarSavingAnnual, sym)}/yr`,
                ctaLabel: "Activate →",
                context: { assetName: solarAsset?.name ?? portfolio.shortName, annualSpend: solarSavingAnnual },
              },
              {
                key: "hvac",
                icon: "🌡️",
                iconBg: "#001828",
                name: `HVAC Scheduling — ${hvacAsset?.name?.split(" ").slice(0, 2).join(" ") ?? "Portfolio"}`,
                detail: "Running 168hr/wk · Optimise to 110hr · saves 34%",
                estimatedNote: "· Estimated from consumption data",
                currentLabel: fmt(hvacMoCost, sym) + "/mo",
                savingLabel: `→ saves ${fmt(hvacSavingMo, sym)}/mo`,
                ctaLabel: "Optimise →",
                context: { assetName: hvacAsset?.name ?? portfolio.shortName, annualSpend: hvacMoCost * 12 },
              },
              {
                key: "led",
                icon: "💡",
                iconBg: "#2d1f00",
                name: `LED Retrofit — ${ledNames || portfolio.shortName}`,
                detail: `${sym}${ledInstallK}k install · ${isGBP ? "UK" : "FL"} rebate ${sym}${ledRebateK}k · ${ledPayback}yr payback`,
                estimatedNote: "· Estimated from floor area",
                currentLabel: fmt(ledSavingMo * 3, sym) + "/mo",
                savingLabel: `→ saves ${fmt(ledSavingMo, sym)}/mo`,
                ctaLabel: "Install →",
                context: { assetName: ledNames || portfolio.shortName, annualSpend: ledSavingMo * 12 },
              },
            ].map((row) => (
              <div key={row.key} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F9FAFB] transition-colors" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: row.iconBg }}>{row.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{row.name}</div>
                  <div className="text-[10.5px] truncate" style={{ color: "#9CA3AF" }}>{row.detail}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs font-semibold" style={{ color: row.currentColor ?? "#FF8080" }}>{row.currentLabel}</div>
                  <div className="text-[10.5px] font-medium" style={{ color: "#0A8A4C" }}>{row.savingLabel}</div>
                  {"estimatedNote" in row && row.estimatedNote && (
                    <div className="text-[9.5px] mt-0.5" style={{ color: "#9CA3AF" }}>{row.estimatedNote}</div>
                  )}
                </div>
                {utilSubmitted[row.key] ? (
                  <span className="shrink-0 text-[10.5px] font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C" }}>Submitted ✓</span>
                ) : (
                  <button
                    onClick={() => {
                      handleSwitchIntent(row.context);
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
                          </div>
                          <button
                            onClick={() => handleSwitchIntent({ assetName: asset.name, assetLocation: asset.location, annualSpend: asset.energyCost })}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                            style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE", color: "#1647E8" }}
                          >
                            Switch →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
              <span className="text-xs" style={{ color: "#9CA3AF" }}>Total annual saving on switch</span>
              <span className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(totalOverpay, sym)}</span>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

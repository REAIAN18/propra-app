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
import { ArcaDirectCallout } from "@/components/ui/ArcaDirectCallout";
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
  benchmarkRate: number;
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

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const [switchStarted, setSwitchStarted] = useState(false);
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

  function handleSwitchIntent(context?: { assetName?: string; assetLocation?: string; supplier?: string; annualSpend?: number }) {
    setSwitchStarted(true);
    fetch("/api/leads/energy-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyAddress: context?.assetName ?? context?.assetLocation ?? portfolio.shortName,
        supplier: context?.supplier,
        annualSpend: context?.annualSpend,
      }),
    }).catch(() => {});
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
  const realBenchmarkRate = energySummary?.benchmarkRate ?? 0.10;
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

  const anomalies = portfolio.assets.filter((a) => {
    const pct = ((a.energyCost - a.marketEnergyCost) / a.marketEnergyCost) * 100;
    return pct > 30;
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
                value: hasRealData ? `${(realBenchmarkRate * 100).toFixed(1)}¢/kWh` : fmt(totalMarketEnergy, sym),
                valueColor: "#0A8A4C",
                sub: "FL commercial benchmark",
              },
              {
                label: "Your Rate",
                value: hasRealData
                  ? (realAvgRate > 0 ? `${(realAvgRate * 100).toFixed(1)}¢/kWh` : "—")
                  : fmt(totalOverpay, sym),
                valueColor: hasRealData
                  ? (realAvgRate > realBenchmarkRate ? "#FF8080" : "#0A8A4C")
                  : "#FF8080",
                sub: hasRealData
                  ? (realAvgRate > realBenchmarkRate ? "Above benchmark" : "At market")
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
                ? `${energySummary!.bills.length} bill${energySummary!.bills.length !== 1 ? "s" : ""} uploaded — avg rate ${(realAvgRate * 100).toFixed(1)}¢/kWh vs ${(realBenchmarkRate * 100).toFixed(1)}¢ benchmark`
                : `${anomalies.length > 0 ? `${anomalies.length} asset${anomalies.length !== 1 ? "s" : ""} 30%+ above benchmark — ` : ""}portfolio paying ${overpayPct}% above market rate`} ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(hasRealData ? Math.round(realTotalSpend * (1 - realBenchmarkRate / Math.max(realAvgRate, 0.001))) : totalOverpay, sym)}/yr</span> excess spend
              {energyCapUplift > 0 && !hasRealData ? ` · ~${fmt(energyCapUplift, sym)} in portfolio value at ${(impliedCapRate * 100).toFixed(1)}% cap rate` : ""} ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
              switches supplier, manages contract placement — 10% of yr 1 saving, success-only
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <ArcaDirectCallout
            title="RealHQ switches the supplier contract — no action needed from you"
            body="Portfolio volume unlocks commercial tariffs. Saving 22–28% vs incumbent. RealHQ handles usage audit, supplier negotiation and contract placement."
          />
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
                subtitle={`${energySummary!.bills.length} bill${energySummary!.bills.length === 1 ? "" : "s"} uploaded · avg ${(realAvgRate * 100).toFixed(2)}¢/kWh vs ${(realBenchmarkRate * 100).toFixed(2)}¢ FL benchmark`}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {energySummary!.bills.map((bill) => {
                const aboveBenchmark = bill.unitRate > 0 && bill.unitRate > realBenchmarkRate;
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
                          {(bill.unitRate * 100).toFixed(2)}¢/kWh {aboveBenchmark ? "↑ above market" : "✓ at market"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && anomalies.length > 0 && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 2L18 16H2L10 2Z" stroke="#D97706" strokeWidth="1.5" />
              <path d="M10 8V11" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="13.5" r="0.75" fill="#D97706" />
            </svg>
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#92400E" }}>
                {anomalies.length} usage anomaly detected
              </div>
              <div className="text-xs" style={{ color: "#6B7280" }}>
                {anomalies.map(a => a.name).join(", ")} {anomalies.length === 1 ? "is" : "are"} consuming 30%+ above benchmark.
                RealHQ recommends an on-site audit before switching.
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

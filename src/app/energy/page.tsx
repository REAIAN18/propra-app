"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarChart } from "@/components/ui/BarChart";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const switchSteps = [
  { label: "Usage audit", desc: "Baseline kWh/sqft per asset", done: true },
  { label: "Anomaly scan", desc: "Flag usage outliers vs benchmark", done: true },
  { label: "Supplier comparison", desc: "Arca runs live market comparison", done: false },
  { label: "Contract negotiation", desc: "Lock in best-rate tariff", done: false },
  { label: "Switch & monitor", desc: "New contract live, usage tracked", done: false },
];

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const [switchStarted, setSwitchStarted] = useState(false);
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalCurrentEnergy = portfolio.assets.reduce((s, a) => s + a.energyCost, 0);
  const totalMarketEnergy = portfolio.assets.reduce((s, a) => s + a.marketEnergyCost, 0);
  const totalOverpay = totalCurrentEnergy - totalMarketEnergy;
  const overpayPct = Math.round((totalOverpay / totalCurrentEnergy) * 100);
  const commissionOnSaving = Math.round(totalOverpay * 0.10);

  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
  const estKwhPerSqft = portfolio.assets[0].type === "warehouse" ? 9.2 : 18.4;
  const benchmarkKwhPerSqft = portfolio.assets[0].type === "warehouse" ? 7.5 : 14.8;

  const barData = portfolio.assets.map((a) => ({
    label: a.name.split(" ").slice(0, 2).join(" "),
    value: a.energyCost,
    benchmark: a.marketEnergyCost,
  }));

  const anomalies = portfolio.assets.filter((a) => {
    const pct = ((a.energyCost - a.marketEnergyCost) / a.marketEnergyCost) * 100;
    return pct > 30;
  });

  return (
    <AppShell>
      <TopBar title="Energy" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard label="Current Energy Spend" value={fmt(totalCurrentEnergy, sym)} sub="Annual across portfolio" accent="red" />
            <MetricCard label="Market Rate" value={fmt(totalMarketEnergy, sym)} sub="Arca benchmark" accent="green" />
            <MetricCard label="Annual Overspend" value={fmt(totalOverpay, sym)} sub={`${overpayPct}% above market`} trend="down" trendLabel="Recoverable via switch" accent="amber" />
            <MetricCard label="Arca Fee" value={fmt(commissionOnSaving, sym)} sub="10% of yr 1 saving · success-only" accent="blue" />
          </div>
        )}

        {!loading && anomalies.length > 0 && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#1e1400", border: "1px solid #F5A94A" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 2L18 16H2L10 2Z" stroke="#F5A94A" strokeWidth="1.5" />
              <path d="M10 8V11" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="13.5" r="0.75" fill="#F5A94A" />
            </svg>
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#F5A94A" }}>
                {anomalies.length} usage anomaly detected
              </div>
              <div className="text-xs" style={{ color: "#8ba0b8" }}>
                {anomalies.map(a => a.name).join(", ")} {anomalies.length === 1 ? "is" : "are"} consuming 30%+ above benchmark.
                Arca recommends an on-site audit before switching.
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={5} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Energy Spend vs Benchmark</div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Per asset — current vs market rate</div>
                </div>
                <div className="flex items-center gap-3 lg:gap-4 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "#1647E8" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#1647E8" }} />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                    Market
                  </span>
                </div>
              </div>
              <BarChart data={barData} height={160} color="#1647E8" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
            </div>

            {/* Switch Workflow */}
            <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>Switch Workflow</div>
              <div className="text-xs mb-4" style={{ color: "#5a7a96" }}>Arca manages supplier transition</div>
              <div className="space-y-3 mb-5">
                {switchSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: step.done ? "#0A8A4C" : switchStarted && i === switchSteps.findIndex(s => !s.done) ? "#1647E8" : "#1a2d45",
                        color: step.done || (switchStarted && i === switchSteps.findIndex(s => !s.done)) ? "#fff" : "#5a7a96",
                      }}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: step.done ? "#0A8A4C" : "#e8eef5" }}>{step.label}</div>
                      <div className="text-xs" style={{ color: "#5a7a96" }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {!switchStarted ? (
                <button
                  onClick={() => setSwitchStarted(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#1647E8", color: "#fff" }}
                >
                  Run Supplier Comparison
                </button>
              ) : (
                <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#0d1630", border: "1px solid #1647E8" }}>
                  <div className="font-semibold mb-1" style={{ color: "#1647E8" }}>Comparison running</div>
                  <div style={{ color: "#5a7a96" }}>Arca is comparing rates across suppliers. Results expected within 3 business days.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Asset Breakdown */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Asset Energy Breakdown" subtitle={`${totalSqft.toLocaleString()} sqft total · est. ${estKwhPerSqft} vs ${benchmarkKwhPerSqft} kWh/sqft benchmark`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {portfolio.assets
                .slice()
                .sort((a, b) => (b.energyCost - b.marketEnergyCost) - (a.energyCost - a.marketEnergyCost))
                .map((asset) => {
                  const overpay = asset.energyCost - asset.marketEnergyCost;
                  const pct = Math.round((overpay / asset.energyCost) * 100);
                  const isAnomaly = pct > 30;
                  return (
                    <div key={asset.id} className="px-5 py-4 transition-colors hover:bg-[#0d1825]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{asset.name}</span>
                            {isAnomaly && <Badge variant="red">Anomaly</Badge>}
                            <Badge variant={pct > 30 ? "red" : pct > 20 ? "amber" : "gray"}>{pct}% above market</Badge>
                          </div>
                          <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>
                            {asset.location} · {asset.sqft.toLocaleString()} sqft · est. {(asset.energyCost / asset.sqft).toFixed(1)} {sym}/sqft/yr
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45", maxWidth: 240 }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct * 2)}%`, backgroundColor: isAnomaly ? "#f06040" : "#1647E8" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#1647E8" }}>{fmt(asset.energyCost, sym)}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Market</div>
                            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketEnergyCost, sym)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Saving</div>
                            <div className="text-sm font-bold" style={{ color: "#e8eef5" }}>{fmt(overpay, sym)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Total annual saving on switch</span>
              <span className="text-base font-bold" style={{ color: "#0A8A4C" }}>{fmt(totalOverpay, sym)}</span>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

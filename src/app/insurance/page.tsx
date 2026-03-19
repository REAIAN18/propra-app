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

const retenderSteps = [
  { label: "Portfolio audit", desc: "Review current premiums vs market", done: true },
  { label: "Market approach", desc: "Arca approaches 8–12 carriers", done: true },
  { label: "Indicative terms", desc: "Receive competitive quotes", done: false },
  { label: "Best & final", desc: "Negotiate final premium", done: false },
  { label: "Placement", desc: "Bind new policy, cancel incumbent", done: false },
];

export default function InsurancePage() {
  const { portfolioId } = useNav();
  const [retenderStarted, setRetenderStarted] = useState(false);
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalCurrentPremium = portfolio.assets.reduce((s, a) => s + a.insurancePremium, 0);
  const totalMarketPremium = portfolio.assets.reduce((s, a) => s + a.marketInsurance, 0);
  const totalOverpay = totalCurrentPremium - totalMarketPremium;
  const overpayPct = Math.round((totalOverpay / totalCurrentPremium) * 100);

  const barData = portfolio.assets.map((a) => ({
    label: a.name.split(" ").slice(0, 2).join(" "),
    value: a.insurancePremium,
    benchmark: a.marketInsurance,
  }));

  const commissionOnSaving = Math.round(totalOverpay * 0.15);

  return (
    <AppShell>
      <TopBar title="Insurance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard label="Current Premium" value={fmt(totalCurrentPremium, sym)} sub="Annual across portfolio" accent="red" />
            <MetricCard label="Market Rate" value={fmt(totalMarketPremium, sym)} sub="Arca benchmark" accent="green" />
            <MetricCard label="Annual Overpay" value={fmt(totalOverpay, sym)} sub={`${overpayPct}% above market`} trend="down" trendLabel="Recoverable via retender" accent="amber" />
            <MetricCard label="Arca Fee" value={fmt(commissionOnSaving, sym)} sub="15% of saving · success-only" accent="blue" />
          </div>
        )}

        {/* Issue context bar */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#f06040", fontWeight: 600 }}>Issue:</span>{" "}
              portfolio paying {overpayPct}% above market rate on insurance{" "}
              ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
              {fmt(totalOverpay, sym)}/yr in recoverable overpayment{" "}
              ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              retenders across 8–12 carriers, saves {fmt(totalOverpay, sym)}, charges 15% of saving only
            </div>
            <button
              onClick={() => setRetenderStarted(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Get quotes →
            </button>
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
                  <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Premium vs Market Rate</div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Per asset — current vs Arca benchmark</div>
                </div>
                <div className="flex items-center gap-3 lg:gap-4 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "#F5A94A" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#F5A94A" }} />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                    Market
                  </span>
                </div>
              </div>
              <BarChart data={barData} height={160} color="#F5A94A" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
            </div>

            {/* Retender Workflow */}
            <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>Retender Workflow</div>
              <div className="text-xs mb-4" style={{ color: "#5a7a96" }}>Arca manages end-to-end</div>
              <div className="space-y-3 mb-5">
                {retenderSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: step.done ? "#0A8A4C" : retenderStarted && i === retenderSteps.findIndex(s => !s.done) ? "#1647E8" : "#1a2d45",
                        color: step.done || (retenderStarted && i === retenderSteps.findIndex(s => !s.done)) ? "#fff" : "#5a7a96",
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
              {!retenderStarted ? (
                <button
                  onClick={() => setRetenderStarted(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Get Better Quotes — save {fmt(totalOverpay, sym)}
                </button>
              ) : (
                <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}>
                  <div className="font-semibold mb-1" style={{ color: "#0A8A4C" }}>Review started</div>
                  <div style={{ color: "#5a7a96" }}>Arca is approaching 8–12 carriers for competitive quotes. Expect results within 5 business days.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Asset Breakdown */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Asset-by-Asset Breakdown" subtitle={`${portfolio.assets.length} assets · ${fmt(totalOverpay, sym)} total recoverable`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {portfolio.assets
                .slice()
                .sort((a, b) => (b.insurancePremium - b.marketInsurance) - (a.insurancePremium - a.marketInsurance))
                .map((asset) => {
                  const overpay = asset.insurancePremium - asset.marketInsurance;
                  const pct = Math.round((overpay / asset.insurancePremium) * 100);
                  return (
                    <div key={asset.id} className="px-5 py-4 transition-colors hover:bg-[#0d1825]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{asset.name}</span>
                            <Badge variant={pct > 25 ? "red" : pct > 15 ? "amber" : "gray"}>{pct}% overpay</Badge>
                          </div>
                          <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>{asset.location} · {asset.type}</div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45", maxWidth: 240 }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct * 2.5)}%`, backgroundColor: pct > 25 ? "#f06040" : "#F5A94A" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#F5A94A" }}>{fmt(asset.insurancePremium, sym)}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Market</div>
                            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketInsurance, sym)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(overpay, sym)}</div>
                          </div>
                          <button
                            onClick={() => setRetenderStarted(true)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] hidden sm:block"
                            style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}
                          >
                            Include →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Total annual saving on placement</span>
              <span className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(totalOverpay, sym)}</span>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

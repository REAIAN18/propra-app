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

// Plausible carriers for quote comparison
const CURRENT_CARRIERS = ["Zurich", "AXA", "Aviva", "Chubb", "FM Global", "RSA", "Hartford", "Travelers"];
const COMPETING_CARRIERS = ["Markel", "QBE", "Allianz", "Hiscox", "Beazley", "Sompo", "Arch", "Liberty Mutual"];

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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
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

        {/* Carrier Quote Comparison */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Carrier Quote Comparison" subtitle="Current incumbent vs best-in-market quote" />
            </div>
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] px-5 py-2.5 text-xs font-medium" style={{ color: "#5a7a96", borderBottom: "1px solid #1a2d45" }}>
              <span>Asset</span>
              <span className="text-center">Incumbent</span>
              <span className="text-center">Best Quote</span>
              <span className="text-right pr-1">Saving</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {portfolio.assets
                .slice()
                .sort((a, b) => (b.insurancePremium - b.marketInsurance) - (a.insurancePremium - a.marketInsurance))
                .map((asset, i) => {
                  const saving = asset.insurancePremium - asset.marketInsurance;
                  const savingPct = Math.round((saving / asset.insurancePremium) * 100);
                  const currentCarrier = CURRENT_CARRIERS[i % CURRENT_CARRIERS.length];
                  const competingCarrier = COMPETING_CARRIERS[i % COMPETING_CARRIERS.length];
                  const expanded = !!expandedRows[asset.id];
                  const setExpanded = (v: boolean) => setExpandedRows(r => ({ ...r, [asset.id]: v }));

                  return (
                    <div key={asset.id}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] px-5 py-3.5 items-center gap-4 hover:bg-[#0d1825] transition-colors">
                        <div>
                          <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>{asset.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{asset.location}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>{currentCarrier}</div>
                          <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#F5A94A" }}>
                            {fmt(asset.insurancePremium, sym)}/yr
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>{competingCarrier}</div>
                          <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#0A8A4C" }}>
                            {fmt(asset.marketInsurance, sym)}/yr
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold mb-0.5" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#e8eef5" }}>
                            {fmt(saving, sym)}
                          </div>
                          <div className="text-xs font-semibold" style={{ color: "#F5A94A" }}>{savingPct}% saving</div>
                          <button
                            onClick={() => setRetenderStarted(true)}
                            className="mt-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                          >
                            Place →
                          </button>
                        </div>
                      </div>
                      {/* Mobile card */}
                      <div className="sm:hidden px-4 py-3">
                        <button type="button" className="w-full flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
                          <div className="text-left">
                            <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>{asset.name}</div>
                            <div className="text-xs" style={{ color: "#5a7a96" }}>{asset.location}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#e8eef5" }}>{fmt(saving, sym)}</span>
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1e1400", color: "#F5A94A" }}>{savingPct}%</span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#5a7a96", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
                              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </button>
                        {expanded && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg p-3" style={{ backgroundColor: "#0d1c2b", border: "1px solid #1a2d45" }}>
                              <div className="text-xs mb-1 font-medium" style={{ color: "#5a7a96" }}>Incumbent</div>
                              <div className="text-xs mb-0.5" style={{ color: "#3d5a72" }}>{currentCarrier}</div>
                              <div className="text-sm font-semibold" style={{ color: "#F5A94A" }}>{fmt(asset.insurancePremium, sym)}/yr</div>
                            </div>
                            <div className="rounded-lg p-3" style={{ backgroundColor: "#0d1c2b", border: "1px solid #0A8A4C" }}>
                              <div className="text-xs mb-1 font-medium" style={{ color: "#5a7a96" }}>Best Quote</div>
                              <div className="text-xs mb-0.5" style={{ color: "#3d5a72" }}>{competingCarrier}</div>
                              <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketInsurance, sym)}/yr</div>
                            </div>
                            <button onClick={() => setRetenderStarted(true)} className="col-span-2 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90" style={{ backgroundColor: "#0A8A4C", color: "#fff" }}>
                              Place with Arca →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Total annual saving on placement</span>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#F5A94A" }}>
                  {fmt(totalOverpay, sym)}
                </span>
                <button onClick={() => setRetenderStarted(true)} className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: "#0A8A4C", color: "#fff" }}>
                  Place all with Arca →
                </button>
              </div>
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

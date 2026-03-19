"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PageHero } from "@/components/ui/PageHero";
import { ArcaDirectCallout } from "@/components/ui/ArcaDirectCallout";

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
  const [instructedCarrier, setInstructedCarrier] = useState<string | null>(null);
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

  // Portfolio-level carrier comparison: current + 3 alternatives
  const coverageTypes = ["All risks · $50M limit", "All risks · $35M limit", "Named perils · $50M limit", "All risks · $25M limit"];
  const carrierQuotes = [
    { carrier: CURRENT_CARRIERS[0], premium: totalCurrentPremium, coverage: coverageTypes[0], saving: 0, recommended: false },
    { carrier: COMPETING_CARRIERS[0], premium: Math.round(totalMarketPremium * 1.08), coverage: coverageTypes[1], saving: Math.round(totalCurrentPremium - totalMarketPremium * 1.08), recommended: false },
    { carrier: COMPETING_CARRIERS[1], premium: totalMarketPremium, coverage: coverageTypes[0], saving: totalOverpay, recommended: true },
    { carrier: COMPETING_CARRIERS[2], premium: Math.round(totalMarketPremium * 0.95), coverage: coverageTypes[3], saving: Math.round(totalCurrentPremium - totalMarketPremium * 0.95), recommended: false },
  ];

  return (
    <AppShell>
      <TopBar title="Insurance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={`Insurance — ${portfolio.name}`}
            cells={[
              { label: "Current Premium", value: fmt(totalCurrentPremium, sym), sub: "Annual across portfolio" },
              { label: "Market Rate", value: fmt(totalMarketPremium, sym), valueColor: "#5BF0AC", sub: "Arca benchmark" },
              { label: "Annual Overpay", value: fmt(totalOverpay, sym), valueColor: "#FF8080", sub: `${overpayPct}% above market` },
              { label: "Arca Fee", value: fmt(commissionOnSaving, sym), valueColor: "#5BF0AC", sub: "15% of saving · success-only" },
            ]}
          />
        )}

        {/* Arca Direct callout */}
        {!loading && (
          <ArcaDirectCallout
            title="Arca places this direct — no broker, no markup"
            body={`Portfolio consolidation across ${portfolio.assets.length} assets unlocks London & New York market rates. Typical saving 22–30% vs incumbent. Arca manages the entire retender end to end.`}
          />
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
                  <span className="flex items-center gap-1.5" style={{ color: "#FF8080" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#FF8080" }} />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#0A8A4C" }}>
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} />
                    Market
                  </span>
                </div>
              </div>
              <BarChart data={barData} height={160} color="#FF8080" benchmarkColor="#0A8A4C" formatValue={(v) => fmt(v, sym)} />
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

        {/* Carrier Quote Comparison — portfolio level, current + 3 alternatives */}
        {!loading && (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Carrier Quote Comparison" subtitle="Current incumbent vs 3 competing carriers — portfolio-level" />
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-2.5 text-xs font-medium" style={{ color: "#5a7a96", borderBottom: "1px solid #1a2d45" }}>
                <span>Carrier</span>
                <span className="text-right pr-8">Annual Premium</span>
                <span className="px-4">Coverage</span>
                <span className="text-right">Saving vs current</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                {carrierQuotes.map((q) => {
                  const isCurrentCarrier = q.saving === 0;
                  const isInstructed = instructedCarrier === q.carrier;
                  return (
                    <div
                      key={q.carrier}
                      className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-4 items-center gap-4 transition-colors hover:bg-[#0d1825]"
                      style={q.recommended ? { backgroundColor: "#0a1f10" } : {}}
                    >
                      <div className="flex items-center gap-2.5">
                        {q.recommended && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}
                          >
                            Recommended
                          </span>
                        )}
                        <span className="text-sm font-medium" style={{ color: isCurrentCarrier ? "#5a7a96" : "#e8eef5" }}>
                          {q.carrier}
                          {isCurrentCarrier && <span className="ml-1.5 text-xs" style={{ color: "#3d5a72" }}>(current)</span>}
                        </span>
                      </div>
                      <div className="text-right pr-8">
                        <div
                          className="text-base font-bold"
                          style={{
                            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                            color: isCurrentCarrier ? "#FF8080" : q.recommended ? "#0A8A4C" : "#e8eef5",
                          }}
                        >
                          {fmt(q.premium, sym)}/yr
                        </div>
                      </div>
                      <div className="px-4">
                        <span className="text-xs" style={{ color: "#8ba0b8" }}>{q.coverage}</span>
                      </div>
                      <div className="flex items-center gap-3 justify-end">
                        {isCurrentCarrier ? (
                          <span className="text-xs" style={{ color: "#3d5a72" }}>—</span>
                        ) : (
                          <>
                            <div className="text-right">
                              <div
                                className="text-sm font-bold"
                                style={{
                                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                                  color: "#0A8A4C",
                                }}
                              >
                                {fmt(q.saving, sym)}
                              </div>
                              <div className="text-xs" style={{ color: "#3d5a72" }}>
                                {Math.round((q.saving / totalCurrentPremium) * 100)}% saving
                              </div>
                            </div>
                            {isInstructed ? (
                              <div
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                                style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}
                              >
                                ✓ Instructed
                              </div>
                            ) : (
                              <button
                                onClick={() => { setInstructedCarrier(q.carrier); setRetenderStarted(true); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                                style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#111e2e", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                              >
                                {q.recommended ? "Instruct Arca →" : "Select →"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: "#1a2d45" }}>
              {carrierQuotes.map((q) => {
                const isCurrentCarrier = q.saving === 0;
                const isInstructed = instructedCarrier === q.carrier;
                return (
                  <div
                    key={q.carrier}
                    className="px-4 py-4"
                    style={q.recommended ? { backgroundColor: "#0a1f10" } : {}}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: isCurrentCarrier ? "#5a7a96" : "#e8eef5" }}>
                            {q.carrier}
                          </span>
                          {isCurrentCarrier && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}>current</span>
                          )}
                          {q.recommended && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>{q.coverage}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-sm font-bold"
                          style={{
                            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                            color: isCurrentCarrier ? "#FF8080" : q.recommended ? "#0A8A4C" : "#e8eef5",
                          }}
                        >
                          {fmt(q.premium, sym)}/yr
                        </div>
                        {!isCurrentCarrier && (
                          <div className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                            saves {fmt(q.saving, sym)}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isCurrentCarrier && (
                      isInstructed ? (
                        <div
                          className="mt-2 w-full py-2 rounded-lg text-center text-xs font-semibold"
                          style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}
                        >
                          ✓ Instructed
                        </div>
                      ) : (
                        <button
                          onClick={() => { setInstructedCarrier(q.carrier); setRetenderStarted(true); }}
                          className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                          style={{ backgroundColor: q.recommended ? "#0A8A4C" : "#111e2e", color: q.recommended ? "#fff" : "#0A8A4C", border: "1px solid #0A8A4C" }}
                        >
                          {q.recommended ? "Instruct Arca →" : "Select →"}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45", backgroundColor: "#0d1825" }}>
              <span className="text-xs" style={{ color: "#5a7a96" }}>Best saving vs current incumbent</span>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold" style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#0A8A4C" }}>
                  {fmt(totalOverpay, sym)}/yr
                </span>
                {!instructedCarrier && (
                  <button
                    onClick={() => { setInstructedCarrier(COMPETING_CARRIERS[1]); setRetenderStarted(true); }}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Instruct Arca →
                  </button>
                )}
                {instructedCarrier && (
                  <div className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #0A8A4C" }}>
                    ✓ Arca instructed
                  </div>
                )}
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
                            <Link href={`/assets/${asset.id}`} className="text-sm font-medium hover:underline underline-offset-2" style={{ color: "#e8eef5" }}>{asset.name}</Link>
                            <Badge variant={pct > 25 ? "red" : pct > 15 ? "amber" : "gray"}>{pct}% overpay</Badge>
                          </div>
                          <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>{asset.location} · {asset.type}</div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45", maxWidth: 240 }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct * 2.5)}%`, backgroundColor: "#FF8080" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Current</div>
                            <div className="text-sm font-semibold" style={{ color: "#FF8080" }}>{fmt(asset.insurancePremium, sym)}</div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Market</div>
                            <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketInsurance, sym)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Saving</div>
                            <div className="text-base font-bold" style={{ color: "#5BF0AC", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(overpay, sym)}</div>
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

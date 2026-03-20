"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HoldSellScenario } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { HoldSellRecommendation } from "@/components/ui/HoldSellRecommendation";
import { PageHero } from "@/components/ui/PageHero";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const holdSellScenarios: Record<string, HoldSellScenario> = {
  "fl-001": { assetId: "fl-001", holdIRR: 7.2, sellPrice: 15800000, sellIRR: 9.1, recommendation: "sell", rationale: "Strong office demand in Miami-Dade drives exit premium. Two leases expiring within 12m add execution risk to hold. Sell at current cap rate compression." },
  "fl-002": { assetId: "fl-002", holdIRR: 8.9, sellPrice: 7200000, sellIRR: 7.8, recommendation: "hold", rationale: "Retail in Brickell is supply-constrained. Passing rent 13% below ERV — hold for lease review cycle and capture reversion before exit." },
  "fl-003": { assetId: "fl-003", holdIRR: 9.6, sellPrice: 6100000, sellIRR: 8.2, recommendation: "hold", rationale: "Full occupancy, long WAULT, industrial fundamentals improving. Solar addition adds 90bps to hold IRR. No catalyst to sell." },
  "fl-004": { assetId: "fl-004", holdIRR: 6.8, sellPrice: 10200000, sellIRR: 8.4, recommendation: "sell", rationale: "Vacancy and dual lease expiry create compounding risk. Exit now captures current valuation; hold scenario requires successful re-leasing at ERV." },
  "fl-005": { assetId: "fl-005", holdIRR: 8.1, sellPrice: 4900000, sellIRR: 7.9, recommendation: "review", rationale: "Marginal hold/sell case. Rent reversion potential supports hold thesis; strong Hillsborough flex demand could support sell. Monitor lease outcome in 6m." },
  "se-001": { assetId: "se-001", holdIRR: 7.8, sellPrice: 24500000, sellIRR: 8.9, recommendation: "sell", rationale: "Break clause risk on key tenant. Logistics cap rate compression provides exceptional exit now. Reinvest into longer-WAULT assets." },
  "se-002": { assetId: "se-002", holdIRR: 8.5, sellPrice: 36200000, sellIRR: 7.4, recommendation: "hold", rationale: "Amazon covenant, 9yr unexpired. Sell price implies sub-5% yield — insufficient premium for grade-A logistics income. Hold for covenant strength." },
  "se-003": { assetId: "se-003", holdIRR: 7.1, sellPrice: 10400000, sellIRR: 8.0, recommendation: "review", rationale: "Vacancy in unit C weighs on income. Lease up before sale maximises exit value. Review following active marketing of vacant unit." },
  "se-004": { assetId: "se-004", holdIRR: 9.2, sellPrice: 7800000, sellIRR: 8.1, recommendation: "hold", rationale: "Both tenants paying ERV on 5yr leases. Clean income, no near-term expiry. EV charging uplift available. Strong hold case." },
  "se-005": { assetId: "se-005", holdIRR: 6.4, sellPrice: 19200000, sellIRR: 9.3, recommendation: "sell", rationale: "Tenant exiting creates void risk. Sell with 18m income unexpired to buyer underwriting re-let. Exit premium > 7.5% above hold scenario." },
};

const recommendationConfig = {
  hold: { label: "Hold", variant: "green" as const, color: "#0A8A4C" },
  sell: { label: "Sell", variant: "amber" as const, color: "#F5A94A" },
  review: { label: "Review", variant: "blue" as const, color: "#1647E8" },
};

async function postTransactionSaleLead(params: {
  assetName?: string;
  sellPrice?: string;
  holdIRR?: number;
  sellIRR?: number;
  recommendation?: string;
  action: string;
  portfolioName?: string;
}) {
  await fetch("/api/leads/transaction-sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).catch(() => {});
}

export default function HoldSellPage() {
  const { portfolioId } = useNav();
  const [capRate, setCapRate] = useState(5.5);
  const [saleActioned, setSaleActioned] = useState<Set<string>>(new Set());
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const assetsWithScenarios = portfolio.assets.flatMap((a) => {
    const base = holdSellScenarios[a.id];
    if (!base) return [];
    const valuation = a.valuationUSD ?? a.valuationGBP ?? 1;
    // Sell price moves inversely with cap rate: higher cap rate = lower exit price
    const adjustedSellPrice = Math.round(a.netIncome / (capRate / 100));
    // Sell IRR = hold IRR + annualised capital gain over assumed 5yr hold
    const exitGainPct = (adjustedSellPrice - valuation) / valuation;
    const adjustedSellIRR = Math.max(0, base.holdIRR + (exitGainPct / 5) * 100);
    const irrDelta = adjustedSellIRR - base.holdIRR;
    const recommendation: HoldSellScenario["recommendation"] =
      irrDelta > 0.8 ? "sell" : irrDelta < -0.3 ? "hold" : "review";
    return [{
      asset: a,
      scenario: {
        ...base,
        sellPrice: adjustedSellPrice,
        sellIRR: parseFloat(adjustedSellIRR.toFixed(1)),
        recommendation,
      } as HoldSellScenario,
    }];
  });

  const sellCandidates = assetsWithScenarios.filter(({ scenario }) => scenario.recommendation === "sell");
  const holdCandidates = assetsWithScenarios.filter(({ scenario }) => scenario.recommendation === "hold");
  const totalSellValue = sellCandidates.reduce((s, { scenario }) => s + scenario.sellPrice, 0);
  const avgHoldIRR = assetsWithScenarios.reduce((s, { scenario }) => s + scenario.holdIRR, 0) / assetsWithScenarios.length;
  const avgSellIRR = sellCandidates.reduce((s, { scenario }) => s + scenario.sellIRR, 0) / (sellCandidates.length || 1);
  const bestExitIRR = sellCandidates.length > 0
    ? Math.max(...sellCandidates.map(({ scenario }) => scenario.sellIRR))
    : avgSellIRR;

  return (
    <AppShell>
      <TopBar title="Hold vs Sell" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={`Hold vs Sell — ${portfolio.name}`}
            cells={[
              {
                label: "Portfolio Hold Return",
                value: `${avgHoldIRR.toFixed(1)}%`,
                valueColor: avgHoldIRR >= 8 ? "#fff" : "#F5A94A",
                sub: "Avg return across all assets",
              },
              {
                label: "Best Exit Return",
                value: `${bestExitIRR.toFixed(1)}%`,
                valueColor: "#5BF0AC",
                sub: "Top sell candidate return",
              },
              {
                label: "Assets Analysed",
                value: `${assetsWithScenarios.length}`,
                sub: `${holdCandidates.length} hold · ${sellCandidates.length} sell`,
              },
              {
                label: "Recommended Exits",
                value: `${sellCandidates.length}`,
                valueColor: sellCandidates.length >= 3 ? "#FF8080" : sellCandidates.length >= 1 ? "#F5A94A" : "#5BF0AC",
                sub: sellCandidates.length >= 3 ? "Action required" : sellCandidates.length >= 1 ? "Review flagged" : "Hold all assets",
              },
            ]}
          />
        )}

        {/* Issue / Cost / Action */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {sellCandidates.length} asset{sellCandidates.length !== 1 ? "s" : ""} where exit IRR exceeds hold IRR ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Opportunity:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(totalSellValue, sym)}</span> total exit value from sell candidates ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              runs acquisition pipeline via AI Scout, manages transaction — no advisory fee on hold assets
            </div>
          </div>
        )}

        {/* Assumptions */}
        {!loading && (
          <div className="rounded-xl p-4 lg:p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: "#e8eef5" }}>Market Assumptions</div>
                <div className="text-xs" style={{ color: "#5a7a96" }}>Adjust cap rate to re-run scenarios</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs shrink-0" style={{ color: "#5a7a96" }}>Market Cap Rate</span>
                <input
                  type="range"
                  min="4"
                  max="8"
                  step="0.25"
                  value={capRate}
                  onChange={(e) => setCapRate(parseFloat(e.target.value))}
                  className="w-28 lg:w-32"
                  style={{ accentColor: "#1647E8" }}
                />
                <span className="text-sm font-bold w-12" style={{ color: "#1647E8" }}>{capRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommendation */}
        {!loading && (
          <HoldSellRecommendation
            portfolioName={portfolio.name}
            title={holdCandidates.length >= sellCandidates.length ? "Hold & Optimise" : "Selective Exit — Recycle Capital"}
            subtitle={
              holdCandidates.length >= sellCandidates.length
                ? `${holdCandidates.length} assets with strong hold thesis. ${sellCandidates.length > 0 ? `Sell ${sellCandidates.length} to recycle into higher-return positions.` : "No sell catalysts at current cap rate."}`
                : `${sellCandidates.length} assets where exit IRR exceeds hold. ${fmt(totalSellValue, sym)} available to redeploy.`
            }
            exitValue={fmt(totalSellValue, sym)}
            comparisonValue={`${sellCandidates.length} asset${sellCandidates.length !== 1 ? "s" : ""} at current cap rate`}
            onOptimise={() => postTransactionSaleLead({ action: "optimise", portfolioName: portfolio.name, sellPrice: fmt(totalSellValue, sym) })}
            onTestMarket={() => postTransactionSaleLead({ action: "test_market", portfolioName: portfolio.name, sellPrice: fmt(totalSellValue, sym) })}
          />
        )}

        {/* Asset Scenarios */}
        {loading ? (
          <CardSkeleton rows={5} />
        ) : (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Per-Asset Analysis" subtitle={`${assetsWithScenarios.length} assets · ${fmt(totalSellValue, sym)} total sell value`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {assetsWithScenarios
                .sort((a, b) => {
                  const order = { sell: 0, review: 1, hold: 2 };
                  return order[a.scenario.recommendation] - order[b.scenario.recommendation];
                })
                .map(({ asset, scenario }) => {
                  const cfg = recommendationConfig[scenario.recommendation];
                  const valuation = asset.valuationUSD ?? asset.valuationGBP ?? 0;
                  const premium = scenario.sellPrice - valuation;
                  const premiumPct = Math.round((premium / valuation) * 100);
                  const irrDiff = scenario.sellIRR - scenario.holdIRR;

                  return (
                    <div key={asset.id} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[#0d1825]">
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link href={`/assets/${asset.id}`} className="text-sm font-semibold hover:underline underline-offset-2" style={{ color: "#e8eef5" }}>{asset.name}</Link>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>
                          <div className="text-xs" style={{ color: "#5a7a96" }}>{asset.location} · {asset.type}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Exit value</div>
                          <div className="text-base font-bold" style={{ color: cfg.color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(scenario.sellPrice, sym)}</div>
                          <div className="text-xs" style={{ color: premiumPct >= 0 ? "#0A8A4C" : "#f06040" }}>
                            {premiumPct >= 0 ? "+" : ""}{premiumPct}% vs book
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 mb-3">
                        <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                          <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Hold Return</div>
                          <div className="text-lg lg:text-xl font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{scenario.holdIRR}%</div>
                        </div>
                        <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                          <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Exit Return</div>
                          <div className="text-lg lg:text-xl font-bold" style={{ color: cfg.color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{scenario.sellIRR}%</div>
                        </div>
                        <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                          <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Gain from selling</div>
                          <div className="text-lg lg:text-xl font-bold" style={{ color: irrDiff > 0 ? "#F5A94A" : "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                            {irrDiff > 0 ? "+" : ""}{irrDiff.toFixed(1)}pp
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#0d1825", color: "#8ba0b8" }}>
                        <span className="font-medium" style={{ color: "#5a7a96" }}>Arca analysis: </span>
                        {scenario.rationale}
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {scenario.recommendation === "sell" && (
                          saleActioned.has(asset.id) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #1a4d2e" }}>
                              Instructed ✓
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                setSaleActioned((prev) => new Set([...prev, asset.id]));
                                await postTransactionSaleLead({
                                  assetName: asset.name,
                                  sellPrice: fmt(scenario.sellPrice, sym),
                                  holdIRR: scenario.holdIRR,
                                  sellIRR: scenario.sellIRR,
                                  recommendation: scenario.recommendation,
                                  action: "begin_transaction",
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                              style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                            >
                              Begin Transaction →
                            </button>
                          )
                        )}
                        {scenario.recommendation === "hold" && (
                          <Link
                            href="/rent-clock"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C", border: "1px solid #1a4d2e" }}
                          >
                            Prep Rent Review →
                          </Link>
                        )}
                        {scenario.recommendation === "review" && (
                          <>
                            <Link
                              href="/scout"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                              style={{ backgroundColor: "#0a1540", color: "#5a8fef", border: "1px solid #1647E8" }}
                            >
                              Model exit →
                            </Link>
                            <Link
                              href="/rent-clock"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                              style={{ backgroundColor: "#0d1825", color: "#5a7a96", border: "1px solid #1a2d45" }}
                            >
                              Review leases →
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

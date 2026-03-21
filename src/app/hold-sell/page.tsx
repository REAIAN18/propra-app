"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { HoldSellRecommendation } from "@/components/ui/HoldSellRecommendation";
import { PageHero } from "@/components/ui/PageHero";
import { useHoldSellScenarios } from "@/hooks/useHoldSellScenarios";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const recommendationConfig = {
  hold: { label: "Hold", variant: "green" as const, color: "#0A8A4C" },
  sell: { label: "Sell", variant: "amber" as const, color: "#F5A94A" },
  review: { label: "Review", variant: "blue" as const, color: "#1647E8" },
};

// Direct execution: hold/sell analysis is surfaced immediately from DB data
function postTransactionSaleLead(_params: {
  assetName?: string; sellPrice?: string; holdIRR?: number; sellIRR?: number;
  recommendation?: string; action: string; portfolioName?: string;
}) {}

export default function HoldSellPage() {
  const [saleActioned, setSaleActioned] = useState<Set<string>>(new Set());
  const { scenarios, loading } = useHoldSellScenarios();

  // Detect currency from first complete scenario (fallback: GBP)
  const sym = "£";

  const complete = scenarios.filter((s) => !s.dataNeeded && s.recommendation !== null);
  const incomplete = scenarios.filter((s) => s.dataNeeded);

  const sellCandidates = complete.filter((s) => s.recommendation === "sell");
  const holdCandidates = complete.filter((s) => s.recommendation === "hold");
  const totalSellValue = sellCandidates.reduce((sum, s) => sum + (s.sellPrice ?? 0), 0);
  const avgHoldIRR =
    complete.length > 0
      ? complete.reduce((sum, s) => sum + (s.holdIRR ?? 0), 0) / complete.length
      : 0;
  const avgSellIRR =
    sellCandidates.length > 0
      ? sellCandidates.reduce((sum, s) => sum + (s.sellIRR ?? 0), 0) / sellCandidates.length
      : 0;
  const bestExitIRR =
    sellCandidates.length > 0
      ? Math.max(...sellCandidates.map((s) => s.sellIRR ?? 0))
      : avgSellIRR;

  const allSorted = [
    ...complete.sort((a, b) => {
      const order = { sell: 0, review: 1, hold: 2 };
      return order[a.recommendation!] - order[b.recommendation!];
    }),
    ...incomplete,
  ];

  return (
    <AppShell>
      <TopBar title="Hold vs Sell" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : scenarios.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="text-4xl">🏢</div>
            <div className="text-lg font-semibold" style={{ color: "#111827" }}>No properties yet</div>
            <div className="text-sm" style={{ color: "#9CA3AF" }}>
              Add your first property to get hold vs sell analysis
            </div>
            <Link
              href="/properties/add"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              Add Property →
            </Link>
          </div>
        ) : (
          <PageHero
            title="Hold vs Sell"
            cells={[
              {
                label: "Portfolio Hold Return",
                value: complete.length > 0 ? `${avgHoldIRR.toFixed(1)}%` : "—",
                valueColor: avgHoldIRR >= 8 ? "#fff" : "#F5A94A",
                sub: "Avg return across all assets",
              },
              {
                label: "Best Exit Return",
                value: complete.length > 0 ? `${bestExitIRR.toFixed(1)}%` : "—",
                valueColor: "#5BF0AC",
                sub: "Top sell candidate return",
              },
              {
                label: "Assets Analysed",
                value: `${complete.length}`,
                sub: `${holdCandidates.length} hold · ${sellCandidates.length} sell${incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""}`,
              },
              {
                label: "Recommended Exits",
                value: `${sellCandidates.length}`,
                valueColor:
                  sellCandidates.length >= 3
                    ? "#FF8080"
                    : sellCandidates.length >= 1
                    ? "#F5A94A"
                    : "#5BF0AC",
                sub:
                  sellCandidates.length >= 3
                    ? "Action required"
                    : sellCandidates.length >= 1
                    ? "Review flagged"
                    : "Hold all assets",
              },
            ]}
          />
        )}

        {/* Issue / Cost / Action banner */}
        {!loading && complete.length > 0 && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="text-xs" style={{ color: "#6B7280" }}>
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {sellCandidates.length} asset{sellCandidates.length !== 1 ? "s" : ""} where exit IRR exceeds hold IRR ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Opportunity:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(totalSellValue, sym)}</span> total exit value from sell candidates ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
              runs acquisition pipeline via AI Scout, manages transaction — no advisory fee on hold assets
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && scenarios.length > 0 && (
          <DirectCallout
            title="RealHQ models every scenario with live market data — then manages the transaction"
            body="Sell candidates get a full buyer market approach and transaction management at 0.25% of deal value. Hold assets get optimisation across income, costs, and compliance — no advisory fee."
          />
        )}

        {/* Portfolio Recommendation */}
        {!loading && complete.length > 0 && (
          <HoldSellRecommendation
            portfolioName="Your Portfolio"
            title={
              holdCandidates.length >= sellCandidates.length
                ? "Hold & Optimise"
                : "Selective Exit — Recycle Capital"
            }
            subtitle={
              holdCandidates.length >= sellCandidates.length
                ? `${holdCandidates.length} assets with strong hold thesis. ${sellCandidates.length > 0 ? `Sell ${sellCandidates.length} to recycle into higher-return positions.` : "No sell catalysts at current market pricing."}`
                : `${sellCandidates.length} assets where exit IRR exceeds hold. ${fmt(totalSellValue, sym)} available to redeploy.`
            }
            exitValue={fmt(totalSellValue, sym)}
            comparisonValue={`${sellCandidates.length} asset${sellCandidates.length !== 1 ? "s" : ""} at market pricing`}
            onOptimise={() =>
              postTransactionSaleLead({ action: "optimise", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })
            }
            onTestMarket={() =>
              postTransactionSaleLead({ action: "test_market", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })
            }
          />
        )}

        {/* Asset Scenarios */}
        {loading ? (
          <CardSkeleton rows={5} />
        ) : allSorted.length > 0 ? (
          <div
            className="rounded-xl transition-all duration-150 hover:shadow-lg"
            style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="Per-Asset Analysis"
                subtitle={`${complete.length} analysed${incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""} · ${fmt(totalSellValue, sym)} total sell value`}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {allSorted.map((scenario) => {
                /* --- Data needed state --- */
                if (scenario.dataNeeded) {
                  return (
                    <div key={scenario.assetId} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[#F9FAFB]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                              {scenario.assetName}
                            </span>
                            <Badge variant="amber">Data needed</Badge>
                          </div>
                          <div className="text-xs" style={{ color: "#9CA3AF" }}>
                            {scenario.location} · {scenario.assetType}
                          </div>
                        </div>
                        <Link
                          href="/properties/add"
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ backgroundColor: "#EEF2FF", color: "#1647E8", border: "1px solid #C7D2FE" }}
                        >
                          Add financials →
                        </Link>
                      </div>
                    </div>
                  );
                }

                /* --- Full scenario row --- */
                const cfg = recommendationConfig[scenario.recommendation!];
                const estimatedValue = scenario.estimatedValue ?? 0;
                const sellPrice = scenario.sellPrice ?? 0;
                const premium = sellPrice - estimatedValue;
                const premiumPct = estimatedValue > 0 ? Math.round((premium / estimatedValue) * 100) : 0;
                const irrDiff = (scenario.sellIRR ?? 0) - (scenario.holdIRR ?? 0);

                return (
                  <div key={scenario.assetId} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[#F9FAFB]">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                            {scenario.assetName}
                          </span>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>
                          {scenario.location} · {scenario.assetType}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>Exit value</div>
                        <div
                          className="text-base font-bold"
                          style={{ color: cfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {fmt(sellPrice, sym)}
                        </div>
                        <div className="text-xs" style={{ color: premiumPct >= 0 ? "#0A8A4C" : "#f06040" }}>
                          {premiumPct >= 0 ? "+" : ""}{premiumPct}% vs book
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 mb-3">
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#F9FAFB" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Hold Return</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {scenario.holdIRR}%
                        </div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#F9FAFB" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Exit Return</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{ color: cfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {scenario.sellIRR}%
                        </div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#F9FAFB" }}>
                        <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Gain from selling</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{
                            color: irrDiff > 0 ? "#F5A94A" : "#0A8A4C",
                            fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                          }}
                        >
                          {irrDiff > 0 ? "+" : ""}{irrDiff.toFixed(1)}pp
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}>
                      <span className="font-medium" style={{ color: "#9CA3AF" }}>RealHQ analysis: </span>
                      {scenario.rationale}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {scenario.recommendation === "sell" && (
                        saleActioned.has(scenario.assetId) ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                            >
                              Instructed ✓
                            </span>
                            <Link href="/requests" className="text-xs" style={{ color: "#1647E8" }}>Track →</Link>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              setSaleActioned((prev) => new Set([...prev, scenario.assetId]));
                              await postTransactionSaleLead({
                                assetName: scenario.assetName,
                                sellPrice: fmt(sellPrice, sym),
                                holdIRR: scenario.holdIRR ?? undefined,
                                sellIRR: scenario.sellIRR ?? undefined,
                                recommendation: scenario.recommendation ?? undefined,
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
                          style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                        >
                          Prep Rent Review →
                        </Link>
                      )}
                      {scenario.recommendation === "review" && (
                        <>
                          <Link
                            href="/scout"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "#EEF2FF", color: "#1647E8", border: "1px solid #C7D2FE" }}
                          >
                            Model exit →
                          </Link>
                          <Link
                            href="/rent-clock"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "#F9FAFB", color: "#9CA3AF", border: "1px solid #E5E7EB" }}
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
        ) : null}
      </main>
    </AppShell>
  );
}

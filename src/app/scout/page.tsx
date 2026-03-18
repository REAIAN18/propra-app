"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { acquisitionPipeline } from "@/lib/data/acquisitions";
import { Portfolio, AcquisitionDeal } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const statusConfig: Record<AcquisitionDeal["status"], { label: string; variant: "green" | "blue" | "amber" | "red" | "gray"; color: string }> = {
  screening: { label: "Screening", variant: "gray", color: "#5a7a96" },
  analysing: { label: "Analysing", variant: "blue", color: "#1647E8" },
  offer: { label: "Offer", variant: "amber", color: "#F5A94A" },
  passed: { label: "Passed", variant: "red", color: "#f06040" },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#0A8A4C" : score >= 65 ? "#F5A94A" : "#f06040";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ScoutPage() {
  const { portfolioId } = useNav();
  const [filter, setFilter] = useState<AcquisitionDeal["status"] | "all">("all");
  const [offerIds, setOfferIds] = useState<Set<string>>(new Set());
  const loading = useLoading(450, portfolioId);

  const currencyFilter = portfolioId === "fl-mixed" ? "USD" : "GBP";
  const allDeals = acquisitionPipeline;
  const portfolioDeals = allDeals.filter(d => d.currency === currencyFilter);
  const otherDeals = allDeals.filter(d => d.currency !== currencyFilter);

  const sym = portfolioId === "fl-mixed" ? "$" : "£";

  const activeDeals = allDeals.filter(d => d.status !== "passed");
  const offerDeals = allDeals.filter(d => d.status === "offer" || offerIds.has(d.id));
  const avgScore = Math.round(activeDeals.reduce((s, d) => s + d.score, 0) / activeDeals.length);
  const totalAskingValue = portfolioDeals
    .filter(d => d.status !== "passed")
    .reduce((s, d) => s + d.askingPrice, 0);

  const filteredDeals = (filter === "all" ? portfolioDeals : portfolioDeals.filter(d => d.status === filter))
    .sort((a, b) => b.score - a.score);

  const handleOffer = (id: string) => {
    setOfferIds(prev => new Set([...prev, id]));
  };

  return (
    <AppShell>
      <TopBar title="AI Scout" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard label="Pipeline Deals" value={`${portfolioDeals.filter(d => d.status !== "passed").length}`} sub={`${otherDeals.filter(d => d.status !== "passed").length} cross-portfolio`} accent="blue" />
            <MetricCard label="At Offer" value={`${offerDeals.length}`} sub="Awaiting decision" accent="amber" />
            <MetricCard label="Avg Deal Score" value={`${avgScore}/100`} sub="AI-weighted signal" trend={avgScore >= 75 ? "up" : "neutral"} trendLabel={avgScore >= 75 ? "Strong pipeline" : "Mixed quality"} accent={avgScore >= 75 ? "green" : "amber"} />
            <MetricCard label="Total Ask" value={fmt(totalAskingValue, sym)} sub={`${portfolioDeals.filter(d => d.status !== "passed").length} active deals`} accent="green" />
          </div>
        )}

        {/* Score Methodology */}
        {!loading && (
          <div className="rounded-xl p-4 lg:p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>Deal Score Methodology</div>
            <div className="text-xs mb-3" style={{ color: "#5a7a96" }}>AI-weighted across 6 signals — 0 to 100</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
              {[
                { label: "Yield spread", weight: "25%" },
                { label: "Location quality", weight: "20%" },
                { label: "Tenant covenant", weight: "18%" },
                { label: "WAULT", weight: "15%" },
                { label: "Value-add upside", weight: "12%" },
                { label: "Portfolio fit", weight: "10%" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-2.5 text-center transition-all duration-150 hover:-translate-y-0.5" style={{ backgroundColor: "#0d1825" }}>
                  <div className="text-xs font-medium mb-0.5" style={{ color: "#e8eef5" }}>{s.label}</div>
                  <div className="text-xs font-bold" style={{ color: "#1647E8" }}>{s.weight}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {!loading && (
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "screening", "analysing", "offer", "passed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 hover:opacity-80"
                style={{
                  backgroundColor: filter === f ? "#1647E8" : "#111e2e",
                  color: filter === f ? "#fff" : "#5a7a96",
                  border: `1px solid ${filter === f ? "#1647E8" : "#1a2d45"}`,
                }}
              >
                {f === "all" ? "All Deals" : statusConfig[f]?.label ?? f}
                {f !== "all" && (
                  <span className="ml-1.5 opacity-70">
                    {portfolioDeals.filter(d => d.status === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Deal Pipeline */}
        {loading ? (
          <CardSkeleton rows={4} />
        ) : (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title={`${portfolioId === "fl-mixed" ? "Florida" : "SE England"} Pipeline`} subtitle={`${filteredDeals.length} deals · sorted by AI score`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {filteredDeals.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#0d1630" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="9" cy="9" r="6" stroke="#1647E8" strokeWidth="1.5" />
                      <path d="M14 14L17.5 17.5" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium mb-1" style={{ color: "#e8eef5" }}>No deals in this stage</div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Arca is continuously scanning for opportunities matching your criteria.</div>
                </div>
              ) : filteredDeals.map((deal) => {
                const isAtOffer = deal.status === "offer" || offerIds.has(deal.id);
                const effectiveStatus = offerIds.has(deal.id) ? "offer" : deal.status;
                const effectiveCfg = statusConfig[effectiveStatus];
                const yieldSpread = deal.estimatedYield - deal.marketYield;
                const dealSym = deal.currency === "USD" ? "$" : "£";

                return (
                  <div key={deal.id} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[#0d1825]">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>{deal.name}</span>
                          <Badge variant={effectiveCfg.variant}>{effectiveCfg.label}</Badge>
                        </div>
                        <div className="text-xs" style={{ color: "#5a7a96" }}>
                          {deal.location} · {deal.type} · {deal.sqft.toLocaleString()} sqft
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-base font-bold" style={{ color: "#e8eef5" }}>{fmt(deal.askingPrice, dealSym)}</div>
                        <div className="text-xs" style={{ color: "#5a7a96" }}>asking price</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "#5a7a96" }}>AI Deal Score</span>
                      </div>
                      <ScoreBar score={deal.score} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-3">
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                        <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Est. Yield</div>
                        <div className="text-base lg:text-lg font-bold" style={{ color: "#0A8A4C" }}>{deal.estimatedYield}%</div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                        <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Market Yield</div>
                        <div className="text-base lg:text-lg font-bold" style={{ color: "#5a7a96" }}>{deal.marketYield}%</div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "#0d1825" }}>
                        <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Spread</div>
                        <div className="text-base lg:text-lg font-bold" style={{ color: yieldSpread > 0 ? "#F5A94A" : "#f06040" }}>
                          {yieldSpread > 0 ? "+" : ""}{yieldSpread.toFixed(1)}pp
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 mb-3 text-xs" style={{ backgroundColor: "#0d1825", color: "#8ba0b8" }}>
                      <span className="font-medium" style={{ color: "#5a7a96" }}>AI rationale: </span>
                      {deal.rationale}
                    </div>

                    {deal.status !== "passed" && (
                      <div className="flex items-center gap-3 flex-wrap">
                        {!isAtOffer && (
                          <button
                            onClick={() => handleOffer(deal.id)}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                            style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                          >
                            Submit Offer
                          </button>
                        )}
                        {isAtOffer && (
                          <span className="text-xs font-medium" style={{ color: "#F5A94A" }}>
                            Offer submitted — Arca managing negotiation
                          </span>
                        )}
                        <button
                          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
                          style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
                        >
                          Full Analysis
                        </button>
                      </div>
                    )}
                    {deal.status === "passed" && (
                      <div className="text-xs" style={{ color: "#3d5a72" }}>
                        Passed at current ask. Arca monitoring for price reduction.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cross-portfolio teaser */}
        {!loading && otherDeals.filter(d => d.status !== "passed").length > 0 && (
          <div className="rounded-xl p-4 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                  {otherDeals.filter(d => d.status !== "passed").length} deals in {portfolioId === "fl-mixed" ? "SE England" : "Florida"} pipeline
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  Switch portfolio to view {portfolioId === "fl-mixed" ? "SE Logistics" : "FL Mixed"} acquisition targets
                </div>
              </div>
              <Badge variant="blue">Cross-portfolio</Badge>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

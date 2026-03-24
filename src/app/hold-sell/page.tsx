"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DirectCallout } from "@/components/ui/DirectCallout";
import { HoldSellRecommendation } from "@/components/ui/HoldSellRecommendation";
import { PageHero } from "@/components/ui/PageHero";
import { useHoldSellScenarios, HoldSellScenarioResult } from "@/hooks/useHoldSellScenarios";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { Asset } from "@/lib/data/types";

function deriveScenariosFromAssets(assets: Asset[]): HoldSellScenarioResult[] {
  return assets.map((asset) => {
    const valuation = asset.valuationUSD ?? asset.valuationGBP ?? 0;
    const netYield = valuation > 0 ? (asset.netIncome / valuation) * 100 : 5.5;
    const holdIRR = parseFloat((netYield + 2.5).toFixed(1));
    const sellPrice = Math.round(valuation * 1.07);
    const exitYield = sellPrice > 0 ? (asset.netIncome / sellPrice) * 100 : 5;
    const sellIRR = parseFloat((exitYield + 3.0).toFixed(1));
    const recommendation: "hold" | "sell" | "review" =
      sellIRR > holdIRR + 1.5 ? "sell" :
      sellIRR > holdIRR ? "review" : "hold";
    const rationale =
      recommendation === "sell"
        ? `Exit IRR (${sellIRR}%) exceeds hold IRR (${holdIRR}%) at current market pricing. Recommend testing the market.`
        : recommendation === "review"
        ? `Hold and exit IRR are comparable. Monitor market conditions and review in 6 months.`
        : `Hold IRR (${holdIRR}%) supported by stable income and ERV growth potential. No compelling exit catalyst.`;
    return {
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      location: asset.location,
      dataNeeded: false,
      holdIRR,
      sellPrice,
      sellIRR,
      recommendation,
      rationale,
      estimatedValue: valuation,
    };
  });
}

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

const recommendationConfig: Record<string, { label: string; variant: "green" | "amber" | "blue"; color: string }> = {
  hold:        { label: "Hold",        variant: "green", color: "#0A8A4C" },
  strong_hold: { label: "Strong Hold", variant: "green", color: "#0A8A4C" },
  sell:        { label: "Sell",        variant: "amber", color: "#F5A94A" },
  review:      { label: "Review",      variant: "blue",  color: "#1647E8" },
  needs_review:{ label: "Review",      variant: "blue",  color: "#1647E8" },
};

function fmtNPV(v: number | null | undefined, sym: string) {
  if (v == null) return null;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "-" : ""}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${v < 0 ? "-" : ""}${sym}${(abs / 1_000).toFixed(0)}k`;
  return `${v < 0 ? "-" : ""}${sym}${abs.toLocaleString()}`;
}

interface AssumptionsPanelProps {
  assetId: string;
  sym: string;
}

function postTransactionSaleLead(_payload: { action: string; portfolioName: string; sellPrice: string }) {
  // no-op placeholder — replace with real CRM/webhook call when available
}

function AssumptionsPanel({ assetId, sym }: AssumptionsPanelProps) {
  const [fields, setFields] = useState({
    holdPeriodYears: 5,
    rentGrowthPct: 2.5,
    exitYieldPct: 5.5,
    vacancyAllowancePct: 5,
    annualCapexPct: 1,
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    holdIRR: number | null;
    sellIRR: number | null;
    holdNPV: number | null;
    sellNPV: number | null;
    recommendation: string | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleChange = useCallback((key: keyof typeof fields, raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) setFields((prev) => ({ ...prev, [key]: n }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/user/hold-sell-scenarios/${assetId}/assumptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setErr(d.error ?? "Failed to recalculate");
      } else {
        const d = await res.json() as {
          holdIRR: number | null;
          sellIRR: number | null;
          holdNPV: number | null;
          sellNPV: number | null;
          recommendation: string | null;
        };
        setResult(d);
      }
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  }, [assetId, fields]);

  return (
    <div className="mt-3 rounded-xl p-4 space-y-4"
      style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(
          [
            { key: "holdPeriodYears" as const, label: "Hold period (yrs)", step: 1, min: 1, max: 20 },
            { key: "rentGrowthPct" as const, label: "Rent growth (%)", step: 0.5, min: -5, max: 15 },
            { key: "exitYieldPct" as const, label: "Exit yield (%)", step: 0.25, min: 1, max: 20 },
            { key: "vacancyAllowancePct" as const, label: "Vacancy (%)", step: 0.5, min: 0, max: 30 },
            { key: "annualCapexPct" as const, label: "Capex % p.a.", step: 0.25, min: 0, max: 10 },
          ] as const
        ).map(({ key, label, step, min, max }) => (
          <div key={key}>
            <label className="block text-xs mb-1" style={{ color: "#6B7280" }}>{label}</label>
            <input
              type="number"
              step={step}
              min={min}
              max={max}
              value={fields[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-lg px-2.5 py-1.5 text-sm"
              style={{ border: "1px solid #D1D5DB", backgroundColor: "#fff", color: "#111827" }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#1647E8", color: "#fff" }}
        >
          {saving ? "Recalculating…" : "Recalculate"}
        </button>
        {err && <span className="text-xs" style={{ color: "#DC2626" }}>{err}</span>}
        {result && !err && (
          <span className="text-xs" style={{ color: "#6B7280" }}>
            Hold {result.holdIRR != null ? `${result.holdIRR.toFixed(1)}% IRR` : "—"}
            {result.holdNPV != null && ` · NPV ${fmtNPV(result.holdNPV, sym)}`}
            {result.recommendation && (
              <span className="ml-2 font-semibold" style={{ color: "#0A8A4C" }}>
                → {result.recommendation.replace("_", " ")}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HoldSellPage() {
  const [saleActioned, setSaleActioned] = useState<Set<string>>(new Set());
  const [openAssumptions, setOpenAssumptions] = useState<string | null>(null);
  const { scenarios: apiScenarios, loading: apiLoading } = useHoldSellScenarios();
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const isUserPortfolio = portfolioId === "user";
  const loading = isUserPortfolio ? apiLoading : false;
  const scenarios: HoldSellScenarioResult[] = isUserPortfolio
    ? apiScenarios
    : deriveScenariosFromAssets(portfolio.assets);

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
      const order: Record<string, number> = { sell: 0, review: 1, needs_review: 1, hold: 2, strong_hold: 2 };
      return (order[a.recommendation!] ?? 3) - (order[b.recommendation!] ?? 3);
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
              {sellCandidates.length} asset{sellCandidates.length !== 1 ? "s" : ""} where exit IRR exceeds hold IRR.{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>{fmt(totalSellValue, sym)}</span> total exit value available from sell candidates.{" "}
              RealHQ manages the full transaction — buyer market approach and execution.
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && scenarios.length > 0 && (
          <DirectCallout
            title="RealHQ models every scenario with live market data — then manages the transaction"
            body="Sell candidates get a full buyer market approach and transaction management. Hold assets get optimisation across income, costs, and compliance."
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

                    {/* NPV comparison row (Wave 2) */}
                    {(scenario.holdNPV != null || scenario.sellNPV != null) && (
                      <div className="flex items-center gap-4 my-2 px-3 py-2 rounded-lg text-xs"
                        style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                        {scenario.holdNPV != null && (
                          <span>
                            <span style={{ color: "#9CA3AF" }}>Hold NPV </span>
                            <span className="font-semibold" style={{ color: scenario.holdNPV >= 0 ? "#0A8A4C" : "#DC2626" }}>
                              {fmtNPV(scenario.holdNPV, sym)}
                            </span>
                          </span>
                        )}
                        {scenario.sellNPV != null && (
                          <span>
                            <span style={{ color: "#9CA3AF" }}>vs Sell today </span>
                            <span className="font-semibold" style={{ color: "#111827" }}>
                              {fmtNPV(scenario.sellNPV, sym)}
                            </span>
                          </span>
                        )}
                        {scenario.holdEquityMultiple != null && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: "#EEF2FF", color: "#1647E8" }}>
                            {scenario.holdEquityMultiple.toFixed(2)}× equity
                          </span>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#F9FAFB", color: "#6B7280" }}>
                      <span className="font-medium" style={{ color: "#9CA3AF" }}>RealHQ analysis: </span>
                      {scenario.rationale}
                    </div>

                    {/* Assumptions accordion (Wave 2) */}
                    {isUserPortfolio && (
                      <div className="mt-2">
                        <button
                          className="text-xs flex items-center gap-1 transition-colors hover:opacity-70"
                          style={{ color: "#9CA3AF" }}
                          onClick={() => setOpenAssumptions(openAssumptions === scenario.assetId ? null : scenario.assetId)}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                            className={`transition-transform ${openAssumptions === scenario.assetId ? "rotate-180" : ""}`}>
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Adjust assumptions
                        </button>
                        {openAssumptions === scenario.assetId && (
                          <AssumptionsPanel
                            assetId={scenario.assetId}
                            sym={sym}
                          />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {(scenario.recommendation === "sell" || scenario.recommendation === "strong_hold") && scenario.recommendation === "sell" && (
                        saleActioned.has(scenario.assetId) ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                            >
                              Sell appraisal requested ✓
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              await fetch(`/api/user/assets/${scenario.assetId}/sell-enquiry`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ targetPrice: sellPrice }),
                              }).catch(() => null);
                              setSaleActioned((prev) => new Set([...prev, scenario.assetId]));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                          >
                            Request selling appraisal →
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

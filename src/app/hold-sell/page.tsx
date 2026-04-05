"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
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

async function postTransactionSaleLead(params: { action: string; portfolioName: string; sellPrice: string }) {
  try {
    await fetch("/api/quotes/sale-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (e) {
    console.error("Failed to post sale lead:", e);
  }
}


const recommendationConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  hold:        { label: "Hold",        color: "var(--grn)", bgColor: "rgba(52, 211, 153, 0.1)", borderColor: "rgba(52, 211, 153, 0.3)" },
  strong_hold: { label: "Strong Hold", color: "var(--grn)", bgColor: "rgba(52, 211, 153, 0.1)", borderColor: "rgba(52, 211, 153, 0.3)" },
  sell:        { label: "Sell",        color: "var(--amb)", bgColor: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.3)" },
  review:      { label: "Review",      color: "var(--acc)", bgColor: "rgba(124, 106, 240, 0.1)", borderColor: "rgba(124, 106, 240, 0.3)" },
  needs_review:{ label: "Review",      color: "var(--acc)", bgColor: "rgba(124, 106, 240, 0.1)", borderColor: "rgba(124, 106, 240, 0.3)" },
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

// no-op placeholder — replace with real CRM/webhook call when available

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
      style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}>
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
            <label className="block text-xs mb-1" style={{ color: "var(--tx2)" }}>{label}</label>
            <input
              type="number"
              step={step}
              min={min}
              max={max}
              value={fields[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-lg px-2.5 py-1.5 text-sm"
              style={{ border: "1px solid var(--bdr)", backgroundColor: "var(--s1)", color: "var(--tx)" }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--acc)", color: "#fff" }}
        >
          {saving ? "Recalculating…" : "Recalculate"}
        </button>
        {err && <span className="text-xs" style={{ color: "var(--red)" }}>{err}</span>}
        {result && !err && (
          <span className="text-xs" style={{ color: "var(--tx2)" }}>
            Hold {result.holdIRR != null ? `${result.holdIRR.toFixed(1)}% IRR` : "—"}
            {result.holdNPV != null && ` · NPV ${fmtNPV(result.holdNPV, sym)}`}
            {result.recommendation && (
              <span className="ml-2 font-semibold" style={{ color: "var(--grn)" }}>
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
  const [sofr, setSofr] = useState<number | null>(null);
  const { scenarios: apiScenarios, loading: apiLoading } = useHoldSellScenarios();

  useEffect(() => {
    fetch("/api/macro/sofr").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.sofr?.value != null) setSofr(d.sofr.value);
    }).catch(() => {});
  }, []);
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

  // Portfolio ranking — sorted by sell advantage (sellPrice − estimatedValue)
  const rankedBySellAdvantage = [...complete].sort((a, b) => {
    const advA = (a.sellPrice ?? 0) - (a.estimatedValue ?? 0);
    const advB = (b.sellPrice ?? 0) - (b.estimatedValue ?? 0);
    return advB - advA;
  });
  const bestSellCandidate = rankedBySellAdvantage[0] ?? null;

  // Avg portfolio cap rate (net income / valuation)
  const assetsWithYield = portfolio.assets.filter(a => {
    const val = a.valuationUSD ?? a.valuationGBP ?? 0;
    return val > 0 && a.netIncome > 0;
  });
  const avgCapRate = assetsWithYield.length > 0
    ? assetsWithYield.reduce((sum, a) => {
        const val = a.valuationUSD ?? a.valuationGBP ?? 0;
        return sum + (a.netIncome / val) * 100;
      }, 0) / assetsWithYield.length
    : null;

  return (
    <AppShell>
      <TopBar title="Hold vs Sell" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6" style={{ background: "var(--bg)" }}>
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : scenarios.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="text-4xl">🏢</div>
            <div className="text-lg font-semibold" style={{ color: "var(--tx)" }}>No properties yet</div>
            <div className="text-sm" style={{ color: "var(--tx3)" }}>
              Add your first property to get hold vs sell analysis
            </div>
            <Link
              href="/properties/add"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "var(--acc)", color: "#fff" }}
            >
              Add Property →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden border" style={{ background: "var(--bdr)", borderColor: "var(--bdr)" }}>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Portfolio Hold Return
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: avgHoldIRR >= 8 ? "var(--tx)" : "var(--amb)" }}>
                {complete.length > 0 ? `${avgHoldIRR.toFixed(1)}%` : "—"}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                Avg return across all assets
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Best Exit Return
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: "var(--grn)" }}>
                {complete.length > 0 ? `${bestExitIRR.toFixed(1)}%` : "—"}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                Top sell candidate return
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Assets Analysed
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
                {complete.length}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                {holdCandidates.length} hold · {sellCandidates.length} sell{incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""}
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ background: "var(--s1)" }}>
              <div className="text-[8px] font-medium uppercase tracking-wider mb-1.5" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                Recommended Exits
              </div>
              <div className="text-xl leading-none mb-1" style={{ fontFamily: "var(--serif)", color: sellCandidates.length >= 3 ? "var(--red)" : sellCandidates.length >= 1 ? "var(--amb)" : "var(--grn)" }}>
                {sellCandidates.length}
              </div>
              <div className="text-[10px] leading-snug" style={{ color: "var(--tx3)" }}>
                {sellCandidates.length >= 3 ? "Action required" : sellCandidates.length >= 1 ? "Review flagged" : "Hold all assets"}
              </div>
            </div>
          </div>
        )}

        {/* Market Timing */}
        {!loading && scenarios.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <h4 className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>Is Now a Good Time to Sell?</h4>
              <span className="text-[11px] font-medium" style={{ color: "var(--acc)" }}>Market Timing</span>
            </div>
            <div style={{ padding: "18px" }}>
              <div className="text-[12px] mb-4 px-3 py-2.5 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--tx)" }}>
                <strong>Neutral market conditions.</strong>{" "}
                <span style={{ color: "var(--tx3)" }}>
                  {sofr != null
                    ? `Rates at ${sofr.toFixed(2)}% are constraining buyer pools. Strong assets are sellable; weaker assets may want to wait.`
                    : "Monitor rate environment and cap rate compression before initiating exit."}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
                {[
                  {
                    label: "Cap Rate Trend",
                    value: avgCapRate != null ? `${avgCapRate.toFixed(1)}%` : "—",
                    sub: avgCapRate != null ? "portfolio avg yield" : "Add asset data",
                    color: "var(--amb)",
                  },
                  {
                    label: "SOFR / Rate Env",
                    value: sofr != null ? `${sofr.toFixed(2)}%` : "—",
                    sub: sofr != null ? "current benchmark rate" : "Loading...",
                    color: sofr != null && sofr > 5 ? "var(--amb)" : "var(--grn)",
                  },
                  { label: "Days on Market", value: "—", sub: "No data connected", color: "var(--tx3)" },
                  { label: "New Supply", value: "—", sub: "No data connected", color: "var(--tx3)" },
                ].map(ind => (
                  <div key={ind.label}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "4px" }}>{ind.label}</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: "17px", color: ind.color }}>{ind.value}</div>
                    <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{ind.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Ranking */}
        {!loading && complete.length > 0 && bestSellCandidate && (
          <>
            {/* Best sell candidate insight */}
            {(() => {
              const adv = (bestSellCandidate.sellPrice ?? 0) - (bestSellCandidate.estimatedValue ?? 0);
              const isHold = adv <= 0;
              return (
                <div className="rounded-xl p-5 flex items-start justify-between gap-4" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                      {isHold ? "Hold Thesis" : "Best Sell Candidate"}
                    </div>
                    <div className="text-base font-semibold mb-1" style={{ color: "var(--tx)" }}>{bestSellCandidate.assetName}</div>
                    <div className="text-[12px]" style={{ color: "var(--tx3)" }}>
                      {isHold
                        ? `Hold NPV (${fmt(bestSellCandidate.estimatedValue ?? 0, sym)}) exceeds sell (${fmt(bestSellCandidate.sellPrice ?? 0, sym)}) across all assets. No exit catalyst at current pricing.`
                        : `Exit value exceeds hold by ${fmt(adv, sym)}. ${holdCandidates.length > 0 ? `${holdCandidates.map(h => h.assetName).join(", ")}: hold strongly recommended.` : ""}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-bold uppercase" style={{ color: isHold ? "var(--grn)" : "var(--red)", letterSpacing: "1px" }}>
                      {isHold ? "HOLD" : "SELL"}
                    </div>
                    {!isHold && <div className="text-[11px]" style={{ color: "var(--tx3)" }}>+{fmt(adv, sym)} advantage</div>}
                  </div>
                </div>
              );
            })()}

            {/* Ranked by sell advantage */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <h4 className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>All Assets — Ranked by Exit Advantage</h4>
                <span className="text-[10px]" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>Exit advantage = Sell − Hold value</span>
              </div>
              {rankedBySellAdvantage.map(s => {
                const adv = (s.sellPrice ?? 0) - (s.estimatedValue ?? 0);
                const cfg = recommendationConfig[s.recommendation!] ?? recommendationConfig.hold;
                return (
                  <div key={s.assetId} className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--bdr-lt)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>{s.assetName}</div>
                      <div className="text-[11px]" style={{ color: "var(--tx3)" }}>{fmt(s.estimatedValue ?? 0, sym)} value · {s.assetType}</div>
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded" style={{ background: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}>
                      {cfg.label.toUpperCase()}
                    </span>
                    <div className="shrink-0 text-right" style={{ minWidth: "90px" }}>
                      <div className="text-[11px]" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>Hold: {fmt(s.estimatedValue ?? 0, sym)}</div>
                      <div className="text-[11px]" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>Sell: {fmt(s.sellPrice ?? 0, sym)}</div>
                    </div>
                    <div className="shrink-0 text-right" style={{ minWidth: "80px" }}>
                      <div className="text-[11px] font-semibold" style={{ fontFamily: "var(--mono)", color: adv > 0 ? "var(--red)" : "var(--grn)" }}>
                        {adv > 0 ? `+${fmt(adv, sym)} sell` : `+${fmt(Math.abs(adv), sym)} hold`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA banner */}
            <div className="rounded-xl px-5 py-4 flex items-center justify-between gap-4" style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="text-[12px]" style={{ color: "var(--tx3)" }}>
                <span style={{ color: "var(--amb)", fontWeight: 600 }}>{fmt(totalSellValue, sym)}</span> total exit value from sell candidates.
                RealHQ manages the full transaction — buyer market approach and execution.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => postTransactionSaleLead({ action: "optimise", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "var(--acc)", color: "#fff" }}
                >
                  Optimise portfolio →
                </button>
                <button
                  onClick={() => postTransactionSaleLead({ action: "test_market", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}
                >
                  Test market →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Asset Scenarios */}
        {loading ? (
          <CardSkeleton rows={5} />
        ) : allSorted.length > 0 ? (
          <div
            className="rounded-xl transition-all duration-150 hover:shadow-lg"
            style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)", letterSpacing: "2px" }}>
                Per-Asset Analysis
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {complete.length} analysed{incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""} · {fmt(totalSellValue, sym)} total sell value
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {allSorted.map((scenario) => {
                /* --- Data needed state --- */
                if (scenario.dataNeeded) {
                  return (
                    <div key={scenario.assetId} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[var(--s2)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                              {scenario.assetName}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: "rgba(251, 191, 36, 0.1)", color: "var(--amb)", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                              Data needed
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: "var(--tx3)" }}>
                            {scenario.location} · {scenario.assetType}
                          </div>
                        </div>
                        <Link
                          href="/properties/add"
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ backgroundColor: "rgba(124, 106, 240, 0.1)", color: "var(--acc)", border: "1px solid rgba(124, 106, 240, 0.3)" }}
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
                  <div key={scenario.assetId} className="px-4 lg:px-5 py-5 transition-colors hover:bg-[var(--s2)]">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                            {scenario.assetName}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-block" style={{ background: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--tx3)" }}>
                          {scenario.location} · {scenario.assetType}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>Exit value</div>
                        <div
                          className="text-base font-bold"
                          style={{ color: cfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {fmt(sellPrice, sym)}
                        </div>
                        <div className="text-xs" style={{ color: premiumPct >= 0 ? "var(--grn)" : "var(--red)" }}>
                          {premiumPct >= 0 ? "+" : ""}{premiumPct}% vs book
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 mb-3">
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "var(--s2)" }}>
                        <div className="text-xs mb-1" style={{ color: "var(--tx3)" }}>Hold Return</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{ color: "var(--grn)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {scenario.holdIRR}%
                        </div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "var(--s2)" }}>
                        <div className="text-xs mb-1" style={{ color: "var(--tx3)" }}>Exit Return</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{ color: cfg.color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
                        >
                          {scenario.sellIRR}%
                        </div>
                      </div>
                      <div className="rounded-lg p-2.5 lg:p-3" style={{ backgroundColor: "var(--s2)" }}>
                        <div className="text-xs mb-1" style={{ color: "var(--tx3)" }}>Gain from selling</div>
                        <div
                          className="text-lg lg:text-xl font-bold"
                          style={{
                            color: irrDiff > 0 ? "var(--amb)" : "var(--grn)",
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
                        style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}>
                        {scenario.holdNPV != null && (
                          <span>
                            <span style={{ color: "var(--tx3)" }}>Hold NPV </span>
                            <span className="font-semibold" style={{ color: scenario.holdNPV >= 0 ? "var(--grn)" : "var(--red)" }}>
                              {fmtNPV(scenario.holdNPV, sym)}
                            </span>
                          </span>
                        )}
                        {scenario.sellNPV != null && (
                          <span>
                            <span style={{ color: "var(--tx3)" }}>vs Sell today </span>
                            <span className="font-semibold" style={{ color: "var(--tx)" }}>
                              {fmtNPV(scenario.sellNPV, sym)}
                            </span>
                          </span>
                        )}
                        {scenario.holdEquityMultiple != null && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: "rgba(124, 106, 240, 0.1)", color: "var(--acc)" }}>
                            {scenario.holdEquityMultiple.toFixed(2)}× equity
                          </span>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--s2)", color: "var(--tx2)" }}>
                      <span className="font-medium" style={{ color: "var(--tx3)" }}>RealHQ analysis: </span>
                      {scenario.rationale}
                    </div>

                    {/* Assumptions accordion (Wave 2) */}
                    {isUserPortfolio && (
                      <div className="mt-2">
                        <button
                          className="text-xs flex items-center gap-1 transition-colors hover:opacity-70"
                          style={{ color: "var(--tx3)" }}
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
                              style={{ backgroundColor: "rgba(52, 211, 153, 0.1)", color: "var(--grn)", border: "1px solid rgba(52, 211, 153, 0.3)" }}
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
                            style={{ backgroundColor: "var(--amb)", color: "var(--bg)" }}
                          >
                            Request selling appraisal →
                          </button>
                        )
                      )}
                      {scenario.recommendation === "hold" && (
                        <Link
                          href="/rent-clock"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
                          style={{ backgroundColor: "rgba(52, 211, 153, 0.1)", color: "var(--grn)", border: "1px solid rgba(52, 211, 153, 0.3)" }}
                        >
                          Prep Rent Review →
                        </Link>
                      )}
                      {scenario.recommendation === "review" && (
                        <>
                          <Link
                            href="/scout"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "rgba(124, 106, 240, 0.1)", color: "var(--acc)", border: "1px solid rgba(124, 106, 240, 0.3)" }}
                          >
                            Model exit →
                          </Link>
                          <Link
                            href="/rent-clock"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                            style={{ backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}
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

        {/* ── Tax Implications ─────────────────────────────────────────── */}
        {!loading && sellCandidates.length > 0 && (() => {
          const sellAsset = sellCandidates[0];
          const sellPrice = sellAsset.sellPrice ?? 0;
          const jurisdiction = portfolio.currency === "GBP" ? "UK" : "US";

          return (
            <div>
              <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12, paddingTop: 4 }}>
                Tax Implications — {sellAsset.assetName}
              </div>
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                    Capital Gains Estimate — {jurisdiction === "UK" ? "UK" : "US"}
                  </span>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>Illustrative only</span>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                        Acquisition Cost
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--tx3)" }}>—</div>
                      <div style={{ font: "400 10px var(--sans)", color: "var(--acc)", marginTop: 2 }}>
                        Add purchase price to calculate
                      </div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                        Estimated Sale Price
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--tx)" }}>
                        {fmt(sellPrice, sym)}
                      </div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                        Estimated Gain
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--tx3)" }}>—</div>
                    </div>
                    <div>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                        {jurisdiction === "UK" ? "Estimated CGT (24%)" : "Estimated Federal CGT (20%)"}
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--tx3)" }}>—</div>
                    </div>
                  </div>

                  {jurisdiction === "US" && (
                    <div style={{ padding: 14, background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ font: "600 11px var(--sans)", color: "var(--grn)", marginBottom: 4 }}>1031 Exchange Eligible</div>
                      <div style={{ font: "300 12px/1.6 var(--sans)", color: "var(--tx2)" }}>
                        Reinvest the full sale proceeds into a like-kind property within{" "}
                        <strong style={{ color: "var(--tx)" }}>180 days</strong> to defer capital gains tax.
                        Replacement property identification required within{" "}
                        <strong style={{ color: "var(--tx)" }}>45 days</strong> of sale.
                      </div>
                    </div>
                  )}
                  {jurisdiction === "UK" && (
                    <div style={{ padding: 14, background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ font: "600 11px var(--sans)", color: "var(--acc)", marginBottom: 4 }}>Business Asset Disposal Relief</div>
                      <div style={{ font: "300 12px/1.6 var(--sans)", color: "var(--tx2)" }}>
                        If you qualify, Business Asset Disposal Relief reduces CGT to{" "}
                        <strong style={{ color: "var(--tx)" }}>10%</strong> on up to £1M of lifetime gains.
                        Annual CGT exemption of{" "}
                        <strong style={{ color: "var(--tx)" }}>£3,000</strong> applies per individual.
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "10px 14px", background: "var(--s2)", border: "1px solid var(--bdr)", borderRadius: 8, font: "300 11px/1.5 var(--sans)", color: "var(--tx3)" }}>
                    ⚠ This is an illustrative estimate only. Tax liability depends on your individual circumstances,
                    {jurisdiction === "US" ? " depreciation recapture (§1250), state taxes, and holding period." : " your marginal rate, indexation allowance, and other reliefs."}
                    {" "}Consult your tax advisor before making any decisions.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </AppShell>
  );
}

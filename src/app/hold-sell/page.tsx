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

function fmtNPV(v: number | null | undefined, sym: string) {
  if (v == null) return null;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "-" : ""}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${v < 0 ? "-" : ""}${sym}${(abs / 1_000).toFixed(0)}k`;
  return `${v < 0 ? "-" : ""}${sym}${abs.toLocaleString()}`;
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

/* ── Shared style tokens (from v2 design) ─────────────────────────────── */
const sec: React.CSSProperties = {
  font: "500 9px/1 var(--mono)",
  color: "var(--tx3)",
  textTransform: "uppercase",
  letterSpacing: "2px",
  marginBottom: 12,
  paddingTop: 4,
};

const cardStyle: React.CSSProperties = {
  background: "var(--s1)",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  overflow: "hidden",
  marginBottom: 14,
};

const cardHd: React.CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid var(--bdr)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

function RecBadge({ rec }: { rec: string }) {
  const styles: Record<string, React.CSSProperties> = {
    hold:        { background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" },
    strong_hold: { background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" },
    sell:        { background: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)" },
    review:      { background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" },
    needs_review:{ background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" },
  };
  const labels: Record<string, string> = {
    hold: "HOLD", strong_hold: "HOLD", sell: "SELL", review: "MARGINAL", needs_review: "MARGINAL",
  };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 12px",
      borderRadius: 100,
      font: "600 10px/1 var(--mono)",
      letterSpacing: ".3px",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...(styles[rec] ?? styles.hold),
    }}>
      {labels[rec] ?? rec.toUpperCase()}
    </span>
  );
}

/* ── Assumptions panel with range sliders ─────────────────────────────── */
interface AssumptionsPanelProps {
  assetId: string;
  sym: string;
}

function AssumptionsPanel({ assetId, sym }: AssumptionsPanelProps) {
  const [fields, setFields] = useState({
    holdPeriodYears: 5,
    rentGrowthPct: 2.0,
    exitYieldPct: 6.5,
    vacancyAllowancePct: 8,
    sellingCostsPct: 3.5,
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

  const handleChange = useCallback((key: keyof typeof fields, val: number) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/user/hold-sell-scenarios/${assetId}/assumptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdPeriodYears: fields.holdPeriodYears,
          rentGrowthPct: fields.rentGrowthPct,
          exitYieldPct: fields.exitYieldPct,
          vacancyAllowancePct: fields.vacancyAllowancePct,
          annualCapexPct: fields.sellingCostsPct,
        }),
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

  const sliders: {
    key: keyof typeof fields;
    label: string;
    badge: "avm" | "lease" | "user" | "market";
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }[] = [
    { key: "holdPeriodYears", label: "Hold period", badge: "user", min: 1, max: 20, step: 1, format: v => `${v} yr` },
    { key: "rentGrowthPct", label: "Rent growth", badge: "user", min: 0, max: 10, step: 0.5, format: v => `${v.toFixed(1)}%/yr` },
    { key: "exitYieldPct", label: "Exit cap rate", badge: "market", min: 3, max: 12, step: 0.25, format: v => `${v.toFixed(2)}%` },
    { key: "vacancyAllowancePct", label: "Vacancy", badge: "user", min: 0, max: 25, step: 1, format: v => `${v}%` },
    { key: "sellingCostsPct", label: "Selling costs", badge: "market", min: 1, max: 8, step: 0.5, format: v => `${v.toFixed(1)}%` },
  ];

  const badgeColors: Record<string, React.CSSProperties> = {
    avm:    { background: "rgba(56,189,248,.07)", color: "#38bdf8", border: "1px solid rgba(56,189,248,.22)" },
    lease:  { background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" },
    user:   { background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" },
    market: { background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)" },
  };

  return (
    <div style={cardStyle}>
      <div style={cardHd}>
        <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Assumptions</span>
        <button
          onClick={() => setFields({ holdPeriodYears: 5, rentGrowthPct: 2.0, exitYieldPct: 6.5, vacancyAllowancePct: 8, sellingCostsPct: 3.5 })}
          style={{ font: "500 11px var(--sans)", color: "var(--acc)", background: "none", border: "none", cursor: "pointer" }}
        >
          Reset to defaults
        </button>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 24px" }}>
          {sliders.map(({ key, label, badge, min, max, step, format }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ font: "500 11px var(--sans)", color: "var(--tx2)", display: "flex", alignItems: "center", gap: 4 }}>
                  {label}
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "1px 6px",
                    borderRadius: 100,
                    font: "500 7px/1 var(--mono)",
                    letterSpacing: ".3px",
                    textTransform: "uppercase",
                    ...badgeColors[badge],
                  }}>
                    {badge.toUpperCase()}
                  </span>
                </span>
                <span style={{ font: "500 13px var(--mono)", color: "var(--tx)" }}>{format(fields[key])}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={fields[key]}
                onChange={e => handleChange(key, parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  background: "var(--s3)",
                  WebkitAppearance: "none",
                  outline: "none",
                  cursor: "pointer",
                  accentColor: "var(--acc)",
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              height: 30,
              padding: "0 14px",
              background: "var(--acc)",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              font: "600 11px/1 var(--sans)",
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Recalculating…" : "Recalculate"}
          </button>
          {err && <span style={{ font: "400 11px var(--sans)", color: "var(--red)" }}>{err}</span>}
          {result && !err && (
            <span style={{ font: "400 11px var(--sans)", color: "var(--tx2)" }}>
              Hold {result.holdIRR != null ? `${result.holdIRR.toFixed(1)}% IRR` : "—"}
              {result.holdNPV != null && ` · NPV ${fmtNPV(result.holdNPV, sym)}`}
              {result.recommendation && (
                <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--grn)" }}>
                  → {result.recommendation.replace("_", " ")}
                </span>
              )}
            </span>
          )}
        </div>

        <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: 12, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          {(["avm", "lease", "user", "market"] as const).map(b => (
            <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-flex", padding: "1px 6px", borderRadius: 100, font: "500 7px/1 var(--mono)", ...badgeColors[b] }}>
                {b.toUpperCase()}
              </span>
              {b === "avm" ? "Automated valuation" : b === "lease" ? "Extracted from lease" : b === "user" ? "Your assumption" : "Market benchmark"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
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
  const bestExitIRR =
    sellCandidates.length > 0
      ? Math.max(...sellCandidates.map((s) => s.sellIRR ?? 0))
      : complete.length > 0 ? Math.max(...complete.map(s => s.sellIRR ?? 0)) : 0;

  const rankedBySellAdvantage = [...complete].sort((a, b) => {
    const advA = (a.sellPrice ?? 0) - (a.estimatedValue ?? 0);
    const advB = (b.sellPrice ?? 0) - (b.estimatedValue ?? 0);
    return advB - advA;
  });
  const bestSellCandidate = rankedBySellAdvantage[0] ?? null;

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

  // Market timing signal
  const sofrHigh = sofr != null && sofr > 5;
  const timingSignal = sofrHigh ? "neutral" : "good";
  const timingColors: Record<string, React.CSSProperties> = {
    good:    { background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", color: "var(--grn)" },
    neutral: { background: "var(--amb-lt)", border: "1px solid var(--amb-bdr)", color: "var(--amb)" },
    wait:    { background: "var(--red-lt)", border: "1px solid var(--red-bdr)", color: "var(--red)" },
  };
  const timingDotBg: Record<string, string> = {
    good: "var(--grn)", neutral: "var(--amb)", wait: "var(--red)",
  };

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

      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)", padding: "28px 32px 80px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 400, color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 4 }}>
                Hold vs Sell Analysis
              </div>
              <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
                DCF-based recommendations across your portfolio. Every number shows its data source.
              </div>
            </div>
            <button
              onClick={() => postTransactionSaleLead({ action: "new_scenario", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })}
              style={{ height: 30, padding: "0 14px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: 7, font: "600 11px/1 var(--sans)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Run new scenario
            </button>
          </div>

          {/* KPI bar */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
              {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
            </div>
          ) : scenarios.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center", gap: 16 }}>
              <div style={{ fontSize: 40 }}>🏢</div>
              <div style={{ font: "600 18px var(--sans)", color: "var(--tx)" }}>No properties yet</div>
              <div style={{ font: "400 13px var(--sans)", color: "var(--tx3)" }}>Add your first property to get hold vs sell analysis</div>
              <Link href="/properties/add" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "var(--acc)", color: "#fff", borderRadius: 8, font: "600 13px/1 var(--sans)", textDecoration: "none" }}>
                Add Property →
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
              {[
                {
                  label: "Portfolio Hold Return",
                  value: complete.length > 0 ? `${avgHoldIRR.toFixed(1)}%` : "—",
                  note: "Avg IRR across all assets",
                  noteColor: avgHoldIRR >= 8 ? "var(--grn)" : "var(--amb)",
                },
                {
                  label: "Best Exit Return",
                  value: complete.length > 0 ? `${bestExitIRR.toFixed(1)}%` : "—",
                  note: sellCandidates.length > 0 ? "Top sell candidate" : "No sell candidates",
                  noteColor: "var(--grn)",
                },
                {
                  label: "Assets Analysed",
                  value: `${complete.length}`,
                  note: `${holdCandidates.length} hold · ${sellCandidates.length} sell${incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""}`,
                  noteColor: "var(--tx3)",
                },
                {
                  label: "Recommended Exits",
                  value: `${sellCandidates.length}`,
                  note: sellCandidates.length >= 3 ? "Action required" : sellCandidates.length >= 1 ? "Review flagged" : "Hold all assets",
                  noteColor: sellCandidates.length >= 3 ? "var(--red)" : sellCandidates.length >= 1 ? "var(--amb)" : "var(--grn)",
                },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "var(--s1)", padding: "14px 16px" }}>
                  <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ font: "400 10px var(--sans)", color: kpi.noteColor, marginTop: 3 }}>{kpi.note}</div>
                </div>
              ))}
            </div>
          )}

          {/* Market Timing */}
          {!loading && scenarios.length > 0 && (
            <>
              <div style={sec}>Market Timing</div>
              <div style={cardStyle}>
                <div style={cardHd}>
                  <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Is Now a Good Time to Sell?</span>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>View market data →</span>
                </div>
                <div style={{ padding: 18 }}>
                  {/* Overall signal */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 8, marginBottom: 16, ...timingColors[timingSignal] }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: timingDotBg[timingSignal], flexShrink: 0 }} />
                    <span style={{ font: "400 12px var(--sans)" }}>
                      {timingSignal === "neutral"
                        ? <><strong>Neutral market conditions.</strong> {sofr != null ? `Rates at ${sofr.toFixed(2)}% are constraining buyer pools. Strong assets are sellable; weaker assets may want to wait.` : "Monitor rate environment and cap rate compression before initiating exit."}</>
                        : <><strong>Favourable market conditions.</strong> Rate environment and cap rate trends support exit pricing for quality assets.</>
                      }
                    </span>
                  </div>
                  {/* 4 indicators */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
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
                        sub: sofr != null ? "current benchmark rate" : "Loading…",
                        color: sofr != null && sofr > 5 ? "var(--amb)" : "var(--grn)",
                      },
                      { label: "Days on Market", value: "—", sub: "No data connected", color: "var(--tx3)" },
                      { label: "New Supply", value: "—", sub: "No data connected", color: "var(--tx3)" },
                    ].map(ind => (
                      <div key={ind.label}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{ind.label}</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: ind.color }}>{ind.value}</div>
                        <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: 2 }}>{ind.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Portfolio Ranking */}
          {!loading && complete.length > 0 && bestSellCandidate && (
            <>
              <div style={sec}>Portfolio Ranking</div>

              {/* Insight card */}
              {(() => {
                const adv = (bestSellCandidate.sellPrice ?? 0) - (bestSellCandidate.estimatedValue ?? 0);
                const isHold = adv <= 0;
                return (
                  <div style={{
                    background: "var(--s1)",
                    border: "1px solid var(--acc-bdr)",
                    borderRadius: 10,
                    padding: "22px 24px",
                    marginBottom: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 24,
                    alignItems: "center",
                  }}>
                    <div>
                      <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                        {isHold ? "Hold Thesis" : "Best Sell Candidate"}
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 400, color: "var(--tx)", marginBottom: 3 }}>
                        {bestSellCandidate.assetName}
                      </div>
                      <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)", lineHeight: 1.6, maxWidth: 480 }}>
                        {isHold
                          ? `Hold NPV (${fmt(bestSellCandidate.estimatedValue ?? 0, sym)}) exceeds sell (${fmt(bestSellCandidate.sellPrice ?? 0, sym)}) across all assets. No exit catalyst at current pricing.`
                          : `Exit value exceeds hold by ${fmt(adv, sym)}. ${holdCandidates.length > 0 ? `${holdCandidates.map(h => h.assetName).join(", ")}: hold strongly recommended.` : ""}`
                        }
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: isHold ? "var(--grn)" : "var(--red)", letterSpacing: "-.03em", lineHeight: 1 }}>
                        {isHold ? "HOLD" : "SELL"}
                      </div>
                      {!isHold && <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: 4 }}>+{fmt(adv, sym)} advantage</div>}
                    </div>
                  </div>
                );
              })()}

              {/* All assets ranked */}
              <div style={cardStyle}>
                <div style={cardHd}>
                  <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Assets — Ranked by Sell Advantage</span>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>Sell advantage = Sell NPV − Hold NPV</span>
                </div>
                {rankedBySellAdvantage.map((s) => {
                  const adv = (s.sellPrice ?? 0) - (s.estimatedValue ?? 0);
                  return (
                    <div key={s.assetId} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 18px",
                      borderBottom: "1px solid var(--bdr-lt)",
                      cursor: "pointer",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--s2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <div>
                        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)", lineHeight: 1.3 }}>{s.assetName}</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{fmt(s.estimatedValue ?? 0, sym)} value · {s.assetType}</div>
                      </div>
                      <RecBadge rec={s.recommendation!} />
                      <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>Hold: {fmt(s.estimatedValue ?? 0, sym)}</span>
                      <span style={{ font: "500 11px/1 var(--mono)", color: adv > 0 ? "var(--tx)" : "var(--grn)" }}>Sell: {fmt(s.sellPrice ?? 0, sym)}</span>
                      <span style={{ font: "600 11px var(--mono)", color: adv > 0 ? "var(--red)" : "var(--grn)", whiteSpace: "nowrap" }}>
                        {adv > 0 ? `+${fmt(adv, sym)} sell` : `+${fmt(Math.abs(adv), sym)} hold`}
                      </span>
                      <span style={{ color: "var(--tx3)", fontSize: 12 }}>→</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA hint */}
              {totalSellValue > 0 && (
                <div style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 10, font: "300 12px/1.5 var(--sans)", color: "var(--tx3)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <span>
                    <strong style={{ color: "var(--amb)", fontWeight: 600 }}>{fmt(totalSellValue, sym)}</strong> total exit value from sell candidates.
                    RealHQ manages the full transaction — buyer market approach and execution.
                  </span>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => postTransactionSaleLead({ action: "optimise", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })}
                      style={{ height: 30, padding: "0 14px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: 7, font: "600 11px/1 var(--sans)", cursor: "pointer" }}
                    >
                      Optimise portfolio →
                    </button>
                    <button
                      onClick={() => postTransactionSaleLead({ action: "test_market", portfolioName: "Your Portfolio", sellPrice: fmt(totalSellValue, sym) })}
                      style={{ height: 30, padding: "0 14px", background: "transparent", color: "var(--tx3)", border: "1px solid var(--bdr)", borderRadius: 7, font: "500 11px/1 var(--sans)", cursor: "pointer" }}
                    >
                      Test market →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Per-asset analysis */}
          {loading ? (
            <CardSkeleton rows={5} />
          ) : allSorted.length > 0 ? (
            <>
              <div style={sec}>Per-Asset Analysis</div>
              <div style={cardStyle}>
                <div style={cardHd}>
                  <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                    {complete.length} analysed{incomplete.length > 0 ? ` · ${incomplete.length} needs data` : ""}
                    {totalSellValue > 0 ? ` · ${fmt(totalSellValue, sym)} total sell value` : ""}
                  </span>
                </div>
                {allSorted.map((scenario) => {
                  if (scenario.dataNeeded) {
                    return (
                      <div key={scenario.assetId} style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>{scenario.assetName}</span>
                            <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: 5, background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" }}>
                              DATA NEEDED
                            </span>
                          </div>
                          <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{scenario.location} · {scenario.assetType}</div>
                        </div>
                        <Link
                          href="/properties/add"
                          style={{ font: "500 11px var(--sans)", color: "var(--acc)", background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)", borderRadius: 7, padding: "6px 12px", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          Add financials →
                        </Link>
                      </div>
                    );
                  }

                  const estimatedValue = scenario.estimatedValue ?? 0;
                  const sellPrice = scenario.sellPrice ?? 0;
                  const premium = sellPrice - estimatedValue;
                  const premiumPct = estimatedValue > 0 ? Math.round((premium / estimatedValue) * 100) : 0;
                  const irrDiff = (scenario.sellIRR ?? 0) - (scenario.holdIRR ?? 0);

                  return (
                    <div key={scenario.assetId} style={{ borderBottom: "1px solid var(--bdr-lt)" }}>
                      {/* Row header */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto auto auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 18px",
                        cursor: "pointer",
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--s2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <div>
                          <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", lineHeight: 1.3, marginBottom: 2 }}>{scenario.assetName}</div>
                          <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{scenario.location} · {scenario.assetType}</div>
                        </div>
                        <RecBadge rec={scenario.recommendation!} />
                        <div style={{ textAlign: "right" }}>
                          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>Hold IRR</div>
                          <div style={{ font: "500 13px var(--mono)", color: "var(--grn)" }}>{scenario.holdIRR}%</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>Exit IRR</div>
                          <div style={{ font: "500 13px var(--mono)", color: scenario.recommendation === "sell" ? "var(--red)" : scenario.recommendation === "review" ? "var(--amb)" : "var(--grn)" }}>{scenario.sellIRR}%</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>Exit value</div>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--tx)" }}>{fmt(sellPrice, sym)}</div>
                          <div style={{ font: "400 10px var(--sans)", color: premiumPct >= 0 ? "var(--grn)" : "var(--red)", marginTop: 1 }}>
                            {premiumPct >= 0 ? "+" : ""}{premiumPct}% vs book
                          </div>
                        </div>
                      </div>

                      {/* NPV comparison + rationale */}
                      <div style={{ padding: "0 18px 14px" }}>
                        {/* Scenario metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
                          {[
                            { label: "Hold IRR", value: `${scenario.holdIRR}%`, color: "var(--grn)" },
                            { label: "Exit IRR", value: `${scenario.sellIRR}%`, color: scenario.recommendation === "sell" ? "var(--red)" : "var(--amb)" },
                            { label: "IRR Gain", value: `${irrDiff > 0 ? "+" : ""}${irrDiff.toFixed(1)}pp`, color: irrDiff > 0 ? "var(--amb)" : "var(--grn)" },
                          ].map(m => (
                            <div key={m.label} style={{ background: "var(--s2)", borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{m.label}</div>
                              <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: m.color }}>{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* NPV row */}
                        {(scenario.holdNPV != null || scenario.sellNPV != null) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 12px", background: "var(--s2)", border: "1px solid var(--bdr)", borderRadius: 8, font: "400 11px var(--sans)", marginBottom: 10 }}>
                            {scenario.holdNPV != null && (
                              <span>
                                <span style={{ color: "var(--tx3)" }}>Hold NPV </span>
                                <span style={{ fontWeight: 600, color: scenario.holdNPV >= 0 ? "var(--grn)" : "var(--red)" }}>{fmtNPV(scenario.holdNPV, sym)}</span>
                              </span>
                            )}
                            {scenario.sellNPV != null && (
                              <span>
                                <span style={{ color: "var(--tx3)" }}>vs Sell today </span>
                                <span style={{ fontWeight: 600, color: "var(--tx)" }}>{fmtNPV(scenario.sellNPV, sym)}</span>
                              </span>
                            )}
                            {scenario.holdEquityMultiple != null && (
                              <span style={{ marginLeft: "auto", padding: "2px 8px", background: "var(--acc-lt)", color: "var(--acc)", borderRadius: 100, font: "500 10px var(--mono)" }}>
                                {scenario.holdEquityMultiple.toFixed(2)}× equity
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rationale */}
                        <div style={{ padding: "10px 12px", background: "var(--s2)", borderRadius: 8, font: "400 11px/1.5 var(--sans)", color: "var(--tx2)", marginBottom: 10 }}>
                          <span style={{ fontWeight: 500, color: "var(--tx3)" }}>Analysis: </span>
                          {scenario.rationale}
                        </div>

                        {/* Assumptions accordion */}
                        {isUserPortfolio && (
                          <div style={{ marginBottom: 10 }}>
                            <button
                              style={{ display: "flex", alignItems: "center", gap: 6, font: "400 11px var(--sans)", color: "var(--tx3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              onClick={() => setOpenAssumptions(openAssumptions === scenario.assetId ? null : scenario.assetId)}
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                                style={{ transform: openAssumptions === scenario.assetId ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }}>
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Adjust assumptions
                            </button>
                            {openAssumptions === scenario.assetId && (
                              <div style={{ marginTop: 10 }}>
                                <AssumptionsPanel assetId={scenario.assetId} sym={sym} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {scenario.recommendation === "sell" && (
                            saleActioned.has(scenario.assetId) ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, font: "600 11px/1 var(--sans)", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>
                                Sell appraisal requested ✓
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  await fetch(`/api/user/assets/${scenario.assetId}/sell-enquiry`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ targetPrice: sellPrice }),
                                  }).catch(() => null);
                                  setSaleActioned(prev => new Set([...prev, scenario.assetId]));
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, font: "600 11px/1 var(--sans)", background: "var(--red)", color: "#fff", border: "none", cursor: "pointer" }}
                              >
                                List this property for sale →
                              </button>
                            )
                          )}
                          {scenario.recommendation === "hold" && (
                            <Link
                              href="/rent-clock"
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, font: "600 11px/1 var(--sans)", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)", textDecoration: "none" }}
                            >
                              Prep Rent Review →
                            </Link>
                          )}
                          {(scenario.recommendation === "review" || scenario.recommendation === "needs_review") && (
                            <>
                              <Link
                                href="/scout"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, font: "500 11px/1 var(--sans)", background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)", textDecoration: "none" }}
                              >
                                Model exit →
                              </Link>
                              <Link
                                href="/rent-clock"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, font: "500 11px/1 var(--sans)", background: "transparent", color: "var(--tx3)", border: "1px solid var(--bdr)", textDecoration: "none" }}
                              >
                                Review leases →
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {/* Tax Implications */}
          {!loading && sellCandidates.length > 0 && (() => {
            const sellAsset = sellCandidates[0];
            const sp = sellAsset.sellPrice ?? 0;
            const jurisdiction = portfolio.currency === "GBP" ? "UK" : "US";
            return (
              <>
                <div style={sec}>Tax Implications — {sellAsset.assetName}</div>
                <div style={cardStyle}>
                  <div style={cardHd}>
                    <span style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                      Capital Gains Estimate — {jurisdiction === "UK" ? "UK" : "US"}
                    </span>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>Illustrative only</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {[
                        { label: "Acquisition Cost", value: "—", note: "Add purchase price to calculate", noteColor: "var(--acc)" },
                        { label: "Estimated Sale Price", value: fmt(sp, sym), note: null, noteColor: null },
                        { label: "Estimated Gain", value: "—", note: null, noteColor: null },
                        { label: jurisdiction === "UK" ? "Estimated CGT (24%)" : "Estimated Federal CGT (20%)", value: "—", note: null, noteColor: null },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: item.value === "—" ? "var(--tx3)" : "var(--tx)" }}>{item.value}</div>
                          {item.note && <div style={{ font: "400 10px var(--sans)", color: item.noteColor ?? "var(--tx3)", marginTop: 2 }}>{item.note}</div>}
                        </div>
                      ))}
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
              </>
            );
          })()}

        </div>
      </main>
    </AppShell>
  );
}

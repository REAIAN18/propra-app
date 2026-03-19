"use client";

import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
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

type PipelineStage = "screening" | "loi" | "due_diligence" | "exchange";

const STAGES: { key: PipelineStage; label: string; shortLabel: string; color: string; badgeVariant: "gray" | "blue" | "amber" | "green" }[] = [
  { key: "screening", label: "Screening", shortLabel: "Screen", color: "#5a7a96", badgeVariant: "gray" },
  { key: "loi",       label: "LOI",       shortLabel: "LOI",    color: "#1647E8", badgeVariant: "blue" },
  { key: "due_diligence", label: "Due Diligence", shortLabel: "DD", color: "#F5A94A", badgeVariant: "amber" },
  { key: "exchange",  label: "Exchange",  shortLabel: "Exchange", color: "#0A8A4C", badgeVariant: "green" },
];

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#0A8A4C" : score >= 65 ? "#F5A94A" : "#f06040";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ── IRR via bisection ────────────────────────────────────────────────
function calcIRR(cashFlows: number[]): number | null {
  const npv = (r: number) => cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  let lo = -0.9999, hi = 50;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

interface UnderwriteInputs {
  askingPrice: number;
  ltv: number;
  interestRate: number;
  noi: number;
  capRate: number;
  exitCapRate: number;
  holdYears: number;
}

interface UnderwriteOutputs {
  irr: number | null;
  equityMultiple: number;
  annualCashYield: number;
  equity: number;
  debt: number;
  annualDebtService: number;
  exitValue: number;
  exitEquity: number;
}

function runUnderwrite(inputs: UnderwriteInputs): UnderwriteOutputs {
  const { askingPrice, ltv, interestRate, noi, exitCapRate, holdYears } = inputs;
  const equity = askingPrice * (1 - ltv / 100);
  const debt = askingPrice * (ltv / 100);
  const annualDebtService = debt * (interestRate / 100);
  const annualCF = noi - annualDebtService;
  const annualCashYield = equity > 0 ? (annualCF / equity) * 100 : 0;
  const exitValue = exitCapRate > 0 ? noi / (exitCapRate / 100) : 0;
  const exitEquity = exitValue - debt;

  // Cash flows: year 0 = -equity, years 1..holdYears = annualCF, year holdYears += exitEquity
  const cfs = [-equity, ...Array(holdYears).fill(annualCF)];
  cfs[holdYears] += exitEquity;

  const totalReturn = annualCF * holdYears + exitEquity;
  const equityMultiple = equity > 0 ? totalReturn / equity : 0;
  const irr = calcIRR(cfs);

  return { irr, equityMultiple, annualCashYield, equity, debt, annualDebtService, exitValue, exitEquity };
}

// ── Deal Detail Panel ────────────────────────────────────────────────
function DealPanel({
  deal,
  sym,
  passedIds,
  submittedIds,
  onClose,
  onPass,
  onSubmitOffer,
}: {
  deal: AcquisitionDeal;
  sym: string;
  passedIds: Set<string>;
  submittedIds: Set<string>;
  onClose: () => void;
  onPass: (id: string) => void;
  onSubmitOffer: (id: string) => void;
}) {
  const isPassed = passedIds.has(deal.id);
  const isSubmitted = submittedIds.has(deal.id);
  const dealSym = deal.currency === "USD" ? "$" : "£";

  const [inputs, setInputs] = useState<UnderwriteInputs>({
    askingPrice: deal.askingPrice,
    ltv: 60,
    interestRate: 5.5,
    noi: deal.noi ?? Math.round(deal.askingPrice * deal.estimatedYield / 100),
    capRate: deal.estimatedYield,
    exitCapRate: deal.marketYield + 0.25,
    holdYears: 7,
  });

  const result = runUnderwrite(inputs);

  const set = (key: keyof UnderwriteInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }));
  };

  const stage = STAGES.find(s => s.key === deal.status);
  const yieldSpread = deal.estimatedYield - deal.marketYield;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="flex-1" style={{ backgroundColor: "rgba(11,22,34,0.6)" }} />

      {/* panel */}
      <div
        className="w-full max-w-xl flex flex-col overflow-y-auto"
        style={{ backgroundColor: "#0B1622", borderLeft: "1px solid #1a2d45" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div className="min-w-0">
            <div className="text-base font-bold mb-1" style={{ color: "#e8eef5" }}>{deal.name}</div>
            <div className="text-xs" style={{ color: "#5a7a96" }}>
              {deal.location} · {deal.type} · {deal.sqft.toLocaleString()} sqft
            </div>
            {stage && (
              <div className="mt-2">
                <Badge variant={stage.badgeVariant}>{stage.label}</Badge>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Key metrics */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: "#111e2e" }}>
              <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Asking Price</div>
              <div className="text-sm font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(deal.askingPrice, dealSym)}</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: "#111e2e" }}>
              <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Est. Yield</div>
              <div className="text-sm font-bold" style={{ color: "#0A8A4C" }}>{deal.estimatedYield}%</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: "#111e2e" }}>
              <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Spread</div>
              <div className="text-sm font-bold" style={{ color: yieldSpread > 0 ? "#F5A94A" : "#f06040" }}>
                {yieldSpread > 0 ? "+" : ""}{yieldSpread.toFixed(1)}pp
              </div>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "#5a7a96" }}>AI Deal Score</span>
            </div>
            <ScoreBar score={deal.score} />
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#111e2e", color: "#8ba0b8" }}>
            <span className="font-medium" style={{ color: "#5a7a96" }}>AI rationale: </span>
            {deal.rationale}
          </div>

          {/* Day 1 callout */}
          <div
            className="mt-2.5 px-3 py-2.5 rounded-xl text-[11px]"
            style={{ background: "rgba(91,240,172,.05)", border: "1px solid rgba(91,240,172,.14)", color: "rgba(255,255,255,.6)" }}
          >
            <strong style={{ color: "#5BF0AC" }}>Day 1 after completion:</strong>{" "}
            Arca runs insurance retender + utility audit — typical {dealSym}{(18000).toLocaleString()}–{dealSym}{(52000).toLocaleString()}/yr saving identified within 48 hours
          </div>
        </div>

        {/* Underwrite Modeller */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "#e8eef5" }}>Underwrite Modeller</div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Asking Price", key: "askingPrice" as const, prefix: dealSym, step: 10000 },
              { label: "LTV %", key: "ltv" as const, suffix: "%", step: 5 },
              { label: "Interest Rate %", key: "interestRate" as const, suffix: "%", step: 0.25 },
              { label: "Annual NOI", key: "noi" as const, prefix: dealSym, step: 1000 },
              { label: "Cap Rate %", key: "capRate" as const, suffix: "%", step: 0.1 },
              { label: "Exit Cap Rate %", key: "exitCapRate" as const, suffix: "%", step: 0.1 },
              { label: "Hold Years", key: "holdYears" as const, suffix: "yr", step: 1 },
            ].map(({ label, key, prefix, suffix, step }) => (
              <div key={key}>
                <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>{label}</label>
                <div className="flex items-center rounded-lg px-3 py-2" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
                  {prefix && <span className="text-xs mr-1" style={{ color: "#5a7a96" }}>{prefix}</span>}
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={set(key)}
                    step={step}
                    className="flex-1 bg-transparent text-sm font-medium outline-none w-0"
                    style={{ color: "#e8eef5" }}
                  />
                  {suffix && <span className="text-xs ml-1" style={{ color: "#5a7a96" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="text-xs font-semibold mb-3" style={{ color: "#5a7a96" }}>MODEL OUTPUTS</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: result.irr !== null && result.irr > 0.1 ? "#0A8A4C" : result.irr !== null && result.irr > 0.07 ? "#F5A94A" : "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                  {result.irr !== null ? fmtPct(result.irr * 100) : "—"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>IRR</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: result.equityMultiple >= 2 ? "#0A8A4C" : result.equityMultiple >= 1.5 ? "#F5A94A" : "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                  {result.equityMultiple.toFixed(2)}x
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Equity Multiple</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: result.annualCashYield >= 8 ? "#0A8A4C" : result.annualCashYield >= 5 ? "#F5A94A" : "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                  {fmtPct(result.annualCashYield)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Cash Yield p.a.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Equity In", value: fmt(result.equity, dealSym) },
                { label: "Debt", value: fmt(result.debt, dealSym) },
                { label: "Annual Debt Service", value: fmt(result.annualDebtService, dealSym) },
                { label: "Exit Value", value: fmt(result.exitValue, dealSym) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: "#5a7a96" }}>{label}</span>
                  <span className="font-medium" style={{ color: "#8ba0b8" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4">
          {isPassed ? (
            <div className="text-sm text-center py-2" style={{ color: "#3d5a72" }}>
              Passed — Arca monitoring for price reduction
            </div>
          ) : isSubmitted ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ backgroundColor: "#0d1825" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#F5A94A" }} />
              <span className="text-sm font-medium" style={{ color: "#F5A94A" }}>Offer submitted — Arca managing negotiation</span>
            </div>
          ) : (
            <div className="flex gap-3">
              {deal.status === "loi" && (
                <button
                  onClick={() => onSubmitOffer(deal.id)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                >
                  Submit Offer
                </button>
              )}
              <button
                onClick={() => onPass(deal.id)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-80"
                style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
              >
                Pass Deal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deal Card (kanban) ────────────────────────────────────────────────
function DealCard({
  deal,
  sym,
  passedIds,
  submittedIds,
  onClick,
  onPass,
  onSubmitOffer,
}: {
  deal: AcquisitionDeal;
  sym: string;
  passedIds: Set<string>;
  submittedIds: Set<string>;
  onClick: () => void;
  onPass: (id: string) => void;
  onSubmitOffer: (id: string) => void;
}) {
  const dealSym = deal.currency === "USD" ? "$" : "£";
  const isSubmitted = submittedIds.has(deal.id);
  const yieldSpread = deal.estimatedYield - deal.marketYield;

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5"
      style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight mb-0.5" style={{ color: "#e8eef5" }}>{deal.name}</div>
          <div className="text-xs" style={{ color: "#5a7a96" }}>{deal.location} · {deal.type}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(deal.askingPrice, dealSym)}</div>
        </div>
      </div>

      <div className="mb-2">
        <ScoreBar score={deal.score} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md p-2 text-center" style={{ backgroundColor: "#0d1825" }}>
          <div className="text-xs font-bold" style={{ color: "#0A8A4C" }}>{deal.estimatedYield}%</div>
          <div className="text-xs" style={{ color: "#3d5a72" }}>yield</div>
        </div>
        <div className="rounded-md p-2 text-center" style={{ backgroundColor: "#0d1825" }}>
          <div className="text-xs font-bold" style={{ color: yieldSpread > 0 ? "#F5A94A" : "#f06040" }}>
            {yieldSpread > 0 ? "+" : ""}{yieldSpread.toFixed(1)}pp
          </div>
          <div className="text-xs" style={{ color: "#3d5a72" }}>spread</div>
        </div>
      </div>

      {isSubmitted ? (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#F5A94A" }} />
          <span className="text-xs font-medium" style={{ color: "#F5A94A" }}>Arca managing negotiation</span>
        </div>
      ) : deal.status === "loi" && (
        <button
          onClick={e => { e.stopPropagation(); onSubmitOffer(deal.id); }}
          className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
        >
          Submit Offer
        </button>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function ScoutPage() {
  const { portfolioId } = useNav();
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [selectedDeal, setSelectedDeal] = useState<AcquisitionDeal | null>(null);
  const loading = useLoading(450, portfolioId);

  const currencyFilter = portfolioId === "fl-mixed" ? "USD" : "GBP";
  const sym = portfolioId === "fl-mixed" ? "$" : "£";

  const allDeals = acquisitionPipeline;
  const portfolioDeals = allDeals.filter(d => d.currency === currencyFilter);
  const otherDeals = allDeals.filter(d => d.currency !== currencyFilter);

  const activeDeals = portfolioDeals.filter(d => d.status !== "passed" && !passedIds.has(d.id));
  const avgScore = activeDeals.length ? Math.round(activeDeals.reduce((s, d) => s + d.score, 0) / activeDeals.length) : 0;
  const totalAskingValue = activeDeals.reduce((s, d) => s + d.askingPrice, 0);
  const loiCount = portfolioDeals.filter(d => d.status === "loi" && !passedIds.has(d.id)).length + submittedIds.size;

  const handlePass = (id: string) => {
    setPassedIds(prev => new Set([...prev, id]));
    setSelectedDeal(null);
  };

  const handleSubmitOffer = (id: string) => {
    setSubmittedIds(prev => new Set([...prev, id]));
  };

  return (
    <AppShell>
      <TopBar title="AI Scout" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="AI Scout — Acquisitions Pipeline"
            cells={[
              { label: "Active Pipeline", value: `${activeDeals.length}`, sub: `${otherDeals.filter(d => d.status !== "passed").length} cross-portfolio` },
              { label: "At LOI", value: `${loiCount}`, valueColor: loiCount > 0 ? "#F5A94A" : "#fff", sub: "Offers in progress" },
              { label: "Avg Deal Score", value: `${avgScore}/100`, valueColor: avgScore >= 75 ? "#5BF0AC" : avgScore >= 60 ? "#F5A94A" : "#FF8080", sub: avgScore >= 75 ? "Strong pipeline" : "Mixed quality" },
              { label: "Total Ask", value: fmt(totalAskingValue, sym), valueColor: "#5BF0AC", sub: `${activeDeals.length} active deals` },
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
              <span style={{ color: "#1647E8", fontWeight: 600 }}>Issue:</span>{" "}
              {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} in pipeline requiring analysis and action ·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Opportunity:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(totalAskingValue, sym)}</span> total asking value across active pipeline ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              AI scores every deal, builds underwriting model, manages LOI and negotiation to exchange
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {!loading && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[800px]">
              {STAGES.map(stage => {
                const stageDeals = portfolioDeals.filter(d => d.status === stage.key && !passedIds.has(d.id));
                return (
                  <div key={stage.key} className="flex-1 min-w-[200px]">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: stage.color }}>{stage.label}</span>
                      <span className="text-xs font-medium rounded-full px-2 py-0.5 ml-auto" style={{ backgroundColor: "#111e2e", color: "#5a7a96", border: "1px solid #1a2d45" }}>
                        {stageDeals.length}
                      </span>
                    </div>

                    {/* Connector line */}
                    <div className="h-px mb-3 mx-1" style={{ backgroundColor: stage.color, opacity: 0.3 }} />

                    {/* Cards */}
                    <div className="space-y-3">
                      {stageDeals.length === 0 ? (
                        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#0d1825", border: "1px dashed #1a2d45" }}>
                          <div className="text-xs" style={{ color: "#3d5a72" }}>No deals</div>
                        </div>
                      ) : stageDeals.map(deal => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          sym={sym}
                          passedIds={passedIds}
                          submittedIds={submittedIds}
                          onClick={() => setSelectedDeal(deal)}
                          onPass={handlePass}
                          onSubmitOffer={handleSubmitOffer}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Passed Deals */}
        {!loading && portfolioDeals.filter(d => d.status === "passed" || passedIds.has(d.id)).length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#3d5a72" }}>Passed Deals — Monitoring</div>
            <div className="space-y-1">
              {portfolioDeals.filter(d => d.status === "passed" || passedIds.has(d.id)).map(deal => {
                const dealSym = deal.currency === "USD" ? "$" : "£";
                return (
                  <div key={deal.id} className="flex items-center justify-between text-xs py-1">
                    <span style={{ color: "#5a7a96" }}>{deal.name}</span>
                    <span style={{ color: "#3d5a72" }}>{fmt(deal.askingPrice, dealSym)} · Arca monitoring for price reduction</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cross-portfolio teaser */}
        {!loading && otherDeals.filter(d => d.status !== "passed").length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
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

      {/* Deal Detail Side Panel */}
      {selectedDeal && (
        <DealPanel
          deal={selectedDeal}
          sym={sym}
          passedIds={passedIds}
          submittedIds={submittedIds}
          onClose={() => setSelectedDeal(null)}
          onPass={handlePass}
          onSubmitOffer={handleSubmitOffer}
        />
      )}
    </AppShell>
  );
}

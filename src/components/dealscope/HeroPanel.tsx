"use client";

import s from "./HeroPanel.module.css";
import { VerdictBadge } from "./VerdictBadge";
import { MetricCard } from "./MetricCard";
import { AISummary } from "./AISummary";

/* ── Formatting helpers ── */
function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtMultiple(n: number): string {
  return `${n.toFixed(2)}x`;
}

/* ── Types ── */
export interface HeroPanelProperty {
  address: string;
  assetType?: string;
  buildingSizeSqft?: number;
  yearBuilt?: number;
  epcRating?: string;
  tenure?: string;
  occupancyPct?: number;
  askingPrice?: number;
  guidePrice?: number;
  dealScore?: number;
  signals?: string[];
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  dataSources?: Record<string, any>;
}

interface HeroPanelProps {
  property: HeroPanelProperty;
  watched?: boolean;
  exporting?: string | null;
  onBack?: () => void;
  onExportMemo?: () => void;
  onAddToPipeline?: () => void;
  onWatch?: () => void;
  onContact?: () => void;
  onAddInfo?: () => void;
}

/* ── Verdict color mapping for verdictCell CSS vars ── */
const VERDICT_VARS: Record<
  string,
  { bg: string; border: string }
> = {
  strong_buy: { bg: "rgba(52,211,153,.06)", border: "rgba(52,211,153,.22)" },
  buy:        { bg: "rgba(52,211,153,.06)", border: "rgba(52,211,153,.22)" },
  good:       { bg: "rgba(52,211,153,.06)", border: "rgba(52,211,153,.22)" },
  marginal:   { bg: "rgba(251,191,36,.06)", border: "rgba(251,191,36,.22)" },
  bad:        { bg: "rgba(248,113,113,.06)", border: "rgba(248,113,113,.22)" },
  avoid:      { bg: "rgba(248,113,113,.06)", border: "rgba(248,113,113,.22)" },
};

export function HeroPanel({
  property,
  watched,
  exporting,
  onBack,
  onExportMemo,
  onAddToPipeline,
  onWatch,
  onContact,
  onAddInfo,
}: HeroPanelProps) {
  const ds = property.dataSources ?? {};
  const ra = ds.ricsAnalysis;
  const da = ds.dealAnalysis;
  const verdict = ra?.verdict ?? da?.verdict;
  const returns = ra?.returns ?? da;
  const assumptions = ds.assumptions ?? {};

  /* ── Derive verdict display ── */
  const rating: string = verdict?.rating ?? "";
  const verdictVars = VERDICT_VARS[rating] ?? {
    bg: "rgba(124,106,240,.06)",
    border: "rgba(124,106,240,.2)",
  };
  const verdictTitle: string = verdict?.play ?? verdict?.summary?.split(".")[0] ?? "";
  const verdictSubtitle: string = (() => {
    const tor = verdict?.targetOfferRange;
    if (tor?.low && tor?.high)
      return `Target: ${fmtCurrency(tor.low)} – ${fmtCurrency(tor.high)}`;
    return verdict?.summary ?? "";
  })();

  /* ── Derive AI summary ── */
  const aiSummary: string | null = verdict?.reasoning ?? verdict?.summary ?? null;
  const aiPlay: string | undefined = verdict?.play;

  /* ── Derive metrics ── */
  const askingRaw = property.askingPrice ?? property.guidePrice;
  const niy = returns?.niy != null ? returns.niy : null;
  const irr = returns?.irr != null ? returns.irr : null;
  const em = returns?.equityMultiple != null ? returns.equityMultiple : null;

  // CAPEX: use .total from ricsAnalysis (it's a CAPEXAnalysis object, not a number)
  const capexRaw: number | null =
    ra?.capex?.total ?? assumptions?.capex?.value ?? null;

  const metrics: Array<{
    label: string;
    value: string;
    subtitle?: string;
    color?: "default" | "green" | "amber" | "red";
  }> = [];

  if (askingRaw != null) {
    const psf =
      property.buildingSizeSqft && property.buildingSizeSqft > 0
        ? `£${Math.round(askingRaw / property.buildingSizeSqft)} psf`
        : undefined;
    metrics.push({ label: "Asking Price", value: fmtCurrency(askingRaw), subtitle: psf });
  }
  if (niy != null) {
    metrics.push({
      label: "NIY",
      value: fmtPct(niy),
      color: niy >= 0.07 ? "green" : niy >= 0.05 ? "amber" : "red",
    });
  }
  if (irr != null) {
    metrics.push({
      label: "IRR",
      value: fmtPct(irr),
      color: irr >= 0.15 ? "green" : irr >= 0.10 ? "amber" : "red",
    });
  }
  if (em != null) {
    metrics.push({
      label: "Equity Multiple",
      value: fmtMultiple(em),
      color: em >= 1.8 ? "green" : em >= 1.3 ? "amber" : "red",
    });
  }
  if (capexRaw != null) {
    metrics.push({ label: "CAPEX", value: fmtCurrency(capexRaw) });
  }

  /* ── Meta tags ── */
  const metaTags: string[] = [];
  if (property.assetType) metaTags.push(property.assetType);
  if (property.buildingSizeSqft)
    metaTags.push(`${property.buildingSizeSqft.toLocaleString()} sq ft NLA`);
  if (property.tenure) metaTags.push(property.tenure);
  if (property.occupancyPct != null) {
    const pct = Math.round(property.occupancyPct * 100);
    metaTags.push(pct === 0 ? "100% Vacant" : `${pct}% Occupied`);
  }

  const hasVerdict = !!rating;

  return (
    <div className={s.heroPanel}>
      {/* ── Property header ── */}
      <div className={s.propertyHeader}>
        <div className={s.propertyTitle}>
          <h1>{property.address}</h1>
          {metaTags.length > 0 && (
            <div className={s.propertyMeta}>
              {metaTags.map((tag, i) => (
                <span key={i}>{tag}</span>
              ))}
            </div>
          )}
        </div>
        {onBack && (
          <button className={s.backBtn} onClick={onBack}>
            ← Back to results
          </button>
        )}
      </div>

      {/* ── AI Summary ── */}
      {aiSummary && <AISummary summary={aiSummary} play={aiPlay} />}

      {/* ── Metrics grid ── */}
      {(hasVerdict || metrics.length > 0) && (
        <div className={s.metricsGrid}>
          {/* Verdict card */}
          {hasVerdict && (
            <div
              className={s.verdictCell}
              style={
                {
                  "--verdictBg": verdictVars.bg,
                  "--verdictBorder": verdictVars.border,
                } as React.CSSProperties
              }
            >
              <VerdictBadge
                rating={rating}
                targetOfferRange={verdict?.targetOfferRange}
              />
              {verdictTitle && (
                <p className={s.verdictTitle}>{verdictTitle}</p>
              )}
              {verdictSubtitle && verdictSubtitle !== verdictTitle && (
                <p className={s.verdictSubtitle}>{verdictSubtitle}</p>
              )}
            </div>
          )}

          {/* Metric cards */}
          {metrics.map((m, i) => (
            <MetricCard
              key={i}
              label={m.label}
              value={m.value}
              subtitle={m.subtitle}
              color={m.color}
            />
          ))}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className={s.actionBar}>
        {onExportMemo && (
          <button
            className={`${s.btnPrimary}${exporting === "pdf" ? ` ${s.btnDisabled}` : ""}`}
            onClick={onExportMemo}
            disabled={exporting === "pdf"}
          >
            Export IC Memo
          </button>
        )}
        {onAddToPipeline && (
          <button className={s.btnSecondary} onClick={onAddToPipeline}>
            + Pipeline
          </button>
        )}
        {onWatch && (
          <button
            className={`${s.btnSecondary}${watched ? ` ${s.btnActive}` : ""}`}
            onClick={onWatch}
          >
            {watched ? "Watching" : "Watch"}
          </button>
        )}
        {onContact && (
          <button className={s.btnSecondary} onClick={onContact}>
            Contact Agent
          </button>
        )}
        {onAddInfo && (
          <button className={s.btnSecondary} onClick={onAddInfo}>
            + Add info
          </button>
        )}
      </div>
    </div>
  );
}

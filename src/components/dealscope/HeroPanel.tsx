"use client";

import s from "./HeroPanel.module.css";

/* ── Types ── */
export interface HeroPanelSignal { name: string; type?: string; }

export interface HeroPanelProperty {
  address: string;
  assetType?: string;
  buildingSizeSqft?: number;
  yearBuilt?: number;
  epcRating?: string;
  tenure?: string;
  rateableValue?: number;
  occupancyPct?: number;
  askingPrice?: number;
  guidePrice?: number;
  dealScore?: number;
  temperature?: string;
  signals?: HeroPanelSignal[] | string[];
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  satelliteImageUrl?: string;
  dataSources?: Record<string, unknown>;
}

interface HeroPanelProps {
  property: HeroPanelProperty;
  watched?: boolean;
  exporting?: string | null;
  onBack?: () => void;
  onExportMemo?: () => void;
  onExportXlsx?: () => void;
  onAddToPipeline?: () => void;
  onWatch?: () => void;
  onContact?: () => void;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function sigType(sig: HeroPanelSignal | string): string {
  if (typeof sig === "string") return "amb";
  const t = sig.type ?? "";
  if (t === "distress" || t === "admin") return "red";
  if (t === "opportunity" || t === "mees") return "blu";
  return "amb";
}

function sigName(sig: HeroPanelSignal | string): string {
  return typeof sig === "string" ? sig : sig.name;
}

const THUMBS = ["Street", "Photo 1", "Floor plan", "EPC", "Title"];

export function HeroPanel({
  property: p,
  watched,
  exporting,
  onBack,
  onExportMemo,
  onExportXlsx,
  onAddToPipeline,
  onWatch,
  onContact,
}: HeroPanelProps) {
  const ds = (p.dataSources ?? {}) as Record<string, any>;
  const ra = ds.ricsAnalysis;
  const da = ds.dealAnalysis;
  const verdict = ra?.verdict ?? da?.verdict;
  const returns = ra?.returns ?? da;
  const score = p.dealScore ?? ds.scoring?.total;
  const scoreThreshold = ds.scoring?.threshold ?? da?.threshold;
  const aboveThreshold = score != null && scoreThreshold != null && score >= scoreThreshold;

  const rawSigs: Array<HeroPanelSignal | string> = [
    ...(p.signals ?? []),
    ...(p.hasInsolvency ? [{ name: "Insolvency", type: "distress" } as HeroPanelSignal] : []),
    ...(p.hasLisPendens ? [{ name: "Lis Pendens", type: "distress" } as HeroPanelSignal] : []),
  ];

  const estValLow  = returns?.estimatedValueLow;
  const estValHigh = returns?.estimatedValueHigh;
  const offerLow   = verdict?.targetOfferRange?.low;
  const offerHigh  = verdict?.targetOfferRange?.high;
  const irr        = returns?.irr != null ? `${(returns.irr * 100).toFixed(1)}%` : null;
  const timeline   = returns?.holdYears != null ? `${returns.holdYears}–${returns.holdYears + 1}y` : null;

  // Discount range: from data or calculated from offer vs estimated value
  let discountStr: string | null = null;
  if (returns?.discountLow != null && returns?.discountHigh != null) {
    discountStr = `${Math.round(returns.discountLow * 100)}–${Math.round(returns.discountHigh * 100)}%`;
  } else if (offerLow && offerHigh && estValLow && estValHigh) {
    const dLow  = Math.round((1 - offerHigh / estValHigh) * 100);
    const dHigh = Math.round((1 - offerLow  / estValLow)  * 100);
    if (dLow > 0 && dHigh > 0) discountStr = `${dLow}–${dHigh}%`;
  }

  const profit = returns?.profit ?? returns?.netProfit ?? da?.profit ?? null;

  return (
    <div className={s.dTop}>
      {onBack && <div className={s.dBack} onClick={onBack}>← Back to results</div>}
      <div className={s.dHdr}>

        {/* Gallery */}
        <div className={s.dGallery}>
          <div
            className={s.dHero}
            style={p.satelliteImageUrl ? { backgroundImage: `url(${p.satelliteImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!p.satelliteImageUrl && "Satellite Image"}
            <div className={s.dHeroLbl}>Google Maps</div>
          </div>
          <div className={s.dThumbs}>
            {THUMBS.map(t => (
              <div key={t} className={s.dThumb}>{t}</div>
            ))}
            <div className={s.dThumb} style={{ background: "var(--s3)", color: "var(--tx2)" }}>+3</div>
          </div>
        </div>

        {/* Info */}
        <div className={s.dInfo}>
          <div className={s.dAddr}>{p.address}</div>
          <div className={s.dSpecs}>
            {p.assetType && <span><strong>Type</strong> {p.assetType}</span>}
            {p.buildingSizeSqft && <span><strong>Size</strong> {p.buildingSizeSqft.toLocaleString()} sqft</span>}
            {p.yearBuilt && <span><strong>Built</strong> {p.yearBuilt}</span>}
            {p.epcRating && <span><strong>EPC</strong> {p.epcRating}</span>}
            {p.tenure && <span><strong>Tenure</strong> {p.tenure}</span>}
            {p.rateableValue && <span><strong>RV</strong> £{p.rateableValue.toLocaleString()}</span>}
          </div>
          {rawSigs.length > 0 && (
            <div className={s.dSigs}>
              {rawSigs.map((sig, i) => (
                <span key={i} className={`${s.b} ${s["b-" + sigType(sig)]}`}>{sigName(sig)}</span>
              ))}
            </div>
          )}
          <div className={s.dActs}>
            {onContact && (
              <button className={`${s.btn} ${s.btnP} ${s.btnSm}`} onClick={onContact}>Approach Owner</button>
            )}
            {onAddToPipeline && (
              <button className={`${s.btn} ${s.btnG} ${s.btnSm}`} onClick={onAddToPipeline}>+ Pipeline</button>
            )}
            {onWatch && (
              <button className={`${s.btn} ${s.btnS} ${s.btnSm} ${watched ? s.btnWatched : ""}`} onClick={onWatch}>
                {watched ? "Watching" : "Watch"}
              </button>
            )}
            {onExportMemo && (
              <button className={`${s.btn} ${s.btnS} ${s.btnSm}`} onClick={onExportMemo} disabled={exporting === "pdf"}>
                {exporting === "pdf" ? "Exporting…" : "Export PDF"}
              </button>
            )}
            {onExportXlsx && (
              <button className={`${s.btn} ${s.btnS} ${s.btnSm}`} onClick={onExportXlsx} disabled={exporting === "xlsx"}>
                {exporting === "xlsx" ? "Exporting…" : "Download .xlsx"}
              </button>
            )}
          </div>
        </div>

        {/* Deal summary */}
        <div className={s.dSum}>
          {score != null && (
            <div className={s.scoreRow}>
              <div className={s.dSc}>{typeof score === "number" ? score.toFixed(1) : score}</div>
              <div>
                <div className={s.scoreLabel}>Opportunity score</div>
                {aboveThreshold && <div className={s.scoreHint}>Above your {scoreThreshold} threshold</div>}
                {!aboveThreshold && p.temperature && <div className={s.scoreHint}>{p.temperature}</div>}
              </div>
            </div>
          )}
          {estValLow && estValHigh && (
            <div className={s.dr}><span className={s.drL}>Est. value</span><span className={s.drV}>{fmt(estValLow)}–{fmt(estValHigh)}</span></div>
          )}
          {offerLow && offerHigh && (
            <div className={s.dr}><span className={s.drL}>Target offer</span><span className={`${s.drV} ${s.g}`}>{fmt(offerLow)}–{fmt(offerHigh)}</span></div>
          )}
          {!offerLow && (p.askingPrice ?? p.guidePrice) && (
            <div className={s.dr}><span className={s.drL}>{p.askingPrice ? "Asking price" : "Guide price"}</span><span className={s.drV}>{fmt((p.askingPrice ?? p.guidePrice)!)}</span></div>
          )}
          {discountStr && (
            <div className={s.dr}><span className={s.drL}>Discount</span><span className={s.drV}>{discountStr}</span></div>
          )}
          {(irr || profit != null) && <div className={s.sep} />}
          {profit != null && (
            <div className={s.dr}><span className={s.drL}>Profit</span><span className={`${s.drV} ${s.g}`}>{profit >= 0 ? "+" : ""}{fmt(profit)}</span></div>
          )}
          {irr && (
            <div className={s.dr}><span className={s.drL}>IRR</span><span className={`${s.drV} ${s.g}`}>{irr}</span></div>
          )}
          {timeline && (
            <div className={s.dr}><span className={s.drL}>Timeline</span><span className={s.drV}>{timeline}</span></div>
          )}
        </div>

      </div>
    </div>
  );
}

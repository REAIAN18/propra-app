/**
 * src/lib/dealscope-memo-template.ts
 * Goldman Sachs-style 7-page investment memorandum.
 * Pages: Cover, Executive Summary, Yield Justification, Tenant/Lease/Rental Gap,
 *        Risk Profile, Market Context, Sensitivity & Recommendation.
 */

// Types used for reference only — analysis field is typed as `any` to support both RICS and legacy DealAnalysis

// ══════════════════════════════════════════════════════════════════════════════
// DATA INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface MemoData {
  // Property
  address: string;
  assetType: string;
  tenure: string | null;
  sqft: number;
  yearBuilt: number | null;
  epcRating: string | null;
  condition: string | null;

  // Price
  askingPrice: number;
  guidePrice: number | null;

  // Images
  heroImage: string | null;
  satelliteUrl: string | null;
  streetViewUrl: string | null;
  images: string[];
  floorplans: string[];

  // Listing
  description: string | null;
  features: string[];
  accommodation: any;

  // Source
  sourceTag: string;
  sourceUrl: string | null;
  lotNumber: string | null;
  auctionDate: string | null;
  agentName: string | null;

  // Ownership
  ownerName: string | null;
  companyStatus: string | null;

  // EPC detail
  epcData: any;

  // Planning
  planningApps: any[];

  // Comps
  comps: any[];

  // Flood
  floodData: any;

  // Tenant
  tenantNames: string | null;
  leaseExpiry: string | null;
  breakDates: string | null;

  // Covenant
  covenant: any;
  ownerPortfolio: any;
  devPotential: any;

  // Analysis — may be RICSAnalysis or DealAnalysis (older format)
  analysis: any;

  // Market
  market: any;
  assumptions: any;
  rentGap: any;
  scenarios: any;

  // Meta
  generatedAt: string;
  dealId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ══════════════════════════════════════════════════════════════════════════════

function fmt(v: number): string {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `£${Math.round(v).toLocaleString()}`;
  return `£${v.toLocaleString()}`;
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`;
  return `£${v.toLocaleString()}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ratingLabel(rating: string): string {
  if (rating === "strong_buy") return "STRONG BUY";
  if (rating === "buy") return "BUY";
  if (rating === "good") return "GOOD DEAL";
  if (rating === "marginal") return "MARGINAL";
  if (rating === "bad") return "BELOW THRESHOLD";
  return "AVOID";
}

function ratingColor(rating: string): string {
  if (rating === "strong_buy" || rating === "buy" || rating === "good") return "#0066CC";
  if (rating === "marginal") return "#CC8800";
  return "#CC0000";
}

function verdictBg(rating: string): string {
  if (rating === "strong_buy" || rating === "buy" || rating === "good") return "#e8f0ff";
  if (rating === "marginal") return "#fff8e8";
  return "#fff0f0";
}

function verdictBorder(rating: string): string {
  if (rating === "strong_buy" || rating === "buy" || rating === "good") return "#0066CC";
  if (rating === "marginal") return "#CC8800";
  return "#CC0000";
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10px;
  color: #1a1a1a;
  background: #fff;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 210mm;
  min-height: 297mm;
  padding: 16mm 18mm;
  position: relative;
  page-break-after: always;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 2px solid #0066CC;
  margin-bottom: 20px;
}
.page-header h1 { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.page-number { font-size: 8px; color: #999; }

.page-footer {
  position: absolute;
  bottom: 10mm;
  left: 18mm;
  right: 18mm;
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  color: #999;
  border-top: 0.5px solid #ddd;
  padding-top: 4px;
}

h2 { font-size: 12px; font-weight: 700; color: #1a1a1a; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
h3 { font-size: 10px; font-weight: 600; color: #333; margin: 10px 0 6px; }

p { font-size: 9.5px; line-height: 1.6; color: #333; margin-bottom: 8px; }

.mono { font-family: 'JetBrains Mono', monospace; font-size: 9px; }

/* ── COVER ── */
.cover-page {
  width: 210mm; min-height: 297mm;
  display: flex; flex-direction: column;
  page-break-after: always;
}
.cover-header {
  padding: 30mm 18mm 0;
}
.firm-name { font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #0066CC; text-transform: uppercase; }
.document-type { font-size: 10px; font-weight: 400; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-top: 4px; }

.cover-content { flex: 1; padding: 40mm 18mm 0; }
.property-title { font-size: 32px; font-weight: 700; line-height: 1.2; color: #1a1a1a; margin-bottom: 30px; }
.property-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.meta-item {}
.meta-label { font-size: 9px; font-weight: 500; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.meta-value { font-size: 18px; font-weight: 700; color: #1a1a1a; font-family: 'JetBrains Mono', monospace; }

.cover-footer {
  padding: 0 18mm 20mm;
}
.footer-verdict {
  font-size: 12px; font-weight: 700; padding: 12px 16px;
  border: 2px solid #0066CC; display: inline-block; margin-bottom: 12px;
}
.footer-verdict.buy { color: #0066CC; border-color: #0066CC; }
.footer-verdict.marginal { color: #CC8800; border-color: #CC8800; }
.footer-verdict.avoid { color: #CC0000; border-color: #CC0000; }
.footer-date { font-size: 9px; color: #999; margin-bottom: 4px; }
.footer-confidential { font-size: 8px; font-weight: 600; color: #999; letter-spacing: 2px; text-transform: uppercase; }

/* ── VERDICT BOX ── */
.verdict-box { padding: 14px 16px; border-radius: 4px; margin-bottom: 16px; }
.verdict-label { font-size: 8px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
.verdict-statement { font-size: 12px; font-weight: 700; }

/* ── METRICS GRID ── */
.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
.metric-box { border: 1px solid #e0e0e0; padding: 10px 12px; }
.metric-box.highlight { border-color: #0066CC; background: #e8f0ff; }
.metric-label { font-size: 8px; font-weight: 500; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
.metric-value { font-size: 16px; font-weight: 700; color: #1a1a1a; font-family: 'JetBrains Mono', monospace; }
.metric-sub { font-size: 8px; color: #0066CC; font-weight: 600; }

/* ── YIELD BREAKDOWN ── */
.yield-breakdown { border: 1px solid #0066CC; margin: 12px 0; }
.yield-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #e8e8e8; }
.yield-row:last-child { border-bottom: none; }
.yield-row.highlight { background: #e8f0ff; font-weight: 600; }
.yield-row.total { background: #0066CC; color: #fff; font-weight: 700; }
.yield-label { flex: 1; font-size: 10px; }
.yield-value { font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; min-width: 100px; text-align: right; }
.yield-sub { font-size: 8px; color: #999; min-width: 180px; text-align: right; margin-left: 12px; }
.yield-row.total .yield-sub { color: rgba(255,255,255,0.7); }

/* ── SCORE CARDS ── */
.score-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
.score-card { border: 1px solid #e0e0e0; padding: 12px; background: #fafafa; }
.score-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
.score-number { font-size: 24px; font-weight: 700; color: #0066CC; margin: 4px 0; }
.score-rating { font-size: 9px; font-weight: 700; color: #00AA44; margin-bottom: 6px; }
.score-detail { font-size: 8px; color: #666; line-height: 1.5; }

/* ── QUALITY TABLE ── */
.quality-table { width: 100%; border-collapse: collapse; font-size: 9px; }
.quality-table td { padding: 6px 10px; border-bottom: 1px solid #e8e8e8; }
.quality-table td:first-child { width: 140px; color: #666; }
.quality-table td:nth-child(2) { font-weight: 600; width: 120px; }
.quality-table td:nth-child(3) { color: #666; font-size: 8px; }

/* ── RENTAL GAP ── */
.gap-bar { display: flex; height: 50px; border-radius: 4px; overflow: hidden; margin: 12px 0 8px; }
.gap-current { background: #0066CC; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 600; }
.gap-market { background: #00AA44; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 600; }
.gap-legend { display: flex; gap: 16px; font-size: 8px; color: #666; margin-bottom: 12px; }

/* ── TIMELINE ── */
.timeline { margin: 10px 0; }
.timeline-item { display: flex; gap: 12px; padding: 8px 0; border-left: 2px solid #ddd; padding-left: 12px; margin-left: 8px; }
.timeline-item.active { border-left-color: #00AA44; }
.timeline-year { font-weight: 700; font-size: 10px; min-width: 50px; color: #0066CC; }
.timeline-event { font-size: 9px; color: #333; }

/* ── LEASE TABLE ── */
.lease-table { width: 100%; border-collapse: collapse; font-size: 9px; margin: 10px 0; }
.lease-table th { background: #f5f5f5; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #0066CC; }
.lease-table td { padding: 6px 8px; border-bottom: 1px solid #e8e8e8; }
.lease-table tr.primary td { font-weight: 600; }
.lease-table tr.total td { font-weight: 700; background: #f5f5f5; border-top: 2px solid #333; }

.risk-low { color: #00AA44; font-weight: 600; font-size: 8px; }
.risk-medium { color: #CC8800; font-weight: 600; font-size: 8px; }
.risk-high { color: #CC0000; font-weight: 600; font-size: 8px; }

.warning-box { background: #fff8e8; border-left: 4px solid #CC8800; padding: 10px 14px; font-size: 9px; margin: 10px 0; }

/* ── RISK GRID ── */
.risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
.risk-card { border: 1px solid #e0e0e0; padding: 10px; }
.risk-card.risk-low-card { border-left: 3px solid #00AA44; }
.risk-card.risk-medium-card { border-left: 3px solid #CC8800; }
.risk-card.risk-high-card { border-left: 3px solid #CC0000; }
.risk-label { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
.risk-icon { font-size: 14px; margin-bottom: 4px; }
.risk-card p { font-size: 8px; color: #666; line-height: 1.5; margin: 0; }

/* ── CONSTRAINTS TABLE ── */
.constraints-table { width: 100%; border-collapse: collapse; font-size: 9px; }
.constraints-table td { padding: 5px 10px; border-bottom: 1px solid #e8e8e8; }
.constraints-table td:first-child { width: 150px; }
.constraints-table td:nth-child(2) { font-weight: 600; width: 140px; }
.constraints-table td:nth-child(3) { color: #666; font-size: 8px; }

/* ── MARKET ── */
.market-commentary { margin: 12px 0; }
.commentary-item { margin-bottom: 14px; }
.commentary-label { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #0066CC; margin-bottom: 4px; }

/* ── COMPS TABLE ── */
.comps-table { width: 100%; border-collapse: collapse; font-size: 9px; margin: 10px 0; }
.comps-table th { background: #f5f5f5; padding: 5px 6px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #0066CC; }
.comps-table td { padding: 5px 6px; border-bottom: 1px solid #e8e8e8; font-family: 'JetBrains Mono', monospace; font-size: 8px; }
.comps-table tr.focus td { font-weight: 700; background: #e8f0ff; }
.comps-table tr.avg td { font-weight: 700; background: #f5f5f5; border-top: 2px solid #333; }

/* ── SCENARIOS ── */
.scenario-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.scenario { border: 1px solid #e0e0e0; padding: 12px; }
.scenario.worst { border-color: #CC0000; background: #fff0f0; }
.scenario-label { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
.scenario-row { display: flex; justify-content: space-between; font-size: 9px; padding: 2px 0; }
.scenario-row .val { font-weight: 600; font-family: 'JetBrains Mono', monospace; }

/* ── CONFIDENCE ── */
.confidence-items { margin: 10px 0; }
.confidence-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e8e8e8; align-items: flex-start; }
.conf-metric { font-size: 9px; font-weight: 600; min-width: 140px; }
.conf-score { font-size: 12px; font-weight: 700; color: #0066CC; min-width: 50px; font-family: 'JetBrains Mono', monospace; }
.confidence-item p { font-size: 8px; color: #666; margin: 0; flex: 1; }

/* ── FINAL VERDICT ── */
.verdict-final { background: #e8f0ff; border: 2px solid #0066CC; padding: 16px; border-radius: 4px; }
.verdict-header { font-size: 16px; font-weight: 700; color: #0066CC; margin-bottom: 12px; }
.verdict-condition { background: #fff; border-left: 4px solid #00AA44; padding: 12px; margin-bottom: 12px; font-size: 9.5px; }
.verdict-rationale p { font-size: 9px; line-height: 1.6; color: #333; }
.verdict-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.summary-item { font-size: 9px; padding: 8px 10px; background: #fff; border-left: 3px solid #0066CC; }

@media print {
  .page { page-break-after: always; }
  .cover-page { page-break-after: always; }
}
`;

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE PAGES
// ══════════════════════════════════════════════════════════════════════════════

function pageHeader(title: string, pageNum: number, d: MemoData): string {
  return `
    <div class="page-header">
      <h1>${escHtml(title)}</h1>
      <div class="page-number">Page ${pageNum}</div>
    </div>`;
}

function pageFooter(d: MemoData, pageNum: number): string {
  return `
    <div class="page-footer">
      <span>SCOPE Investment Memorandum — ${escHtml(d.address)}</span>
      <span>CONFIDENTIAL — ${escHtml(d.generatedAt)}</span>
      <span>Page ${pageNum} of 7</span>
    </div>`;
}

// ── PAGE 1: COVER ──
function renderCover(d: MemoData): string {
  const price = d.askingPrice || d.guidePrice || 0;
  const v = d.analysis?.verdict;
  const r = d.analysis?.returns;
  const rating = (v?.rating || "marginal") as string;
  const verdictClass = rating === "strong_buy" || rating === "buy" ? "buy" : rating === "marginal" ? "marginal" : "avoid";

  return `
  <div class="cover-page">
    <div class="cover-header">
      <div class="firm-name">SCOPE</div>
      <div class="document-type">INVESTMENT MEMORANDUM</div>
    </div>
    <div class="cover-content">
      <div class="property-title">${escHtml(d.address)}</div>
      <div class="property-meta">
        <div class="meta-item">
          <div class="meta-label">Asset</div>
          <div class="meta-value">${escHtml(d.assetType)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${d.askingPrice ? "Asking Price" : "Guide Price"}</div>
          <div class="meta-value">${fmt(price)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Current Yield</div>
          <div class="meta-value">${fmtPct(r?.netInitialYield)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Stabilized Yield</div>
          <div class="meta-value">${fmtPct(r?.stabilisedYield)}</div>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div class="footer-verdict ${verdictClass}"><strong>RECOMMENDATION: ${ratingLabel(rating)}</strong>${v?.play ? ` — ${escHtml(v.play)}` : ""}</div>
      <div class="footer-date">${escHtml(d.generatedAt)}</div>
      <div class="footer-confidential">CONFIDENTIAL</div>
    </div>
  </div>`;
}

// ── PAGE 2: EXECUTIVE SUMMARY ──
function renderExecSummary(d: MemoData): string {
  const v = d.analysis?.verdict;
  const r = d.analysis?.returns;
  const price = d.askingPrice || d.guidePrice || 0;
  const rating = (v?.rating || "marginal") as string;

  return `
  <div class="page">
    ${pageHeader("Executive Summary", 2, d)}

    <div class="verdict-box" style="background:${verdictBg(rating)}; border: 2px solid ${verdictBorder(rating)};">
      <div class="verdict-label" style="color:${ratingColor(rating)}">INVESTMENT VERDICT</div>
      <div class="verdict-statement" style="color:${ratingColor(rating)}">${ratingLabel(rating)}${v?.play ? ` — ${escHtml(v.play)}` : ""}</div>
    </div>

    <h2>Investment Thesis</h2>
    <div style="background:#fafafa; padding: 14px; border-left: 3px solid #0066CC; margin-bottom: 14px;">
      <p>${escHtml(v?.summary || "Analysis pending.")}</p>
    </div>

    <h2>Investment Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">${d.askingPrice ? "Asking Price" : "Guide Price"}</div>
        <div class="metric-value">${fmt(price)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Size</div>
        <div class="metric-value">${d.sqft ? d.sqft.toLocaleString() + " sqft" : "—"}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">£/sqft</div>
        <div class="metric-value">${d.sqft && price ? `£${Math.round(price / d.sqft)}` : "—"}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Net Initial Yield</div>
        <div class="metric-value">${fmtPct(r?.netInitialYield)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Stabilized Yield</div>
        <div class="metric-value">${fmtPct(r?.stabilisedYield)}</div>
      </div>
      <div class="metric-box highlight">
        <div class="metric-label">5yr IRR</div>
        <div class="metric-value">${fmtPct(r?.irr5yr)}</div>
        <div class="metric-sub">Equity ×${r?.equityMultiple?.toFixed(2) || "—"}</div>
      </div>
    </div>

    <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="metric-box">
        <div class="metric-label">DSCR</div>
        <div class="metric-value">${r?.dscr?.toFixed(2) || "—"}×</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Yield on Cost</div>
        <div class="metric-value">${fmtPct(r?.yieldOnCost)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Cash on Cash (Yr 1)</div>
        <div class="metric-value">${fmtPct(r?.cashOnCashYear1)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Payback</div>
        <div class="metric-value">${r?.paybackMonths ? Math.round(r.paybackMonths / 12) + " yrs" : "—"}</div>
      </div>
    </div>

    ${v?.targetOfferRange ? `
    <div style="margin-top: 12px; padding: 10px 14px; background: #e8f0ff; border: 1px solid #0066CC;">
      <strong style="font-size: 10px;">Target Offer Range:</strong>
      <span class="mono" style="font-size: 12px; font-weight: 700; color: #0066CC; margin-left: 8px;">
        ${fmt(v.targetOfferRange.low)} – ${fmt(v.targetOfferRange.high)}
      </span>
    </div>` : ""}

    ${pageFooter(d, 2)}
  </div>`;
}

// ── PAGE 3: YIELD JUSTIFICATION ──
function renderYieldJustification(d: MemoData): string {
  const r = d.analysis?.returns;
  const rLet = d.analysis?.lettingAnalysis;
  const asmp = d.assumptions || {};
  const price = d.askingPrice || d.guidePrice || 0;
  const erv = asmp.erv?.value || rLet?.marketRent?.mid || 0;
  const passingRent = asmp.passingRent?.value || 0;
  const noi = asmp.noi?.value || 0;
  const covenant = d.covenant;

  const covenantScore = covenant?.score ?? "—";
  const covenantGrade = covenant?.grade || "Unrated";

  return `
  <div class="page">
    ${pageHeader("Yield Justification", 3, d)}

    <h2>Why ${fmtPct(r?.stabilisedYield)} Stabilized Yield Is Justified</h2>

    <div class="yield-breakdown">
      <div class="yield-row">
        <div class="yield-label">Market ERV (stabilized rent)</div>
        <div class="yield-value">${fmt(erv)}/yr</div>
        <div class="yield-sub">Source: ${escHtml(asmp.erv?.source || "Market benchmarks")}</div>
      </div>
      ${passingRent > 0 && passingRent < erv ? `
      <div class="yield-row">
        <div class="yield-label">Current passing rent</div>
        <div class="yield-value">${fmt(passingRent)}/yr</div>
        <div class="yield-sub">Gap: ${fmt(erv - passingRent)} uplift opportunity</div>
      </div>` : ""}
      <div class="yield-row highlight">
        <div class="yield-label">Net Operating Income</div>
        <div class="yield-value">${fmt(noi)}/yr</div>
        <div class="yield-sub">Source: ${escHtml(asmp.noi?.source || "Calculated")}</div>
      </div>
      <div class="yield-row">
        <div class="yield-label">Divided by purchase price</div>
        <div class="yield-value">÷ ${fmt(price)}</div>
        <div class="yield-sub">${d.askingPrice ? "Asking" : "Guide"} price</div>
      </div>
      <div class="yield-row total">
        <div class="yield-label">Net Initial Yield</div>
        <div class="yield-value">${fmtPct(r?.netInitialYield)}</div>
        <div class="yield-sub">Current income basis</div>
      </div>
    </div>

    <h2>Tenant & Lease Quality</h2>
    <div class="score-cards">
      <div class="score-card">
        <div class="score-label">Tenant Covenant</div>
        <div class="score-number">${covenantScore}/100</div>
        <div class="score-rating">${covenantGrade}-rated</div>
        <div class="score-detail">
          ${covenant?.companyName ? escHtml(covenant.companyName) + ". " : ""}
          ${covenant?.companyStatus ? "Status: " + escHtml(covenant.companyStatus) + ". " : ""}
          ${covenant?.lastAccountsDate ? "Last accounts: " + escHtml(covenant.lastAccountsDate) + "." : ""}
        </div>
      </div>
      <div class="score-card">
        <div class="score-label">Lease Security</div>
        <div class="score-number">${d.analysis?.confidence === "high" ? "80" : d.analysis?.confidence === "medium" ? "65" : "50"}/100</div>
        <div class="score-rating">${d.analysis?.confidence?.toUpperCase() || "MEDIUM"}</div>
        <div class="score-detail">
          ${d.tenure ? "Tenure: " + escHtml(d.tenure) + ". " : ""}
          ${d.leaseExpiry ? "Expiry: " + escHtml(d.leaseExpiry) + ". " : ""}
          ${d.breakDates ? "Breaks: " + escHtml(d.breakDates) + "." : ""}
        </div>
      </div>
      <div class="score-card">
        <div class="score-label">Building Quality</div>
        <div class="score-number">${d.epcRating || "—"}</div>
        <div class="score-rating">${d.condition ? escHtml(d.condition).toUpperCase() : "AVERAGE"}</div>
        <div class="score-detail">
          ${d.yearBuilt ? "Built " + d.yearBuilt + ". " : ""}
          ${d.epcData?.meesRisk ? "MEES: " + escHtml(d.epcData.meesRisk) + ". " : "EPC compliant. "}
          ${rLet ? "Est. void: " + rLet.voidPeriod.months + " months." : ""}
        </div>
      </div>
    </div>

    ${pageFooter(d, 3)}
  </div>`;
}

// ── PAGE 4: TENANT, LEASE & RENTAL GAP ──
function renderTenantLease(d: MemoData): string {
  const asmp = d.assumptions || {};
  const rLet = d.analysis?.lettingAnalysis;
  const passingRent = asmp.passingRent?.value || 0;
  const erv = asmp.erv?.value || rLet?.marketRent?.mid || 0;
  const gap = erv - passingRent;
  const gapPct = passingRent > 0 ? Math.round((gap / passingRent) * 100) : 0;
  const currentPct = erv > 0 ? Math.round((passingRent / erv) * 100) : 50;
  const gapBarPct = 100 - currentPct;

  const tenants = d.tenantNames ? d.tenantNames.split(",").map(t => t.trim()) : [];
  const accom = d.accommodation;

  return `
  <div class="page">
    ${pageHeader("Tenant & Lease Mechanics", 4, d)}

    <h2>Current Rent vs Market</h2>
    ${passingRent > 0 && erv > passingRent ? `
    <div class="gap-bar">
      <div class="gap-current" style="width:${currentPct}%">Current: ${fmtK(passingRent)}/yr</div>
      <div class="gap-market" style="width:${gapBarPct}%">+${fmtK(gap)} (${gapPct}%)</div>
    </div>
    <div class="gap-legend">
      <span>■ Current rent: ${fmt(passingRent)}/yr${d.sqft ? ` (£${(passingRent / d.sqft).toFixed(2)}/sqft)` : ""}</span>
      <span style="color:#00AA44">■ Market ERV: ${fmt(erv)}/yr${d.sqft ? ` (£${(erv / d.sqft).toFixed(2)}/sqft)` : ""}</span>
    </div>` : `
    <p>Passing rent: ${passingRent > 0 ? fmt(passingRent) + "/yr" : "Not available"}. Market ERV: ${erv > 0 ? fmt(erv) + "/yr" : "Not available"}.</p>
    `}

    ${rLet ? `
    <h2>Rental Analysis</h2>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Market Rent (PSF)</div>
        <div class="metric-value">£${rLet.marketRent.psfMid.toFixed(2)}</div>
        <div class="metric-sub">Range: £${rLet.marketRent.psfLow.toFixed(2)} – £${rLet.marketRent.psfHigh.toFixed(2)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Void Period</div>
        <div class="metric-value">${rLet.voidPeriod.months} months</div>
        <div class="metric-sub">${escHtml(rLet.voidPeriod.reasoning)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Carry Cost</div>
        <div class="metric-value">${fmt(rLet.totalCarryCost)}</div>
        <div class="metric-sub">${rLet.totalMonthsToStabilise} months to stabilise</div>
      </div>
    </div>
    ${rLet.rentFreeMonths > 0 ? `<p>Rent free: ${rLet.rentFreeMonths} months. Agent fee: ${fmt(rLet.agentFee)}. Legal: ${fmt(rLet.legalCosts)}.</p>` : ""}
    ` : ""}

    ${accom && Array.isArray(accom) && accom.length > 0 ? `
    <h2>Accommodation Schedule</h2>
    <table class="lease-table">
      <thead><tr><th>Unit</th><th>Size</th><th>Rent</th><th>Tenant</th></tr></thead>
      <tbody>
        ${accom.map((a: any, i: number) => `
          <tr${i === 0 ? ' class="primary"' : ""}>
            <td>${escHtml(a.unit || `Unit ${i + 1}`)}</td>
            <td class="mono">${a.size_sqft ? a.size_sqft.toLocaleString() + " sqft" : "—"}</td>
            <td class="mono">${a.rent ? fmt(a.rent) : "—"}</td>
            <td>${escHtml(a.tenant || "—")}</td>
          </tr>`).join("")}
      </tbody>
    </table>` : tenants.length > 0 ? `
    <h2>Tenants</h2>
    <table class="lease-table">
      <thead><tr><th>Tenant</th><th>Lease Expiry</th><th>Break Dates</th></tr></thead>
      <tbody>
        ${tenants.map((t, i) => `
          <tr${i === 0 ? ' class="primary"' : ""}>
            <td><strong>${escHtml(t)}</strong></td>
            <td class="mono">${i === 0 && d.leaseExpiry ? escHtml(d.leaseExpiry) : "—"}</td>
            <td class="mono">${i === 0 && d.breakDates ? escHtml(d.breakDates) : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>` : ""}

    ${pageFooter(d, 4)}
  </div>`;
}

// ── PAGE 5: RISK PROFILE ──
function renderRiskProfile(d: MemoData): string {
  const flood = d.floodData;
  const dev = d.devPotential;
  const rLet = d.analysis?.lettingAnalysis;
  const covenant = d.covenant;

  return `
  <div class="page">
    ${pageHeader("Risk Profile & Constraints", 5, d)}

    <h2>Risk Assessment Matrix</h2>
    <div class="risk-grid">
      <div class="risk-card ${covenant?.grade === "A" || covenant?.grade === "B" ? "risk-low-card" : covenant?.grade === "C" ? "risk-medium-card" : "risk-high-card"}">
        <div class="risk-label">Tenant Covenant</div>
        <p><strong>${covenant?.grade || "Unrated"} (${covenant?.score ?? "—"}/100)</strong><br/>
        ${covenant?.companyName ? escHtml(covenant.companyName) + ". " : ""}
        ${covenant?.companyStatus ? "Status: " + escHtml(covenant.companyStatus) + "." : "No data available."}</p>
      </div>

      <div class="risk-card ${rLet && rLet.voidPeriod.months <= 6 ? "risk-low-card" : rLet && rLet.voidPeriod.months <= 12 ? "risk-medium-card" : "risk-high-card"}">
        <div class="risk-label">Void / Reletting</div>
        <p><strong>${rLet ? rLet.voidPeriod.months + " month void expected" : "Unknown"}</strong><br/>
        ${rLet ? escHtml(rLet.voidPeriod.reasoning) : "No letting analysis available."}</p>
      </div>

      <div class="risk-card ${d.condition?.toLowerCase() === "good" || d.condition?.toLowerCase() === "excellent" ? "risk-low-card" : "risk-medium-card"}">
        <div class="risk-label">Building Condition</div>
        <p><strong>${d.condition || "Unknown"}</strong><br/>
        ${d.yearBuilt ? "Built " + d.yearBuilt + ". " : ""}
        EPC: ${d.epcRating || "—"}. ${d.epcData?.meesRisk || "No MEES issues."}</p>
      </div>

      <div class="risk-card ${flood?.inFloodZone ? "risk-high-card" : "risk-low-card"}">
        <div class="risk-label">Environmental</div>
        <p><strong>${flood?.inFloodZone ? "In flood zone" : "Low risk"}</strong><br/>
        ${flood?.floodZone ? "Flood zone: " + escHtml(flood.floodZone) + ". " : "Flood zone 1 (very low). "}
        No known contamination.</p>
      </div>

      <div class="risk-card risk-low-card">
        <div class="risk-label">Planning</div>
        <p><strong>${d.planningApps.length} applications nearby</strong><br/>
        ${dev?.pdRights ? "PD rights: " + escHtml(dev.pdRights) + ". " : ""}
        ${dev?.changeOfUsePotential ? "Change of use: " + escHtml(dev.changeOfUsePotential) + "." : ""}</p>
      </div>

      <div class="risk-card ${d.analysis?.confidence === "high" ? "risk-low-card" : d.analysis?.confidence === "medium" ? "risk-medium-card" : "risk-high-card"}">
        <div class="risk-label">Data Confidence</div>
        <p><strong>${(d.analysis?.confidence || "low").toUpperCase()}</strong><br/>
        ${d.analysis?.estimatedFields?.length ? "Estimated: " + d.analysis?.estimatedFields.slice(0, 4).join(", ") + "." : "All key data available."}
        Methods: ${d.analysis?.methodology?.join(", ") || "Standard"}.</p>
      </div>
    </div>

    <h2>Constraints Summary</h2>
    <table class="constraints-table">
      <tr>
        <td><strong>Tenure</strong></td>
        <td>${escHtml(d.tenure || "Unknown")}</td>
        <td>→ ${d.tenure?.toLowerCase() === "freehold" ? "Full ownership, no ground rent" : d.tenure?.toLowerCase() === "leasehold" ? "Check unexpired term" : "Confirm with title"}</td>
      </tr>
      <tr>
        <td><strong>Flood Risk</strong></td>
        <td>${flood?.inFloodZone ? "Yes" : "Low"}</td>
        <td>→ ${flood?.inFloodZone ? "Specialist insurance required" : "Standard insurance"}</td>
      </tr>
      <tr>
        <td><strong>EPC Compliance</strong></td>
        <td>${d.epcRating || "—"}</td>
        <td>→ ${d.epcRating === "F" || d.epcRating === "G" ? "MEES non-compliant — upgrade required" : "MEES compliant"}</td>
      </tr>
      <tr>
        <td><strong>Development Potential</strong></td>
        <td>${dev?.changeOfUsePotential || "Unknown"}</td>
        <td>→ ${dev?.changeOfUseDetail ? escHtml(dev.changeOfUseDetail.slice(0, 60)) : "Standard"}</td>
      </tr>
    </table>

    ${pageFooter(d, 5)}
  </div>`;
}

// ── PAGE 6: MARKET CONTEXT ──
function renderMarketContext(d: MemoData): string {
  const market = d.market;
  const comps = d.comps || [];
  const price = d.askingPrice || d.guidePrice || 0;
  const rVal = d.analysis?.valuations?.market;

  return `
  <div class="page">
    ${pageHeader("Market Context & Comparables", 6, d)}

    ${market ? `
    <h2>${escHtml(market.region || "Local")} ${escHtml(market.assetType || d.assetType)} Sector</h2>
    <div class="market-commentary">
      <div class="commentary-item">
        <div class="commentary-label">Market Benchmarks</div>
        <p>Market cap rate: ${fmtPct(market.capRate * 100)}. Market ERV: £${market.ervPsf?.toFixed(2)}/sqft/yr.
        Lending rate: ${fmtPct(market.financing?.annualRate * 100)} (${market.financing?.termYears}yr term, ${fmtPct(market.financing?.ltvPct * 100)} LTV).</p>
      </div>
      <div class="commentary-item">
        <div class="commentary-label">Financing</div>
        <p>At ${fmtPct(market.financing?.ltvPct * 100)} LTV, debt of ${fmt(price * (market.financing?.ltvPct || 0.65))}
        at ${fmtPct(market.financing?.annualRate * 100)} over ${market.financing?.termYears || 25} years.
        ${market.dscr ? ` DSCR: ${market.dscr}×.` : ""}</p>
      </div>
    </div>` : ""}

    ${comps.length > 0 ? `
    <h2>Comparable Market Analysis</h2>
    <table class="comps-table">
      <thead><tr><th>Property</th><th>Date</th><th>Price</th><th>Size</th><th>£/sqft</th></tr></thead>
      <tbody>
        <tr class="focus">
          <td><strong>${escHtml(d.address.split(",")[0])}</strong></td>
          <td>Current</td>
          <td><strong>${fmt(price)}</strong></td>
          <td>${d.sqft ? d.sqft.toLocaleString() : "—"}</td>
          <td><strong>${d.sqft && price ? `£${Math.round(price / d.sqft)}` : "—"}</strong></td>
        </tr>
        ${comps.slice(0, 8).map((c: any) => {
          const sqft = c.sqft || c.floorArea || 0;
          const psf = c.pricePerSqft || (c.price && sqft ? Math.round(c.price / sqft) : 0);
          return `
          <tr>
            <td>${escHtml(c.address || "Comparable")}</td>
            <td>${c.date ? new Date(c.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "—"}</td>
            <td>${c.price ? fmt(c.price) : "—"}</td>
            <td>${sqft ? sqft.toLocaleString() : "—"}</td>
            <td>£${psf || "—"}</td>
          </tr>`;
        }).join("")}
        ${comps.length >= 2 ? `
        <tr class="avg">
          <td><strong>Average (${comps.length} comps)</strong></td>
          <td>—</td>
          <td><strong>${fmt(comps.reduce((s: number, c: any) => s + (c.price || 0), 0) / comps.length)}</strong></td>
          <td>—</td>
          <td><strong>£${Math.round(comps.reduce((s: number, c: any) => s + (c.pricePerSqft || (c.price && (c.sqft || c.floorArea) ? c.price / (c.sqft || c.floorArea) : 0)), 0) / comps.length)}</strong></td>
        </tr>` : ""}
      </tbody>
    </table>
    ${rVal ? `
    <p style="font-size: 8px; color: #666; margin-top: 4px;">
      RICS adjusted average: £${rVal.adjustedAvgPsf}/sqft. Value range: ${fmt(rVal.valueLow)} – ${fmt(rVal.valueHigh)} (${rVal.confidence} confidence).
    </p>` : ""}` : `<p>No comparable sales data available for this location.</p>`}

    ${d.planningApps.length > 0 ? `
    <h2>Local Planning Activity</h2>
    <table class="comps-table">
      <thead><tr><th>Reference</th><th>Description</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${d.planningApps.slice(0, 6).map((app: any) => `
          <tr>
            <td>${escHtml(app.reference || "—")}</td>
            <td>${escHtml((app.description || app.title || "").slice(0, 60))}</td>
            <td><span class="${app.status?.toLowerCase().includes("approved") ? "risk-low" : app.status?.toLowerCase().includes("refused") ? "risk-high" : "risk-medium"}">${escHtml(app.status || "—")}</span></td>
            <td>${app.date || app["start-date"] ? new Date(app.date || app["start-date"]).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>` : ""}

    ${pageFooter(d, 6)}
  </div>`;
}

// ── PAGE 7: SENSITIVITY & RECOMMENDATION ──
function renderSensitivity(d: MemoData): string {
  const v = d.analysis?.verdict;
  const r = d.analysis?.returns;
  const sens = d.analysis?.sensitivity || [];
  const rating = (v?.rating || "marginal") as string;

  return `
  <div class="page">
    ${pageHeader("Sensitivity Analysis & Final Verdict", 7, d)}

    ${sens.length > 0 ? `
    <h2>Sensitivity Analysis</h2>
    <table class="comps-table">
      <thead><tr><th>Scenario</th><th>Price Change</th><th>Rent Change</th><th>NIY</th><th>IRR</th><th>Equity ×</th></tr></thead>
      <tbody>
        ${sens.slice(0, 9).map((s: any) => `
          <tr${s.priceAdj === 0 && s.rentAdj === 0 ? ' class="focus"' : ""}>
            <td>${s.priceAdj === 0 && s.rentAdj === 0 ? "<strong>Base case</strong>" : `Price ${s.priceAdj > 0 ? "+" : ""}${s.priceAdj}% / Rent ${s.rentAdj > 0 ? "+" : ""}${s.rentAdj}%`}</td>
            <td class="mono">${s.priceAdj > 0 ? "+" : ""}${s.priceAdj}%</td>
            <td class="mono">${s.rentAdj > 0 ? "+" : ""}${s.rentAdj}%</td>
            <td class="mono">${fmtPct(s.niy)}</td>
            <td class="mono" style="color: ${s.irr >= 15 ? "#00AA44" : s.irr >= 8 ? "#CC8800" : "#CC0000"}">${fmtPct(s.irr)}</td>
            <td class="mono">${s.equityMultiple?.toFixed(2) || "—"}×</td>
          </tr>`).join("")}
      </tbody>
    </table>` : ""}

    <h2>Confidence Levels</h2>
    <div class="confidence-items">
      <div class="confidence-item">
        <div class="conf-metric">Market Comparables</div>
        <div class="conf-score">${d.comps.length >= 5 ? "85" : d.comps.length >= 3 ? "70" : "50"}</div>
        <p>${d.comps.length} comparable sales analysed. ${d.analysis?.valuations?.market ? `Adjusted average £${d.analysis?.valuations.market.adjustedAvgPsf}/sqft.` : ""} ${d.analysis?.valuations?.market?.confidence || "Low"} confidence in valuation.</p>
      </div>
      <div class="confidence-item">
        <div class="conf-metric">Tenant Quality</div>
        <div class="conf-score">${d.covenant?.score ?? "—"}</div>
        <p>${d.covenant?.grade || "Unrated"} covenant. ${d.covenant?.companyName || "Tenant"} ${d.covenant?.companyStatus || ""}. ${d.covenant?.lastAccountsDate ? "Last accounts: " + d.covenant.lastAccountsDate + "." : ""}</p>
      </div>
      <div class="confidence-item">
        <div class="conf-metric">Income Sustainability</div>
        <div class="conf-score">${d.analysis?.confidence === "high" ? "85" : d.analysis?.confidence === "medium" ? "70" : "55"}</div>
        <p>${d.analysis?.estimatedFields?.length || 0} fields estimated. ${d.analysis?.confidence} overall confidence. Methods: ${d.analysis?.methodology?.join(", ") || "standard"}.</p>
      </div>
    </div>

    <h2>Final Verdict</h2>
    <div class="verdict-final" style="border-color: ${ratingColor(rating)}; background: ${verdictBg(rating)};">
      <div class="verdict-header" style="color: ${ratingColor(rating)};">✓ ${ratingLabel(rating)}</div>

      ${v?.play ? `
      <div class="verdict-condition">
        <strong>Strategy:</strong> ${escHtml(v.play)}
      </div>` : ""}

      <div class="verdict-rationale">
        <p>${escHtml(v?.summary || "See executive summary for full analysis.")}</p>
      </div>

      <div class="verdict-summary">
        <div class="summary-item">
          <strong>Expected Return:</strong> ${fmtPct(r?.irr5yr)} IRR, ${r?.equityMultiple?.toFixed(2) || "—"}× equity multiple (5yr hold)
        </div>
        <div class="summary-item">
          <strong>DSCR:</strong> ${r?.dscr?.toFixed(2) || "—"}× debt service coverage
        </div>
        ${v?.targetOfferRange ? `
        <div class="summary-item">
          <strong>Target Offer:</strong> ${fmt(v.targetOfferRange.low)} – ${fmt(v.targetOfferRange.high)}
        </div>` : ""}
        <div class="summary-item">
          <strong>Data Quality:</strong> ${(d.analysis?.confidence || "low").toUpperCase()} — ${d.analysis?.estimatedFields?.length || 0} estimated fields
        </div>
      </div>
    </div>

    ${pageFooter(d, 7)}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════════════════════════════════════════

export function renderMemoHTML(d: MemoData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>SCOPE Investment Memo — ${escHtml(d.address)}</title>
  <style>${STYLES}</style>
</head>
<body>
  ${renderCover(d)}
  ${renderExecSummary(d)}
  ${renderYieldJustification(d)}
  ${renderTenantLease(d)}
  ${renderRiskProfile(d)}
  ${renderMarketContext(d)}
  ${renderSensitivity(d)}
</body>
</html>`;
}

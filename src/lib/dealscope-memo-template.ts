/**
 * src/lib/dealscope-memo-template.ts
 * Professional acquisition memorandum template for PDF export.
 * Generates 15+ page HTML document branded with DealScope/RealHQ.
 * Renders via Puppeteer → A4 PDF.
 */

import type { RICSAnalysis, DCFYear, SensitivityRow, CompAdjustment, EPCMeasure } from "./dealscope-deal-analysis";

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
  accommodation: string | null;

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

  // Analysis
  analysis: RICSAnalysis;

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

function ratingColor(rating: string): string {
  if (rating === "strong_buy" || rating === "buy" || rating === "good") return "#34d399";
  if (rating === "marginal") return "#fbbf24";
  return "#f87171";
}

function ratingLabel(rating: string): string {
  if (rating === "strong_buy") return "STRONG BUY";
  if (rating === "buy") return "BUY";
  if (rating === "marginal") return "MARGINAL";
  return "AVOID";
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  color: #1a1a2e;
  background: #fff;
  line-height: 1.5;
}

.page {
  width: 210mm;
  min-height: 297mm;
  padding: 14mm 16mm;
  position: relative;
  page-break-after: always;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e4ec;
  margin-bottom: 16px;
  font-size: 8px;
  color: #9ca3af;
}

.logo { font-weight: 700; color: #7c6af0; font-size: 10px; }

.page-footer {
  position: absolute;
  bottom: 10mm;
  left: 16mm;
  right: 16mm;
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  color: #9ca3af;
  border-top: 0.5px solid #e4e4ec;
  padding-top: 6px;
}

/* Cover page */
.cover { padding: 0; display: flex; flex-direction: column; }
.cover-hero {
  width: 100%;
  height: 55%;
  background-size: cover;
  background-position: center;
  position: relative;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(9,9,11,0.9) 0%, rgba(9,9,11,0.3) 40%, transparent 70%);
}
.cover-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px;
  color: #fff;
}
.cover-badge {
  display: inline-block;
  background: #7c6af0;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 3px;
  margin-bottom: 12px;
}
.cover-title { font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
.cover-sub { font-size: 13px; opacity: 0.85; }
.cover-bottom {
  padding: 24px 32px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cover-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.cover-metric {
  background: #f8f8fc;
  border: 1px solid #e4e4ec;
  border-radius: 8px;
  padding: 14px 16px;
}
.cover-metric-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; font-weight: 600; margin-bottom: 4px; }
.cover-metric-value { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; color: #1a1a2e; }
.cover-verdict {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.cover-footer { font-size: 9px; color: #9ca3af; }
.cover-confidential { font-size: 8px; color: #f87171; font-weight: 600; margin-top: 8px; }

/* Section titles */
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7c6af0;
  margin-bottom: 10px;
  margin-top: 20px;
  padding-bottom: 4px;
  border-bottom: 2px solid #7c6af0;
  display: inline-block;
}
.section-title:first-of-type { margin-top: 0; }

.subsection-title {
  font-size: 10px;
  font-weight: 700;
  color: #1a1a2e;
  margin-top: 14px;
  margin-bottom: 6px;
}

/* Cards */
.card {
  background: #f8f8fc;
  border: 1px solid #e4e4ec;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  margin-bottom: 10px;
}
th {
  text-align: left;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  font-weight: 600;
  padding: 6px 8px;
  border-bottom: 1px solid #e4e4ec;
}
td {
  padding: 5px 8px;
  border-bottom: 0.5px solid #f0f0f5;
  color: #374151;
}
tr:nth-child(even) td { background: #fafafe; }
.mono { font-family: 'JetBrains Mono', monospace; }
.right { text-align: right; }
.bold { font-weight: 600; }
.green { color: #34d399; }
.red { color: #f87171; }
.amber { color: #fbbf24; }

/* Stats grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.stat-box {
  background: #f8f8fc;
  border: 1px solid #e4e4ec;
  border-radius: 6px;
  padding: 10px 12px;
  text-align: center;
}
.stat-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; font-weight: 600; margin-bottom: 3px; }
.stat-value { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #1a1a2e; }
.stat-sub { font-size: 7px; color: #9ca3af; margin-top: 2px; }

/* Verdict box */
.verdict-box {
  border-radius: 8px;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.verdict-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
.verdict-text { font-size: 10px; line-height: 1.7; color: #1a1a2e; }
.verdict-play { font-size: 9px; color: #374151; margin-top: 8px; font-style: italic; }

/* Image grid */
.img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.img-grid img { width: 100%; height: 100px; object-fit: cover; border-radius: 4px; }

/* Risk table */
.rag-green { background: rgba(52,211,153,.1); color: #059669; }
.rag-amber { background: rgba(251,191,36,.1); color: #d97706; }
.rag-red { background: rgba(248,113,113,.1); color: #dc2626; }

.body-text { font-size: 10px; line-height: 1.7; color: #374151; margin-bottom: 8px; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

@media print { .page { page-break-after: always; } }
`;

// ══════════════════════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════════════════════

export function renderMemoHTML(d: MemoData): string {
  const a = d.analysis;
  const v = a.verdict;
  const vColor = ratingColor(v.rating);
  const vLabel = ratingLabel(v.rating);
  const assetLabel = d.assetType ? d.assetType.charAt(0).toUpperCase() + d.assetType.slice(1) : "Commercial";
  const location = d.address.split(",").slice(-2).join(",").trim() || d.address;

  const pages: string[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 1: COVER
  // ──────────────────────────────────────────────────────────────────────────
  const heroStyle = d.heroImage || d.satelliteUrl
    ? `background-image: url('${d.heroImage || d.satelliteUrl}');`
    : "background: linear-gradient(135deg, #09090b, #18181f);";

  pages.push(`
<div class="page cover">
  <div class="cover-hero" style="${heroStyle}">
    <div class="cover-overlay"></div>
    <div class="cover-content">
      <div class="cover-badge">Acquisition Memorandum</div>
      <div class="cover-title">${escHtml(d.address)}</div>
      <div class="cover-sub">${assetLabel} · ${d.sqft.toLocaleString()} sqft · ${d.tenure || "TBC"}</div>
    </div>
  </div>
  <div class="cover-bottom">
    <div>
      <div class="cover-metrics">
        <div class="cover-metric">
          <div class="cover-metric-label">${d.guidePrice ? "Guide Price" : "Asking Price"}</div>
          <div class="cover-metric-value">${fmt(d.askingPrice)}</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-label">Stabilised Yield</div>
          <div class="cover-metric-value" style="color: ${a.returns.stabilisedYield >= 7 ? "#34d399" : a.returns.stabilisedYield >= 5 ? "#fbbf24" : "#f87171"}">${fmtPct(a.returns.stabilisedYield)}</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-label">IRR (10yr)</div>
          <div class="cover-metric-value">${fmtPct(a.returns.irr10yr)}</div>
        </div>
      </div>
      <div class="cover-verdict" style="background: ${vColor}20; color: ${vColor}; border: 1px solid ${vColor}40;">
        ${vLabel}
      </div>
    </div>
    <div class="cover-footer">
      <div>Prepared by <span class="logo">DealScope · RealHQ</span> · ${d.generatedAt}</div>
      <div class="cover-confidential">Confidential — For intended recipient only</div>
    </div>
  </div>
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 2: EXECUTIVE SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  const opportunities: string[] = [];
  const risks: string[] = [];
  if (a.quickFilter.psfPremiumDiscount < -10) opportunities.push(`${Math.abs(a.quickFilter.psfPremiumDiscount).toFixed(0)}% discount to comparable £/sqft`);
  if (a.returns.stabilisedYield > 7) opportunities.push(`Strong ${a.returns.stabilisedYield.toFixed(1)}% stabilised yield`);
  if (a.capex.epcUpgrade.cost > 0) opportunities.push(`EPC upgrade value uplift (${a.capex.epcUpgrade.currentRating}→${a.capex.epcUpgrade.targetRating})`);
  if (a.lettingAnalysis) opportunities.push("Vacant — letting opportunity");
  if (a.locationGrade.grade === "prime") opportunities.push("Prime location — institutional demand");

  if (a.lettingAnalysis && a.lettingAnalysis.voidPeriod.months > 6) risks.push(`${a.lettingAnalysis.voidPeriod.months} month void period`);
  if (a.returns.dscr < 1.25) risks.push(`Tight debt coverage (${a.returns.dscr.toFixed(2)}×)`);
  if (a.capex.total > d.askingPrice * 0.15) risks.push(`Significant CAPEX (${fmtK(a.capex.total)})`);
  if (d.epcRating && /[FG]/i.test(d.epcRating)) risks.push(`MEES non-compliant (EPC ${d.epcRating})`);

  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Executive Summary</div>

  <div class="verdict-box" style="background: ${vColor}08; border: 1px solid ${vColor}30;">
    <div class="verdict-label" style="color: ${vColor}">${vLabel}</div>
    <div class="verdict-text">${escHtml(v.summary)}</div>
    <div class="verdict-play"><strong>The play:</strong> ${escHtml(v.play)}</div>
  </div>

  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-label">Price</div>
      <div class="stat-value">${fmtK(d.askingPrice)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Size</div>
      <div class="stat-value">${d.sqft.toLocaleString()} sqft</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">NIY</div>
      <div class="stat-value">${fmtPct(a.returns.netInitialYield)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Stab. Yield</div>
      <div class="stat-value" style="color: ${a.returns.stabilisedYield >= 7 ? "#34d399" : "#fbbf24"}">${fmtPct(a.returns.stabilisedYield)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">IRR</div>
      <div class="stat-value">${fmtPct(a.returns.irr10yr)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Equity Multiple</div>
      <div class="stat-value">${a.returns.equityMultiple.toFixed(2)}×</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">DSCR</div>
      <div class="stat-value" style="color: ${a.returns.dscr >= 1.25 ? "#34d399" : a.returns.dscr >= 1.0 ? "#fbbf24" : "#f87171"}">${a.returns.dscr.toFixed(2)}×</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Offer Range</div>
      <div class="stat-value" style="font-size:11px">${fmtK(v.targetOfferRange.low)} – ${fmtK(v.targetOfferRange.high)}</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="subsection-title" style="color: #34d399">Opportunities</div>
      <ul style="padding-left: 16px; font-size: 9px; color: #374151;">
        ${(opportunities.length > 0 ? opportunities : ["Standard investment opportunity"]).map(o => `<li style="margin-bottom:3px">${escHtml(o)}</li>`).join("")}
      </ul>
    </div>
    <div class="card">
      <div class="subsection-title" style="color: #f87171">Risks</div>
      <ul style="padding-left: 16px; font-size: 9px; color: #374151;">
        ${(risks.length > 0 ? risks : ["Standard investment risk"]).map(r => `<li style="margin-bottom:3px">${escHtml(r)}</li>`).join("")}
      </ul>
    </div>
  </div>

  ${pageFooter(d, 2)}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 3: PROPERTY DESCRIPTION
  // ──────────────────────────────────────────────────────────────────────────
  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Property Description</div>

  <table>
    <tr><td class="bold" style="width:35%">Address</td><td>${escHtml(d.address)}</td></tr>
    <tr><td class="bold">Type</td><td>${assetLabel}</td></tr>
    <tr><td class="bold">Size</td><td>${d.sqft.toLocaleString()} sqft</td></tr>
    <tr><td class="bold">Year Built</td><td>${d.yearBuilt || "Unknown"}</td></tr>
    <tr><td class="bold">Tenure</td><td>${d.tenure || "TBC"}</td></tr>
    <tr><td class="bold">EPC Rating</td><td>${d.epcRating || "TBC"}${d.epcRating && /[DEF]/.test(d.epcRating) ? " — MEES upgrade required" : ""}</td></tr>
    <tr><td class="bold">Condition</td><td>${d.condition || "Not assessed"}</td></tr>
    ${d.lotNumber ? `<tr><td class="bold">Lot Number</td><td>#${d.lotNumber}</td></tr>` : ""}
    ${d.auctionDate ? `<tr><td class="bold">Auction Date</td><td>${d.auctionDate}</td></tr>` : ""}
  </table>

  ${d.images.length > 0 ? `
  <div class="subsection-title">Gallery</div>
  <div class="img-grid">
    ${d.images.slice(0, 6).map(img => `<img src="${img}" alt="Property" />`).join("")}
  </div>` : ""}

  ${d.description ? `
  <div class="subsection-title">Description</div>
  <div class="body-text">${escHtml(d.description).slice(0, 2000)}</div>` : ""}

  ${d.features.length > 0 ? `
  <div class="subsection-title">Key Features</div>
  <ul style="padding-left: 16px; font-size: 9px; color: #374151; columns: 2;">
    ${d.features.slice(0, 12).map(f => `<li style="margin-bottom:3px">${escHtml(f)}</li>`).join("")}
  </ul>` : ""}

  ${pageFooter(d, 3)}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 4: LOCATION ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────
  const loc = a.locationGrade;
  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Location Analysis</div>

  ${d.satelliteUrl ? `<div style="margin-bottom:12px"><img src="${d.satelliteUrl}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;" /></div>` : ""}

  <div class="card">
    <div class="subsection-title">Location Grade: ${loc.grade.toUpperCase()}</div>
    <div class="body-text">${escHtml(loc.reasoning)}</div>
    <div style="margin-top:8px">
      <div class="stat-label" style="margin-bottom:4px">DEMAND DRIVERS</div>
      <ul style="padding-left: 16px; font-size: 9px; color: #374151;">
        ${loc.demandDrivers.map(d => `<li>${escHtml(d)}</li>`).join("")}
      </ul>
    </div>
    <div style="margin-top:8px">
      <div class="stat-label">ESTIMATED VACANCY</div>
      <div class="body-text">${escHtml(loc.submarketVacancy)}</div>
    </div>
  </div>

  <div class="section-title">Planning & Development</div>
  ${d.planningApps.length > 0 ? `
  <table>
    <thead><tr><th>Reference</th><th>Description</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>
      ${d.planningApps.slice(0, 8).map((p: any) => `
        <tr>
          <td class="mono">${escHtml(p.reference || p.caseReference || "—")}</td>
          <td>${escHtml((p.description || p.proposal || "—").slice(0, 100))}</td>
          <td>${escHtml(p.status || p.decision || "—")}</td>
          <td class="mono">${escHtml(p.date || p.decisionDate || "—")}</td>
        </tr>`).join("")}
    </tbody>
  </table>` : `<div class="body-text">No planning applications found within search radius.</div>`}

  ${pageFooter(d, 4)}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 5: ENVIRONMENTAL & RISK
  // ──────────────────────────────────────────────────────────────────────────
  const floodRisk = d.floodData?.inFloodZone ? "High" : d.floodData ? "Low" : "Unknown";
  const floodClass = d.floodData?.inFloodZone ? "rag-red" : "rag-green";
  const asbestosRisk = !d.yearBuilt || d.yearBuilt < 2000 ? "Medium" : "Low";
  const asbestosClass = asbestosRisk === "Medium" ? "rag-amber" : "rag-green";
  const contaminationRisk = d.assetType?.toLowerCase().includes("industrial") && (!d.yearBuilt || d.yearBuilt < 1990) ? "Medium" : "Low";
  const contaminationClass = contaminationRisk === "Medium" ? "rag-amber" : "rag-green";

  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Environmental & Risk Assessment</div>

  <table>
    <thead><tr><th>Risk Category</th><th>Severity</th><th>Detail</th><th>Mitigation</th></tr></thead>
    <tbody>
      <tr>
        <td class="bold">Flood Risk</td>
        <td><span class="${floodClass}" style="padding:2px 8px; border-radius:3px; font-size:8px; font-weight:600;">${floodRisk}</span></td>
        <td>${d.floodData?.zone || "No EA data available"}</td>
        <td>${d.floodData?.inFloodZone ? "Flood survey required pre-exchange" : "Standard"}</td>
      </tr>
      <tr>
        <td class="bold">Asbestos</td>
        <td><span class="${asbestosClass}" style="padding:2px 8px; border-radius:3px; font-size:8px; font-weight:600;">${asbestosRisk}</span></td>
        <td>${d.yearBuilt ? `Built ${d.yearBuilt}` : "Build date unknown"} — ${asbestosRisk === "Medium" ? "pre-2000 building" : "post-2000 build"}</td>
        <td>${asbestosRisk === "Medium" ? `R&D survey budgeted at £${a.capex.asbestos.cost.toLocaleString()}` : "Low risk — no survey needed"}</td>
      </tr>
      <tr>
        <td class="bold">Contamination</td>
        <td><span class="${contaminationClass}" style="padding:2px 8px; border-radius:3px; font-size:8px; font-weight:600;">${contaminationRisk}</span></td>
        <td>${contaminationRisk === "Medium" ? "Industrial use pre-1990 — potential contamination" : "Standard commercial risk"}</td>
        <td>${contaminationRisk === "Medium" ? "Phase 1 environmental survey recommended" : "Standard"}</td>
      </tr>
      <tr>
        <td class="bold">EPC / MEES</td>
        <td><span class="${d.epcRating && /[EFG]/.test(d.epcRating) ? "rag-red" : d.epcRating && /[D]/.test(d.epcRating) ? "rag-amber" : "rag-green"}" style="padding:2px 8px; border-radius:3px; font-size:8px; font-weight:600;">${d.epcRating || "Unknown"}</span></td>
        <td>${d.epcRating && /[EFG]/.test(d.epcRating) ? "Non-compliant with MEES 2025 (minimum B)" : d.epcRating && /[D]/.test(d.epcRating) ? "Compliant but below target" : "Compliant"}</td>
        <td>${a.capex.epcUpgrade.cost > 0 ? `Upgrade budget £${a.capex.epcUpgrade.cost.toLocaleString()}` : "No upgrade needed"}</td>
      </tr>
    </tbody>
  </table>

  ${a.capex.epcUpgrade.measures.length > 0 ? `
  <div class="subsection-title">EPC Upgrade Path</div>
  <table>
    <thead><tr><th>Measure</th><th class="right">Cost</th><th class="right">Annual Saving</th><th class="right">Payback</th></tr></thead>
    <tbody>
      ${a.capex.epcUpgrade.measures.map((m: EPCMeasure) => `
        <tr>
          <td>${escHtml(m.measure)}</td>
          <td class="right mono">${fmt(m.cost)}</td>
          <td class="right mono">${fmt(m.annualSaving)}</td>
          <td class="right mono">${m.paybackYears} years</td>
        </tr>`).join("")}
    </tbody>
  </table>` : ""}

  <div class="section-title">Ownership & Legal</div>
  <table>
    <tr><td class="bold" style="width:35%">Owner</td><td>${escHtml(d.ownerName) || "Not disclosed"}</td></tr>
    <tr><td class="bold">Company Status</td><td>${escHtml(d.companyStatus) || "N/A"}</td></tr>
    <tr><td class="bold">Tenure</td><td>${d.tenure || "TBC"}</td></tr>
    <tr><td class="bold">Source</td><td>${escHtml(d.sourceTag)}${d.sourceUrl ? ` — <span class="mono" style="font-size:8px">${escHtml(d.sourceUrl.slice(0, 60))}</span>` : ""}</td></tr>
    ${d.agentName ? `<tr><td class="bold">Agent</td><td>${escHtml(d.agentName)}</td></tr>` : ""}
  </table>

  ${pageFooter(d, 5)}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // PAGES 6-8: FINANCIAL ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────

  // Page 6: Valuations
  const rv = a.valuations.reconciled;
  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Financial Analysis — Valuations</div>

  <div class="card">
    <div class="subsection-title">Reconciled Opinion of Value</div>
    <div class="stat-grid" style="grid-template-columns: repeat(3,1fr)">
      <div class="stat-box">
        <div class="stat-label">Low</div>
        <div class="stat-value">${fmtK(rv.low)}</div>
      </div>
      <div class="stat-box" style="border-color: #7c6af0">
        <div class="stat-label">Mid (Reconciled)</div>
        <div class="stat-value" style="color: #7c6af0">${fmtK(rv.mid)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">High</div>
        <div class="stat-value">${fmtK(rv.high)}</div>
      </div>
    </div>
    <div class="body-text">${escHtml(rv.opinion)}</div>
    <div style="font-size:8px; color:#9ca3af">Primary method: ${escHtml(rv.primary)} · Variance: ${rv.variance.toFixed(0)}% · Methodology: ${a.methodology.join(", ")}</div>
  </div>

  ${a.valuations.market ? `
  <div class="subsection-title">Market Approach — Comparable Sales</div>
  <table>
    <thead><tr><th>Address</th><th class="right">Price</th><th class="right">£/sqft</th><th>Date</th><th class="right">Adj %</th><th class="right">Adj £/sqft</th></tr></thead>
    <tbody>
      ${a.valuations.market.comps.slice(0, 8).map((c: CompAdjustment) => `
        <tr>
          <td>${escHtml(c.address.slice(0, 40))}</td>
          <td class="right mono">${fmtK(c.price)}</td>
          <td class="right mono">£${c.psf}</td>
          <td class="mono">${c.date}</td>
          <td class="right mono ${c.totalAdj > 0 ? "green" : c.totalAdj < 0 ? "red" : ""}">${c.totalAdj > 0 ? "+" : ""}${c.totalAdj}%</td>
          <td class="right mono bold">£${c.adjustedPsf}</td>
        </tr>`).join("")}
    </tbody>
  </table>
  <div style="font-size:8px; color:#9ca3af; margin-bottom:10px">
    Average: £${a.valuations.market.avgPsf}/sqft unadjusted, £${a.valuations.market.adjustedAvgPsf}/sqft adjusted ·
    Value range: ${fmtK(a.valuations.market.valueLow)} – ${fmtK(a.valuations.market.valueHigh)} ·
    Confidence: ${a.valuations.market.confidence}
  </div>` : ""}

  <div class="subsection-title">Income Approach — Capitalisation</div>
  <table>
    <tr><td class="bold">Net Operating Income</td><td class="right mono">${fmt(a.valuations.income.capitalisation.netInitialYield > 0 ? Math.round(d.askingPrice * a.valuations.income.capitalisation.netInitialYield / 100) : 0)} p.a.</td></tr>
    <tr><td class="bold">Market Yield</td><td class="right mono">${fmtPct(a.valuations.income.capitalisation.netInitialYield)}</td></tr>
    <tr><td class="bold">Income Cap Value</td><td class="right mono bold">${fmtK(a.valuations.income.capitalisation.incomeCapValue)}</td></tr>
  </table>
  <div style="font-size:8px; color:#9ca3af">${escHtml(a.valuations.income.capitalisation.method)}</div>

  ${a.valuations.income.termReversion ? `
  <div class="subsection-title">Term & Reversion</div>
  <table>
    <tr><td class="bold">Term Value</td><td class="right mono">${fmtK(a.valuations.income.termReversion.termValue)}</td></tr>
    <tr><td class="bold">Reversion Value</td><td class="right mono">${fmtK(a.valuations.income.termReversion.reversionValue)}</td></tr>
    <tr><td class="bold">Total</td><td class="right mono bold">${fmtK(a.valuations.income.termReversion.totalValue)}</td></tr>
  </table>
  <div style="font-size:8px; color:#9ca3af">${escHtml(a.valuations.income.termReversion.method)}</div>` : ""}

  ${pageFooter(d, 6)}
</div>`);

  // Page 7: Letting + Acquisition Cost + CAPEX
  pages.push(`
<div class="page">
  ${pageHeader(d)}

  ${a.lettingAnalysis ? `
  <div class="section-title">Letting Analysis</div>

  <div class="two-col">
    <div>
      <div class="subsection-title">Market Rent Estimate</div>
      <table>
        <tr><td>Conservative</td><td class="right mono">£${a.lettingAnalysis.marketRent.psfLow}/sqft (${fmtK(a.lettingAnalysis.marketRent.low)} p.a.)</td></tr>
        <tr><td class="bold">Mid</td><td class="right mono bold">£${a.lettingAnalysis.marketRent.psfMid}/sqft (${fmtK(a.lettingAnalysis.marketRent.mid)} p.a.)</td></tr>
        <tr><td>Optimistic</td><td class="right mono">£${a.lettingAnalysis.marketRent.psfHigh}/sqft (${fmtK(a.lettingAnalysis.marketRent.high)} p.a.)</td></tr>
      </table>
      <div style="font-size:8px; color:#9ca3af">${escHtml(a.lettingAnalysis.marketRent.source)}</div>
    </div>
    <div>
      <div class="subsection-title">Expected Tenant Profile</div>
      <table>
        <tr><td>Type</td><td>${escHtml(a.lettingAnalysis.tenantProfile.type)}</td></tr>
        <tr><td>Lease</td><td>${escHtml(a.lettingAnalysis.tenantProfile.leaseLength)}</td></tr>
        <tr><td>Break</td><td>${escHtml(a.lettingAnalysis.tenantProfile.breakClause)}</td></tr>
      </table>
    </div>
  </div>

  <div class="subsection-title">Timeline to Stabilised Income</div>
  <table>
    <tr><td>Refurbishment</td><td class="right mono">${a.lettingAnalysis.refurbMonths} months</td></tr>
    <tr><td>Marketing</td><td class="right mono">${a.lettingAnalysis.marketingMonths} months</td></tr>
    <tr><td>Void period</td><td class="right mono">${a.lettingAnalysis.voidPeriod.months} months</td></tr>
    <tr><td>Rent free</td><td class="right mono">${a.lettingAnalysis.rentFreeMonths} months</td></tr>
    <tr><td class="bold">Total</td><td class="right mono bold">${a.lettingAnalysis.totalMonthsToStabilise} months</td></tr>
  </table>
  <div style="font-size:8px; color:#9ca3af">${escHtml(a.lettingAnalysis.voidPeriod.reasoning)}</div>

  <div class="subsection-title">Carry Costs During Void</div>
  <table>
    <tr><td>Debt service</td><td class="right mono">${fmt(a.lettingAnalysis.carryCostBreakdown.debtService)}/month</td></tr>
    <tr><td>Business rates</td><td class="right mono">${fmt(a.lettingAnalysis.carryCostBreakdown.rates)}/month</td></tr>
    <tr><td>Insurance</td><td class="right mono">${fmt(a.lettingAnalysis.carryCostBreakdown.insurance)}/month</td></tr>
    <tr><td>Security + utilities</td><td class="right mono">${fmt(a.lettingAnalysis.carryCostBreakdown.security + a.lettingAnalysis.carryCostBreakdown.utilities)}/month</td></tr>
    <tr><td class="bold">Total monthly carry</td><td class="right mono bold">${fmt(a.lettingAnalysis.monthlyCarryCost)}/month</td></tr>
    <tr><td class="bold">Total carry cost</td><td class="right mono bold red">${fmt(a.lettingAnalysis.totalCarryCost)}</td></tr>
  </table>` : `
  <div class="section-title">Tenancy Schedule</div>
  <table>
    <tr><td class="bold">Tenant</td><td>${escHtml(d.tenantNames) || "Not disclosed"}</td></tr>
    ${d.leaseExpiry ? `<tr><td class="bold">Lease Expiry</td><td>${escHtml(d.leaseExpiry)}</td></tr>` : ""}
    ${d.breakDates ? `<tr><td class="bold">Break Dates</td><td>${escHtml(d.breakDates)}</td></tr>` : ""}
  </table>`}

  <div class="section-title">Acquisition Cost Breakdown</div>
  <table>
    <tr><td>Purchase price</td><td class="right mono">${fmt(a.acquisitionCost.purchasePrice)}</td></tr>
    <tr><td>SDLT</td><td class="right mono">${fmt(a.acquisitionCost.sdlt)}</td></tr>
    <tr><td>Legal fees</td><td class="right mono">${fmt(a.acquisitionCost.legal)}</td></tr>
    <tr><td>Survey</td><td class="right mono">${fmt(a.acquisitionCost.survey)}</td></tr>
    <tr><td>Finance arrangement</td><td class="right mono">${fmt(a.acquisitionCost.financeArrangement)}</td></tr>
    <tr><td class="bold">Subtotal acquisition</td><td class="right mono bold">${fmt(a.acquisitionCost.subtotalAcquisition)}</td></tr>
    ${a.acquisitionCost.capex > 0 ? `<tr><td>CAPEX (MEES + refurb)</td><td class="right mono">${fmt(a.acquisitionCost.capex)}</td></tr>` : ""}
    ${a.acquisitionCost.carryCosts > 0 ? `<tr><td>Carry costs (void)</td><td class="right mono">${fmt(a.acquisitionCost.carryCosts)}</td></tr>` : ""}
    ${a.acquisitionCost.lettingCosts > 0 ? `<tr><td>Letting costs</td><td class="right mono">${fmt(a.acquisitionCost.lettingCosts)}</td></tr>` : ""}
    <tr style="background:#7c6af008"><td class="bold" style="font-size:11px">TOTAL COST IN</td><td class="right mono bold" style="font-size:11px; color:#7c6af0">${fmt(a.acquisitionCost.totalCostIn)}</td></tr>
  </table>

  ${pageFooter(d, 7)}
</div>`);

  // Page 8: Returns + DCF + Sensitivity
  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">Returns Analysis</div>

  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-label">Net Initial Yield</div>
      <div class="stat-value">${fmtPct(a.returns.netInitialYield)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Stabilised Yield</div>
      <div class="stat-value" style="color: ${a.returns.stabilisedYield >= 7 ? "#34d399" : "#fbbf24"}">${fmtPct(a.returns.stabilisedYield)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Yield on Cost</div>
      <div class="stat-value">${fmtPct(a.returns.yieldOnCost)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Cash-on-Cash (Yr1)</div>
      <div class="stat-value">${fmtPct(a.returns.cashOnCashYear1)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Cash-on-Cash (Stab)</div>
      <div class="stat-value">${fmtPct(a.returns.cashOnCashStabilised)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">IRR (10yr)</div>
      <div class="stat-value" style="color: ${a.returns.irr10yr >= 12 ? "#34d399" : a.returns.irr10yr >= 8 ? "#fbbf24" : "#f87171"}">${fmtPct(a.returns.irr10yr)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Equity Multiple</div>
      <div class="stat-value">${a.returns.equityMultiple.toFixed(2)}×</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">DSCR</div>
      <div class="stat-value" style="color: ${a.returns.dscr >= 1.25 ? "#34d399" : a.returns.dscr >= 1.0 ? "#fbbf24" : "#f87171"}">${a.returns.dscr.toFixed(2)}×</div>
    </div>
  </div>

  <div class="subsection-title">Financing Assumptions</div>
  <table>
    <tr><td>LTV</td><td class="right mono">65%</td><td style="font-size:8px; color:#9ca3af">Market benchmark — office may be constrained to 55-60% post-COVID</td></tr>
    <tr><td>Interest rate</td><td class="right mono">${((0.0475 + 0.02) * 100).toFixed(2)}%</td><td style="font-size:8px; color:#9ca3af">Base rate 4.75% + 2.0% margin (SONIA swap + lender spread)</td></tr>
    <tr><td>Term</td><td class="right mono">25 years</td><td style="font-size:8px; color:#9ca3af">Standard commercial mortgage term</td></tr>
    ${d.askingPrice ? `<tr><td>Loan amount</td><td class="right mono">${fmt(Math.round(d.askingPrice * 0.65))}</td><td style="font-size:8px; color:#9ca3af">Asking price × LTV</td></tr>` : ""}
    ${d.askingPrice ? `<tr><td>Equity required</td><td class="right mono">${fmt(Math.round(d.askingPrice * 0.35))}</td><td style="font-size:8px; color:#9ca3af">Asking price × (1 - LTV)</td></tr>` : ""}
    <tr><td>Management fee</td><td class="right mono">5%</td><td style="font-size:8px; color:#9ca3af">Of gross income</td></tr>
    <tr><td>Vacancy provision</td><td class="right mono">3%</td><td style="font-size:8px; color:#9ca3af">Of gross income (tenanted); 0% during void</td></tr>
    <tr><td>Maintenance reserve</td><td class="right mono">1%</td><td style="font-size:8px; color:#9ca3af">Of gross income</td></tr>
    <tr><td>Exit yield</td><td class="right mono">${a.dcf ? `${a.dcf.exitYield.toFixed(1)}%` : "—"}</td><td style="font-size:8px; color:#9ca3af">Market cap rate + 50bp expansion</td></tr>
    <tr><td>Discount rate</td><td class="right mono">${a.dcf ? `${a.dcf.discountRate}%` : "—"}</td><td style="font-size:8px; color:#9ca3af">Risk-adjusted rate for DCF</td></tr>
  </table>
  <div style="font-size:8px; color:#9ca3af; margin-bottom:16px">
    Note: All financing terms are estimates based on current market conditions. Actual lender terms may vary significantly.
    Lenders may require higher equity (lower LTV) for office assets, secondary locations, or vacant properties.
  </div>

  <div class="subsection-title">10-Year DCF</div>
  <table>
    <thead>
      <tr><th>Year</th><th class="right">Gross Income</th><th class="right">Costs</th><th class="right">NOI</th><th class="right">Debt Service</th><th class="right">Cash Flow</th><th class="right">Cumulative</th></tr>
    </thead>
    <tbody>
      ${a.dcf.years.map((yr: DCFYear) => `
        <tr>
          <td class="mono">${yr.year}</td>
          <td class="right mono">${fmtK(yr.grossIncome)}</td>
          <td class="right mono">${fmtK(yr.voidProvision + yr.managementFee + yr.insurance + yr.maintenance)}</td>
          <td class="right mono">${fmtK(yr.netIncome)}</td>
          <td class="right mono">${fmtK(yr.debtService)}</td>
          <td class="right mono ${yr.cashFlow >= 0 ? "green" : "red"}">${fmtK(yr.cashFlow)}</td>
          <td class="right mono ${yr.cumulative >= 0 ? "green" : "red"}">${fmtK(yr.cumulative)}</td>
        </tr>`).join("")}
    </tbody>
  </table>
  <div style="font-size:8px; color:#9ca3af">
    Terminal value: ${fmtK(a.dcf.terminalValue)} at ${a.dcf.exitYield.toFixed(1)}% exit yield ·
    NPV: ${fmtK(a.dcf.npv)} at ${a.dcf.discountRate}% discount rate ·
    IRR: ${a.dcf.irr.toFixed(1)}% ·
    Equity multiple: ${a.dcf.equityMultiple.toFixed(2)}×
  </div>

  <div class="subsection-title" style="margin-top:14px">Sensitivity Analysis</div>
  <table>
    <thead><tr><th>Scenario</th><th class="right">Void</th><th class="right">Rent</th><th class="right">CAPEX</th><th class="right">IRR</th><th>Verdict</th></tr></thead>
    <tbody>
      ${a.sensitivity.map((row: SensitivityRow) => `
        <tr>
          <td class="bold">${escHtml(row.scenario)}</td>
          <td class="right mono">${row.voidMonths}</td>
          <td class="right mono">${row.rent}</td>
          <td class="right mono">${row.capex}</td>
          <td class="right mono">${row.irr}</td>
          <td class="${row.verdict.includes("Strong") || row.verdict.includes("Buy") ? "green" : row.verdict.includes("Avoid") ? "red" : "amber"} bold">${escHtml(row.verdict)}</td>
        </tr>`).join("")}
    </tbody>
  </table>

  ${pageFooter(d, 8)}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL PAGE: DISCLAIMER
  // ──────────────────────────────────────────────────────────────────────────
  pages.push(`
<div class="page">
  ${pageHeader(d)}
  <div class="section-title">CAPEX Detail</div>

  <table>
    ${a.capex.epcUpgrade.cost > 0 ? `<tr><td>EPC upgrade (${a.capex.epcUpgrade.currentRating}→${a.capex.epcUpgrade.targetRating})</td><td class="right mono">${fmt(a.capex.epcUpgrade.cost)}</td></tr>` : ""}
    <tr><td>Refurbishment (£${a.capex.refurb.psfRate}/sqft — ${escHtml(a.capex.refurb.scope)})</td><td class="right mono">${fmt(a.capex.refurb.cost)}</td></tr>
    <tr><td>Contingency (${a.capex.contingency.pct}%)</td><td class="right mono">${fmt(a.capex.contingency.cost)}</td></tr>
    <tr><td>Professional fees (${a.capex.professionalFees.pct}%)</td><td class="right mono">${fmt(a.capex.professionalFees.cost)}</td></tr>
    ${a.capex.asbestos.applicable ? `<tr><td>Asbestos survey + removal</td><td class="right mono">${fmt(a.capex.asbestos.cost)}</td></tr>` : ""}
    <tr style="background:#f8f8fc"><td class="bold">Total CAPEX</td><td class="right mono bold">${fmt(a.capex.total)}</td></tr>
  </table>
  <div style="font-size:8px; color:#9ca3af; margin-bottom:20px">${escHtml(a.capex.reasoning)}</div>

  ${(() => {
    // Outlier detection for memo
    const niy = a.returns?.netInitialYield || 0;
    const irr10 = a.returns?.irr10yr || a.dcf?.irr || 0;
    const dscr = a.returns?.dscr || 0;
    const outliers: string[] = [];
    if (niy > 30) outliers.push(`Net Initial Yield ${niy.toFixed(1)}% (typical range: 4-12%)`);
    if (irr10 > 50) outliers.push(`IRR ${irr10.toFixed(1)}% (typical range: 8-25%)`);
    if (dscr > 10) outliers.push(`DSCR ${dscr.toFixed(1)}× (typical range: 1.2-3.0×)`);
    if (a.valuations?.reconciled && d.askingPrice > 0) {
      const variance = ((a.valuations.reconciled.mid / d.askingPrice - 1) * 100);
      if (Math.abs(variance) > 100) outliers.push(`Valuation variance ${variance.toFixed(0)}% vs asking price`);
    }
    return outliers.length > 0 ? `
  <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:16px; margin-bottom:20px">
    <div style="font-weight:700; color:#dc2626; font-size:11px; margin-bottom:8px">⚠ OUTLIER METRICS — INDEPENDENT VERIFICATION REQUIRED</div>
    <div style="font-size:9px; color:#991b1b; line-height:1.8">
      The following metrics fall outside normal investment ranges and may indicate a data error, distressed sale, or undisclosed defects:
      <ul style="margin:8px 0; padding-left:16px">
        ${outliers.map(o => `<li>${escHtml(o)}</li>`).join("")}
      </ul>
      <strong>Do not rely on automated returns.</strong> Commission an independent RICS Red Book valuation and full building survey before any investment commitment.
    </div>
  </div>` : "";
  })()}

  <div class="section-title" style="margin-top:20px">Recommended Next Steps</div>
  <div class="body-text" style="font-size:9px; line-height:2.0; margin-bottom:20px">
    <ol style="padding-left:16px; margin:8px 0">
      <li>Commission independent RICS Red Book valuation</li>
      <li>Full building survey (structural, M&E, roof, cladding)</li>
      <li>Asbestos management survey${d.yearBuilt && d.yearBuilt < 2000 ? " (pre-2000 building — high priority)" : ""}</li>
      <li>Environment Agency flood risk assessment</li>
      <li>Planning Portal search (Article 4, conservation area, CIL/S106)</li>
      <li>Title review and legal due diligence</li>
      ${d.agentName ? `<li>Contact agent (${escHtml(d.agentName)}) for vendor pack and negotiation</li>` : "<li>Identify owner and establish contact strategy</li>"}
      <li>Review financing options with lender (current office LTV caps, rates)</li>
    </ol>
  </div>

  <div class="section-title">Data Quality & Confidence</div>
  <div class="body-text" style="font-size:8px; color:#6b7280; line-height:1.8; margin-bottom:12px">
    Confidence: <strong>${a.confidence || "low"}</strong>.
    ${a.estimatedFields?.length ? `Estimated fields: ${a.estimatedFields.join(", ")}.` : "All inputs derived from source data."}
    ${a.methodology?.length ? `Valuation methods: ${a.methodology.join(", ")}.` : ""}
    ${d.sourceUrl ? `Source: ${escHtml(d.sourceUrl)}` : ""}
  </div>

  <div class="section-title">Disclaimer</div>
  <div class="body-text" style="font-size:8px; color:#9ca3af; line-height:1.8">
    This document has been prepared for information purposes only and does not constitute professional advice.
    The analysis contained herein is based on publicly available data, estimated market benchmarks, and automated
    calculations. No responsibility is accepted for any loss or damage arising from reliance on this information.
    All return projections are modelled estimates based on assumptions documented herein — actual results may
    differ materially due to market conditions, property condition, tenant creditworthiness, and other factors.
    <br /><br />
    Prospective purchasers should undertake their own independent investigations including but not limited to:
    building survey, environmental assessment, title review, planning consultation, and professional valuation
    by a RICS-registered valuer before making any investment decision.
    <br /><br />
    All financial projections are estimates only and actual results may differ materially. Past performance is
    not indicative of future results. Property values can go down as well as up. Lending terms and conditions
    are subject to lender approval and may vary from assumptions used in this analysis.
    <br /><br />
    <strong>DealScope · RealHQ Ltd</strong><br />
    Generated: ${d.generatedAt}<br />
    Reference: ${d.dealId}
  </div>

  ${pageFooter(d, "Final")}
</div>`);

  // ──────────────────────────────────────────────────────────────────────────
  // ASSEMBLE
  // ──────────────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${STYLES}</style>
</head>
<body>
${pages.join("\n")}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE HEADER / FOOTER
// ══════════════════════════════════════════════════════════════════════════════

function pageHeader(d: MemoData): string {
  return `<div class="page-header">
    <span class="logo">DealScope · RealHQ</span>
    <span>${escHtml(d.address.slice(0, 50))}</span>
  </div>`;
}

function pageFooter(d: MemoData, pageNum: number | string): string {
  return `<div class="page-footer">
    <span>Confidential — ${d.generatedAt}</span>
    <span>Page ${pageNum}</span>
  </div>`;
}

/**
 * src/lib/brochure-template.ts
 * Returns an HTML string for the RealHQ marketing brochure / investment memo.
 * Designed for A4 PDF output via puppeteer-core + @sparticuz/chromium.
 */

export interface BrochureData {
  type: "brochure" | "investment_memo";
  assetName: string;
  assetType: string;
  location: string;
  address?: string;
  sqft?: number;
  passingRent?: number;
  marketERV?: number;
  noi?: number;
  yieldPct?: number;
  capRate?: number;
  marketCapRate?: number;
  epcRating?: string;
  satelliteUrl?: string;
  tenants?: Array<{ name: string; expiry: string | null; rentPerSqft: number | null }>;
  financials?: {
    grossRevenue: number;
    operatingCosts: number;
    noi: number;
  };
  narrative: string; // AI-generated
  sym: string; // "£" | "$"
  confidential: boolean;
  recipientName?: string;
  generatedAt: string;
}

function fmt(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtPct(v?: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtSqft(v?: number | null): string {
  if (v == null) return "—";
  return `${v.toLocaleString()} sqft`;
}

export function renderBrochureHTML(d: BrochureData): string {
  const assetTypeLabel = d.assetType
    ? d.assetType.charAt(0).toUpperCase() + d.assetType.slice(1)
    : "Commercial Property";

  const docTitle = d.type === "investment_memo" ? "Investment Memorandum" : "Property Brochure";

  const heroStyle = d.satelliteUrl
    ? `background-image: url('${d.satelliteUrl}'); background-size: cover; background-position: center;`
    : "background: #1f2937;";

  const kpiGrid = [
    { label: d.type === "investment_memo" ? "Asking Price" : "Valuation", value: d.passingRent ? fmt(d.passingRent / (d.yieldPct ?? 6) * 100, d.sym) : "POA" },
    { label: "Annual NOI", value: d.noi ? fmt(d.noi, d.sym) : d.passingRent ? fmt(d.passingRent, d.sym) : "—" },
    { label: "Initial Yield", value: fmtPct(d.yieldPct) },
    { label: "Floor Area", value: fmtSqft(d.sqft) },
  ].map((k) => `
    <div class="kpi-cell">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
    </div>
  `).join("");

  const tenantRows = (d.tenants ?? []).slice(0, 6).map((t) => `
    <tr>
      <td>${t.name}</td>
      <td>${t.expiry ?? "—"}</td>
      <td>${t.rentPerSqft != null ? `${d.sym}${t.rentPerSqft.toFixed(2)}/sqft` : "—"}</td>
    </tr>
  `).join("") || `<tr><td colspan="3" style="color:#9CA3AF">Vacant or single-let</td></tr>`;

  const financialRows = d.financials ? `
    <table class="fin-table">
      <tr><td>Gross Revenue</td><td>${fmt(d.financials.grossRevenue, d.sym)}</td></tr>
      <tr><td>Operating Costs</td><td>(${fmt(d.financials.operatingCosts, d.sym)})</td></tr>
      <tr class="fin-noi"><td><strong>Net Operating Income</strong></td><td><strong>${fmt(d.financials.noi, d.sym)}</strong></td></tr>
      <tr><td>Initial Yield</td><td>${fmtPct(d.yieldPct)}</td></tr>
      ${d.capRate != null ? `<tr><td>Cap Rate</td><td>${fmtPct(d.capRate)}${d.marketCapRate != null ? ` vs ${fmtPct(d.marketCapRate)} market` : ""}</td></tr>` : ""}
    </table>
  ` : "<p style=\"color:#9CA3AF\">Financial data not available.</p>";

  const confidentialWatermark = d.confidential ? `
    <div class="watermark">STRICTLY CONFIDENTIAL</div>
  ` : "";

  const preparedFor = d.recipientName
    ? `<span>Prepared for: ${d.recipientName}</span>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11px;
    color: #111827;
    background: #fff;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm;
    position: relative;
    page-break-after: always;
  }

  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 52px;
    font-weight: 700;
    color: rgba(0,0,0,0.06);
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .hero {
    width: 100%;
    height: 160px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    position: relative;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%);
  }

  .hero-text {
    position: relative;
    padding: 12px 16px;
    color: #fff;
    z-index: 1;
  }

  .hero-title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 22px;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .hero-sub {
    font-size: 11px;
    opacity: 0.85;
    letter-spacing: 0.3px;
  }

  .doc-type-badge {
    display: inline-block;
    background: #0A8A4C;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 3px;
    margin-bottom: 8px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .kpi-cell {
    background: #F9FAFB;
    border: 0.5px solid #E5E7EB;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .kpi-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9CA3AF;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .kpi-value {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 16px;
    color: #111827;
    line-height: 1.1;
  }

  .narrative {
    font-size: 11px;
    line-height: 1.7;
    color: #374151;
    margin-bottom: 16px;
    padding: 12px 14px;
    background: #F9FAFB;
    border-left: 3px solid #0A8A4C;
    border-radius: 0 6px 6px 0;
  }

  .footer-bar {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 0.5px solid #E5E7EB;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #9CA3AF;
  }

  .realhq-logo {
    font-weight: 700;
    color: #0A8A4C;
    font-size: 11px;
  }

  /* Page 2 */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9CA3AF;
    margin-bottom: 8px;
    margin-top: 16px;
  }

  .section-title:first-of-type {
    margin-top: 0;
  }

  .fin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 4px;
  }

  .fin-table td {
    padding: 6px 10px;
    border-bottom: 0.5px solid #F3F4F6;
  }

  .fin-table td:last-child {
    text-align: right;
    font-weight: 600;
  }

  .fin-noi td {
    background: #F0FDF4;
    color: #0A8A4C;
  }

  .lease-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }

  .lease-table th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9CA3AF;
    font-weight: 600;
    padding: 0 10px 6px;
    border-bottom: 0.5px solid #E5E7EB;
  }

  .lease-table td {
    padding: 6px 10px;
    border-bottom: 0.5px solid #F3F4F6;
    color: #374151;
  }

  .location-para {
    font-size: 11px;
    line-height: 1.7;
    color: #374151;
    margin-top: 4px;
  }

  @media print {
    .page { page-break-after: always; }
  }
</style>
</head>
<body>

${confidentialWatermark}

<!-- PAGE 1 -->
<div class="page">
  <div class="doc-type-badge">${docTitle}</div>

  <div class="hero" style="${heroStyle}">
    <div class="hero-overlay"></div>
    <div class="hero-text">
      <div class="hero-title">${d.assetName}</div>
      <div class="hero-sub">${d.location}${d.epcRating ? ` · EPC ${d.epcRating}` : ""} · ${assetTypeLabel}</div>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiGrid}
  </div>

  <div class="narrative">${d.narrative}</div>

  <div class="footer-bar">
    <div>
      <span class="realhq-logo">RealHQ</span>
      <span style="margin-left:8px">Generated ${d.generatedAt}</span>
      ${preparedFor ? `<span style="margin-left:8px">· ${preparedFor.replace(/<[^>]+>/g, "")}</span>` : ""}
    </div>
    ${d.confidential ? '<span style="font-weight:600;color:#D93025">STRICTLY CONFIDENTIAL</span>' : ""}
  </div>
</div>

<!-- PAGE 2 -->
<div class="page">

  <div class="section-title">Financial Summary</div>
  ${financialRows}

  <div class="section-title">Lease Schedule</div>
  <table class="lease-table">
    <thead>
      <tr>
        <th>Tenant</th>
        <th>Expiry</th>
        <th>Rent</th>
      </tr>
    </thead>
    <tbody>
      ${tenantRows}
    </tbody>
  </table>

  <div class="section-title">Location &amp; Connectivity</div>
  <p class="location-para">
    ${d.assetName} is located at ${d.address ?? d.location}.
    The property benefits from ${assetTypeLabel.toLowerCase()} characteristics typical of the ${d.location} submarket.
    ${d.marketERV && d.passingRent && d.marketERV > d.passingRent
      ? `Current passing rent of ${fmt(d.passingRent, d.sym)}/yr represents a discount to estimated rental value of ${fmt(d.marketERV, d.sym)}/yr, providing an active management opportunity.`
      : d.passingRent ? `The property is currently producing ${fmt(d.passingRent, d.sym)}/yr in contracted income.` : ""}
  </p>

  <div class="footer-bar">
    <div>
      <span class="realhq-logo">RealHQ</span>
      <span style="margin-left:8px">${d.location} · Page 2 of 2</span>
    </div>
    ${d.confidential ? '<span style="font-weight:600;color:#D93025">STRICTLY CONFIDENTIAL</span>' : ""}
  </div>
</div>

</body>
</html>`;
}

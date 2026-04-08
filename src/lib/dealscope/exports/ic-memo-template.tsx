/**
 * src/lib/dealscope/exports/ic-memo-template.tsx
 * DS-T24: IC Memo HTML template — multi-page A4 IC memorandum.
 *
 * Matches docs/designs/ic-memo-template.html pixel-for-pixel:
 * - Cover page, Executive Summary, Asset Overview, Financial Analysis, Risk Assessment, Recommendation
 * - Dark theme (#09090b bg, #7c6af0 accent), @page A4 print-first
 * - Page headers/footers, h2 sections with purple underlines, metric boxes, tables, callouts
 *
 * Re-exports MemoData / renderMemoHTML for backward-compat callers.
 */

import React from "react";
export { renderMemoHTML, type MemoData } from "@/lib/dealscope-memo-template";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ICMemoProps {
  headline: string;
  recommendation: "PROCEED" | "CONDITIONAL" | "PASS";
  dealScore: number;
  irr: number;
  equityMultiple: number;
  totalCostIn: number;
  currency: string;

  address: string;
  assetType: string;
  sqft: number | null;
  tenure: string | null;
  yearBuilt: number | null;
  epcRating: string | null;
  askingPrice: number | null;
  guidePrice: number | null;

  passingRent: number | null;
  erv: number | null;
  capRate: number | null;
  noi: number | null;
  exitValue: number | null;
  cashFlows: Array<{ year: number; amount: number; description: string }>;

  signals: string[];
  hasInsolvency: boolean;
  hasLisPendens: boolean;
  inFloodZone: boolean;
  epcMeesRisk: string | null;
  riskSummary: string | null;

  investmentThesis: string;
  keyRisks: string[];
  keyOpportunities: string[];
  confidential: boolean;
  generatedAt: string;

  // Wave F: condition-anchored dual-scenario valuation (optional — only present
  // when /api/dealscope/enrich has run and stored dataSources.valuations).
  waveF?: {
    condition?: "unrefurbished" | "average" | "refurbished" | null;
    conditionSignals?: string[];
    recommendation?: "BUY" | "REVIEW" | "PASS" | null;
    recommendationReasons?: string[];
    askingPsf?: number | null;
    compPsfBand?: { low: number | null; mid: number | null; high: number | null; sampleSize: number } | null;
    asIs?: {
      erv: number; ervPsf: number | null; noi: number; value: number; clearsAsking: boolean;
    } | null;
    refurb?: {
      erv: number; ervPsf: number | null; noi: number;
      capexPsf: number; capexTotal: number; capexSource: string;
      grossValue: number; value: number; clearsAsking: boolean;
    } | null;
  } | null;
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, sym = "£"): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(0)}k`;
  return `${sym}${n.toLocaleString()}`;
}
function fmtFull(n: number | null | undefined, sym = "£"): string {
  if (n == null) return "—";
  return `${sym}${n.toLocaleString()}`;
}
function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function recLabel(r: "PROCEED" | "CONDITIONAL" | "PASS"): string {
  if (r === "PROCEED") return "✓ PROCEED";
  if (r === "CONDITIONAL") return "⚠ CONDITIONAL OPPORTUNITY";
  return "✗ PASS — DO NOT PROCEED";
}
function recColor(r: "PROCEED" | "CONDITIONAL" | "PASS"): string {
  if (r === "PROCEED") return "#16a34a";
  if (r === "CONDITIONAL") return "#d97706";
  return "#dc2626";
}
function riskSeverityColor(i: number): string {
  if (i < 2) return "#dc2626";
  if (i < 4) return "#d97706";
  return "#6b7280";
}
function riskSeverityLabel(i: number): string {
  if (i < 2) return "HIGH";
  if (i < 4) return "MEDIUM";
  return "LOW";
}

// ── Shared CSS ────────────────────────────────────────────────────────────────
const CSS = `
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#09090b;color:#fafafa;line-height:1.5;font-size:10pt}
.page{width:210mm;min-height:297mm;padding:20mm 20mm 25mm 20mm;margin:0 auto;background:#09090b;page-break-after:always;position:relative;border-top:3pt solid #7c6af0}
.page-header{position:absolute;top:12mm;left:20mm;right:20mm;padding-bottom:3mm;border-bottom:0.5pt solid #27272a;display:flex;justify-content:space-between;align-items:center}
.phl{font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:0.5pt;color:#7c6af0}
.phr{font-size:7pt;color:#71717a}
.page-footer{position:absolute;bottom:15mm;left:20mm;right:20mm;padding-top:3mm;border-top:0.5pt solid #3f3f46;display:flex;justify-content:space-between;font-size:7pt;color:#71717a}
.content{padding-top:10mm}
h2{font-size:14pt;font-weight:600;margin-top:16pt;margin-bottom:10pt;padding-bottom:4pt;border-bottom:2pt solid #7c6af0;text-transform:uppercase;letter-spacing:0.5pt;color:#9b8ff5}
h3{font-size:11pt;font-weight:600;margin-top:12pt;margin-bottom:6pt;color:#fafafa}
h4{font-size:9pt;font-weight:600;margin-top:8pt;margin-bottom:4pt;text-transform:uppercase;letter-spacing:0.3pt;color:#a1a1aa}
p{margin-bottom:6pt;font-size:9.5pt;line-height:1.5;color:#d4d4d8}
.lead{font-size:10.5pt;line-height:1.6;margin-bottom:10pt;color:#e4e4e7}
strong{font-weight:600;color:#fafafa}
ul{margin:6pt 0 10pt 16pt}
li{margin-bottom:3pt;font-size:9pt;color:#d4d4d8}
table{width:100%;border-collapse:collapse;margin:8pt 0 12pt 0;font-size:8.5pt;background:#18181b}
thead{background:#27272a}
th{text-align:left;padding:6pt 8pt;font-weight:600;border-bottom:1pt solid #7c6af0;font-size:7.5pt;text-transform:uppercase;letter-spacing:0.3pt;color:#a1a1aa}
td{padding:5pt 8pt;border-bottom:0.25pt solid #27272a;vertical-align:top;color:#d4d4d8}
tr:last-child td{border-bottom:0.5pt solid #3f3f46}
.hl{background:rgba(124,106,240,0.15)!important}
.hl td{color:#fafafa!important}
.tn{font-family:'Courier New',monospace;font-weight:500}
.tr{text-align:right}
.mr{display:grid;grid-template-columns:repeat(4,1fr);gap:6pt;margin:10pt 0;page-break-inside:avoid}
.mb{padding:8pt;border:0.5pt solid #3f3f46;background:#18181b;text-align:center}
.ml{font-size:7pt;text-transform:uppercase;letter-spacing:0.3pt;color:#71717a;margin-bottom:3pt}
.mv{font-size:14pt;font-weight:600;font-family:'Courier New',monospace;color:#fafafa}
.ms{font-size:6.5pt;color:#71717a;margin-top:2pt}
.badge{display:inline-block;padding:2pt 6pt;font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:0.3pt;border:0.5pt solid}
.bh{border-color:#dc2626;color:#dc2626;background:rgba(220,38,38,0.1)}
.bm{border-color:#d97706;color:#d97706;background:rgba(215,119,6,0.1)}
.bl{border-color:#16a34a;color:#16a34a;background:rgba(22,163,74,0.1)}
.callout{padding:8pt 10pt;margin:10pt 0;border-left:3pt solid #3f3f46;background:#18181b;page-break-inside:avoid}
.cw{border-left-color:#f59e0b;background:rgba(245,158,11,0.1)}
.cd{border-left-color:#ef4444;background:rgba(239,68,68,0.1)}
.ci{border-left-color:#7c6af0;background:rgba(124,106,240,0.1)}
.cs{border-left-color:#22c55e;background:rgba(34,197,94,0.1)}
.callout p,.callout h4,.callout li{color:#e4e4e7}
.nb{page-break-inside:avoid}
.mt2{margin-top:8pt}
.mt3{margin-top:12pt}
.mb0{margin-bottom:0}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40mm 30mm;background:linear-gradient(135deg,#09090b 0%,#18181b 100%);border-top:4pt solid #7c6af0}
.clogo{font-size:18pt;font-weight:600;letter-spacing:2pt;margin-bottom:40mm;text-transform:uppercase;color:#7c6af0}
.ctype{font-size:10pt;text-transform:uppercase;letter-spacing:1.5pt;margin-bottom:10mm;color:#71717a}
.ctitle{font-size:32pt;font-weight:400;margin-bottom:4mm;line-height:1.1;color:#fafafa}
.csub{font-size:14pt;margin-bottom:20mm;color:#a1a1aa}
.cdiv{width:80mm;height:0.5pt;background:#3f3f46;margin:15mm 0}
.cstatus{padding:8pt 20pt;border:2pt solid;font-size:12pt;font-weight:600;margin-bottom:15mm;text-transform:uppercase;letter-spacing:0.5pt}
.cmetrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10mm;width:100%;max-width:140mm;margin-top:10mm}
.cmetric{text-align:center;padding:8pt;border:0.5pt solid #3f3f46;background:#18181b}
.cmla{font-size:7pt;text-transform:uppercase;letter-spacing:0.5pt;color:#71717a;margin-bottom:4pt}
.cmva{font-size:16pt;font-weight:600;font-family:'Courier New',monospace;color:#fafafa}
.cfoot{position:absolute;bottom:20mm;left:0;right:0;text-align:center;font-size:8pt;color:#71717a}
.rrow{display:flex;align-items:flex-start;gap:8pt;padding:5pt 0;border-bottom:0.25pt solid #27272a}
.rdot{width:6pt;height:6pt;border-radius:50%;flex-shrink:0;margin-top:3pt}
.rtxt{font-size:9pt;color:#d4d4d8}
@media print{body{background:white!important;color:black!important}.page{background:white!important;margin:0}*{color:black!important}.cover{background:white!important}}
`;

// ── Page scaffold ─────────────────────────────────────────────────────────────
function Page({ children, address }: { children: React.ReactNode; address: string }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="phl">{address}</div>
        <div className="phr">Investment Committee Memorandum</div>
      </div>
      <div className="content">{children}</div>
      <div className="page-footer">
        <div>DealScope IC Memorandum — {address}</div>
        <div>Confidential</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ICMemoTemplate(props: ICMemoProps): React.ReactElement {
  const {
    headline, recommendation, dealScore, irr, equityMultiple, totalCostIn, currency,
    address, assetType, sqft, tenure, yearBuilt, epcRating, askingPrice, guidePrice,
    passingRent, erv, capRate, noi, exitValue, cashFlows,
    signals, hasInsolvency, hasLisPendens, inFloodZone, epcMeesRisk, riskSummary,
    investmentThesis, keyRisks, keyOpportunities, confidential, generatedAt,
    waveF,
  } = props;

  const sym = currency === "GBP" ? "£" : "$";
  const rc = recColor(recommendation);
  const irrClr = irr >= 0.15 ? "#22c55e" : irr >= 0.10 ? "#f59e0b" : "#ef4444";
  const emClr = equityMultiple >= 1.8 ? "#22c55e" : equityMultiple >= 1.2 ? "#f59e0b" : "#ef4444";
  const dateStr = (() => {
    try { return new Date(generatedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
    catch { return generatedAt; }
  })();

  const allRisks: string[] = [
    ...(hasInsolvency ? ["Insolvency proceedings detected — verify title before exchange"] : []),
    ...(hasLisPendens ? ["Lis pendens registered — independent legal review required"] : []),
    ...(inFloodZone ? ["Flood zone designation — review insurance implications"] : []),
    ...(epcMeesRisk ? [`MEES risk: ${epcMeesRisk}`] : []),
    ...signals.slice(0, 3),
    ...keyRisks.slice(0, 4),
  ].slice(0, 8);

  const epcGrade = epcRating ?? "";
  const epcClass = epcGrade <= "C" ? "bl" : epcGrade <= "D" ? "bm" : "bh";
  const epcMeesOk = epcGrade <= "E";

  const calloutClass = recommendation === "PASS" ? "cd" : recommendation === "CONDITIONAL" ? "cw" : "cs";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>IC Memo — {address}</title>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>

        {/* ═══ COVER PAGE ════════════════════════════════════════════════════ */}
        <div className="page cover">
          <div className="clogo">DEALSCOPE</div>
          <div className="ctype">Investment Committee Memorandum</div>
          <div className="ctitle">{headline}</div>
          <div className="csub">{address}</div>
          <div className="cdiv" />
          <div className="cstatus" style={{ borderColor: rc, color: rc }}>
            {recLabel(recommendation)}
          </div>
          <div className="cmetrics">
            <div className="cmetric">
              <div className="cmla">Asking Price</div>
              <div className="cmva">{fmt(askingPrice ?? guidePrice, sym)}</div>
            </div>
            <div className="cmetric">
              <div className="cmla">Total Cost In</div>
              <div className="cmva">{fmt(totalCostIn, sym)}</div>
            </div>
            <div className="cmetric">
              <div className="cmla">Asset Type</div>
              <div className="cmva" style={{ fontSize: "12pt" }}>{assetType}</div>
            </div>
            <div className="cmetric">
              <div className="cmla">NLA</div>
              <div className="cmva">{sqft ? `${sqft.toLocaleString()} sq ft` : "—"}</div>
            </div>
          </div>
          {confidential && (
            <div className="cfoot">
              Strictly Confidential — Not for Distribution<br />
              Prepared by DealScope Analysis Engine · {dateStr}
            </div>
          )}
          {!confidential && (
            <div className="cfoot">
              Prepared by DealScope Analysis Engine · {dateStr}
            </div>
          )}
        </div>

        {/* ═══ EXECUTIVE SUMMARY ══════════════════════════════════════════════ */}
        <Page address={address}>
          <h2>Executive Summary</h2>
          <p className="lead">{investmentThesis}</p>

          <h3>Key Metrics</h3>
          <div className="mr">
            <div className="mb">
              <div className="ml">Deal Score</div>
              <div className="mv" style={{ color: rc }}>{dealScore}/100</div>
              <div className="ms">{recommendation}</div>
            </div>
            <div className="mb">
              <div className="ml">IRR (10yr)</div>
              <div className="mv" style={{ color: irrClr }}>{pct(irr)}</div>
              <div className="ms">Unlevered</div>
            </div>
            <div className="mb">
              <div className="ml">Equity Multiple</div>
              <div className="mv" style={{ color: emClr }}>{equityMultiple.toFixed(2)}×</div>
              <div className="ms">Unlevered</div>
            </div>
            <div className="mb">
              <div className="ml">Total Cost In</div>
              <div className="mv" style={{ fontSize: "11pt" }}>{fmt(totalCostIn, sym)}</div>
              <div className="ms">Inc. SDLT + fees</div>
            </div>
          </div>

          <h3>Pricing Summary</h3>
          <table>
            <thead>
              <tr><th>Valuation Metric</th><th className="tr">Value</th><th>Commentary</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Asking Price</td>
                <td className="tr tn">{fmtFull(askingPrice ?? guidePrice, sym)}</td>
                <td>Listed price</td>
              </tr>
              {noi != null && (
                <tr>
                  <td>Stabilised NOI</td>
                  <td className="tr tn">{fmtFull(noi, sym)}</td>
                  <td>Net operating income</td>
                </tr>
              )}
              {capRate != null && (
                <tr>
                  <td>Entry Cap Rate</td>
                  <td className="tr tn">{pct(capRate)}</td>
                  <td>Based on passing rent</td>
                </tr>
              )}
              {exitValue != null && (
                <tr className="hl">
                  <td><strong>Exit Value (Base Case)</strong></td>
                  <td className="tr tn"><strong>{fmtFull(exitValue, sym)}</strong></td>
                  <td><strong>10-year projection</strong></td>
                </tr>
              )}
            </tbody>
          </table>

          {allRisks.length > 0 && (
            <>
              <h3>Key Risk Flags</h3>
              <div className="mr">
                {allRisks.slice(0, 4).map((r, i) => (
                  <div key={i} className="mb">
                    <div className="badge" style={{ borderColor: riskSeverityColor(i), color: riskSeverityColor(i), background: `${riskSeverityColor(i)}18` }}>
                      {riskSeverityLabel(i)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: "7.5pt", color: "#d4d4d8" }}>{r}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={`callout ${calloutClass} nb`}>
            <h4>DECISION</h4>
            <p className="mb0">
              <strong style={{ color: rc }}>
                {recommendation === "PROCEED"
                  ? "PROCEED — Transaction merits further due diligence and negotiation."
                  : recommendation === "CONDITIONAL"
                  ? "CONDITIONAL — Proceed subject to satisfactory resolution of key risks."
                  : "DO NOT PROCEED — Risk-adjusted returns insufficient at asking price."}
              </strong>
              {keyOpportunities.length > 0 && (
                <span style={{ color: "#d4d4d8" }}> Key upside: {keyOpportunities[0]}</span>
              )}
            </p>
          </div>
        </Page>

        {/* ═══ ASSET OVERVIEW ══════════════════════════════════════════════════ */}
        <Page address={address}>
          <h2>Asset Overview</h2>

          <h3>Physical Characteristics</h3>
          <table>
            <tbody>
              <tr><td style={{ width: "40%" }}><strong>Address</strong></td><td>{address}</td></tr>
              <tr><td><strong>Asset Type</strong></td><td>{assetType}</td></tr>
              {tenure && <tr><td><strong>Tenure</strong></td><td>{tenure}</td></tr>}
              {sqft != null && <tr><td><strong>Net Lettable Area (NLA)</strong></td><td className="tn">{sqft.toLocaleString()} sq ft</td></tr>}
              {yearBuilt != null && <tr><td><strong>Year Built</strong></td><td className="tn">{yearBuilt}</td></tr>}
              {epcRating && (
                <tr>
                  <td><strong>EPC Rating</strong></td>
                  <td><span className={`badge ${epcClass}`}>{epcRating}</span></td>
                </tr>
              )}
              <tr>
                <td><strong>Asking / Guide Price</strong></td>
                <td className="tn">{fmtFull(askingPrice ?? guidePrice, sym)}</td>
              </tr>
              {sqft != null && (askingPrice ?? guidePrice) != null && (
                <tr>
                  <td><strong>Price Per Sq Ft</strong></td>
                  <td className="tn">{sym}{Math.round((askingPrice ?? guidePrice ?? 0) / sqft).toLocaleString()} psf</td>
                </tr>
              )}
            </tbody>
          </table>

          {(passingRent != null || erv != null) && (
            <>
              <h3>Income Profile</h3>
              <table>
                <tbody>
                  {passingRent != null && (
                    <tr>
                      <td style={{ width: "40%" }}><strong>Passing Rent (p.a.)</strong></td>
                      <td className="tn">{fmtFull(passingRent, sym)}</td>
                      <td>{sqft ? `${sym}${(passingRent / sqft).toFixed(2)} psf` : ""}</td>
                    </tr>
                  )}
                  {erv != null && (
                    <tr>
                      <td><strong>ERV (p.a.)</strong></td>
                      <td className="tn">{fmtFull(erv, sym)}</td>
                      <td>{sqft ? `${sym}${(erv / sqft).toFixed(2)} psf` : ""}</td>
                    </tr>
                  )}
                  {passingRent != null && erv != null && erv > passingRent && (
                    <tr className="hl">
                      <td><strong>Reversionary Potential</strong></td>
                      <td className="tn">+{sym}{(erv - passingRent).toLocaleString()} p.a.</td>
                      <td>+{((erv - passingRent) / passingRent * 100).toFixed(1)}% uplift</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {keyOpportunities.length > 0 && (
            <>
              <h3>Key Opportunities</h3>
              <ul>
                {keyOpportunities.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </>
          )}
        </Page>

        {/* ═══ FINANCIAL ANALYSIS ════════════════════════════════════════════ */}
        <Page address={address}>
          <h2>Financial Analysis</h2>

          <h3>Investment Returns</h3>
          <div className="mr">
            <div className="mb">
              <div className="ml">IRR (10yr, unlevered)</div>
              <div className="mv" style={{ color: irrClr }}>{pct(irr)}</div>
            </div>
            <div className="mb">
              <div className="ml">Equity Multiple</div>
              <div className="mv" style={{ color: emClr }}>{equityMultiple.toFixed(2)}×</div>
              <div className="ms">Unlevered</div>
            </div>
            <div className="mb">
              <div className="ml">NOI</div>
              <div className="mv" style={{ fontSize: "11pt" }}>{fmt(noi, sym)}</div>
              <div className="ms">Net operating income</div>
            </div>
            <div className="mb">
              <div className="ml">Exit Value</div>
              <div className="mv" style={{ fontSize: "11pt" }}>{fmt(exitValue, sym)}</div>
              <div className="ms">10-year projection</div>
            </div>
          </div>

          <h3>Acquisition Costs</h3>
          <table>
            <thead>
              <tr><th>Cost Component</th><th className="tr">Amount</th><th>Commentary</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Purchase Price</td>
                <td className="tr tn">{fmtFull(askingPrice ?? guidePrice, sym)}</td>
                <td>Asking / guide price</td>
              </tr>
              <tr className="hl">
                <td><strong>Total Cost In (Est.)</strong></td>
                <td className="tr tn"><strong>{fmtFull(totalCostIn, sym)}</strong></td>
                <td><strong>Inc. SDLT, legal, arrangement fees</strong></td>
              </tr>
            </tbody>
          </table>

          {(passingRent != null || erv != null || capRate != null || noi != null) && (
            <>
              <h3>Income & Yield Analysis</h3>
              <table>
                <tbody>
                  {passingRent != null && (
                    <tr>
                      <td style={{ width: "50%" }}><strong>Passing Rent (p.a.)</strong></td>
                      <td className="tn">{fmtFull(passingRent, sym)}</td>
                    </tr>
                  )}
                  {erv != null && (
                    <tr>
                      <td><strong>ERV (p.a.)</strong></td>
                      <td className="tn">{fmtFull(erv, sym)}</td>
                    </tr>
                  )}
                  {capRate != null && (
                    <tr>
                      <td><strong>Cap Rate / Initial Yield</strong></td>
                      <td className="tn">{pct(capRate)}</td>
                    </tr>
                  )}
                  {noi != null && (
                    <tr>
                      <td><strong>Net Operating Income</strong></td>
                      <td className="tn">{fmtFull(noi, sym)}</td>
                    </tr>
                  )}
                  {exitValue != null && (
                    <tr className="hl">
                      <td><strong>Projected Exit Value (10yr)</strong></td>
                      <td className="tn"><strong>{fmtFull(exitValue, sym)}</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {waveF?.asIs && waveF?.refurb && (
            <>
              <h3>As-is vs. Post-refurb Valuation</h3>
              {waveF.condition && (
                <p style={{ fontSize: "8.5pt", color: "#a1a1aa", marginBottom: "6pt" }}>
                  Building condition detected as <strong>{waveF.condition}</strong>
                  {waveF.conditionSignals && waveF.conditionSignals.length > 0
                    ? ` (signals: ${waveF.conditionSignals.slice(0, 3).join(", ")})`
                    : ""}
                  . As-is values reflect current condition; refurb scenario assumes repositioning to top-of-band.
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="tr">As-is</th>
                    <th className="tr">Post-refurb</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>ERV (p.a.)</strong></td>
                    <td className="tr tn">{fmtFull(waveF.asIs.erv, sym)}</td>
                    <td className="tr tn">{fmtFull(waveF.refurb.erv, sym)}</td>
                  </tr>
                  {(waveF.asIs.ervPsf != null || waveF.refurb.ervPsf != null) && (
                    <tr>
                      <td><strong>ERV / sq ft</strong></td>
                      <td className="tr tn">{waveF.asIs.ervPsf != null ? `${sym}${waveF.asIs.ervPsf.toFixed(2)}` : "—"}</td>
                      <td className="tr tn">{waveF.refurb.ervPsf != null ? `${sym}${waveF.refurb.ervPsf.toFixed(2)}` : "—"}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>NOI (p.a.)</strong></td>
                    <td className="tr tn">{fmtFull(waveF.asIs.noi, sym)}</td>
                    <td className="tr tn">{fmtFull(waveF.refurb.noi, sym)}</td>
                  </tr>
                  <tr>
                    <td><strong>Capitalised value</strong></td>
                    <td className="tr tn">{fmtFull(waveF.asIs.value, sym)}</td>
                    <td className="tr tn">{fmtFull(waveF.refurb.grossValue, sym)}</td>
                  </tr>
                  <tr>
                    <td><strong>Capex deduction</strong></td>
                    <td className="tr tn" style={{ color: "#71717a" }}>—</td>
                    <td className="tr tn" style={{ color: "#ef4444" }}>−{fmtFull(waveF.refurb.capexTotal, sym)}</td>
                  </tr>
                  <tr className="hl">
                    <td><strong>Net value to investor</strong></td>
                    <td className="tr tn" style={{ color: waveF.asIs.clearsAsking ? "#22c55e" : "#ef4444" }}>
                      <strong>{fmtFull(waveF.asIs.value, sym)}</strong>
                    </td>
                    <td className="tr tn" style={{ color: waveF.refurb.clearsAsking ? "#22c55e" : "#ef4444" }}>
                      <strong>{fmtFull(waveF.refurb.value, sym)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: "7.5pt", color: "#71717a", marginTop: "-4pt" }}>
                Capex assumption: {sym}{waveF.refurb.capexPsf}/sq ft ({waveF.refurb.capexSource}).
                {" "}As-is {waveF.asIs.clearsAsking ? "clears" : "does not clear"} asking;
                {" "}refurb-net {waveF.refurb.clearsAsking ? "clears" : "does not clear"} asking.
              </p>

              {(waveF.askingPsf != null || waveF.compPsfBand) && (
                <>
                  <h4>Price-per-sq-ft Sanity Check</h4>
                  <table>
                    <tbody>
                      {waveF.askingPsf != null && (
                        <tr>
                          <td style={{ width: "50%" }}><strong>Asking £/sq ft</strong></td>
                          <td className="tn">{sym}{waveF.askingPsf.toLocaleString()}</td>
                        </tr>
                      )}
                      {waveF.compPsfBand && (waveF.compPsfBand.low != null || waveF.compPsfBand.high != null) && (
                        <tr>
                          <td>
                            <strong>
                              Comp band £/sq ft
                              {waveF.compPsfBand.sampleSize ? ` (n=${waveF.compPsfBand.sampleSize})` : ""}
                            </strong>
                          </td>
                          <td className="tn">
                            {sym}{waveF.compPsfBand.low ?? "—"} – {sym}{waveF.compPsfBand.high ?? "—"}
                          </td>
                        </tr>
                      )}
                      {waveF.askingPsf != null &&
                        waveF.compPsfBand?.low != null &&
                        waveF.askingPsf < waveF.compPsfBand.low * 0.9 && (
                          <tr className="hl">
                            <td><strong>Verdict</strong></td>
                            <td style={{ color: "#22c55e" }}>
                              <strong>Below comp band low — clearly cheap on £/sq ft</strong>
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </>
              )}

              {waveF.recommendation && (
                <div className={`callout ${waveF.recommendation === "BUY" ? "cs" : waveF.recommendation === "PASS" ? "cd" : "cw"} nb`}>
                  <h4>SCENARIO-BASED RECOMMENDATION</h4>
                  <p>
                    <strong style={{ color: waveF.recommendation === "BUY" ? "#16a34a" : waveF.recommendation === "PASS" ? "#dc2626" : "#d97706" }}>
                      {waveF.recommendation}
                    </strong>
                  </p>
                  {waveF.recommendationReasons && waveF.recommendationReasons.length > 0 && (
                    <ul style={{ margin: "4pt 0 0 16pt" }}>
                      {waveF.recommendationReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {cashFlows.length > 0 && (
            <>
              <h3>Cash Flow Summary</h3>
              <table>
                <thead>
                  <tr><th>Year</th><th className="tr">Cash Flow</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {cashFlows.slice(0, 10).map((cf) => (
                    <tr key={cf.year}>
                      <td className="tn">{cf.year}</td>
                      <td className="tr tn" style={{ color: cf.amount >= 0 ? "#22c55e" : "#ef4444" }}>
                        {cf.amount >= 0 ? "+" : ""}{fmtFull(Math.abs(cf.amount), sym)}
                      </td>
                      <td style={{ color: "#a1a1aa" }}>{cf.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Page>

        {/* ═══ RISK ASSESSMENT ═══════════════════════════════════════════════ */}
        <Page address={address}>
          <h2>Risk Assessment</h2>

          {riskSummary && <p className="lead">{riskSummary}</p>}

          <h3>Risk Flags</h3>
          {allRisks.length > 0 ? (
            <div style={{ marginBottom: "12pt" }}>
              {allRisks.map((r, i) => (
                <div key={i} className="rrow">
                  <div className="rdot" style={{ background: riskSeverityColor(i) }} />
                  <div className="rtxt">{r}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="callout cs nb">
              <p className="mb0">No material risk flags identified at this stage of analysis.</p>
            </div>
          )}

          {epcRating && (
            <>
              <h3>Environmental & ESG</h3>
              <table>
                <tbody>
                  <tr>
                    <td style={{ width: "40%" }}><strong>EPC Rating</strong></td>
                    <td><span className={`badge ${epcClass}`}>{epcRating}</span></td>
                  </tr>
                  <tr>
                    <td><strong>MEES Compliance</strong></td>
                    <td>{epcMeesOk ? "✓ Compliant (min E required from April 2023)" : "✗ Below minimum E — remediation required"}</td>
                  </tr>
                  {epcMeesRisk && (
                    <tr>
                      <td><strong>Future MEES Risk</strong></td>
                      <td>{epcMeesRisk}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Flood Risk</strong></td>
                    <td>{inFloodZone ? "⚠ Flood zone — review insurance and lender requirements" : "Zone 1 (low probability, <0.1% annual)"}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {(hasInsolvency || hasLisPendens) && (
            <div className="callout cd nb">
              <h4>LEGAL ALERTS</h4>
              {hasInsolvency && <p>⚠ <strong>Insolvency proceedings detected.</strong> Verify title and ownership chain before exchange.</p>}
              {hasLisPendens && <p className="mb0">⚠ <strong>Lis pendens registered.</strong> Active litigation — independent legal review mandatory.</p>}
            </div>
          )}

          {keyRisks.length > 0 && (
            <>
              <h3>Risk Register</h3>
              <table>
                <thead>
                  <tr><th>Risk Factor</th><th>Severity</th></tr>
                </thead>
                <tbody>
                  {keyRisks.map((r, i) => (
                    <tr key={i}>
                      <td>{r}</td>
                      <td>
                        <span className={`badge ${i < 2 ? "bh" : i < 4 ? "bm" : "bl"}`}>
                          {riskSeverityLabel(i)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Page>

        {/* ═══ RECOMMENDATION ════════════════════════════════════════════════ */}
        <Page address={address}>
          <h2>Recommendation</h2>

          <div className={`callout ${calloutClass} nb`}>
            <h4>COMMITTEE RECOMMENDATION</h4>
            <p>
              <strong style={{ color: rc, fontSize: "12pt" }}>{recLabel(recommendation)}</strong>
            </p>
            {confidential && (
              <p className="mb0" style={{ fontSize: "8pt", color: "#71717a" }}>
                STRICTLY CONFIDENTIAL — NOT FOR DISTRIBUTION
              </p>
            )}
          </div>

          <h3>Investment Thesis</h3>
          <p>{investmentThesis}</p>

          {keyOpportunities.length > 0 && (
            <>
              <h3>Key Opportunities</h3>
              <ul>
                {keyOpportunities.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </>
          )}

          {keyRisks.length > 0 && (
            <>
              <h3>Key Risks</h3>
              <ul>
                {keyRisks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}

          <h3>Deal Summary</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ width: "50%" }}><strong>Recommendation</strong></td>
                <td style={{ color: rc }}><strong>{recommendation}</strong></td>
              </tr>
              <tr>
                <td><strong>Deal Score</strong></td>
                <td className="tn">{dealScore} / 100</td>
              </tr>
              <tr>
                <td><strong>IRR (10yr, unlevered)</strong></td>
                <td className="tn" style={{ color: irrClr }}>{pct(irr)}</td>
              </tr>
              <tr>
                <td><strong>Equity Multiple (unlevered)</strong></td>
                <td className="tn" style={{ color: emClr }}>{equityMultiple.toFixed(2)}×</td>
              </tr>
              <tr>
                <td><strong>Total Cost In</strong></td>
                <td className="tn">{fmtFull(totalCostIn, sym)}</td>
              </tr>
              {exitValue != null && (
                <tr className="hl">
                  <td><strong>Exit Value (10yr)</strong></td>
                  <td className="tn"><strong>{fmtFull(exitValue, sym)}</strong></td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="callout ci nb mt3">
            <h4>PREPARED BY</h4>
            <p className="mb0">
              DealScope Analysis Engine · {dateStr}<br />
              <span style={{ fontSize: "8pt", color: "#71717a" }}>
                This memorandum is generated automatically from property data and financial modelling.
                All assumptions should be verified against current market data before investment decisions are made.
              </span>
            </p>
          </div>
        </Page>

      </body>
    </html>
  );
}

/**
 * src/lib/dealscope/exports/ic-memo-template.tsx
 * DS-T24: IC Memo HTML template (React component for server-side rendering).
 *
 * Sections: Executive Summary, Property Overview, Financial Analysis,
 *           Risk Assessment, Recommendation.
 *
 * Re-exports `renderMemoHTML` from the canonical template in src/lib/dealscope-memo-template.ts
 * and exposes a typed React component for programmatic use.
 */

import React from "react";
export { renderMemoHTML, type MemoData } from "@/lib/dealscope-memo-template";

// ── IC Memo section types ─────────────────────────────────────────────────────
export interface ICMemoProps {
  // Executive summary
  headline: string;
  recommendation: "PROCEED" | "CONDITIONAL" | "PASS";
  dealScore: number;
  irr: number;        // 0–1
  equityMultiple: number;
  totalCostIn: number;
  currency: string;

  // Property overview
  address: string;
  assetType: string;
  sqft: number | null;
  tenure: string | null;
  yearBuilt: number | null;
  epcRating: string | null;
  askingPrice: number | null;
  guidePrice: number | null;

  // Financial analysis
  passingRent: number | null;      // annual
  erv: number | null;              // annual
  capRate: number | null;          // 0–1
  noi: number | null;
  exitValue: number | null;
  cashFlows: Array<{ year: number; amount: number; description: string }>;

  // Risk assessment
  signals: string[];
  hasInsolvency: boolean;
  hasLisPendens: boolean;
  inFloodZone: boolean;
  epcMeesRisk: string | null;
  riskSummary: string | null;

  // Recommendation
  investmentThesis: string;
  keyRisks: string[];
  keyOpportunities: string[];
  confidential: boolean;
  generatedAt: string;
}

function fmt(n: number | null | undefined, sym = "£"): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(0)}k`;
  return `${sym}${n.toLocaleString()}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * ICMemoTemplate — React component for server-side rendering.
 * Produces a self-contained HTML string when rendered to static markup.
 */
export function ICMemoTemplate({
  headline,
  recommendation,
  dealScore,
  irr,
  equityMultiple,
  totalCostIn,
  currency,
  address,
  assetType,
  sqft,
  tenure,
  yearBuilt,
  epcRating,
  askingPrice,
  guidePrice,
  passingRent,
  erv,
  capRate,
  noi,
  exitValue,
  cashFlows,
  signals,
  hasInsolvency,
  hasLisPendens,
  inFloodZone,
  epcMeesRisk,
  riskSummary,
  investmentThesis,
  keyRisks,
  keyOpportunities,
  confidential,
  generatedAt,
}: ICMemoProps): React.ReactElement {
  const sym = currency === "GBP" ? "£" : "$";
  const recColor = recommendation === "PROCEED" ? "#34d399" : recommendation === "CONDITIONAL" ? "#fbbf24" : "#f87171";
  const irrColor = irr >= 0.12 ? "#34d399" : irr >= 0.07 ? "#fbbf24" : "#f87171";
  const emColor = equityMultiple >= 1.8 ? "#34d399" : equityMultiple >= 1.2 ? "#fbbf24" : "#f87171";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>IC Memo — {address}</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; background: #09090b; color: #e4e4ec; font-size: 13px; line-height: 1.5; }
          .page { max-width: 860px; margin: 0 auto; padding: 48px 40px; }
          .header { border-bottom: 2px solid #7c6af0; padding-bottom: 24px; margin-bottom: 32px; }
          .header h1 { font-size: 26px; font-weight: 600; color: #fff; margin-bottom: 4px; }
          .header .sub { font-size: 12px; color: #888; }
          .confidential { font-size: 10px; color: #f87171; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
          .section { margin-bottom: 32px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7c6af0; margin-bottom: 12px; }
          .card { background: #111116; border: 1px solid #252533; border-radius: 8px; padding: 18px 20px; margin-bottom: 12px; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #252533; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
          .kpi { background: #111116; padding: 14px 16px; }
          .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555568; margin-bottom: 4px; }
          .kpi-val { font-size: 20px; font-weight: 600; color: #e4e4ec; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #1a1a26; }
          .row:last-child { border-bottom: none; }
          .row-label { color: #888; font-size: 12px; }
          .row-val { font-size: 12px; font-weight: 500; }
          .rec-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 8px 12px; background: #18181f; color: #7c6af0; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
          td { padding: 7px 12px; border-bottom: 1px solid #1a1a26; color: #e4e4ec; }
          .risk { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; }
          .risk-dot { width: 6px; height: 6px; border-radius: 50%; background: #f87171; flex-shrink: 0; margin-top: 5px; }
          ul { padding-left: 18px; }
          li { margin-bottom: 4px; font-size: 12px; color: #ccc; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #252533; font-size: 10px; color: #555568; display: flex; justify-content: space-between; }
        `}</style>
      </head>
      <body>
        <div className="page">
          {confidential && <div className="confidential">Strictly confidential — not for distribution</div>}

          <div className="header">
            <h1>{headline}</h1>
            <div className="sub">{address} · Generated {new Date(generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>

          {/* 1. Executive Summary */}
          <div className="section">
            <div className="section-title">1. Executive Summary</div>
            <div className="kpi-row">
              <div className="kpi">
                <div className="kpi-label">Recommendation</div>
                <div className="kpi-val"><span className="rec-badge" style={{ background: `${recColor}22`, color: recColor }}>{recommendation}</span></div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Deal score</div>
                <div className="kpi-val" style={{ color: recColor }}>{dealScore}/100</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">IRR (10yr)</div>
                <div className="kpi-val" style={{ color: irrColor }}>{pct(irr)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Equity multiple</div>
                <div className="kpi-val" style={{ color: emColor }}>{equityMultiple.toFixed(2)}×</div>
              </div>
            </div>
            <div className="card">
              <div className="row"><span className="row-label">Investment thesis</span></div>
              <p style={{ marginTop: 8, fontSize: 12, color: "#ccc", lineHeight: 1.7 }}>{investmentThesis}</p>
            </div>
          </div>

          {/* 2. Property Overview */}
          <div className="section">
            <div className="section-title">2. Property Overview</div>
            <div className="card">
              <div className="row"><span className="row-label">Asset type</span><span className="row-val">{assetType}</span></div>
              <div className="row"><span className="row-label">Address</span><span className="row-val">{address}</span></div>
              {sqft != null && <div className="row"><span className="row-label">Size</span><span className="row-val">{sqft.toLocaleString()} sqft</span></div>}
              {tenure && <div className="row"><span className="row-label">Tenure</span><span className="row-val">{tenure}</span></div>}
              {yearBuilt && <div className="row"><span className="row-label">Year built</span><span className="row-val">{yearBuilt}</span></div>}
              {epcRating && <div className="row"><span className="row-label">EPC rating</span><span className="row-val">{epcRating}</span></div>}
              <div className="row"><span className="row-label">Asking price</span><span className="row-val">{fmt(askingPrice ?? guidePrice, sym)}</span></div>
              <div className="row"><span className="row-label">Total cost in</span><span className="row-val">{fmt(totalCostIn, sym)}</span></div>
            </div>
          </div>

          {/* 3. Financial Analysis */}
          <div className="section">
            <div className="section-title">3. Financial Analysis</div>
            <div className="card">
              {passingRent != null && <div className="row"><span className="row-label">Passing rent (pa)</span><span className="row-val" style={{ color: "#34d399" }}>{fmt(passingRent, sym)}</span></div>}
              {erv != null && <div className="row"><span className="row-label">ERV (pa)</span><span className="row-val">{fmt(erv, sym)}</span></div>}
              {capRate != null && <div className="row"><span className="row-label">Cap rate</span><span className="row-val">{pct(capRate)}</span></div>}
              {noi != null && <div className="row"><span className="row-label">Net operating income</span><span className="row-val">{fmt(noi, sym)}</span></div>}
              {exitValue != null && <div className="row"><span className="row-label">Exit value (10yr)</span><span className="row-val" style={{ color: "#34d399" }}>{fmt(exitValue, sym)}</span></div>}
            </div>
            {cashFlows.length > 0 && (
              <table>
                <thead><tr><th>Year</th><th>Cash flow</th><th>Note</th></tr></thead>
                <tbody>
                  {cashFlows.map(cf => (
                    <tr key={cf.year}>
                      <td>{cf.year}</td>
                      <td style={{ color: cf.amount >= 0 ? "#34d399" : "#f87171" }}>
                        {cf.amount >= 0 ? "+" : ""}{fmt(Math.abs(cf.amount), sym)}
                      </td>
                      <td style={{ color: "#888" }}>{cf.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 4. Risk Assessment */}
          <div className="section">
            <div className="section-title">4. Risk Assessment</div>
            <div className="card">
              {riskSummary && <p style={{ fontSize: 12, color: "#ccc", marginBottom: 12 }}>{riskSummary}</p>}
              {hasInsolvency && <div className="risk"><div className="risk-dot" /><span>Insolvency proceedings detected — verify title</span></div>}
              {hasLisPendens && <div className="risk"><div className="risk-dot" /><span>Lis pendens registered — legal review required</span></div>}
              {inFloodZone && <div className="risk"><div className="risk-dot" style={{ background: "#fbbf24" }} /><span>Flood zone designation — insurance implications</span></div>}
              {epcMeesRisk && <div className="risk"><div className="risk-dot" style={{ background: "#fbbf24" }} /><span>MEES risk: {epcMeesRisk}</span></div>}
              {signals.map((s, i) => <div key={i} className="risk"><div className="risk-dot" style={{ background: "#888" }} /><span>{s}</span></div>)}
              {keyRisks.length > 0 && <ul style={{ marginTop: 8 }}>{keyRisks.map((r, i) => <li key={i}>{r}</li>)}</ul>}
              {!hasInsolvency && !hasLisPendens && !inFloodZone && signals.length === 0 && keyRisks.length === 0 && (
                <p style={{ fontSize: 11, color: "#555568" }}>No material risk flags identified at this stage.</p>
              )}
            </div>
          </div>

          {/* 5. Recommendation */}
          <div className="section">
            <div className="section-title">5. Recommendation</div>
            <div className="card">
              <div className="row">
                <span className="row-label">Committee recommendation</span>
                <span className="rec-badge" style={{ background: `${recColor}22`, color: recColor }}>{recommendation}</span>
              </div>
              {keyOpportunities.length > 0 && (
                <>
                  <div className="row-label" style={{ marginTop: 12, marginBottom: 6 }}>Key opportunities</div>
                  <ul>{keyOpportunities.map((o, i) => <li key={i}>{o}</li>)}</ul>
                </>
              )}
            </div>
          </div>

          <div className="footer">
            <span>RealHQ — Every asset earning what it should</span>
            <span>Generated {new Date(generatedAt).toLocaleString()}</span>
          </div>
        </div>
      </body>
    </html>
  );
}

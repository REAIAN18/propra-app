/**
 * src/lib/dealscope/exports/ic-memo-template.tsx
 * DS-T24: IC Memo HTML template (React component for server-side rendering).
 *
 * Multi-page A4 layout matching designs/ic-memo-template.html:
 *   1. Cover Page
 *   2. Executive Summary
 *   3. Asset Overview
 *   4. Planning & Environmental
 *   5. Market Analysis
 *   6. Comparable Evidence
 *   7. Financial Summary
 *   8. Investment Decision
 *
 * Sections render conditionally — pages without supporting data are omitted
 * rather than padded with placeholder text.
 */

import React from "react";

// ── Type definitions ─────────────────────────────────────────────────────────

export interface MemoData {
  // Identity
  id: string;
  address: string;
  confidential: boolean;
  generatedAt: string;
  currency: string;

  // Headline / verdict
  recommendation: "PROCEED" | "CONDITIONAL" | "PASS";
  dealScore: number;
  verdictReasons: string[];
  verdictConditions: string[] | null;

  // Cover metrics
  askingPrice: number | null;
  guidePrice: number | null;
  targetEntry: number | null;
  assetType: string;
  sqft: number | null;

  // Executive summary
  irr: number;
  equityMultiple: number;
  totalCostIn: number;
  investmentThesis: string;

  // Asset / physical
  tenure: string | null;
  yearBuilt: number | null;
  occupancyPct: number | null;
  propertyType: string | null;
  numberOfUnits: number | null;
  accommodation: string | null;
  condition: string | null;
  keyFeatures: string[];
  listingDescription: string | null;
  brokerName: string | null;
  daysOnMarket: number | null;

  // Tenancy
  tenantNames: string[];
  leaseExpiry: string | null;
  breakDates: string | null;
  serviceCharge: number | null;
  groundRent: number | null;
  aiVacancy: string | null;

  // Location
  geocode: { lat: number | null; lng: number | null; formatted: string | null } | null;
  satelliteImageUrl: string | null;
  region: string | null;

  // Planning & environmental
  planningApplications: Array<{
    reference: string | null;
    description: string;
    status: string | null;
    date: string | null;
  }>;
  epc: {
    rating: string | null;
    potential: string | null;
    validUntil: string | null;
    meesRisk: string | null;
    co2: string | null;
  } | null;
  floodZone: { inZone: boolean; zone: string | null; description: string | null } | null;
  devPotential: {
    summary: string | null;
    permittedDevelopment: boolean;
    residualValue: number | null;
  } | null;

  // Financials
  passingRent: number | null;
  erv: number | null;
  capRate: number | null;
  noi: number | null;
  exitValue: number | null;
  cashFlows: Array<{ year: number; amount: number; description: string }>;
  rentGap: {
    passingRent: number | null;
    erv: number | null;
    gap: number | null;
    gapPct: number | null;
    direction: string | null;
  } | null;
  valuations: {
    incomeCap: number | null;
    blended: number | null;
    confidence: number | null;
    asking: number | null;
    discount: number | null;
  } | null;
  returns: {
    capRate: number | null;
    irr5yr: number | null;
    cashOnCash: number | null;
    equityMultiple: number | null;
    equityNeeded: number | null;
  } | null;
  scenarios: Array<{
    name: string;
    irr: string | null;
    equityMultiple: string | null;
    cashYield: string | null;
    npv: number | null;
  }>;
  assumptions: Record<string, { value: unknown; source: string | null }> | null;

  // Market
  market: {
    capRate: number | null;
    ervPsf: number | null;
    vacancyRate: number | null;
    primeYield: number | null;
    secondaryYield: number | null;
    dscr: number | null;
    annualDebtService: number | null;
    notes: string | null;
  } | null;

  // Comparables
  comparables: Array<{
    address: string;
    sqft: number | null;
    price: number | null;
    rentPsf: number | null;
    yieldPct: number | null;
    date: string | null;
    distance: string | null;
    source: string | null;
    tenancy: string | null;
    incentive: string | null;
  }>;

  // Risk
  keyRisks: string[];
  keyOpportunities: string[];
  signals: string[];
  hasInsolvency: boolean;
  hasLisPendens: boolean;
  inFloodZone: boolean;
  confidence: number | null;
  confidenceLevel: string | null;

  // Ownership
  ownerName: string | null;
  companyOwner: {
    name: string | null;
    number: string | null;
    status: string | null;
    incorporated: string | null;
  } | null;
  ownerPortfolio: Array<{ address: string; value: number | null }>;
  covenantStrength: { rating: string | null; summary: string | null } | null;

  // Deep analysis
  dealAnalysis: { summary: string | null; dcfValue: number | null; npv: number | null } | null;
  ricsAnalysis: {
    recommendation: string | null;
    marketValue: number | null;
    confidence: string | null;
    notes: string | null;
  } | null;
}

// ── Formatters ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, sym = "£"): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `${sym}${(n / 1_000).toFixed(0)}k`;
  return `${sym}${Math.round(n).toLocaleString()}`;
}

function fmtFull(n: number | null | undefined, sym = "£"): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${sym}${Math.round(n).toLocaleString()}`;
}

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function pctRaw(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtSqft(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString()} sq ft`;
}

// ── Color helpers ───────────────────────────────────────────────────────────

const COLORS = {
  bg: "#09090b",
  card: "#18181b",
  border: "#27272a",
  borderLight: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  accent: "#7c6af0",
  accentLight: "#9b8ff5",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

function recColor(rec: MemoData["recommendation"]): string {
  return rec === "PROCEED" ? COLORS.green : rec === "CONDITIONAL" ? COLORS.amber : COLORS.red;
}

function recLabel(rec: MemoData["recommendation"]): string {
  return rec === "PROCEED" ? "✓ PROCEED" : rec === "CONDITIONAL" ? "⚠ CONDITIONAL OPPORTUNITY" : "✗ DO NOT PROCEED";
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function PageHeader({ address }: { address: string }) {
  return (
    <div className="page-header">
      <div className="page-header-left">{address}</div>
      <div className="page-header-right">Investment Committee Memorandum</div>
    </div>
  );
}

function PageFooter({ address }: { address: string }) {
  return (
    <div className="page-footer">
      <div>RealHQ IC Memorandum — {address}</div>
      <div>Confidential</div>
    </div>
  );
}

// ── Main template ───────────────────────────────────────────────────────────

export function ICMemoTemplate(d: MemoData): React.ReactElement {
  const sym = d.currency === "GBP" ? "£" : "$";
  const rcol = recColor(d.recommendation);
  const generatedDate = new Date(d.generatedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Conditional page rendering
  const hasPlanning = d.planningApplications.length > 0 || d.epc != null || d.floodZone != null || d.devPotential != null;
  const hasMarket = d.market != null || d.rentGap != null;
  const hasComparables = d.comparables.length > 0;
  const hasOwnership = d.companyOwner != null || d.ownerPortfolio.length > 0 || d.ownerName != null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>IC Memo — {d.address}</title>
        <style>{CSS}</style>
      </head>
      <body>
        {/* ===================================
            COVER PAGE
            =================================== */}
        <div className="page cover-page">
          <div className="cover-logo">REALHQ</div>
          <div className="cover-type">Investment Committee Memorandum</div>
          <h1 className="cover-title">{d.address}</h1>
          {d.geocode?.formatted && <div className="cover-subtitle">{d.geocode.formatted}</div>}

          <div className="cover-divider" />

          <div className="cover-status" style={{ borderColor: rcol, color: rcol }}>
            {recLabel(d.recommendation)}
          </div>

          <div className="cover-metrics">
            <div className="cover-metric">
              <div className="cover-metric-label">Asking Price</div>
              <div className="cover-metric-value">{fmt(d.askingPrice ?? d.guidePrice, sym)}</div>
            </div>
            <div className="cover-metric">
              <div className="cover-metric-label">Deal Score</div>
              <div className="cover-metric-value" style={{ color: rcol }}>
                {d.dealScore}/100
              </div>
            </div>
            <div className="cover-metric">
              <div className="cover-metric-label">Asset Type</div>
              <div className="cover-metric-value">{d.assetType || "—"}</div>
            </div>
            <div className="cover-metric">
              <div className="cover-metric-label">{d.assetType?.toLowerCase().includes("office") ? "NLA" : "Size"}</div>
              <div className="cover-metric-value">{fmtSqft(d.sqft)}</div>
            </div>
          </div>

          <div className="cover-footer-text">
            {d.confidential && (
              <>
                Strictly confidential — not for distribution
                <br />
              </>
            )}
            Prepared by RealHQ Analysis Engine — {generatedDate}
          </div>
        </div>

        {/* ===================================
            EXECUTIVE SUMMARY
            =================================== */}
        <div className="page">
          <PageHeader address={d.address} />
          <h2>Executive Summary</h2>

          <p className="lead">{d.investmentThesis}</p>

          <h3>Headline Metrics</h3>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Recommendation</div>
              <div className="metric-value" style={{ color: rcol, fontSize: "11pt" }}>
                {d.recommendation}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Deal Score</div>
              <div className="metric-value" style={{ color: rcol }}>
                {d.dealScore}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">IRR (10yr)</div>
              <div className="metric-value">{pct(d.irr)}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Equity Multiple</div>
              <div className="metric-value">{d.equityMultiple.toFixed(2)}×</div>
            </div>
          </div>

          {d.valuations && (
            <>
              <h3>Pricing Analysis</h3>
              <table>
                <thead>
                  <tr>
                    <th>Valuation Metric</th>
                    <th className="text-right">Value</th>
                    <th>Commentary</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Asking Price</td>
                    <td className="text-right table-number">{fmtFull(d.valuations.asking, sym)}</td>
                    <td>Vendor guide</td>
                  </tr>
                  {d.valuations.incomeCap != null && (
                    <tr>
                      <td>Income Capitalisation</td>
                      <td className="text-right table-number">{fmtFull(d.valuations.incomeCap, sym)}</td>
                      <td>NOI / cap rate</td>
                    </tr>
                  )}
                  {d.valuations.blended != null && (
                    <tr className="table-highlight">
                      <td>
                        <strong>Blended AVM</strong>
                      </td>
                      <td className="text-right table-number">
                        <strong>{fmtFull(d.valuations.blended, sym)}</strong>
                      </td>
                      <td>
                        {d.valuations.confidence != null
                          ? `Confidence ${(d.valuations.confidence * 100).toFixed(0)}%`
                          : "Income + comps blend"}
                      </td>
                    </tr>
                  )}
                  {d.valuations.discount != null && (
                    <tr>
                      <td>Discount to AVM</td>
                      <td className="text-right table-number">{d.valuations.discount}%</td>
                      <td>Asking vs AVM</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {d.verdictReasons.length > 0 && (
            <>
              <h3>Verdict Rationale</h3>
              <ul>
                {d.verdictReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}

          {d.verdictConditions && d.verdictConditions.length > 0 && (
            <div className="callout callout-warning no-break">
              <h4>Conditions for Approval</h4>
              <ul style={{ marginBottom: 0 }}>
                {d.verdictConditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            className={`callout no-break ${d.recommendation === "PASS" ? "callout-danger" : d.recommendation === "CONDITIONAL" ? "callout-warning" : "callout-success"}`}
          >
            <h4>Decision</h4>
            <p style={{ marginBottom: 0 }}>
              <strong style={{ color: rcol }}>{recLabel(d.recommendation)}</strong> at deal score {d.dealScore}/100.
              IRR {pct(d.irr)}, equity multiple {d.equityMultiple.toFixed(2)}×, total cost in {fmt(d.totalCostIn, sym)}.
            </p>
          </div>

          <PageFooter address={d.address} />
        </div>

        {/* ===================================
            ASSET OVERVIEW
            =================================== */}
        <div className="page">
          <PageHeader address={d.address} />
          <h2>Asset Overview</h2>

          {(d.geocode?.formatted || d.satelliteImageUrl) && (
            <>
              <h3>Location &amp; Access</h3>
              {d.satelliteImageUrl ? (
                <div className="figure">
                  <div className="figure-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="figure-image" src={d.satelliteImageUrl} alt="Aerial view" />
                  </div>
                  <div className="figure-caption">
                    <strong>Figure 1:</strong> Aerial view of {d.address}
                    {d.region ? ` — ${d.region}` : ""}.
                  </div>
                </div>
              ) : (
                <div className="figure">
                  <div className="figure-container">
                    <div className="map-placeholder">📍 {d.geocode?.formatted ?? d.address}</div>
                  </div>
                </div>
              )}
            </>
          )}

          <h3>Physical Characteristics</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ width: "40%" }}>
                  <strong>Address</strong>
                </td>
                <td>{d.address}</td>
              </tr>
              <tr>
                <td>
                  <strong>Asset Type</strong>
                </td>
                <td>
                  {d.assetType}
                  {d.propertyType ? ` — ${d.propertyType}` : ""}
                </td>
              </tr>
              {d.tenure && (
                <tr>
                  <td>
                    <strong>Tenure</strong>
                  </td>
                  <td>{d.tenure}</td>
                </tr>
              )}
              {d.sqft != null && (
                <tr>
                  <td>
                    <strong>Floor Area</strong>
                  </td>
                  <td className="table-number">{fmtSqft(d.sqft)}</td>
                </tr>
              )}
              {d.numberOfUnits != null && (
                <tr>
                  <td>
                    <strong>Number of Units</strong>
                  </td>
                  <td className="table-number">{d.numberOfUnits}</td>
                </tr>
              )}
              {d.accommodation && (
                <tr>
                  <td>
                    <strong>Accommodation</strong>
                  </td>
                  <td>{d.accommodation}</td>
                </tr>
              )}
              {d.yearBuilt != null && (
                <tr>
                  <td>
                    <strong>Year Built</strong>
                  </td>
                  <td className="table-number">{d.yearBuilt}</td>
                </tr>
              )}
              {d.condition && (
                <tr>
                  <td>
                    <strong>Condition</strong>
                  </td>
                  <td>{d.condition}</td>
                </tr>
              )}
              {d.occupancyPct != null && (
                <tr>
                  <td>
                    <strong>Occupancy</strong>
                  </td>
                  <td>
                    <span style={{ color: d.occupancyPct === 0 ? COLORS.red : d.occupancyPct >= 0.8 ? COLORS.green : COLORS.amber }}>
                      {Math.round(d.occupancyPct * 100)}%{d.occupancyPct === 0 ? " — Vacant" : ""}
                    </span>
                  </td>
                </tr>
              )}
              {d.aiVacancy && (
                <tr>
                  <td>
                    <strong>Vacancy Detail</strong>
                  </td>
                  <td>{d.aiVacancy}</td>
                </tr>
              )}
              {d.brokerName && (
                <tr>
                  <td>
                    <strong>Marketing Agent</strong>
                  </td>
                  <td>{d.brokerName}</td>
                </tr>
              )}
              {d.daysOnMarket != null && (
                <tr>
                  <td>
                    <strong>Days on Market</strong>
                  </td>
                  <td className="table-number">{d.daysOnMarket}</td>
                </tr>
              )}
            </tbody>
          </table>

          {d.keyFeatures.length > 0 && (
            <>
              <h4>Key Features</h4>
              <ul>
                {d.keyFeatures.slice(0, 12).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}

          {(d.tenantNames.length > 0 || d.leaseExpiry || d.breakDates) && (
            <>
              <h3>Tenancy</h3>
              <table>
                <tbody>
                  {d.tenantNames.length > 0 && (
                    <tr>
                      <td style={{ width: "40%" }}>
                        <strong>Tenants</strong>
                      </td>
                      <td>{d.tenantNames.join(", ")}</td>
                    </tr>
                  )}
                  {d.leaseExpiry && (
                    <tr>
                      <td>
                        <strong>Lease Expiry</strong>
                      </td>
                      <td>{d.leaseExpiry}</td>
                    </tr>
                  )}
                  {d.breakDates && (
                    <tr>
                      <td>
                        <strong>Break Dates</strong>
                      </td>
                      <td>{d.breakDates}</td>
                    </tr>
                  )}
                  {d.serviceCharge != null && (
                    <tr>
                      <td>
                        <strong>Service Charge</strong>
                      </td>
                      <td className="table-number">{fmtFull(d.serviceCharge, sym)} pa</td>
                    </tr>
                  )}
                  {d.groundRent != null && (
                    <tr>
                      <td>
                        <strong>Ground Rent</strong>
                      </td>
                      <td className="table-number">{fmtFull(d.groundRent, sym)} pa</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {d.listingDescription && (
            <>
              <h4>Listing Narrative</h4>
              <p>{d.listingDescription.substring(0, 1200)}</p>
            </>
          )}

          <PageFooter address={d.address} />
        </div>

        {/* ===================================
            PLANNING & ENVIRONMENTAL
            =================================== */}
        {hasPlanning && (
          <div className="page">
            <PageHeader address={d.address} />
            <h2>Planning &amp; Environmental Context</h2>

            {d.planningApplications.length > 0 && (
              <>
                <h3>Planning Applications</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.planningApplications.map((p, i) => (
                      <tr key={i}>
                        <td className="table-number">{p.reference ?? "—"}</td>
                        <td>{p.description}</td>
                        <td>{p.status ?? "—"}</td>
                        <td>{p.date ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {d.devPotential && (
              <div className="callout callout-info no-break">
                <h4>Development Potential</h4>
                {d.devPotential.summary && <p>{d.devPotential.summary}</p>}
                {d.devPotential.permittedDevelopment && (
                  <p>Permitted Development rights identified.</p>
                )}
                {d.devPotential.residualValue != null && (
                  <p style={{ marginBottom: 0 }}>
                    <strong>Residual land value:</strong> {fmtFull(d.devPotential.residualValue, sym)}
                  </p>
                )}
              </div>
            )}

            {d.epc && (
              <>
                <h3>Energy Performance &amp; ESG</h3>
                <table>
                  <tbody>
                    <tr>
                      <td style={{ width: "40%" }}>
                        <strong>EPC Rating</strong>
                      </td>
                      <td>
                        {d.epc.rating ? <span className="badge badge-low">{d.epc.rating}</span> : "—"}
                        {d.epc.validUntil ? ` — Valid until ${d.epc.validUntil}` : ""}
                      </td>
                    </tr>
                    {d.epc.potential && (
                      <tr>
                        <td>
                          <strong>Potential Rating</strong>
                        </td>
                        <td>{d.epc.potential}</td>
                      </tr>
                    )}
                    {d.epc.meesRisk && (
                      <tr>
                        <td>
                          <strong>MEES Compliance</strong>
                        </td>
                        <td>{d.epc.meesRisk}</td>
                      </tr>
                    )}
                    {d.epc.co2 && (
                      <tr>
                        <td>
                          <strong>CO₂ Emissions</strong>
                        </td>
                        <td>{d.epc.co2}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {d.floodZone && (
              <div className={`callout ${d.floodZone.inZone ? "callout-warning" : "callout-info"} no-break`}>
                <h4>Flood Risk</h4>
                <p style={{ marginBottom: 0 }}>
                  {d.floodZone.inZone ? (
                    <>
                      Asset is within an Environment Agency flood risk zone
                      {d.floodZone.zone ? ` (${d.floodZone.zone})` : ""}. Insurance and lender implications apply.
                    </>
                  ) : (
                    "Asset is outside designated flood risk zones."
                  )}
                  {d.floodZone.description ? ` ${d.floodZone.description}` : ""}
                </p>
              </div>
            )}

            <PageFooter address={d.address} />
          </div>
        )}

        {/* ===================================
            MARKET ANALYSIS
            =================================== */}
        {hasMarket && (
          <div className="page">
            <PageHeader address={d.address} />
            <h2>Market Analysis</h2>

            {d.market && (
              <>
                <h3>Market Benchmarks</h3>
                <div className="metrics-row">
                  {d.market.capRate != null && (
                    <div className="metric-box">
                      <div className="metric-label">Market Cap Rate</div>
                      <div className="metric-value">{pctRaw(d.market.capRate * 100)}</div>
                    </div>
                  )}
                  {d.market.ervPsf != null && (
                    <div className="metric-box">
                      <div className="metric-label">Market ERV psf</div>
                      <div className="metric-value">
                        {sym}
                        {d.market.ervPsf.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {d.market.vacancyRate != null && (
                    <div className="metric-box">
                      <div className="metric-label">Vacancy Rate</div>
                      <div className="metric-value">{pctRaw(d.market.vacancyRate * 100)}</div>
                    </div>
                  )}
                  {d.market.primeYield != null && (
                    <div className="metric-box">
                      <div className="metric-label">Prime Yield</div>
                      <div className="metric-value">{pctRaw(d.market.primeYield * 100)}</div>
                    </div>
                  )}
                  {d.market.secondaryYield != null && (
                    <div className="metric-box">
                      <div className="metric-label">Secondary Yield</div>
                      <div className="metric-value">{pctRaw(d.market.secondaryYield * 100)}</div>
                    </div>
                  )}
                  {d.market.dscr != null && (
                    <div className="metric-box">
                      <div className="metric-label">DSCR</div>
                      <div className="metric-value">{d.market.dscr.toFixed(2)}×</div>
                    </div>
                  )}
                  {d.market.annualDebtService != null && (
                    <div className="metric-box">
                      <div className="metric-label">Annual Debt Service</div>
                      <div className="metric-value">{fmt(d.market.annualDebtService, sym)}</div>
                    </div>
                  )}
                </div>
                {d.market.notes && <p>{d.market.notes}</p>}
              </>
            )}

            {d.rentGap && (
              <>
                <h3>Rent Gap Analysis</h3>
                <table>
                  <tbody>
                    <tr>
                      <td style={{ width: "40%" }}>
                        <strong>Passing Rent</strong>
                      </td>
                      <td className="table-number">{fmtFull(d.rentGap.passingRent, sym)} pa</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Market ERV</strong>
                      </td>
                      <td className="table-number">{fmtFull(d.rentGap.erv, sym)} pa</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Gap</strong>
                      </td>
                      <td className="table-number" style={{ color: (d.rentGap.gap ?? 0) >= 0 ? COLORS.green : COLORS.red }}>
                        {fmtFull(d.rentGap.gap, sym)}
                        {d.rentGap.gapPct != null ? ` (${d.rentGap.gapPct.toFixed(1)}%)` : ""}
                      </td>
                    </tr>
                    {d.rentGap.direction && (
                      <tr>
                        <td>
                          <strong>Direction</strong>
                        </td>
                        <td>{d.rentGap.direction}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            <PageFooter address={d.address} />
          </div>
        )}

        {/* ===================================
            COMPARABLE EVIDENCE
            =================================== */}
        {hasComparables && (
          <div className="page">
            <PageHeader address={d.address} />
            <h2>Comparable Evidence</h2>
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th className="text-right">Size (sq ft)</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Yield</th>
                  <th>Date</th>
                  <th>Distance</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {d.comparables.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{c.address}</strong>
                      {c.tenancy ? <div style={{ color: COLORS.textDim, fontSize: "7pt" }}>{c.tenancy}</div> : null}
                    </td>
                    <td className="text-right table-number">{c.sqft != null ? c.sqft.toLocaleString() : "—"}</td>
                    <td className="text-right table-number">{c.price != null ? fmtFull(c.price, sym) : "—"}</td>
                    <td className="text-right table-number">
                      {c.yieldPct != null ? `${c.yieldPct.toFixed(2)}%` : "—"}
                    </td>
                    <td>{c.date ?? "—"}</td>
                    <td>{c.distance ?? "—"}</td>
                    <td style={{ fontSize: "7pt" }}>{c.source ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PageFooter address={d.address} />
          </div>
        )}

        {/* ===================================
            FINANCIAL SUMMARY
            =================================== */}
        <div className="page">
          <PageHeader address={d.address} />
          <h2>Financial Summary</h2>

          <h3>Income &amp; Cap Rate</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ width: "40%" }}>
                  <strong>Passing Rent</strong>
                </td>
                <td className="text-right table-number" style={{ color: (d.passingRent ?? 0) > 0 ? COLORS.green : COLORS.red }}>
                  {fmtFull(d.passingRent, sym)} pa
                </td>
              </tr>
              <tr>
                <td>
                  <strong>ERV</strong>
                </td>
                <td className="text-right table-number">{fmtFull(d.erv, sym)} pa</td>
              </tr>
              <tr>
                <td>
                  <strong>Net Operating Income</strong>
                </td>
                <td className="text-right table-number">{fmtFull(d.noi, sym)}</td>
              </tr>
              {d.capRate != null && (
                <tr>
                  <td>
                    <strong>Cap Rate</strong>
                  </td>
                  <td className="text-right table-number">{pct(d.capRate)}</td>
                </tr>
              )}
              {d.exitValue != null && (
                <tr>
                  <td>
                    <strong>Exit Value (10yr)</strong>
                  </td>
                  <td className="text-right table-number" style={{ color: COLORS.green }}>
                    {fmtFull(d.exitValue, sym)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {d.returns && (
            <>
              <h3>Returns Profile</h3>
              <div className="metrics-row">
                {d.returns.irr5yr != null && (
                  <div className="metric-box">
                    <div className="metric-label">IRR (5yr)</div>
                    <div className="metric-value">{d.returns.irr5yr.toFixed(1)}%</div>
                  </div>
                )}
                {d.returns.cashOnCash != null && (
                  <div className="metric-box">
                    <div className="metric-label">Cash-on-Cash</div>
                    <div className="metric-value">{d.returns.cashOnCash.toFixed(1)}%</div>
                  </div>
                )}
                {d.returns.equityMultiple != null && (
                  <div className="metric-box">
                    <div className="metric-label">Equity Multiple</div>
                    <div className="metric-value">{d.returns.equityMultiple.toFixed(2)}×</div>
                  </div>
                )}
                {d.returns.equityNeeded != null && (
                  <div className="metric-box">
                    <div className="metric-label">Equity Required</div>
                    <div className="metric-value">{fmt(d.returns.equityNeeded, sym)}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.cashFlows.length > 0 && (
            <>
              <h3>Cash Flow Projection</h3>
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th className="text-right">Cash Flow</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {d.cashFlows.map((cf) => (
                    <tr key={cf.year}>
                      <td className="table-number">{cf.year}</td>
                      <td className="text-right table-number" style={{ color: cf.amount >= 0 ? COLORS.green : COLORS.red }}>
                        {cf.amount >= 0 ? "+" : ""}
                        {fmt(Math.abs(cf.amount), sym)}
                      </td>
                      <td style={{ color: COLORS.textDim }}>{cf.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {d.scenarios.length > 0 && (
            <>
              <h3>Exit Scenarios</h3>
              <table>
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="text-right">IRR</th>
                    <th className="text-right">Equity Multiple</th>
                    <th className="text-right">Cash Yield</th>
                    <th className="text-right">NPV</th>
                  </tr>
                </thead>
                <tbody>
                  {d.scenarios.map((s, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td className="text-right table-number">{s.irr ?? "—"}</td>
                      <td className="text-right table-number">{s.equityMultiple ?? "—"}</td>
                      <td className="text-right table-number">{s.cashYield ?? "—"}</td>
                      <td className="text-right table-number">{s.npv != null ? fmt(s.npv, sym) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {d.assumptions && Object.keys(d.assumptions).length > 0 && (
            <>
              <h3>Underwriting Assumptions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th className="text-right">Value</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(d.assumptions).map(([k, v]) => (
                    <tr key={k}>
                      <td>
                        <strong>{k}</strong>
                      </td>
                      <td className="text-right table-number">{String(v.value ?? "—")}</td>
                      <td style={{ fontSize: "7pt", color: COLORS.textDim }}>{v.source ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <PageFooter address={d.address} />
        </div>

        {/* ===================================
            OWNERSHIP
            =================================== */}
        {hasOwnership && (
          <div className="page">
            <PageHeader address={d.address} />
            <h2>Ownership &amp; Covenant</h2>

            {(d.ownerName || d.companyOwner) && (
              <>
                <h3>Registered Owner</h3>
                <table>
                  <tbody>
                    {d.ownerName && (
                      <tr>
                        <td style={{ width: "40%" }}>
                          <strong>Owner Name</strong>
                        </td>
                        <td>{d.ownerName}</td>
                      </tr>
                    )}
                    {d.companyOwner?.name && (
                      <tr>
                        <td>
                          <strong>Company</strong>
                        </td>
                        <td>{d.companyOwner.name}</td>
                      </tr>
                    )}
                    {d.companyOwner?.number && (
                      <tr>
                        <td>
                          <strong>Company Number</strong>
                        </td>
                        <td className="table-number">{d.companyOwner.number}</td>
                      </tr>
                    )}
                    {d.companyOwner?.status && (
                      <tr>
                        <td>
                          <strong>Status</strong>
                        </td>
                        <td>{d.companyOwner.status}</td>
                      </tr>
                    )}
                    {d.companyOwner?.incorporated && (
                      <tr>
                        <td>
                          <strong>Incorporated</strong>
                        </td>
                        <td>{d.companyOwner.incorporated}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {d.covenantStrength && (d.covenantStrength.rating || d.covenantStrength.summary) && (
              <>
                <h3>Tenant Covenant</h3>
                <table>
                  <tbody>
                    {d.covenantStrength.rating && (
                      <tr>
                        <td style={{ width: "40%" }}>
                          <strong>Rating</strong>
                        </td>
                        <td>{d.covenantStrength.rating}</td>
                      </tr>
                    )}
                    {d.covenantStrength.summary && (
                      <tr>
                        <td>
                          <strong>Summary</strong>
                        </td>
                        <td>{d.covenantStrength.summary}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {d.ownerPortfolio.length > 0 && (
              <>
                <h3>Owner Portfolio</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.ownerPortfolio.map((p, i) => (
                      <tr key={i}>
                        <td>{p.address}</td>
                        <td className="text-right table-number">{p.value != null ? fmtFull(p.value, sym) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <PageFooter address={d.address} />
          </div>
        )}

        {/* ===================================
            INVESTMENT DECISION
            =================================== */}
        <div className="page">
          <PageHeader address={d.address} />
          <h2>Investment Decision</h2>

          <div
            className={`callout no-break ${d.recommendation === "PASS" ? "callout-danger" : d.recommendation === "CONDITIONAL" ? "callout-warning" : "callout-success"}`}
          >
            <h4 style={{ color: rcol }}>{recLabel(d.recommendation)}</h4>
            <p>
              <strong>Deal score:</strong> {d.dealScore}/100
              {d.confidenceLevel ? ` · Data confidence: ${d.confidenceLevel}` : ""}
            </p>
            {d.verdictReasons.length > 0 && (
              <ul style={{ marginBottom: 0 }}>
                {d.verdictReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          {d.keyOpportunities.length > 0 && (
            <>
              <h3>Key Opportunities</h3>
              <ul>
                {d.keyOpportunities.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </>
          )}

          {d.keyRisks.length > 0 && (
            <>
              <h3>Risk Summary</h3>
              <ul>
                {d.keyRisks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}

          {d.dealAnalysis?.summary && (
            <>
              <h3>Deal Analysis Summary</h3>
              <p>{d.dealAnalysis.summary}</p>
              {d.dealAnalysis.dcfValue != null && (
                <p>
                  <strong>DCF Valuation:</strong> {fmtFull(d.dealAnalysis.dcfValue, sym)}
                </p>
              )}
              {d.dealAnalysis.npv != null && (
                <p>
                  <strong>NPV:</strong> {fmtFull(d.dealAnalysis.npv, sym)}
                </p>
              )}
            </>
          )}

          {d.ricsAnalysis && (d.ricsAnalysis.recommendation || d.ricsAnalysis.notes) && (
            <>
              <h3>RICS-Aligned Assessment</h3>
              <table>
                <tbody>
                  {d.ricsAnalysis.recommendation && (
                    <tr>
                      <td style={{ width: "40%" }}>
                        <strong>Recommendation</strong>
                      </td>
                      <td>{d.ricsAnalysis.recommendation}</td>
                    </tr>
                  )}
                  {d.ricsAnalysis.marketValue != null && (
                    <tr>
                      <td>
                        <strong>RICS Market Value</strong>
                      </td>
                      <td className="table-number">{fmtFull(d.ricsAnalysis.marketValue, sym)}</td>
                    </tr>
                  )}
                  {d.ricsAnalysis.confidence && (
                    <tr>
                      <td>
                        <strong>Confidence</strong>
                      </td>
                      <td>{d.ricsAnalysis.confidence}</td>
                    </tr>
                  )}
                  {d.ricsAnalysis.notes && (
                    <tr>
                      <td>
                        <strong>Notes</strong>
                      </td>
                      <td>{d.ricsAnalysis.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          <h3>Final Recommendation</h3>
          <div
            style={{
              border: `2pt solid ${rcol}`,
              padding: "12pt",
              marginTop: "16pt",
              pageBreakInside: "avoid",
            }}
          >
            <h4 style={{ marginTop: 0, textAlign: "center", fontSize: "12pt", color: rcol }}>
              INVESTMENT COMMITTEE RECOMMENDATION
            </h4>
            <p style={{ textAlign: "center", fontSize: "11pt", margin: "12pt 0", color: rcol }}>
              <strong>{recLabel(d.recommendation)}</strong>
            </p>
            <p style={{ textAlign: "center", marginBottom: 0 }}>
              IRR {pct(d.irr)} · Equity Multiple {d.equityMultiple.toFixed(2)}× · Total cost in {fmt(d.totalCostIn, sym)}
            </p>
          </div>

          <div style={{ marginTop: "20mm", textAlign: "center", fontSize: "8pt", color: COLORS.textDim }}>
            <p>— END OF MEMORANDUM —</p>
            <p style={{ marginTop: "8pt" }}>RealHQ Analysis Engine · {generatedDate}</p>
          </div>

          <PageFooter address={d.address} />
        </div>
      </body>
    </html>
  );
}

// ── Stylesheet (mirrors designs/ic-memo-template.html, dark theme variant) ─

const CSS = `
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${COLORS.bg}; color: ${COLORS.text}; line-height: 1.5; font-size: 10pt; }

  .page {
    width: 210mm; min-height: 297mm; padding: 20mm 20mm 25mm 20mm;
    margin: 0 auto; background: ${COLORS.bg}; page-break-after: always;
    position: relative; border-top: 3pt solid ${COLORS.accent};
  }

  .page-header {
    position: absolute; top: 12mm; left: 20mm; right: 20mm;
    padding-bottom: 3mm; border-bottom: 0.5pt solid ${COLORS.border};
    display: flex; justify-content: space-between; align-items: center;
  }
  .page-header-left { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5pt; color: ${COLORS.accent}; }
  .page-header-right { font-size: 7pt; color: ${COLORS.textDim}; }

  .page-footer {
    position: absolute; bottom: 15mm; left: 20mm; right: 20mm;
    padding-top: 3mm; border-top: 0.5pt solid ${COLORS.border};
    display: flex; justify-content: space-between; font-size: 7pt; color: ${COLORS.textDim};
  }

  h1 { font-size: 24pt; font-weight: 400; margin-bottom: 6pt; line-height: 1.2; letter-spacing: -0.5pt; color: ${COLORS.text}; }
  h2 {
    font-size: 14pt; font-weight: 600; margin-top: 16pt; margin-bottom: 10pt;
    padding-bottom: 4pt; border-bottom: 2pt solid ${COLORS.accent};
    text-transform: uppercase; letter-spacing: 0.5pt; color: ${COLORS.accentLight};
  }
  h3 { font-size: 11pt; font-weight: 600; margin-top: 12pt; margin-bottom: 6pt; color: ${COLORS.text}; }
  h4 { font-size: 9pt; font-weight: 600; margin-top: 8pt; margin-bottom: 4pt; text-transform: uppercase; letter-spacing: 0.3pt; color: ${COLORS.textMuted}; }
  p { margin-bottom: 6pt; font-size: 9.5pt; line-height: 1.5; color: ${COLORS.text}; }
  .lead { font-size: 10.5pt; line-height: 1.6; margin-bottom: 10pt; color: ${COLORS.text}; }
  strong { font-weight: 600; color: ${COLORS.text}; }

  /* Cover page */
  .cover-page {
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center; padding: 40mm 30mm;
    background: linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.card} 100%);
    border-top: 4pt solid ${COLORS.accent};
  }
  .cover-logo { font-size: 18pt; font-weight: 600; letter-spacing: 2pt; margin-bottom: 40mm; text-transform: uppercase; color: ${COLORS.accent}; }
  .cover-type { font-size: 10pt; text-transform: uppercase; letter-spacing: 1.5pt; margin-bottom: 10mm; color: ${COLORS.textMuted}; }
  .cover-title { font-size: 28pt; font-weight: 400; margin-bottom: 8mm; line-height: 1.1; color: ${COLORS.text}; }
  .cover-subtitle { font-size: 13pt; margin-bottom: 20mm; color: ${COLORS.textMuted}; }
  .cover-divider { width: 80mm; height: 0.5pt; background: ${COLORS.border}; margin: 15mm 0; }
  .cover-status {
    padding: 8pt 20pt; border: 2pt solid; font-size: 12pt; font-weight: 600;
    margin-bottom: 15mm; text-transform: uppercase; letter-spacing: 0.5pt;
  }
  .cover-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; width: 100%; max-width: 140mm; margin-top: 10mm; }
  .cover-metric { text-align: center; padding: 8pt; border: 0.5pt solid ${COLORS.borderLight}; background: ${COLORS.card}; }
  .cover-metric-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5pt; color: ${COLORS.textDim}; margin-bottom: 4pt; }
  .cover-metric-value { font-size: 16pt; font-weight: 600; color: ${COLORS.text}; }
  .cover-footer-text { position: absolute; bottom: 20mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: ${COLORS.textDim}; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt 0; font-size: 8.5pt; background: ${COLORS.card}; }
  thead { background: ${COLORS.border}; }
  th { text-align: left; padding: 6pt 8pt; font-weight: 600; border-bottom: 1pt solid ${COLORS.accent}; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3pt; color: ${COLORS.textMuted}; }
  td { padding: 5pt 8pt; border-bottom: 0.25pt solid ${COLORS.border}; vertical-align: top; color: ${COLORS.text}; }
  tr:last-child td { border-bottom: 0.5pt solid ${COLORS.accent}; }
  .table-number { font-family: 'SF Mono', 'Courier New', monospace; font-weight: 500; }
  .table-highlight { background: rgba(124, 106, 240, 0.15); font-weight: 600; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  /* Figures */
  .figure { margin: 10pt 0 14pt 0; page-break-inside: avoid; }
  .figure-container { width: 100%; background: ${COLORS.card}; border: 0.5pt solid ${COLORS.borderLight}; padding: 8pt; text-align: center; }
  .figure-image { width: 100%; max-height: 110mm; height: auto; display: block; object-fit: cover; }
  .figure-caption { margin-top: 6pt; font-size: 7.5pt; color: ${COLORS.textDim}; text-align: left; font-style: italic; }
  .map-placeholder {
    width: 100%; height: 80pt;
    background: linear-gradient(135deg, ${COLORS.border} 0%, ${COLORS.borderLight} 100%);
    display: flex; align-items: center; justify-content: center;
    color: ${COLORS.accent}; font-size: 9pt; border: 0.5pt solid ${COLORS.accent};
  }

  /* Callouts */
  .callout { padding: 8pt 10pt; margin: 10pt 0; border-left: 3pt solid; background: rgba(255,255,255,0.02); page-break-inside: avoid; }
  .callout-warning { border-left-color: ${COLORS.amber}; background: rgba(245, 158, 11, 0.08); }
  .callout-danger { border-left-color: ${COLORS.red}; background: rgba(239, 68, 68, 0.08); }
  .callout-info { border-left-color: ${COLORS.accent}; background: rgba(124, 106, 240, 0.08); }
  .callout-success { border-left-color: ${COLORS.green}; background: rgba(34, 197, 94, 0.08); }
  .callout h4 { margin-top: 0; margin-bottom: 4pt; }
  .callout p:last-child { margin-bottom: 0; }

  /* Metric boxes */
  .metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6pt; margin: 10pt 0; page-break-inside: avoid; }
  .metric-box { padding: 8pt; border: 0.5pt solid ${COLORS.borderLight}; background: ${COLORS.card}; text-align: center; }
  .metric-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.3pt; color: ${COLORS.textDim}; margin-bottom: 3pt; }
  .metric-value { font-size: 14pt; font-weight: 600; font-family: 'SF Mono', 'Courier New', monospace; color: ${COLORS.text}; }

  /* Badges */
  .badge { display: inline-block; padding: 2pt 6pt; font-size: 7pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3pt; border: 0.5pt solid; }
  .badge-low { border-color: ${COLORS.green}; color: ${COLORS.green}; background: rgba(34, 197, 94, 0.1); }
  .badge-medium { border-color: ${COLORS.amber}; color: ${COLORS.amber}; background: rgba(245, 158, 11, 0.1); }
  .badge-high { border-color: ${COLORS.red}; color: ${COLORS.red}; background: rgba(239, 68, 68, 0.1); }

  /* Lists */
  ul, ol { margin: 6pt 0 10pt 16pt; }
  li { margin-bottom: 3pt; font-size: 9pt; color: ${COLORS.text}; }

  .no-break { page-break-inside: avoid; }
  .mt-1 { margin-top: 4pt; }
  .mt-2 { margin-top: 8pt; }
  .mt-3 { margin-top: 12pt; }

  @media print {
    body { background: white; color: black; }
    .page { background: white; box-shadow: none; }
  }
`;

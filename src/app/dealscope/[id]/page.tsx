"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import styles from "./dossier.module.css";

interface Property {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  yearBuilt?: number;
  askingPrice?: number;
  guidePrice?: number;
  capRate?: number;
  dealScore: number;
  temperature: "hot" | "warm" | "watch" | "cold";
  signals: string[];
  ownerName?: string;
  currentRentPsf?: number;
  marketRentPsf?: number;
  occupancyPct?: number;
  epcRating?: string;
  currency: string;
  estimatedValue?: number;
  opportunityScore?: number;
}

interface Signal {
  type: string;
  title: string;
  description: string;
  date: string;
  severity: "info" | "high" | "critical";
}

interface Comparable {
  id: string;
  address: string;
  saleAmount?: number;
  saleDate?: string;
  pricePerSqft?: number;
}

interface Valuation {
  comparableSales?: number;
  incomeCapitalisation?: number;
  replacementCost?: number;
}

export default function PropertyDossierPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [comps, setComps] = useState<Comparable[]>([]);
  const [valuations, setValuations] = useState<Valuation>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<{
    conservative: { assumptions: Record<string, number>; results: Record<string, number> };
    midcase: { assumptions: Record<string, number>; results: Record<string, number> };
    optimistic: { assumptions: Record<string, number>; results: Record<string, number> };
  }>({
    conservative: { assumptions: {}, results: {} },
    midcase: { assumptions: {}, results: {} },
    optimistic: { assumptions: {}, results: {} },
  });
  const [activeScenario, setActiveScenario] = useState<"conservative" | "midcase" | "optimistic">("midcase");

  const calculateScenarios = (prop: Property) => {
    if (!prop.askingPrice || !prop.sqft) return;

    const calculateMetrics = (assumptions: Record<string, number>) => {
      const purchasePrice = assumptions.purchasePrice ?? prop.askingPrice ?? 0;
      const annualRent = assumptions.annualRent ?? ((prop.currentRentPsf ?? 0) * (prop.sqft ?? 1) * 12);
      const opexRate = assumptions.opexRate ?? 0.3;
      const capexAnnual = assumptions.capexAnnual ?? 0;

      const noi = annualRent * (1 - opexRate) - capexAnnual;
      const profit = noi - (purchasePrice * 0.06); // Simple profit calc
      const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
      const dscr = (purchasePrice * 0.06) > 0 ? noi / (purchasePrice * 0.06) : 0;

      return { profit, capRate, dscr, irr: capRate / 100 };
    };

    setScenarios({
      conservative: {
        assumptions: {
          purchasePrice: prop.askingPrice,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12 * 0.9,
          opexRate: 0.35,
          capexAnnual: 5000,
          exitYield: 0.065,
        },
        results: calculateMetrics({
          purchasePrice: prop.askingPrice,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12 * 0.9,
          opexRate: 0.35,
          capexAnnual: 5000,
          exitYield: 0.065,
        }),
      },
      midcase: {
        assumptions: {
          purchasePrice: prop.askingPrice,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12,
          opexRate: 0.30,
          capexAnnual: 3000,
          exitYield: 0.055,
        },
        results: calculateMetrics({
          purchasePrice: prop.askingPrice,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12,
          opexRate: 0.30,
          capexAnnual: 3000,
          exitYield: 0.055,
        }),
      },
      optimistic: {
        assumptions: {
          purchasePrice: prop.askingPrice * 0.95,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12 * 1.1,
          opexRate: 0.25,
          capexAnnual: 1000,
          exitYield: 0.045,
        },
        results: calculateMetrics({
          purchasePrice: prop.askingPrice * 0.95,
          annualRent: (prop.currentRentPsf || 0) * prop.sqft! * 12 * 1.1,
          opexRate: 0.25,
          capexAnnual: 1000,
          exitYield: 0.045,
        }),
      },
    });
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/dealscope/properties/${propertyId}`).then((r) => r.json()),
      fetch(`/api/dealscope/properties/${propertyId}/signals`).then((r) => r.json()),
      fetch(`/api/dealscope/properties/${propertyId}/comps`).then((r) => r.json()),
    ])
      .then(([propData, signalData, compData]) => {
        setProperty(propData);
        setSignals(signalData.signals || []);
        setComps(compData || []);
        // Calculate valuation methods
        setValuations({
          comparableSales: propData.sqft ? (propData.sqft * 92) : undefined,
          incomeCapitalisation: propData.currentRentPsf && propData.sqft
            ? (propData.currentRentPsf * propData.sqft * 12) / 0.06
            : undefined,
          replacementCost: propData.sqft ? (propData.sqft * 85) : undefined,
        });
        // Calculate scenarios
        calculateScenarios(propData);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading || !property) return <AppShell><div>Loading...</div></AppShell>;

  const getTempColor = (temp: string) => {
    if (temp === "hot") return "#f87171";
    if (temp === "warm") return "#fbbf24";
    if (temp === "watch") return "#60a5fa";
    return "#6b7280";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "#f87171";
    if (severity === "high") return "#fbbf24";
    return "#60a5fa";
  };

  return (
    <AppShell>
      <div className={styles.container}>
        {/* Header with Property Photo and Info */}
        <div className={styles.dossierHeader}>
          <div className={styles.propertyPhoto}></div>
          <div className={styles.propertyInfo}>
            <h1 className={styles.propertyAddress}>{property.address}</h1>
            <div className={styles.propertySpecs}>
              <div className={styles.propertySpec}>
                <div className={styles.specLabel}>Type</div>
                <div className={styles.specValue}>{property.assetType}</div>
              </div>
              {property.sqft && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>Size</div>
                  <div className={styles.specValue}>{property.sqft.toLocaleString()} sqft</div>
                </div>
              )}
              {property.yearBuilt && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>Year Built</div>
                  <div className={styles.specValue}>{property.yearBuilt}</div>
                </div>
              )}
              {property.epcRating && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>EPC</div>
                  <div className={styles.specValue}>{property.epcRating}</div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.signalBadges}>
            {property.temperature && (
              <div
                className={styles.temperatureBadge}
                style={{ borderColor: getTempColor(property.temperature) }}
              >
                {property.temperature.toUpperCase()}
              </div>
            )}
            {property.dealScore && (
              <div className={styles.scoreBadge}>{property.dealScore}</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {["overview", "valuation", "opportunity", "underwrite", "risk", "owner", "comps", "ddchecklist"].map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "ddchecklist" ? "DD Checklist" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div className={styles.tabPane}>
              <h2>Overview</h2>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Quick Stats</div>
                <div className={styles.grid}>
                  {property.estimatedValue && (
                    <div className={styles.card}>
                      <div className={styles.cardLabel}>Estimated Value</div>
                      <div className={styles.cardValue} style={{ color: "var(--acc)" }}>
                        {property.currency} {property.estimatedValue.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {property.opportunityScore && (
                    <div className={styles.card}>
                      <div className={styles.cardLabel}>Opportunity Score</div>
                      <div className={styles.cardValue} style={{ color: "var(--amb)" }}>
                        {property.opportunityScore.toFixed(1)} / 10
                      </div>
                    </div>
                  )}
                  {property.askingPrice && (
                    <div className={styles.card}>
                      <div className={styles.cardLabel}>Asking Price</div>
                      <div className={styles.cardValue}>
                        {property.currency} {property.askingPrice.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {property.capRate && (
                    <div className={styles.card}>
                      <div className={styles.cardLabel}>Cap Rate</div>
                      <div className={styles.cardValue}>{property.capRate.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              </div>

              {signals.length > 0 && (
                <div className={styles.timeline}>
                  <h3>Signal Timeline</h3>
                  {signals.map((signal, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineMarker}>
                        <div 
                          className={styles.timelineDot} 
                          style={{ background: getSeverityColor(signal.severity) }}
                        ></div>
                        <div className={styles.timelineDate}>
                          {new Date(signal.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{signal.title}</div>
                        <div className={styles.timelineDetail}>{signal.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "valuation" && (
            <div className={styles.tabPane}>
              <h2>Valuation</h2>
              <div className={styles.valuationGrid}>
                {valuations.comparableSales && (
                  <div className={styles.valuationMethod}>
                    <div className={styles.methodTitle}>Comparable Sales</div>
                    <div className={styles.methodValue}>
                      {property.currency} {valuations.comparableSales.toLocaleString()}
                    </div>
                    <div className={styles.methodDetail}>
                      Based on recent sales in area ({property.sqft ? `${(valuations.comparableSales / property.sqft).toFixed(0)}/sqft` : "N/A"})
                    </div>
                  </div>
                )}
                {valuations.incomeCapitalisation && (
                  <div className={styles.valuationMethod}>
                    <div className={styles.methodTitle}>Income Capitalisation</div>
                    <div className={styles.methodValue}>
                      {property.currency} {valuations.incomeCapitalisation.toLocaleString()}
                    </div>
                    <div className={styles.methodDetail}>
                      {property.currentRentPsf ? `${property.currentRentPsf.toFixed(2)}/sqft, 6% discount rate` : "N/A"}
                    </div>
                  </div>
                )}
                {valuations.replacementCost && (
                  <div className={styles.valuationMethod}>
                    <div className={styles.methodTitle}>Replacement Cost</div>
                    <div className={styles.methodValue}>
                      {property.currency} {valuations.replacementCost.toLocaleString()}
                    </div>
                    <div className={styles.methodDetail}>
                      New build equivalent with depreciation
                    </div>
                  </div>
                )}
              </div>

              {comps.length > 0 && (
                <div className={styles.card} style={{ marginTop: "16px" }}>
                  <div className={styles.cardTitle}>Comparable Transactions</div>
                  <table className={styles.table} style={{ marginTop: "12px" }}>
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Sale Amount</th>
                        <th>Sale Date</th>
                        <th>£/sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comps.map((comp) => (
                        <tr key={comp.id}>
                          <td>{comp.address}</td>
                          <td>{property.currency} {comp.saleAmount?.toLocaleString() || "-"}</td>
                          <td>{comp.saleDate || "-"}</td>
                          <td>{comp.pricePerSqft?.toFixed(2) || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "opportunity" && (
            <div className={styles.tabPane}>
              <h2>Opportunities</h2>
              <div className={styles.opportunityGrid}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Rent Gap</div>
                  {property.currentRentPsf && property.marketRentPsf ? (
                    <>
                      <div className={styles.cardValue} style={{ color: "var(--grn)" }}>
                        £{((property.marketRentPsf - property.currentRentPsf) * (property.sqft || 1) * 12).toLocaleString()} p.a.
                      </div>
                      <div className={styles.methodDetail}>
                        Market: £{property.marketRentPsf.toFixed(2)}/sqft vs Current: £{property.currentRentPsf.toFixed(2)}/sqft
                      </div>
                    </>
                  ) : (
                    <p>Data not available</p>
                  )}
                </div>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Occupancy Upside</div>
                  {property.occupancyPct ? (
                    <>
                      <div className={styles.cardValue}>
                        {(100 - property.occupancyPct).toFixed(1)}% available
                      </div>
                      <div className={styles.methodDetail}>
                        Current occupancy: {property.occupancyPct.toFixed(1)}%
                      </div>
                    </>
                  ) : (
                    <p>Data not available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "underwrite" && (
            <div className={styles.tabPane}>
              <h2>Deal Scenarios</h2>
              <div className={styles.underwriteContainer}>
                {/* Scenario Tabs */}
                <div className={styles.scenarioTabs}>
                  {(["conservative", "midcase", "optimistic"] as const).map((scenario) => (
                    <button
                      key={scenario}
                      className={`${styles.scenarioTab} ${activeScenario === scenario ? styles.active : ""}`}
                      onClick={() => setActiveScenario(scenario)}
                    >
                      {scenario === "conservative" ? "🛡️ Conservative" : scenario === "midcase" ? "📊 Mid-Case" : "📈 Optimistic"}
                    </button>
                  ))}
                </div>

                {/* Scenario Content */}
                <div className={styles.scenarioContent}>
                  {(["conservative", "midcase", "optimistic"] as const).map((scenario) => {
                    const scen = scenarios[scenario];
                    const assumptions = scen.assumptions;
                    const results = scen.results;

                    return activeScenario === scenario ? (
                      <div key={scenario} className={styles.scenarioPane}>
                        {/* Assumptions */}
                        <div className={styles.card} style={{ marginBottom: "16px" }}>
                          <div className={styles.cardTitle}>Assumptions</div>
                          <div className={styles.assumptionsGrid}>
                            <div className={styles.assumptionItem}>
                              <label className={styles.assumptionLabel}>Purchase Price</label>
                              <div className={styles.assumptionValue}>
                                {property.currency} {(assumptions.purchasePrice || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className={styles.assumptionItem}>
                              <label className={styles.assumptionLabel}>Annual Rent</label>
                              <div className={styles.assumptionValue}>
                                {property.currency} {(assumptions.annualRent || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className={styles.assumptionItem}>
                              <label className={styles.assumptionLabel}>OpEx Rate</label>
                              <div className={styles.assumptionValue}>
                                {((assumptions.opexRate || 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className={styles.assumptionItem}>
                              <label className={styles.assumptionLabel}>Annual CapEx</label>
                              <div className={styles.assumptionValue}>
                                {property.currency} {(assumptions.capexAnnual || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className={styles.assumptionItem}>
                              <label className={styles.assumptionLabel}>Exit Yield</label>
                              <div className={styles.assumptionValue}>
                                {((assumptions.exitYield || 0) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Results */}
                        <div className={styles.card}>
                          <div className={styles.cardTitle}>Deal Metrics</div>
                          <div className={styles.resultsGrid}>
                            <div className={styles.resultItem}>
                              <div className={styles.resultLabel}>Cap Rate</div>
                              <div className={styles.resultValue} style={{ color: "var(--acc)" }}>
                                {(results.capRate || 0).toFixed(2)}%
                              </div>
                            </div>
                            <div className={styles.resultItem}>
                              <div className={styles.resultLabel}>Annual Profit</div>
                              <div className={styles.resultValue} style={{ color: "var(--grn)" }}>
                                {property.currency} {(results.profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className={styles.resultItem}>
                              <div className={styles.resultLabel}>DSCR</div>
                              <div className={styles.resultValue}>
                                {(results.dscr || 0).toFixed(2)}x
                              </div>
                            </div>
                            <div className={styles.resultItem}>
                              <div className={styles.resultLabel}>IRR</div>
                              <div className={styles.resultValue} style={{ color: "var(--amb)" }}>
                                {((results.irr || 0) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Thesis */}
                        <div className={styles.card} style={{ marginTop: "16px" }}>
                          <div className={styles.cardTitle}>Thesis</div>
                          <p className={styles.thesisText}>
                            {scenario === "conservative"
                              ? "Assumes below-market rent capture, elevated opex, and higher exit yield reflecting risk. Suitable for stress-testing portfolio resilience."
                              : scenario === "midcase"
                              ? "Balanced case with current rental income, standard operating costs, and mid-market exit yield. Represents expected performance under normal conditions."
                              : "Assumes rent upside from market movements, optimized opex management, and lower exit yield reflecting demand. Requires successful rent review or tenant retention."}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "risk" && (
            <div className={styles.tabPane}>
              <h2>Risk Assessment</h2>
              <div className={styles.riskMatrix}>
                <div className={styles.riskItem}>
                  <div className={styles.riskLabel}>EPC Rating</div>
                  <div>{property.epcRating || "Not provided"}</div>
                </div>
                <div className={styles.riskItem}>
                  <div className={styles.riskLabel}>Energy Efficiency Risk</div>
                  <div>{property.epcRating && ['A', 'B'].includes(property.epcRating) ? "Low" : "Moderate"}</div>
                </div>
                <div className={styles.riskItem}>
                  <div className={styles.riskLabel}>Valuation Volatility</div>
                  <div>{property.temperature === "hot" ? "High" : "Standard"}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "owner" && (
            <div className={styles.tabPane}>
              <h2>Owner Profile</h2>
              <div className={styles.ownerInfo}>
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Owner Details</div>
                  <p>
                    <strong>Name:</strong> {property.ownerName || "Unknown"}
                  </p>
                  <Link href={`/dealscope/owners/${property.id}`} className={styles.link}>
                    View full owner profile & portfolio →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comps" && (
            <div className={styles.tabPane}>
              <h2>Comparable Transactions</h2>
              {comps.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Sale Amount</th>
                      <th>Sale Date</th>
                      <th>Price/sqft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((comp) => (
                      <tr key={comp.id}>
                        <td>{comp.address}</td>
                        <td>{property.currency} {comp.saleAmount?.toLocaleString() || "-"}</td>
                        <td>{comp.saleDate || "-"}</td>
                        <td>{comp.pricePerSqft?.toFixed(2) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No comparable transactions available.</p>
              )}
            </div>
          )}

          {activeTab === "ddchecklist" && (
            <div className={styles.tabPane}>
              <h2>Due Diligence Checklist</h2>
              <div className={styles.checklistGrid}>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="title-check" />
                  <label htmlFor="title-check">Title & Ownership Verified</label>
                </div>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="lease-check" />
                  <label htmlFor="lease-check">Lease Terms Reviewed</label>
                </div>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="survey-check" />
                  <label htmlFor="survey-check">Structural Survey Completed</label>
                </div>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="compliance-check" />
                  <label htmlFor="compliance-check">Compliance & Regulations Verified</label>
                </div>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="financial-check" />
                  <label htmlFor="financial-check">Financial Records Reviewed</label>
                </div>
                <div className={styles.checklistItem}>
                  <input type="checkbox" id="insurance-check" />
                  <label htmlFor="insurance-check">Insurance & Warranties Checked</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href={`/dealscope/${propertyId}/approach`} className={styles.btn}>
            Generate Approach Letter
          </Link>
          <Link href={`/dealscope/${propertyId}/negotiate`} className={styles.btn}>
            Negotiation Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

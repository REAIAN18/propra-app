"use client";

import { useState } from "react";

interface PlanningEntry {
  id: string;
  refNumber: string;
  description: string;
  applicant?: string;
  type: string;
  status: string;
  distanceFt?: number;
  impact: "threat" | "opportunity" | "neutral";
  impactScore: number;
  submittedDate: string;
  decisionDate?: string;
  notes: string;
  holdSellLink?: "sell" | "hold" | "monitor";
  alertAcked?: boolean;
  sourceUrl?: string | null;
}

interface AssetPlanningData {
  assetId: string;
  assetName: string;
  location: string;
  planningHistory: PlanningEntry[];
  planningImpactSignal?: string | null;
  planningLastFetched?: string | null;
}

interface DevPotentialData {
  siteCoveragePct: number | null;
  pdRights: "full" | "partial" | "restricted" | "none";
  pdRightsDetail: string;
  changeOfUsePotential: "high" | "medium" | "low" | "none";
  changeOfUseDetail: string;
  airRightsPotential: "high" | "medium" | "low" | "none";
  airRightsDetail: string;
}

interface PlanningTabContentProps {
  planningData: AssetPlanningData | null;
  devPotential: DevPotentialData | null;
  loading: boolean;
}

export function PlanningTabContent({ planningData, devPotential, loading }: PlanningTabContentProps) {
  const [planningViewMode, setPlanningViewMode] = useState<"list" | "map">("list");
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ font: "500 13px var(--sans)", color: "var(--tx3)" }}>Loading planning data...</div>
      </div>
    );
  }

  if (!planningData) {
    return (
      <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>🏗️</div>
        <div style={{ font: "500 13px var(--sans)", color: "var(--tx2)", marginBottom: "4px" }}>No planning data available</div>
        <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)" }}>Planning applications will appear here when detected</div>
      </div>
    );
  }

  const apps = planningData.planningHistory || [];
  const negativeApps = apps.filter(a => a.impact === "threat");
  const positiveApps = apps.filter(a => a.impact === "opportunity");

  const devLevel = devPotential?.changeOfUsePotential === "high" ? "High" :
                 devPotential?.changeOfUsePotential === "medium" ? "Medium" :
                 devPotential?.changeOfUsePotential === "low" ? "Low" : "None";

  return (
    <>
      {/* KPIs */}
      <div className="a1" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
        <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Applications</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: "1" }}>{apps.length}</div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>within 1 mile · last 12mo</div>
        </div>
        <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Negative</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-0.02em", lineHeight: "1" }}>{negativeApps.length}</div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
            {negativeApps.length > 0 ? <span style={{ color: "var(--red)" }}>could impact value</span> : "none identified"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Positive</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: "1" }}>{positiveApps.length}</div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
            {positiveApps.length > 0 ? <span style={{ color: "var(--grn)" }}>neighbourhood improving</span> : "none identified"}
          </div>
        </div>
        <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Dev Potential</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--acc)", letterSpacing: "-0.02em", lineHeight: "1" }}>{devLevel}</div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>from site analysis</div>
        </div>
        <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
          <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Monitoring</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: "1" }}>Active</div>
          <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>Checked weekly</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="a2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px" }}>Nearby Applications</div>
        <div style={{ display: "flex", gap: "0", border: "1px solid var(--bdr)", borderRadius: "7px", overflow: "hidden" }}>
          <button
            onClick={() => setPlanningViewMode("list")}
            style={{
              padding: "6px 14px",
              font: "500 10px var(--sans)",
              color: planningViewMode === "list" ? "var(--acc)" : "var(--tx3)",
              background: planningViewMode === "list" ? "rgba(124,106,240,.10)" : "var(--s1)",
              cursor: "pointer",
              border: "none",
              borderRight: "1px solid var(--bdr)",
              transition: "all .12s"
            }}
          >
            List
          </button>
          <button
            onClick={() => setPlanningViewMode("map")}
            style={{
              padding: "6px 14px",
              font: "500 10px var(--sans)",
              color: planningViewMode === "map" ? "var(--acc)" : "var(--tx3)",
              background: planningViewMode === "map" ? "rgba(124,106,240,.10)" : "var(--s1)",
              cursor: "pointer",
              border: "none",
              transition: "all .12s"
            }}
          >
            Map
          </button>
        </div>
      </div>

      {/* Map View Placeholder */}
      {planningViewMode === "map" && (
        <div className="a2" style={{ background: "var(--s2)", border: "1px solid var(--bdr)", borderRadius: "10px", height: "320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "24px", position: "relative" }}>
          <div style={{ position: "absolute", top: "12px", right: "12px", font: "300 10px var(--sans)", color: "var(--tx3)" }}>Map view coming soon</div>
          <div style={{ font: "500 13px var(--sans)", color: "var(--tx3)" }}>Geographic view of planning applications</div>
          <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)", marginTop: "4px" }}>Will display applications on map with distance rings</div>
        </div>
      )}

      {/* Application List */}
      {planningViewMode === "list" && apps.length > 0 && (
        <div className="a3" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Applications — Last 12 Months</h4>
          </div>

          {apps.map((app) => {
            const isExpanded = expandedAppId === app.id;
            const impactColor = app.impact === "threat" ? "var(--red)" :
                               app.impact === "opportunity" ? "var(--grn)" : "var(--amb)";
            const impactBg = app.impact === "threat" ? "rgba(248,113,113,.07)" :
                            app.impact === "opportunity" ? "rgba(52,211,153,.07)" : "rgba(251,191,36,.07)";
            const impactBorder = app.impact === "threat" ? "rgba(248,113,113,.22)" :
                                app.impact === "opportunity" ? "rgba(52,211,153,.22)" : "rgba(251,191,36,.22)";
            const impactLabel = app.impact === "threat" ? "NEGATIVE" :
                               app.impact === "opportunity" ? "POSITIVE" : "NEUTRAL";

            const statusColor = app.status.toLowerCase().includes("approve") ? "var(--grn)" :
                               app.status.toLowerCase().includes("pending") ? "var(--amb)" :
                               app.status.toLowerCase().includes("reject") ? "var(--red)" : "var(--tx3)";

            const distanceMiles = app.distanceFt ? (app.distanceFt / 5280).toFixed(1) : "?";

            return (
              <div key={app.id}>
                <div
                  onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 18px",
                    borderBottom: "1px solid rgba(26, 26, 38, 0.6)",
                    borderLeft: `3px solid ${impactColor}`,
                    cursor: "pointer",
                    transition: "background .1s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--s2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: "1.3" }}>{app.description}</div>
                    <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                      {app.type} · {distanceMiles}mi · {app.submittedDate}
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "100px",
                    font: "600 9px/1 var(--mono)",
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                    background: impactBg,
                    color: impactColor,
                    border: `1px solid ${impactBorder}`
                  }}>
                    {impactLabel}
                  </span>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{distanceMiles}mi</span>
                  <span style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 7px",
                    borderRadius: "5px",
                    letterSpacing: "0.3px",
                    background: statusColor === "var(--grn)" ? "rgba(52,211,153,.07)" : statusColor === "var(--amb)" ? "rgba(251,191,36,.07)" : "var(--s3)",
                    color: statusColor,
                    border: `1px solid ${statusColor === "var(--grn)" ? "rgba(52,211,153,.22)" : statusColor === "var(--amb)" ? "rgba(251,191,36,.22)" : "var(--bdr)"}`,
                    whiteSpace: "nowrap"
                  }}>
                    {app.status.toUpperCase()}
                  </span>
                  <span style={{ color: "var(--tx3)", fontSize: "12px" }}>{isExpanded ? "↑" : "→"}</span>
                </div>

                {/* AI Explanation (Expanded) */}
                {isExpanded && app.notes && (
                  <div style={{ padding: "14px 18px", background: "var(--s2)", borderRadius: "8px", margin: "0 18px 18px", font: "300 12px/1.7 var(--sans)", color: "var(--tx2)" }}>
                    <div style={{ font: "500 8px/1 var(--mono)", padding: "2px 6px", borderRadius: "4px", background: "rgba(124,106,240,.10)", color: "var(--acc)", border: "1px solid rgba(124,106,240,.22)", marginBottom: "8px", display: "inline-block" }}>
                      AI CLASSIFICATION
                    </div>
                    <div style={{ color: "var(--tx)", fontWeight: 500, marginBottom: "4px" }}>
                      Classified as {impactLabel} because:
                    </div>
                    <div>{app.notes}</div>
                    {app.impact === "threat" && (
                      <div style={{ marginTop: "8px" }}>
                        <a href="#" style={{ color: "var(--red)", font: "500 11px var(--sans)" }}>Draft objection letter →</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {planningViewMode === "list" && apps.length === 0 && (
        <div className="a3" style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "24px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>✓</div>
          <div style={{ font: "500 13px var(--sans)", color: "var(--tx2)", marginBottom: "4px" }}>No planning applications found</div>
          <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)" }}>RealHQ monitors planning authorities weekly</div>
        </div>
      )}

      {/* Dev Potential Summary */}
      {devPotential && devPotential.changeOfUsePotential !== "none" && (
        <>
          <div className="a4" style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Development Potential</div>
          <div className="a4" style={{ background: "var(--s1)", border: "1px solid rgba(124,106,240,.22)", borderRadius: "10px", padding: "22px 24px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "center" }}>
            <div>
              <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Your Property</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px" }}>{devLevel} development potential</div>
              <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: "1.6", maxWidth: "480px" }}>
                {devPotential.changeOfUseDetail || "Development options identified based on site analysis and planning policy."}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <button style={{
                marginTop: "14px",
                display: "inline-block",
                padding: "8px 16px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                font: "600 11px/1 var(--sans)",
                cursor: "pointer"
              }}>
                Full report →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Zoning Summary & Site Analysis */}
      {devPotential && (
        <div className="a4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {/* Zoning & Rights */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Zoning & Rights</h4>
            </div>
            <div style={{ padding: "18px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>PDR Rights</div>
                <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                  {devPotential.pdRights === "full" ? "Full permitted development" :
                   devPotential.pdRights === "partial" ? "Partial rights" :
                   devPotential.pdRights === "restricted" ? "Restricted" : "None applicable"}
                </div>
                <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                  {devPotential.pdRightsDetail ? devPotential.pdRightsDetail.slice(0, 80) + (devPotential.pdRightsDetail.length > 80 ? "..." : "") : "Based on current use class"}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Change of Use</div>
                <div style={{ font: "500 12px var(--sans)", color: devPotential.changeOfUsePotential === "high" ? "var(--grn)" : devPotential.changeOfUsePotential === "medium" ? "var(--amb)" : "var(--tx)" }}>
                  {devPotential.changeOfUsePotential.charAt(0).toUpperCase() + devPotential.changeOfUsePotential.slice(1)} potential
                </div>
                <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                  {devPotential.changeOfUseDetail ? devPotential.changeOfUseDetail.slice(0, 80) + (devPotential.changeOfUseDetail.length > 80 ? "..." : "") : "Assessed from planning policy"}
                </div>
              </div>
              <div>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Air Rights</div>
                <div style={{ font: "500 12px var(--sans)", color: devPotential.airRightsPotential === "high" ? "var(--grn)" : devPotential.airRightsPotential === "medium" ? "var(--amb)" : "var(--tx)" }}>
                  {devPotential.airRightsPotential.charAt(0).toUpperCase() + devPotential.airRightsPotential.slice(1)} potential
                </div>
                <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                  {devPotential.airRightsDetail ? devPotential.airRightsDetail.slice(0, 80) + (devPotential.airRightsDetail.length > 80 ? "..." : "") : "Assessed from site coverage"}
                </div>
              </div>
            </div>
          </div>

          {/* Site Analysis */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Site Analysis</h4>
            </div>
            <div style={{ padding: "18px" }}>
              {devPotential.siteCoveragePct !== null && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>Site Coverage</div>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                    {devPotential.siteCoveragePct}% built · {100 - devPotential.siteCoveragePct}% open
                  </div>
                  <div style={{ font: "300 10px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
                    {devPotential.siteCoveragePct < 40 ? "Low coverage indicates development headroom" :
                     devPotential.siteCoveragePct < 70 ? "Moderate coverage, some expansion possible" :
                     "High coverage limits additional building"}
                  </div>
                </div>
              )}
              <div style={{ background: "var(--s2)", borderRadius: "8px", padding: "12px", marginTop: "12px" }}>
                <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", lineHeight: "1.6" }}>
                  Development potential assessment is indicative only. Full planning advice required before proceeding with any application.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useIncomeDashboard } from "@/hooks/useIncomeDashboard";

function fmt(v: number): string {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v.toLocaleString()}`;
}

const CATEGORY_BADGES: Record<string, string> = {
  "ev_charging": "ev",
  "solar": "solar",
  "5g_mast": "telecom",
  "parking": "parking",
  "billboard": "advertising",
  "vending": "vending",
  "roofspace": "roofspace",
  "coworking": "coworking",
  "storage": "storage",
};

const STATUS_TAG_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "LIVE": { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)" },
  "QUOTING": { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
  "INSTALLING": { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)" },
  "IDENTIFIED": { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)" },
  "UNTAPPED": { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
  "IN PROGRESS": { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)" },
};

export default function IncomePage() {
  const { data, loading } = useIncomeDashboard();

  if (loading || !data) {
    return (
      <AppShell>
        <TopBar title="Income" />
        <main style={{ padding: "28px 32px 80px" }}>
          <div style={{ maxWidth: "1080px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "24px",
                color: "var(--tx)",
                marginBottom: "4px"
              }}>
                Income Opportunities
              </div>
              <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
                Loading...
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const { kpis, topOpportunity, categories, activationPipeline, assetsByPotential } = data;

  return (
    <AppShell>
      <TopBar title="Income" />

      <main style={{ padding: "28px 32px 80px" }}>
        <div style={{ maxWidth: "1080px" }}>

          {/* Page Header */}
          <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "24px",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
                lineHeight: "1.2",
                marginBottom: "4px"
              }}>
                Income Opportunities
              </div>
              <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
                Ancillary income across your portfolio — AI-discovered and user-added.
              </div>
            </div>
            <button style={{
              height: "30px",
              padding: "0 14px",
              background: "var(--acc)",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              font: "600 11px/1 var(--sans)",
              cursor: "pointer"
            }}>
              + Add custom opportunity
            </button>
          </div>

          {/* KPIs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "1px",
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "24px"
          }}>
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer",
              transition: "background 0.12s"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px"
              }}>
                Active Income
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--grn)",
                letterSpacing: "-0.02em",
                lineHeight: "1"
              }}>
                {fmt(kpis.activeIncome)}<small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}>/yr</small>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--grn)" }}>↑ {kpis.activeIncomeChange}% vs last year</span>
              </div>
            </div>

            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer",
              transition: "background 0.12s"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px"
              }}>
                Pipeline
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
                lineHeight: "1"
              }}>
                {fmt(kpis.pipeline)}<small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}>/yr</small>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                {kpis.pipelineCount} opportunities in progress
              </div>
            </div>

            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer",
              transition: "background 0.12s"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px"
              }}>
                Untapped
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--acc)",
                letterSpacing: "-0.02em",
                lineHeight: "1"
              }}>
                {fmt(kpis.untapped)}<small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: 400 }}>/yr</small>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                {kpis.untappedCount} new opportunities identified
              </div>
            </div>

            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer",
              transition: "background 0.12s"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px"
              }}>
                Performance
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
                lineHeight: "1"
              }}>
                {kpis.performance}%
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--grn)" }}>vs estimate</span>
              </div>
            </div>

            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer",
              transition: "background 0.12s"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px"
              }}>
                Opportunities
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
                lineHeight: "1"
              }}>
                {kpis.totalOpportunities}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                {kpis.assetCount} assets · {kpis.categoryCount} categories
              </div>
            </div>
          </div>

          {/* Top Opportunity Insight */}
          {topOpportunity && (
            <div style={{
              background: "var(--s1)",
              border: "1px solid var(--acc-bdr)",
              borderRadius: "10px",
              padding: "22px 24px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "24px",
              alignItems: "center"
            }}>
              <div>
                <div style={{
                  font: "500 9px/1 var(--mono)",
                  color: "var(--acc)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  marginBottom: "8px"
                }}>
                  Top Opportunity
                </div>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: "18px",
                  color: "var(--tx)",
                  marginBottom: "3px"
                }}>
                  {topOpportunity.category} at {topOpportunity.assetName}
                </div>
                <div style={{
                  fontSize: "12px",
                  color: "var(--tx3)",
                  lineHeight: "1.6",
                  maxWidth: "480px"
                }}>
                  {topOpportunity.description}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: "32px",
                  color: "var(--tx)",
                  letterSpacing: "-0.03em",
                  lineHeight: "1"
                }}>
                  {fmt(topOpportunity.annualIncome)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>
                  per year · {topOpportunity.confidence}% confidence
                </div>
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
                  View details →
                </button>
              </div>
            </div>
          )}

          {/* Income by Category */}
          <div style={{
            font: "500 9px/1 var(--mono)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
            paddingTop: "4px"
          }}>
            Income by Category
          </div>

          <div style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "24px"
          }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                Portfolio Ancillary Income — Active + Pipeline
              </h4>
              <span style={{
                font: "500 11px var(--sans)",
                color: "var(--acc)",
                cursor: "pointer"
              }}>
                View all opportunities →
              </span>
            </div>

            {categories.map((cat, idx) => (
              <div
                key={cat.categoryKey}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: idx < categories.length - 1 ? "1px solid var(--bdr-lt)" : "none",
                  cursor: "pointer",
                  transition: "background 0.1s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: "1.3" }}>
                    {cat.category}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                    {cat.assetCount} {cat.assetCount === 1 ? "asset" : "assets"} · {cat.providers.join(", ")}
                  </div>
                </div>

                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "100px",
                  font: "500 8px/1 var(--mono)",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  ...(CATEGORY_BADGES[cat.categoryKey] === "ev" && {
                    background: "rgba(56,189,248,0.07)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56,189,248,0.22)"
                  }),
                  ...(CATEGORY_BADGES[cat.categoryKey] === "solar" && {
                    background: "var(--amb-lt)",
                    color: "var(--amb)",
                    border: "1px solid var(--amb-bdr)"
                  }),
                  ...(CATEGORY_BADGES[cat.categoryKey] === "telecom" && {
                    background: "var(--acc-lt)",
                    color: "var(--acc)",
                    border: "1px solid var(--acc-bdr)"
                  }),
                  ...(CATEGORY_BADGES[cat.categoryKey] === "parking" && {
                    background: "var(--grn-lt)",
                    color: "var(--grn)",
                    border: "1px solid var(--grn-bdr)"
                  }),
                  ...(CATEGORY_BADGES[cat.categoryKey] === "advertising" && {
                    background: "var(--red-lt)",
                    color: "var(--red)",
                    border: "1px solid var(--red-bdr)"
                  })
                }}>
                  {CATEGORY_BADGES[cat.categoryKey]?.toUpperCase() || cat.categoryKey.toUpperCase()}
                </span>

                <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>
                  {cat.annualIncome > 0 ? fmt(cat.annualIncome) : "—"}/yr
                </span>

                {cat.liveCount > 0 && (
                  <span style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 7px",
                    borderRadius: "5px",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                    ...STATUS_TAG_STYLES["LIVE"]
                  }}>
                    {cat.liveCount} LIVE
                  </span>
                )}

                {cat.pipelineCount > 0 && (
                  <span style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 7px",
                    borderRadius: "5px",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                    ...STATUS_TAG_STYLES["QUOTING"]
                  }}>
                    {cat.pipelineCount} QUOTING
                  </span>
                )}

                {cat.identifiedCount > 0 && cat.liveCount === 0 && cat.pipelineCount === 0 && (
                  <span style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 7px",
                    borderRadius: "5px",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                    ...STATUS_TAG_STYLES["IDENTIFIED"]
                  }}>
                    {cat.identifiedCount} IDENTIFIED
                  </span>
                )}

                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
              </div>
            ))}
          </div>

          {/* Activation Pipeline */}
          <div style={{
            font: "500 9px/1 var(--mono)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
            paddingTop: "4px"
          }}>
            Activation Pipeline
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "24px"
          }}>
            {[
              { label: "Identified", count: activationPipeline.identified, color: "var(--tx3)" },
              { label: "Researching", count: activationPipeline.researching, color: "var(--tx3)" },
              { label: "Quoting", count: activationPipeline.quoting, color: "var(--acc)" },
              { label: "Approved", count: activationPipeline.approved, color: "var(--tx3)" },
              { label: "Installing", count: activationPipeline.installing, color: "var(--amb)" },
              { label: "Live", count: activationPipeline.live, color: "var(--grn)" },
              { label: "Renewing", count: activationPipeline.renewing, color: "var(--tx3)" },
            ].map((stage) => (
              <div key={stage.label} style={{
                background: "var(--s1)",
                padding: "14px",
                textAlign: "center"
              }}>
                <div style={{
                  font: "500 8px/1 var(--mono)",
                  color: stage.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px"
                }}>
                  {stage.label}
                </div>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: stage.color
                }}>
                  {stage.count}
                </div>
              </div>
            ))}
          </div>

          {/* Assets by Untapped Potential */}
          <div style={{
            font: "500 9px/1 var(--mono)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
            paddingTop: "4px"
          }}>
            Assets by Untapped Potential
          </div>

          <div style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "24px"
          }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                Where to Focus Next
              </h4>
              <span style={{
                font: "500 11px var(--sans)",
                color: "var(--acc)",
                cursor: "pointer"
              }}>
                Highest potential first
              </span>
            </div>

            {assetsByPotential.map((asset, idx) => (
              <div
                key={asset.assetId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: idx < assetsByPotential.length - 1 ? "1px solid var(--bdr-lt)" : "none",
                  cursor: "pointer",
                  transition: "background 0.1s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: "1.3" }}>
                    {asset.assetName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                    {asset.opportunityCount} {asset.opportunityCount === 1 ? "opportunity" : "opportunities"} · {asset.opportunityTypes.join(", ")}
                  </div>
                </div>

                <span style={{ font: "500 11px/1 var(--mono)", color: "var(--grn)" }}>
                  {fmt(asset.untappedIncome)}/yr
                </span>

                <span style={{
                  font: "500 9px/1 var(--mono)",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  letterSpacing: "0.3px",
                  whiteSpace: "nowrap",
                  ...(STATUS_TAG_STYLES[asset.statusSummary] || STATUS_TAG_STYLES["UNTAPPED"])
                }}>
                  {asset.statusSummary}
                </span>

                <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>
                  {fmt(asset.activeIncome)} active
                </span>

                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
              </div>
            ))}
          </div>

        </div>
      </main>
    </AppShell>
  );
}

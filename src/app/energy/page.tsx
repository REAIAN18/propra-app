"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// Types
type MarketType = "regulated" | "deregulated";

type EnergyAnomaly = {
  id: string;
  propertyId: string;
  propertyName: string;
  description: string;
  impactMonthly: number;
};

type EnergySummary = {
  annualSpend: number;
  isEstimated: boolean;
  identifiedSavings: number;
  costPerSqft: number;
  benchmarkCostPerSqft: number;
  billsUploaded: number;
  totalProperties: number;
  solarPotential: number;
  anomalies: EnergyAnomaly[];
  marketType: MarketType;
};

// Formatters
function fmt(value: number, prefix = "$"): string {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(0)}k`;
  return `${prefix}${value.toLocaleString()}`;
}

export default function EnergyPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Energy Optimisation — RealHQ";

    // Fetch energy summary
    fetch(`/api/user/energy-summary?portfolioId=${portfolioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setSummary(data);
        } else {
          // Demo fallback
          const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
          const annualSpend = totalSqft * 3.61; // FL commercial avg

          setSummary({
            annualSpend,
            isEstimated: true,
            identifiedSavings: annualSpend * 0.14, // 14% savings
            costPerSqft: 3.61,
            benchmarkCostPerSqft: 3.06,
            billsUploaded: 3,
            totalProperties: portfolio.assets.length,
            solarPotential: 42000,
            anomalies: [],
            marketType: "regulated"
          });
        }
        setLoading(false);
      })
      .catch(() => {
        // Demo fallback
        const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);
        const annualSpend = totalSqft * 3.61;

        setSummary({
          annualSpend,
          isEstimated: true,
          identifiedSavings: annualSpend * 0.14,
          costPerSqft: 3.61,
          benchmarkCostPerSqft: 3.06,
          billsUploaded: 3,
          totalProperties: portfolio.assets.length,
          solarPotential: 42000,
          anomalies: [],
          marketType: "regulated"
        });
        setLoading(false);
      });
  }, [portfolioId, portfolio.assets]);

  if (loading || !summary) {
    return (
      <AppShell>
        <TopBar />
        <div style={{ padding: "32px", color: "var(--tx2)" }}>Loading energy data...</div>
      </AppShell>
    );
  }

  const savingsPercent = summary.annualSpend > 0
    ? ((summary.identifiedSavings / summary.annualSpend) * 100).toFixed(0)
    : 0;

  const costVsBenchmarkPercent = summary.benchmarkCostPerSqft > 0
    ? (((summary.costPerSqft - summary.benchmarkCostPerSqft) / summary.benchmarkCostPerSqft) * 100).toFixed(0)
    : 0;

  const totalSqft = portfolio.assets.reduce((s, a) => s + a.sqft, 0);

  return (
    <AppShell>
      <TopBar />
      <div style={{ padding: "28px 32px 80px", background: "var(--bg)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1080px" }}>

          {/* Page Header */}
          <div style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between"
          }}>
            <div>
              <h1 style={{
                fontFamily: "var(--serif)",
                fontSize: "24px",
                fontWeight: 400,
                color: "var(--tx)",
                letterSpacing: "-.02em",
                marginBottom: "4px"
              }}>
                Energy Optimisation
              </h1>
              <p style={{
                font: "300 13px var(--sans)",
                color: "var(--tx3)"
              }}>
                Find savings across your portfolio — tariff restructuring, solar, demand reduction, and more.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{
                height: "30px",
                padding: "0 12px",
                background: "transparent",
                color: "var(--tx2)",
                border: "1px solid var(--bdr)",
                borderRadius: "7px",
                font: "500 11px/1 var(--sans)",
                cursor: "pointer"
              }}>
                Upload bills
              </button>
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
                Get full assessment
              </button>
            </div>
          </div>

          {/* Market Banner */}
          {summary.marketType === "regulated" && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "12px",
              lineHeight: "1.5",
              background: "var(--amb-lt)",
              border: "1px solid var(--amb-bdr)",
              color: "var(--amb)"
            }}>
              <div style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>⚠</div>
              <div>
                <strong style={{ display: "block", fontSize: "12px", marginBottom: "1px" }}>
                  Florida is a regulated energy market — you cannot switch supplier.
                </strong>
                <span style={{ opacity: ".7" }}>
                  FPL, Duke Energy, and Tampa Electric are the sole providers in their service areas.
                  RealHQ focuses on optimisation: tariff restructuring, demand reduction, solar PPA, and utility rebates.
                </span>
              </div>
            </div>
          )}

          {/* KPI Row */}
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
            {/* Annual Spend */}
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "6px"
              }}>
                Annual Spend
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-.02em",
                lineHeight: "1"
              }}>
                {fmt(summary.annualSpend)}{" "}
                {summary.isEstimated && (
                  <span style={{
                    display: "inline-flex",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    font: "500 8px/1 var(--mono)",
                    letterSpacing: ".3px",
                    background: "var(--amb-lt)",
                    color: "var(--amb)",
                    border: "1px solid var(--amb-bdr)",
                    verticalAlign: "middle",
                    marginLeft: "4px"
                  }}>
                    EST
                  </span>
                )}
              </div>
              <div style={{
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginTop: "3px"
              }}>
                {totalSqft.toLocaleString()} sqft · FL commercial avg
              </div>
            </div>

            {/* Identified Savings */}
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "6px"
              }}>
                Identified Savings
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--grn)",
                letterSpacing: "-.02em",
                lineHeight: "1"
              }}>
                {fmt(summary.identifiedSavings)}
              </div>
              <div style={{
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginTop: "3px"
              }}>
                <span style={{ color: "var(--grn)" }}>↓ {savingsPercent}%</span> of current spend
              </div>
            </div>

            {/* Cost per sqft */}
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "6px"
              }}>
                Cost / sqft
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-.02em",
                lineHeight: "1"
              }}>
                ${summary.costPerSqft.toFixed(2)}
              </div>
              <div style={{
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginTop: "3px"
              }}>
                <span style={{ color: "var(--red)" }}>↑ {costVsBenchmarkPercent}%</span> vs FL avg ${summary.benchmarkCostPerSqft.toFixed(2)}
              </div>
            </div>

            {/* Bills Uploaded */}
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "6px"
              }}>
                Bills Uploaded
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--tx)",
                letterSpacing: "-.02em",
                lineHeight: "1"
              }}>
                {summary.billsUploaded}{" "}
                <small style={{
                  fontFamily: "var(--sans)",
                  fontSize: "10px",
                  color: "var(--tx3)",
                  fontWeight: 400
                }}>
                  of {summary.totalProperties}
                </small>
              </div>
              <div style={{
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginTop: "3px"
              }}>
                <span style={{ color: "var(--amb)" }}>
                  {summary.totalProperties - summary.billsUploaded} properties missing
                </span>
              </div>
            </div>

            {/* Solar Potential */}
            <div style={{
              background: "var(--s1)",
              padding: "14px 16px",
              cursor: "pointer"
            }}>
              <div style={{
                font: "500 8px/1 var(--mono)",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "6px"
              }}>
                Solar Potential
              </div>
              <div style={{
                fontFamily: "var(--serif)",
                fontSize: "20px",
                color: "var(--amb)",
                letterSpacing: "-.02em",
                lineHeight: "1"
              }}>
                {fmt(summary.solarPotential)}
                <small style={{
                  fontFamily: "var(--sans)",
                  fontSize: "10px",
                  color: "var(--tx3)",
                  fontWeight: 400
                }}>
                  /yr
                </small>
              </div>
              <div style={{
                font: "400 10px var(--sans)",
                color: "var(--tx3)",
                marginTop: "3px"
              }}>
                {summary.billsUploaded} roofs assessed
              </div>
            </div>
          </div>

          {/* Anomalies */}
          {summary.anomalies.map(anomaly => (
            <div
              key={anomaly.id}
              style={{
                background: "var(--s1)",
                border: "1px solid var(--red-bdr)",
                borderRadius: "10px",
                padding: "14px 20px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--red)"
                }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx)" }}>
                    {anomaly.propertyName} — consumption spike detected
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                    {anomaly.description}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ font: "600 13px var(--sans)", color: "var(--red)" }}>
                  +{fmt(anomaly.impactMonthly)}/mo
                </span>
                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
              </div>
            </div>
          ))}

          {/* Properties Section */}
          <div style={{
            font: "500 9px/1 var(--mono)",
            color: "var(--tx3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
            paddingTop: "4px"
          }}>
            Properties
          </div>

          <div style={{
            background: "var(--s1)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "14px"
          }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                Energy by Property
              </h4>
              <span style={{
                font: "500 11px var(--sans)",
                color: "var(--acc)",
                cursor: "pointer"
              }}>
                Download summary →
              </span>
            </div>

            {/* Property Rows */}
            {portfolio.assets.slice(0, 3).map((asset, idx) => {
              // Demo data - in production would come from API
              const annualCost = asset.energyCost;
              const costPerSqft = asset.sqft > 0 ? annualCost / asset.sqft : 0;
              const saving = annualCost * 0.15; // Demo: 15% savings potential

              return (
                <div
                  key={asset.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 1fr 1fr auto",
                    alignItems: "center",
                    gap: "16px",
                    padding: "14px 18px",
                    borderBottom: idx < 2 ? "1px solid var(--bdr-lt)" : "none",
                    cursor: "pointer",
                    transition: "background .1s"
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--tx)",
                      marginBottom: "2px"
                    }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3)" }}>
                      {asset.location}
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "4px",
                      padding: "1px 7px",
                      borderRadius: "100px",
                      font: "500 8px/1 var(--mono)",
                      letterSpacing: ".4px",
                      textTransform: "uppercase",
                      background: "var(--amb-lt)",
                      border: "1px solid var(--amb-bdr)",
                      color: "var(--amb)"
                    }}>
                      FL Regulated
                    </span>
                  </div>

                  <div>
                    <div style={{
                      font: "500 8px/1 var(--mono)",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      marginBottom: "4px"
                    }}>
                      Annual Cost
                    </div>
                    <div style={{
                      fontFamily: "var(--serif)",
                      fontSize: "17px",
                      color: "var(--tx)",
                      letterSpacing: "-.01em"
                    }}>
                      {fmt(annualCost)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                      <span style={{ color: "var(--red)", fontWeight: 500 }}>↑ 22%</span> vs benchmark
                    </div>
                  </div>

                  <div>
                    <div style={{
                      font: "500 8px/1 var(--mono)",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      marginBottom: "4px"
                    }}>
                      Cost/sqft
                    </div>
                    <div style={{
                      fontFamily: "var(--serif)",
                      fontSize: "17px",
                      color: "var(--tx)",
                      letterSpacing: "-.01em"
                    }}>
                      ${costPerSqft.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                      FL {asset.type} avg
                    </div>
                  </div>

                  <div>
                    <div style={{
                      font: "500 8px/1 var(--mono)",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      marginBottom: "4px"
                    }}>
                      Saving Found
                    </div>
                    <div style={{
                      fontFamily: "var(--serif)",
                      fontSize: "17px",
                      color: "var(--grn)",
                      letterSpacing: "-.01em"
                    }}>
                      {fmt(saving)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                      <span style={{ color: "var(--grn)" }}>tariff + demand</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <button style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--acc-bdr)",
                      background: "var(--acc-lt)",
                      color: "var(--acc)",
                      font: "500 10px var(--sans)",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                      Review savings →
                    </button>
                    <button style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--bdr)",
                      background: "var(--s2)",
                      color: "var(--tx2)",
                      font: "500 10px var(--sans)",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                      View bills
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </AppShell>
  );
}

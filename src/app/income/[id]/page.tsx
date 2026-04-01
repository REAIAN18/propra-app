"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StagePipeline } from "@/components/StagePipeline";
import Link from "next/link";

interface OpportunityDetail {
  id: string;
  assetId: string;
  assetName: string;
  opportunityType: string;
  opportunityLabel: string;
  annualIncome: number;
  confidence: number;
  capex: number;
  currentStage: "identified" | "researching" | "quoting" | "approved" | "installing" | "live";
  methodology: {
    baseEstimate: string;
    utilisationAssumptions: string;
    revenueModel: string;
  };
  comparables: Array<{
    id: string;
    name: string;
    distance: number;
    provider: string;
    liveSince: string;
    annualIncome: number;
    verified: boolean;
  }>;
  riskFactors: Array<{
    type: "positive" | "warning";
    label: string;
  }>;
  quotes: Array<{
    id: string;
    provider: string;
    description: string;
    annualIncome: number;
    recommended: boolean;
    receivedDate: string;
  }>;
  activityLog: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    type: "current" | "completed" | "info";
  }>;
}

export default function IncomeOpportunityDetailPage() {
  const params = useParams();
  const opportunityId = params.id as string;

  const [data, setData] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/income-opportunities/${opportunityId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [opportunityId]);

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Income" />
        <main style={{ padding: "28px 32px 80px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
              Loading...
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <TopBar title="Income" />
        <main style={{ padding: "28px 32px 80px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
              Opportunity not found.
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const comparablesRange = data.comparables.length > 0
    ? {
        min: Math.min(...data.comparables.map(c => c.annualIncome)),
        max: Math.max(...data.comparables.map(c => c.annualIncome)),
        median: data.comparables[Math.floor(data.comparables.length / 2)]?.annualIncome || 0,
      }
    : null;

  return (
    <AppShell>
      <TopBar title="Income" />

      <main style={{ padding: "28px 32px 80px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              font: "500 9px/1 var(--mono)",
              color: "var(--acc)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}
            className="a1"
          >
            {data.assetName} · Income
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: "28px",
              color: "var(--tx)",
              letterSpacing: "-0.02em",
              marginBottom: "6px",
            }}
            className="a1"
          >
            {data.opportunityLabel}
          </div>
          <div
            style={{
              font: "300 13px var(--sans)",
              color: "var(--tx3)",
              marginBottom: "20px",
            }}
            className="a2"
          >
            AI-identified opportunity with comparable evidence and provider quotes.
          </div>

          {/* Stage Pipeline */}
          <div className="a2">
            <StagePipeline currentStage={data.currentStage} />
          </div>

          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              background: "var(--bdr)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "14px",
            }}
            className="a2"
          >
            <div
              style={{
                background: "var(--s1)",
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Estimated Income
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--grn)",
                }}
              >
                £{data.annualIncome.toLocaleString()}/yr
              </div>
            </div>

            <div
              style={{
                background: "var(--s1)",
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Confidence
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--grn)",
                }}
              >
                {data.confidence}%
              </div>
            </div>

            <div
              style={{
                background: "var(--s1)",
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Capex Required
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  color: "var(--tx)",
                }}
              >
                {data.capex > 0 ? `£${data.capex.toLocaleString()}` : "£0"}
              </div>
              {data.capex === 0 && (
                <div
                  style={{
                    font: "400 9px var(--sans)",
                    color: "var(--tx3)",
                    marginTop: "2px",
                  }}
                >
                  Provider-funded
                </div>
              )}
            </div>
          </div>

          {/* Methodology */}
          <div
            className="card a3"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--bdr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                How We Calculated This
              </h4>
              <span
                style={{
                  font: "500 11px var(--sans)",
                  color: "var(--acc)",
                  cursor: "pointer",
                }}
              >
                View raw data →
              </span>
            </div>
            <div style={{ padding: "18px" }}>
              <div
                style={{ font: "400 12px/1.7 var(--sans)", color: "var(--tx2)" }}
              >
                <strong style={{ color: "var(--tx)" }}>Base estimate:</strong>{" "}
                {data.methodology.baseEstimate}
              </div>
              <div
                style={{
                  marginTop: "12px",
                  font: "400 12px/1.7 var(--sans)",
                  color: "var(--tx2)",
                }}
              >
                <strong style={{ color: "var(--tx)" }}>
                  Utilisation assumptions:
                </strong>{" "}
                {data.methodology.utilisationAssumptions}
              </div>
              <div
                style={{
                  marginTop: "12px",
                  font: "400 12px/1.7 var(--sans)",
                  color: "var(--tx2)",
                }}
              >
                <strong style={{ color: "var(--tx)" }}>Revenue model:</strong>{" "}
                {data.methodology.revenueModel}
              </div>
            </div>
          </div>

          {/* Comparable Evidence */}
          {data.comparables.length > 0 && (
            <div
              className="card a3"
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bdr)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                  Comparable Evidence
                </h4>
                <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>
                  {data.comparables.length} comparables found
                </span>
              </div>

              {data.comparables.map((comp, idx) => (
                <div
                  key={comp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 18px",
                    borderBottom:
                      idx < data.comparables.length - 1
                        ? "1px solid var(--bdr-lt)"
                        : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--s2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--tx)",
                        lineHeight: "1.3",
                      }}
                    >
                      {comp.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                      {comp.distance} miles away · {comp.provider} · Live since{" "}
                      {comp.liveSince}
                    </div>
                  </div>

                  <span
                    style={{
                      font: "500 11px/1 var(--mono)",
                      color: "var(--tx2)",
                    }}
                  >
                    £{comp.annualIncome.toLocaleString()}/yr
                  </span>

                  <span
                    style={{
                      font: "500 9px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "5px",
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                      ...(comp.verified
                        ? {
                            background: "var(--grn-lt)",
                            color: "var(--grn)",
                            border: "1px solid var(--grn-bdr)",
                          }
                        : {
                            background: "var(--s3)",
                            color: "var(--tx3)",
                            border: "1px solid var(--bdr)",
                          }),
                    }}
                  >
                    {comp.verified ? "VERIFIED" : "ESTIMATED"}
                  </span>

                  <span style={{ color: "var(--tx3)", fontSize: "12px" }}>
                    →
                  </span>
                </div>
              ))}

              {comparablesRange && (
                <div
                  style={{
                    padding: "12px 18px",
                    font: "300 11px var(--sans)",
                    color: "var(--tx3)",
                  }}
                >
                  Range: £{comparablesRange.min.toLocaleString()}–£
                  {comparablesRange.max.toLocaleString()}/yr · Median: £
                  {comparablesRange.median.toLocaleString()}/yr · Your estimate
                  (£{data.annualIncome.toLocaleString()}) within range.
                </div>
              )}
            </div>
          )}

          {/* Risk Factors */}
          <div
            className="card a3"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--bdr)",
              }}
            >
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                Risk Factors
              </h4>
            </div>
            <div style={{ padding: "18px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {data.riskFactors.map((risk, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      font: "400 11px var(--sans)",
                      ...(risk.type === "positive"
                        ? {
                            background: "var(--grn-lt)",
                            border: "1px solid var(--grn-bdr)",
                            color: "var(--grn)",
                          }
                        : {
                            background: "var(--amb-lt)",
                            border: "1px solid var(--amb-bdr)",
                            color: "var(--amb)",
                          }),
                    }}
                  >
                    {risk.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quotes Received */}
          {data.quotes.length > 0 && (
            <div
              className="card a4"
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bdr)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                  Quotes Received
                </h4>
                <span
                  style={{
                    font: "500 11px var(--sans)",
                    color: "var(--acc)",
                    cursor: "pointer",
                  }}
                >
                  Request more quotes →
                </span>
              </div>

              {data.quotes.map((quote, idx) => (
                <div
                  key={quote.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 18px",
                    borderBottom:
                      idx < data.quotes.length - 1
                        ? "1px solid var(--bdr-lt)"
                        : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--s2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--tx)",
                        lineHeight: "1.3",
                      }}
                    >
                      {quote.provider}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--tx3)" }}>
                      {quote.description}
                    </div>
                  </div>

                  <span
                    style={{
                      font: "500 11px/1 var(--mono)",
                      color: quote.recommended ? "var(--grn)" : "var(--tx2)",
                    }}
                  >
                    £{quote.annualIncome.toLocaleString()}/yr
                  </span>

                  <span
                    style={{
                      font: "500 9px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "5px",
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                      ...(quote.recommended
                        ? {
                            background: "var(--grn-lt)",
                            color: "var(--grn)",
                            border: "1px solid var(--grn-bdr)",
                          }
                        : {
                            background: "var(--s3)",
                            color: "var(--tx3)",
                            border: "1px solid var(--bdr)",
                          }),
                    }}
                  >
                    {quote.recommended ? "RECOMMENDED" : "RECEIVED"}
                  </span>

                  <span
                    style={{
                      font: "500 10px var(--sans)",
                      color: "var(--tx3)",
                    }}
                  >
                    Received {quote.receivedDate}
                  </span>

                  <span style={{ color: "var(--tx3)", fontSize: "12px" }}>
                    →
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Activity Log */}
          <div
            className="card a4"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--bdr)",
              }}
            >
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>
                Activity
              </h4>
            </div>
            <div style={{ padding: "18px" }}>
              <div
                style={{
                  borderLeft: "2px solid var(--bdr)",
                  paddingLeft: "16px",
                  marginLeft: "4px",
                }}
              >
                {data.activityLog.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      marginBottom:
                        idx < data.activityLog.length - 1 ? "14px" : "0",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-21px",
                        top: "3px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        border: "2px solid var(--bg)",
                        ...(item.type === "current" && {
                          background: "var(--acc)",
                        }),
                        ...(item.type === "completed" && {
                          background: "var(--grn)",
                        }),
                        ...(item.type === "info" && {
                          background: "var(--tx3)",
                        }),
                      }}
                    />
                    <div
                      style={{
                        font: "500 11px var(--sans)",
                        color: "var(--tx)",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        font: "300 10px var(--sans)",
                        color: "var(--tx3)",
                      }}
                    >
                      {item.date} · {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
            }}
            className="a5"
          >
            <button
              className="btn-primary green"
              style={{
                flex: 1,
                height: "42px",
                padding: "0 18px",
                background: "var(--grn)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              Accept quote →
            </button>
            <button
              className="btn-primary"
              style={{
                flex: 1,
                height: "42px",
                padding: "0 18px",
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              Request more quotes →
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
            }}
            className="a5"
          >
            <button
              className="btn-secondary"
              style={{
                flex: 2,
                height: "42px",
                padding: "0 18px",
                background: "var(--s2)",
                color: "var(--tx)",
                border: "1px solid var(--bdr)",
                borderRadius: "8px",
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              Add note / contact details
            </button>
            <button
              className="btn-secondary"
              style={{
                flex: 1,
                height: "42px",
                padding: "0 18px",
                background: "var(--s2)",
                color: "var(--red)",
                border: "1px solid var(--red-bdr)",
                borderRadius: "8px",
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              Dismiss ×
            </button>
          </div>

          <Link href="/income">
            <button
              className="btn-secondary a5"
              style={{
                width: "100%",
                height: "42px",
                padding: "0 18px",
                background: "var(--s2)",
                color: "var(--tx)",
                border: "1px solid var(--bdr)",
                borderRadius: "8px",
                font: "600 12px/1 var(--sans)",
                cursor: "pointer",
              }}
            >
              ← Back to income
            </button>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

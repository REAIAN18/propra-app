"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

type TabName = "Overview" | "Tenants" | "Financials" | "Insurance" | "Energy" | "Compliance" | "Planning" | "Documents";

interface Document {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  documentType: string | null;
  status: string;
  extractedData: unknown;
  createdAt: string;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const assetId = params.id as string;
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [documentsData, setDocumentsData] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<"satellite" | "street">("satellite");

  const asset = portfolio.assets.find((a) => a.id === assetId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  useEffect(() => {
    if (asset) {
      document.title = `${asset.name || "Property"} — RealHQ`;
    }
  }, [asset]);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch("/api/user/documents");
        const data = await res.json();
        setDocumentsData(data.documents || []);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    }
    fetchDocuments();
  }, []);

  if (!asset) {
    return (
      <AppShell>
        <TopBar title="Property Not Found" />
        <div className="p-6 text-center">
          <p className="text-gray-500">Asset not found</p>
        </div>
      </AppShell>
    );
  }

  // Calculate KPIs
  const estimatedValue = asset.valuationGBP ?? asset.valuationUSD ?? 0;
  const passingRent = asset.leases.reduce((s, l) => s + l.sqft * l.rentPerSqft, 0);
  const noi = passingRent * 0.65; // Simplified: 65% after expenses
  const occupancy = (asset.leases.filter(l => l.tenant !== "Vacant").reduce((s, l) => s + l.sqft, 0) / asset.sqft) * 100;
  const uncapturedValue = passingRent * 0.15; // 15% opportunity estimate
  const savedThisYear = 42000; // Demo value
  const activeTenants = asset.leases.filter(l => l.tenant !== "Vacant");
  const vacantUnits = asset.leases.filter(l => l.tenant === "Vacant");

  return (
    <AppShell>
      <TopBar title={asset.name || "Property Details"} />

      <main className="flex-1 overflow-y-auto" style={{ background: "#09090b" }}>
        <div style={{ maxWidth: "1040px", padding: "24px 28px 80px" }}>

          {/* Hero with satellite */}
          <div
            className="a1"
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "24px",
              border: "1px solid var(--bdr)"
            }}
          >
            <div
              style={{
                height: "200px",
                background: "var(--s2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
                opacity: 0.15,
                position: "relative"
              }}
            >
              {viewMode === "satellite" ? "🛰️" : "🏙️"}
            </div>

            {/* Property overlay info */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "20px 24px",
                background: "linear-gradient(transparent, rgba(9,9,11,0.9))"
              }}
            >
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "24px",
                  color: "#fff",
                  marginBottom: "2px"
                }}
              >
                {asset.name}
              </h1>
              <p style={{ font: "400 12px var(--sans)", color: "rgba(255,255,255,0.5)" }}>
                {asset.location} · {asset.sqft.toLocaleString()} sqft
              </p>
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                <span
                  style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    letterSpacing: ".3px",
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}
                >
                  {asset.type || "Commercial"}
                </span>
                <span
                  style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    letterSpacing: ".3px",
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}
                >
                  {asset.sqft.toLocaleString()} sqft
                </span>
                <span
                  style={{
                    font: "500 9px/1 var(--mono)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    letterSpacing: ".3px",
                    background: "var(--grn-lt)",
                    color: "var(--grn)",
                    border: "1px solid var(--grn-bdr)"
                  }}
                >
                  ✓ {documentsData.length} docs uploaded
                </span>
              </div>
            </div>

            {/* View toggle buttons */}
            <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "6px" }}>
              <button
                onClick={() => setViewMode("street")}
                style={{
                  height: "28px",
                  padding: "0 10px",
                  background: viewMode === "street" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  font: "500 10px/1 var(--sans)",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all .12s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.8)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = viewMode === "street" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                🏙️ Street view
              </button>
              <button
                onClick={() => setViewMode("satellite")}
                style={{
                  height: "28px",
                  padding: "0 10px",
                  background: viewMode === "satellite" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  font: "500 10px/1 var(--sans)",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all .12s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.8)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = viewMode === "satellite" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                🚀 Satellite
              </button>
            </div>
          </div>

          {/* KPI strip - 5 KPIs */}
          <div
            className="a2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "1px",
              background: "var(--bdr)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "24px"
            }}
          >
            {/* Value */}
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                  marginBottom: "6px"
                }}
              >
                Value
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {fmt(estimatedValue * 0.9, sym)}–{fmt(estimatedValue * 1.1, sym)}
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "8px",
                    color: "var(--amb)",
                    background: "var(--amb-lt)",
                    border: "1px solid var(--amb-bdr)",
                    padding: "1px 4px",
                    borderRadius: "3px",
                    marginLeft: "3px",
                    verticalAlign: "middle",
                    letterSpacing: ".3px"
                  }}
                >
                  EST
                </span>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                6.6% cap rate
              </div>
            </div>

            {/* Net Income */}
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                  marginBottom: "6px"
                }}
              >
                Net Income
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {fmt(noi, sym)}
                <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>/yr</small>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                64% margin
              </div>
            </div>

            {/* Occupancy */}
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                  marginBottom: "6px"
                }}
              >
                Occupancy
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {occupancy.toFixed(0)}%
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                {occupancy < 90 && <span style={{ color: "var(--amb)" }}>Below mkt 94%</span>}
                {occupancy >= 90 && <span style={{ color: "var(--grn)" }}>Above benchmark</span>}
              </div>
            </div>

            {/* Uncaptured */}
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                  marginBottom: "6px"
                }}
              >
                Uncaptured
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {fmt(uncapturedValue, sym)}
                <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>/yr</small>
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--red)" }}>3 actions found</span>
              </div>
            </div>

            {/* Saved */}
            <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div
                style={{
                  font: "500 8px/1 var(--mono)",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                  marginBottom: "6px"
                }}
              >
                Saved
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {fmt(savedThisYear, sym)}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--grn)" }}>1 action this year</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="a2" style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--bdr)", marginBottom: "24px" }}>
            {(["Overview", "Tenants", "Financials", "Insurance", "Energy", "Compliance", "Planning", "Documents"] as TabName[]).map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 16px",
                  font: "500 12px var(--sans)",
                  color: activeTab === tab ? "var(--acc)" : "var(--tx3)",
                  cursor: "pointer",
                  borderBottom: activeTab === tab ? "2px solid var(--acc)" : "2px solid transparent",
                  transition: "all .12s"
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--tx2)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--tx3)";
                }}
              >
                {tab}
                {tab === "Tenants" && (
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)",
                      color: activeTab === tab ? "var(--acc)" : "var(--tx3)",
                      marginLeft: "5px"
                    }}
                  >
                    {asset.leases.length}
                  </span>
                )}
                {tab === "Compliance" && (
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)",
                      color: activeTab === tab ? "var(--acc)" : "var(--tx3)",
                      marginLeft: "5px"
                    }}
                  >
                    2
                  </span>
                )}
                {tab === "Documents" && (
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      background: activeTab === tab ? "var(--acc-lt)" : "var(--s3)",
                      color: activeTab === tab ? "var(--acc)" : "var(--tx3)",
                      marginLeft: "5px"
                    }}
                  >
                    {documentsData.length}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <>
              {/* Actions found */}
              <div className="a3" style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>
                Actions found
              </div>
              <div className="a3" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "14px" }}>
                {/* Action 1 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bdr-lt)",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                      background: "var(--red-lt)",
                      border: "1px solid var(--red-bdr)"
                    }}
                  >
                    ⚠️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Insurance 22% above market</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      Current $18.4k/yr · Market $14.2k/yr · CoverForce quotes available in seconds
                    </div>
                  </div>
                  <span
                    style={{
                      font: "600 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      whiteSpace: "nowrap",
                      background: "var(--grn-lt)",
                      color: "var(--grn)",
                      border: "1px solid var(--grn-bdr)"
                    }}
                  >
                    Quick win
                  </span>
                  <div style={{ font: "500 11px var(--mono)", color: "var(--tx)", textAlign: "right", whiteSpace: "nowrap" }}>
                    $4.2k/yr
                  </div>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>

                {/* Action 2 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bdr-lt)",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                      background: "var(--amb-lt)",
                      border: "1px solid var(--amb-bdr)"
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Energy demand charges above FL benchmark</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      $1,200/mo demand charges · 28% above office benchmark · Tariff optimisation ready
                    </div>
                  </div>
                  <span
                    style={{
                      font: "600 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      whiteSpace: "nowrap",
                      background: "var(--acc-lt)",
                      color: "var(--acc)",
                      border: "1px solid var(--acc-bdr)"
                    }}
                  >
                    Opportunity
                  </span>
                  <div style={{ font: "500 11px var(--mono)", color: "var(--tx)", textAlign: "right", whiteSpace: "nowrap" }}>
                    $6.8k/yr
                  </div>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>

                {/* Action 3 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 18px",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                      background: "var(--acc-lt)",
                      border: "1px solid var(--acc-bdr)"
                    }}
                  >
                    📡
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Roof space — solar + 5G potential</div>
                    <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      {asset.sqft.toLocaleString()} sqft roof · Estimated $34k/yr from solar lease + mast rental
                    </div>
                  </div>
                  <span
                    style={{
                      font: "600 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      whiteSpace: "nowrap",
                      background: "var(--acc-lt)",
                      color: "var(--acc)",
                      border: "1px solid var(--acc-bdr)"
                    }}
                  >
                    New income
                  </span>
                  <div style={{ font: "500 11px var(--mono)", color: "var(--tx)", textAlign: "right", whiteSpace: "nowrap" }}>
                    $34k/yr
                  </div>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>
              </div>

              {/* Two column: Tenants + Property Details */}
              <div className="a3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                {/* Tenants */}
                <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--bdr-lt)"
                    }}
                  >
                    <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Tenants</h4>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }} onClick={() => setActiveTab("Tenants")}>
                      View all {asset.leases.length} →
                    </span>
                  </div>
                  {activeTenants.slice(0, 3).map((lease) => (
                    <div
                      key={lease.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 18px",
                        borderBottom: "1px solid var(--bdr-lt)",
                        transition: "background .1s",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div>
                        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{lease.tenant}</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                          {lease.sqft.toLocaleString()} sqft · {fmt(lease.sqft * lease.rentPerSqft, sym)}/yr
                        </div>
                      </div>
                      <span
                        style={{
                          font: "500 8px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          letterSpacing: ".3px",
                          background: "var(--grn-lt)",
                          color: "var(--grn)",
                          border: "1px solid var(--grn-bdr)"
                        }}
                      >
                        Secure
                      </span>
                      <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                    </div>
                  ))}
                  {vacantUnits.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 18px",
                        transition: "background .1s",
                        cursor: "pointer",
                        opacity: 0.4
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--s2)";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.opacity = "0.4";
                      }}
                    >
                      <div>
                        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>— Vacant —</div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                          {vacantUnits[0].sqft.toLocaleString()} sqft · Available for letting
                        </div>
                      </div>
                      <span
                        style={{
                          font: "500 8px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          letterSpacing: ".3px",
                          background: "var(--red-lt)",
                          color: "var(--red)",
                          border: "1px solid var(--red-bdr)"
                        }}
                      >
                        Vacant
                      </span>
                      <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--bdr-lt)"
                    }}
                  >
                    <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Property Details</h4>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>From ATTOM + docs</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden", margin: "14px 18px" }}>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Type
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>{asset.type || "Commercial"}</div>
                    </div>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Size
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>{asset.sqft.toLocaleString()} sqft</div>
                    </div>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Year Built
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>—</div>
                    </div>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Lot Size
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>—</div>
                    </div>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Zoning
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>—</div>
                    </div>
                    <div style={{ background: "var(--s1)", padding: "12px 14px" }}>
                      <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                        Parking
                      </div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>—</div>
                    </div>
                  </div>
                  {/* Owner card */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "9px",
                        background: "var(--acc-lt)",
                        border: "1px solid var(--acc-bdr)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0
                      }}
                    >
                      🏢
                    </div>
                    <div>
                      <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>Owner on record</div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>From property records</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance alerts */}
              <div className="a4" style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>
                Compliance
              </div>
              <div className="a4" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--bdr-lt)"
                  }}
                >
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Certificates</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }} onClick={() => setActiveTab("Compliance")}>
                    View all →
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "11px 18px",
                    borderBottom: "1px solid var(--bdr-lt)",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Fire Safety Certificate</div>
                    <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      Expired 14 Feb 2026 · $24k fine exposure
                    </div>
                  </div>
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      background: "var(--red-lt)",
                      color: "var(--red)",
                      border: "1px solid var(--red-bdr)"
                    }}
                  >
                    Expired
                  </span>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "11px 18px",
                    borderBottom: "1px solid var(--bdr-lt)",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Asbestos Register</div>
                    <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      Expired 3 Jan 2026 · $18k fine exposure
                    </div>
                  </div>
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      background: "var(--red-lt)",
                      color: "var(--red)",
                      border: "1px solid var(--red-bdr)"
                    }}
                  >
                    Expired
                  </span>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "11px 18px",
                    transition: "background .1s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Elevator Inspection</div>
                    <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                      Valid until Sep 2026
                    </div>
                  </div>
                  <span
                    style={{
                      font: "500 8px/1 var(--mono)",
                      padding: "3px 7px",
                      borderRadius: "4px",
                      letterSpacing: ".3px",
                      background: "var(--grn-lt)",
                      color: "var(--grn)",
                      border: "1px solid var(--grn-bdr)"
                    }}
                  >
                    Valid
                  </span>
                  <div style={{ color: "var(--tx3)", fontSize: "12px" }}>→</div>
                </div>
              </div>

              {/* Documents */}
              <div className="a4" style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>
                Recent documents
              </div>
              <div className="a4" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--bdr-lt)"
                  }}
                >
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Uploaded Documents</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }} onClick={() => setActiveTab("Documents")}>
                    Upload more →
                  </span>
                </div>
                {documentsData.slice(0, 3).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 18px",
                      borderBottom: "1px solid var(--bdr-lt)"
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        flexShrink: 0,
                        background: "var(--s2)",
                        border: "1px solid var(--bdr)"
                      }}
                    >
                      📄
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{doc.filename}</div>
                      <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>
                        {doc.documentType || "Document"} · {new Date(doc.createdAt).toLocaleDateString()} · {(doc.fileSize / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    {doc.status === "parsed" && (
                      <span
                        style={{
                          font: "500 9px/1 var(--mono)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          letterSpacing: ".3px",
                          background: "var(--grn-lt)",
                          color: "var(--grn)",
                          border: "1px solid var(--grn-bdr)"
                        }}
                      >
                        ✓ Parsed
                      </span>
                    )}
                  </div>
                ))}
                {documentsData.length === 0 && (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--tx3)", font: "300 12px var(--sans)" }}>
                    No documents uploaded yet. Upload leases, insurance schedules, or energy bills to unlock insights.
                  </div>
                )}
              </div>

              {/* Portal hint */}
              <div
                className="a5"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  background: "var(--acc-dim)",
                  border: "1px solid var(--acc-bdr)",
                  borderRadius: "8px",
                  font: "400 12px var(--sans)",
                  color: "var(--tx2)",
                  margin: "20px 0"
                }}
              >
                Need to share this property with a lender, insurer, or partner?{" "}
                <span style={{ color: "var(--acc)", fontWeight: 500, cursor: "pointer" }}>Create a portal link →</span> — they see only what you choose, and you track every view.
              </div>
            </>
          )}

          {/* Other tabs - placeholders */}
          {activeTab === "Tenants" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>👥</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Tenants Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                Full tenant schedule, lease details, covenant grades, engagement tracker, and letting pipeline. Uses tenants-v2-design.html.
              </p>
            </div>
          )}

          {activeTab === "Financials" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>💰</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Financials Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                NOI waterfall, monthly P&L input, debt overview, SOFR tracking, refinance calculator. Uses financials-v2-design.html.
              </p>
            </div>
          )}

          {activeTab === "Insurance" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>🛡️</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Insurance Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                Current policy details, CoverForce quotes, risk assessment, renewal timeline. Uses insurance-design.html.
              </p>
            </div>
          )}

          {activeTab === "Energy" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>⚡</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Energy Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                Tariff analysis, demand charges, supplier quotes from Octopus, solar assessment. Uses energy-design.html.
              </p>
            </div>
          )}

          {activeTab === "Compliance" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>📋</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Compliance Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                Certificate tracker, expiry alerts, fine exposure, renewal reminders. Uses compliance-design.html.
              </p>
            </div>
          )}

          {activeTab === "Planning" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>🏗️</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Planning Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                Nearby applications, AI impact classification, development potential assessment. Uses planning-v2-design.html.
              </p>
            </div>
          )}

          {activeTab === "Documents" && (
            <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>📁</div>
              <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>Documents Tab</h3>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)", maxWidth: "480px", margin: "0 auto" }}>
                All uploaded files, extraction status, document viewer, bulk upload. Uses utility-pages-design.html.
              </p>
            </div>
          )}

        </div>
      </main>
    </AppShell>
  );
}

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

interface TenantsData {
  asset: { id: string; name: string; address: string; currency: string };
  overview: {
    totalAnnualRent: number;
    activeTenantsCount: number;
    vacantUnitsCount: number;
    collectionStatus: { paid: number; late: number; overdue: number; vacant: number };
    wault: number;
    tenantConcentration: number;
    upcomingEvents: Array<{ type: string; date: Date; tenantName: string; description: string }>;
  };
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    email: string | null;
    sector: string | null;
    covenantGrade: string;
    covenantScore: number | null;
    units: string;
    annualRent: number;
    leaseExpiry: Date | null;
    nextReview: Date | null;
    breakClause: Date | null;
    arrearsBalance: number;
    arrearsEscalation: string;
    paymentTrend: string;
    paymentHistory: Array<{ month: string; status: string }>;
    leaseAbstract: { source: string; completeness: number; data: Record<string, unknown> } | null;
  }>;
}

interface FinancialsData {
  asset: { id: string; name: string; address: string; currency: string };
  kpis: {
    grossRevenue: number;
    opex: number;
    noi: number;
    collectionRate: number;
    ltv: number;
    dscr: number;
  };
  noiWaterfall: {
    grossRevenue: number;
    insurance: number;
    energy: number;
    maintenance: number;
    management: number;
    noi: number;
  };
  rentCollection: Array<{
    tenantId: string;
    tenantName: string;
    unitRef: string;
    rentAmount: number;
    status: string;
    paidDate: Date | null;
    dueDate: Date;
    daysLate: number;
  }>;
  collectionSummary: {
    collectedAmount: number;
    outstandingAmount: number;
    latePaymentsCount: number;
  };
  cashFlowForecast: Array<{
    month: string;
    revenue: number;
    opex: number;
    noi: number;
    debt: number;
    capex: number;
    netCash: number;
  }>;
  capexPlan: Array<{
    id: string;
    description: string;
    estimatedCost: number;
    scheduledDate: string;
    status: string;
    valueImpact: number;
  }>;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const assetId = params.id as string;
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [documentsData, setDocumentsData] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<"satellite" | "street">("satellite");
  const [financialsData, setFinancialsData] = useState<FinancialsData | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [tenantsData, setTenantsData] = useState<TenantsData | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(false);

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

  // Fetch financials data when Financials tab is active
  useEffect(() => {
    async function fetchFinancials() {
      if (activeTab !== "Financials" || !assetId) return;
      setFinancialsLoading(true);
      try {
        const res = await fetch(`/api/user/assets/${assetId}/financials`);
        const data = await res.json();
        if (res.ok) {
          setFinancialsData(data);
        }
      } catch (error) {
        console.error("Failed to fetch financials:", error);
      } finally {
        setFinancialsLoading(false);
      }
    }
    fetchFinancials();
  }, [activeTab, assetId]);

  // Fetch tenants data when Tenants tab is active
  useEffect(() => {
    async function fetchTenants() {
      if (activeTab !== "Tenants" || !assetId) return;
      setTenantsLoading(true);
      try {
        const res = await fetch(`/api/user/assets/${assetId}/tenants`);
        const data = await res.json();
        if (res.ok) {
          setTenantsData(data);
        }
      } catch (error) {
        console.error("Failed to fetch tenants:", error);
      } finally {
        setTenantsLoading(false);
      }
    }
    fetchTenants();
  }, [activeTab, assetId]);

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
            <>
              {financialsLoading && !financialsData && (
                <div style={{ padding: "48px", textAlign: "center" }}>
                  <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Loading financial data...</div>
                </div>
              )}

              {!financialsLoading && !financialsData && (
                <div style={{ padding: "48px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>💰</div>
                  <h3 style={{ font: "600 16px var(--sans)", color: "var(--tx)", marginBottom: "8px" }}>No Financial Data</h3>
                  <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Upload documents or enter financial data to see analytics.</p>
                </div>
              )}

              {financialsData && (() => {
                const formatCurrency = (val: number) => {
                  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
                  if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
                  return `${sym}${Math.round(val).toLocaleString()}`;
                };

                const kpis = financialsData.kpis;
                const waterfall = financialsData.noiWaterfall;
                const maxWaterfallValue = Math.max(waterfall.grossRevenue, waterfall.noi);

                return (
                  <>
                    {/* KPIs */}
                    <div
                      className="a1"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: "1px",
                        background: "var(--bdr)",
                        border: "1px solid var(--bdr)",
                        borderRadius: "10px",
                        overflow: "hidden",
                        marginBottom: "24px",
                      }}
                    >
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Gross Revenue</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{formatCurrency(kpis.grossRevenue)}<span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>/yr</span></div>
                      </div>
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>OpEx</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{formatCurrency(kpis.opex)}<span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>/yr</span></div>
                      </div>
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>NOI</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: 1 }}>{formatCurrency(kpis.noi)}<span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)" }}>/yr</span></div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>{kpis.grossRevenue > 0 ? Math.round((kpis.noi / kpis.grossRevenue) * 100) : 0}% margin</div>
                      </div>
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>Collection Rate</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{kpis.collectionRate}%</div>
                        <div style={{ font: "400 10px var(--sans)", color: kpis.collectionRate >= 95 ? "var(--grn)" : "var(--amb)", marginTop: "3px" }}>
                          {financialsData.collectionSummary.latePaymentsCount > 0 ? `${financialsData.collectionSummary.latePaymentsCount} late` : "on track"}
                        </div>
                      </div>
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>LTV</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{kpis.ltv}%</div>
                        <div style={{ font: "400 10px var(--sans)", color: kpis.ltv > 65 ? "var(--amb)" : "var(--grn)", marginTop: "3px" }}>
                          {kpis.ltv > 65 ? "above target" : "healthy"}
                        </div>
                      </div>
                      <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>DSCR</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>{kpis.dscr.toFixed(2)}×</div>
                        <div style={{ font: "400 10px var(--sans)", color: kpis.dscr >= 1.25 ? "var(--grn)" : kpis.dscr >= 1.15 ? "var(--amb)" : "var(--red)", marginTop: "3px" }}>
                          {kpis.dscr >= 1.25 ? "above covenant" : "tight"}
                        </div>
                      </div>
                    </div>

                    {/* NOI Waterfall */}
                    <div className="a2" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>NOI Bridge — Trailing 12 Months</h4>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "180px", padding: "0 18px 18px" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(52, 211, 153, 0.7)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.grossRevenue / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>{formatCurrency(waterfall.grossRevenue)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center", whiteSpace: "nowrap" }}>Gross<br />Revenue</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(248, 113, 113, 0.7)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.insurance / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>−{formatCurrency(waterfall.insurance)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center" }}>Insurance</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(248, 113, 113, 0.7)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.energy / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>−{formatCurrency(waterfall.energy)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center" }}>Energy</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(248, 113, 113, 0.7)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.maintenance / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>−{formatCurrency(waterfall.maintenance)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center" }}>Maint</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(248, 113, 113, 0.7)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.management / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--tx)" }}>−{formatCurrency(waterfall.management)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center" }}>Mgmt</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "100%", background: "rgba(124, 106, 240, 0.8)", borderRadius: "4px 4px 0 0", minHeight: "4px", height: `${(waterfall.noi / maxWaterfallValue) * 160}px` }}></div>
                          <div style={{ font: "500 10px var(--mono)", color: "var(--grn)" }}>{formatCurrency(waterfall.noi)}</div>
                          <div style={{ font: "400 8px var(--mono)", color: "var(--tx3)", textAlign: "center" }}>NOI</div>
                        </div>
                      </div>
                    </div>

                    {/* Rent Collection */}
                    <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Rent Collection — Current Month</div>
                    <div className="a3" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Collection Status</h4>
                        <span style={{ font: "500 11px var(--sans)", color: "var(--tx3)" }}>{kpis.collectionRate}% collected · {formatCurrency(financialsData.collectionSummary.outstandingAmount)} outstanding</span>
                      </div>
                      {financialsData.rentCollection.map((tenant, idx) => {
                        const dotColor = tenant.status === "PAID" ? "var(--grn)" :
                                        tenant.status === "VACANT" ? "var(--tx3)" :
                                        tenant.daysLate > 7 ? "var(--red)" : "var(--amb)";
                        const tagClass = tenant.status === "PAID" ? "ok" :
                                        tenant.status === "VACANT" ? "muted" :
                                        tenant.daysLate > 14 ? "danger" : "warn";
                        const tagLabel = tenant.status === "PAID" ? "PAID" :
                                        tenant.status === "VACANT" ? "VACANT" :
                                        `${tenant.daysLate} DAYS LATE`;

                        return (
                          <div
                            key={tenant.tenantId}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto auto auto auto",
                              gap: "12px",
                              alignItems: "center",
                              padding: "11px 18px",
                              borderBottom: idx < financialsData.rentCollection.length - 1 ? "1px solid rgba(37, 37, 51, 0.5)" : "none",
                              cursor: "pointer",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--s2)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }}></div>
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{tenant.tenantName}</div>
                                <div style={{ fontSize: "11px", color: "var(--tx3)" }}>{tenant.unitRef} · {formatCurrency(tenant.rentAmount)}/mo</div>
                              </div>
                            </div>
                            <span style={{
                              font: "500 9px/1 var(--mono)",
                              padding: "3px 7px",
                              borderRadius: "5px",
                              letterSpacing: "0.3px",
                              whiteSpace: "nowrap",
                              background: tagClass === "ok" ? "rgba(52, 211, 153, 0.07)" :
                                         tagClass === "danger" ? "rgba(248, 113, 113, 0.07)" :
                                         tagClass === "warn" ? "rgba(251, 191, 36, 0.07)" : "var(--s3)",
                              color: tagClass === "ok" ? "var(--grn)" :
                                    tagClass === "danger" ? "var(--red)" :
                                    tagClass === "warn" ? "var(--amb)" : "var(--tx3)",
                              border: `1px solid ${tagClass === "ok" ? "rgba(52, 211, 153, 0.22)" :
                                                   tagClass === "danger" ? "rgba(248, 113, 113, 0.22)" :
                                                   tagClass === "warn" ? "rgba(251, 191, 36, 0.22)" : "var(--bdr)"}`,
                            }}>{tagLabel}</span>
                            <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>
                              {tenant.paidDate ? new Date(tenant.paidDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) :
                               tenant.status !== "VACANT" ? `Due ${new Date(tenant.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "—"}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: tenant.status === "PAID" ? "var(--tx)" : tenant.status === "VACANT" ? "var(--tx3)" : "var(--amb)", textAlign: "right" }}>
                              {formatCurrency(tenant.rentAmount)}
                            </span>
                            <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cash Flow Forecast */}
                    <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Cash Flow Forecast — Next 12 Months</div>
                    <div className="a3" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Monthly Projected Cash Flow</h4>
                      </div>
                      <div style={{ padding: "18px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 11px var(--sans)", minWidth: "700px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Month</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>Revenue</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>OpEx</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>NOI</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>Debt</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>Capex</th>
                              <th style={{ padding: "6px 8px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textAlign: "right" }}>Net Cash</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financialsData.cashFlowForecast.slice(0, 6).map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < 5 ? "1px solid rgba(37, 37, 51, 0.5)" : "none", background: row.capex > 0 ? "rgba(251, 191, 36, 0.07)" : "transparent" }}>
                                <td style={{ padding: "6px 8px", color: row.capex > 0 ? "var(--amb)" : "var(--tx)" }}>{row.month}{row.capex > 0 ? " ⚠" : ""}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--grn)" }}>{formatCurrency(row.revenue)}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--red)" }}>{formatCurrency(row.opex)}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--tx)" }}>{formatCurrency(row.noi)}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--tx3)" }}>{formatCurrency(row.debt)}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: row.capex > 0 ? "var(--red)" : "var(--tx3)" }}>{row.capex > 0 ? formatCurrency(row.capex) : "—"}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: row.netCash >= 0 ? "var(--grn)" : "var(--red)", fontWeight: 500 }}>{row.netCash < 0 ? "−" : ""}{formatCurrency(Math.abs(row.netCash))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Capex Plan */}
                    {financialsData.capexPlan.length > 0 && (
                      <>
                        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Capex Plan</div>
                        <div className="a4" style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
                          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Scheduled Capital Works</h4>
                          </div>
                          {financialsData.capexPlan.map((item, idx) => (
                            <div
                              key={item.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto auto auto auto",
                                gap: "12px",
                                alignItems: "center",
                                padding: "11px 18px",
                                borderBottom: idx < financialsData.capexPlan.length - 1 ? "1px solid rgba(37, 37, 51, 0.5)" : "none",
                                cursor: "pointer",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--s2)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{item.description}</div>
                              </div>
                              <span style={{
                                font: "500 9px/1 var(--mono)",
                                padding: "3px 7px",
                                borderRadius: "5px",
                                background: item.status === "PLANNING" ? "var(--s3)" : "rgba(251, 191, 36, 0.07)",
                                color: item.status === "PLANNING" ? "var(--tx3)" : "var(--amb)",
                                border: `1px solid ${item.status === "PLANNING" ? "var(--bdr)" : "rgba(251, 191, 36, 0.22)"}`,
                              }}>{item.scheduledDate}</span>
                              <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{formatCurrency(item.estimatedCost)}</span>
                              <span style={{ font: "400 10px var(--sans)", color: "var(--grn)" }}>+{formatCurrency(item.valueImpact)} value</span>
                              <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </>
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

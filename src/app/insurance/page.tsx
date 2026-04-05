"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// ── Types ─────────────────────────────────────────────────────────────
type PolicyData = {
  id: string;
  propertyName: string;
  propertyType: string;
  sqft: number;
  carrier: string;
  premium: number;
  cover: number;
  deductible: number;
  renewal: string;
  vsMarket: number; // percentage above/below market
  status: "bound" | "overpaying" | "missing";
};

type QuoteData = {
  id: string;
  carrier: string;
  carrierRating: string;
  policyType: string;
  premium: number;
  cover: number;
  deductible: number;
  saving: number;
  isBest: boolean;
  coverage: {
    building: string;
    businessInterruption: string;
    liability: string;
    deductible: string;
    flood: { included: boolean; note?: string };
    hurricane: { included: boolean; note?: string };
  };
  carrierIntel: {
    amBestRating: string;
    avgClaimsPay: string;
    claimsSatisfaction: number; // out of 5
    flMarketPresence: string;
    creSpecialism: string;
    renewalStability: string;
  };
  pros: string[];
  cons: string[];
  warnings: string[];
  review?: string;
};

// ── Main Page ─────────────────────────────────────────────────────────
export default function InsurancePage() {
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [showQuotes, setShowQuotes] = useState(false);
  const [insuranceRisk, setInsuranceRisk] = useState<{
    coverageGaps: Array<{
      id: string;
      severity: "red" | "amber" | "green";
      icon: string;
      title: string;
      detail: string;
      action: string;
    }>;
    premiumReductionActions: Array<{
      id: string;
      action: string;
      why: string;
      annualSaving: number;
    }>;
  } | null>(null);
  const [insuranceBenchmarks, setInsuranceBenchmarks] = useState<{ min: number; max: number } | null>(null);
  const [policies, setPolicies] = useState<PolicyData[]>([]);

  // Fetch insurance risk + summary data
  useEffect(() => {
    Promise.all([
      fetch("/api/user/insurance-risk").then(r => r.json()),
      fetch("/api/user/insurance-summary").then(r => r.json()),
    ]).then(([riskData, summaryData]) => {
      setInsuranceRisk(riskData);
      if (summaryData?.benchmarkMin && summaryData?.benchmarkMax) {
        setInsuranceBenchmarks({ min: summaryData.benchmarkMin, max: summaryData.benchmarkMax });
      }
      if (Array.isArray(summaryData?.policies)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPolicies(summaryData.policies.map((p: any) => ({
          id: p.id,
          propertyName: p.propertyAddress?.split(",")[0] ?? "Property",
          propertyType: p.coverageType ?? "Commercial",
          sqft: 0,
          carrier: p.insurer ?? "—",
          premium: p.premium ?? 0,
          cover: p.sumInsured ?? 0,
          deductible: p.excess ?? 0,
          renewal: p.renewalDate
            ? new Date(p.renewalDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : "",
          vsMarket: 0,
          status: (p.premium === 0 ? "missing" : "overpaying") as PolicyData["status"],
        })));
      }
    }).catch((err) => console.error("Failed to fetch insurance data:", err));
  }, []);

  const quotes: QuoteData[] = [];

  const totalPremium = policies.reduce((sum, p) => sum + p.premium, 0);
  const marketRate = insuranceBenchmarks
    ? Math.round((insuranceBenchmarks.min + insuranceBenchmarks.max) / 2)
    : 0;
  const overpaying = marketRate > 0 ? Math.max(0, totalPremium - marketRate) : 0;
  const coverageGaps = insuranceRisk?.coverageGaps?.filter(g => g.severity !== "green").length ?? 0;
  const savedThisYear = 0; // populated once a policy has been retendered via CoverForce

  return (
    <>
      <style jsx>{`
        .insurance-shell {
          display: grid;
          grid-template-columns: 192px 1fr;
          min-height: calc(100vh - 52px);
          background: var(--bg);
        }
        .insurance-kpis {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
          background: var(--bdr);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .intelligence-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 28px;
        }
        @media (max-width: 900px) {
          .insurance-shell {
            grid-template-columns: 1fr;
          }
          .insurance-sidebar {
            display: none;
          }
          .insurance-kpis {
            grid-template-columns: repeat(2, 1fr);
          }
          .intelligence-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <AppShell>
        <TopBar />
        <div className="insurance-shell">

        {/* Sidebar */}
        <aside className="insurance-sidebar" style={{ backgroundColor: "var(--s1)", borderRight: "1px solid var(--bdr)", padding: "14px 10px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1.6px", padding: "0 8px", marginBottom: "6px" }}>Overview</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", marginBottom: "1px" }}>Dashboard</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Properties</span>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "1px 6px", borderRadius: "4px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>5</span>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1.6px", padding: "0 8px", marginBottom: "6px" }}>Reduce</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "600 12px var(--sans)", color: "var(--acc)", cursor: "pointer", background: "var(--acc-lt)", marginBottom: "1px" }}>Insurance</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", marginBottom: "1px" }}>Energy</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Compliance</span>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "1px 6px", borderRadius: "4px", background: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)" }}>6</span>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1.6px", padding: "0 8px", marginBottom: "6px" }}>Optimise</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px" }}>
              <span>Rent Reviews</span>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "1px 6px", borderRadius: "4px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>5</span>
            </div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", marginBottom: "1px" }}>Ancillary Income</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer" }}>Hold vs Sell</div>
          </div>
          <div>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "1.6px", padding: "0 8px", marginBottom: "6px" }}>Grow</div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px" }}>
              <span>Deal Finder</span>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "1px 6px", borderRadius: "4px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>11</span>
            </div>
            <div style={{ padding: "7px 10px", borderRadius: "7px", font: "400 12px var(--sans)", color: "var(--tx3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Pipeline</span>
              <span style={{ font: "500 9px/1 var(--mono)", padding: "1px 6px", borderRadius: "4px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>3</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ overflowY: "auto", backgroundColor: "var(--bg)" }}>
          <div style={{ padding: "24px 28px 80px", maxWidth: "1080px" }}>

            {/* View Toggle */}
            <div style={{ display: "flex", gap: "0", marginBottom: "20px", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden", width: "fit-content" }}>
              <button onClick={() => setSelectedProperty("all")} style={{ padding: "8px 16px", font: "500 11px var(--sans)", color: selectedProperty === "all" ? "#fff" : "var(--tx3)", cursor: "pointer", transition: "all .12s", border: "none", background: selectedProperty === "all" ? "var(--acc)" : "none" }}>All properties</button>
              {policies.filter(p => p.status !== "missing").slice(0, 5).map(p => (
                <button key={p.id} onClick={() => setSelectedProperty(p.id)} style={{ padding: "8px 16px", font: "500 11px var(--sans)", color: selectedProperty === p.id ? "#fff" : "var(--tx3)", cursor: "pointer", transition: "all .12s", border: "none", background: selectedProperty === p.id ? "var(--acc)" : "none" }}>
                  {p.propertyName.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Page Header */}
            <div style={{ marginBottom: "20px" }}>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: "400", color: "var(--tx)", marginBottom: "4px" }}>Insurance</h1>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Portfolio insurance analysis. Every policy benchmarked, risks surfaced, and quotes available in seconds via CoverForce.</p>
            </div>

            {/* KPIs */}
            <div className="insurance-kpis">
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Total Premium</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(totalPremium / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>{policies.length} {policies.length === 1 ? "policy" : "policies"} across {policies.length} assets</div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Market Rate</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(marketRate / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>FL mixed benchmark Q1 2026</div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Overpaying</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(overpaying / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                  {marketRate > 0 && overpaying > 0 ? (
                    <span style={{ color: "var(--red)" }}>{Math.round((overpaying / marketRate) * 100)}% above market avg</span>
                  ) : "—"}
                </div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Coverage Gaps</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>{coverageGaps}</div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                  {coverageGaps > 0 ? <span style={{ color: "var(--amb)" }}>{policies.filter(p => p.status === "missing").length} missing · check details</span> : "No gaps found"}
                </div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Saved This Year</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>{savedThisYear > 0 ? `$${(savedThisYear / 1000).toFixed(1)}k` : "—"}</div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                  {savedThisYear > 0 ? <span style={{ color: "var(--grn)" }}>via CoverForce rebind</span> : "Retender a policy to save"}
                </div>
              </div>
            </div>

            {/* Bound Banner — only shows when a policy has been retendered via CoverForce */}
            {savedThisYear > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: "10px", marginBottom: "14px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "var(--grn)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", flexShrink: "0" }}>✓</div>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Policy retendered and bound via CoverForce</div>
                  <div style={{ font: "400 11px var(--sans)", color: "var(--tx2)", marginTop: "1px" }}>Same cover, lower premium</div>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--grn)" }}>${savedThisYear}/yr saved</div>
              </div>
            )}

            {/* Risks & Coverage Gaps + Ways to Reduce Premium (2-column grid) */}
            <div className="intelligence-grid">

              {/* Risks & Coverage Gaps */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Risks & Coverage Gaps</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--red)" }}>
                    {insuranceRisk?.coverageGaps.filter(g => g.severity === "red" || g.severity === "amber").length || 0} issues
                  </span>
                </div>
                <div>
                  {insuranceRisk?.coverageGaps && insuranceRisk.coverageGaps.length > 0 ? (
                    insuranceRisk.coverageGaps.slice(0, 4).map((gap, idx) => (
                      <div key={gap.id} style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px", borderBottom: idx < Math.min(insuranceRisk.coverageGaps.length, 4) - 1 ? "1px solid var(--bdr-lt)" : "none" }}>
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          background: gap.severity === "red" ? "var(--red-lt)" : gap.severity === "amber" ? "var(--amb-lt)" : "var(--grn-lt)",
                          border: gap.severity === "red" ? "1px solid var(--red-bdr)" : gap.severity === "amber" ? "1px solid var(--amb-bdr)" : "1px solid var(--grn-bdr)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          flexShrink: "0",
                          marginTop: "2px"
                        }}>{gap.icon}</div>
                        <div style={{ flex: "1" }}>
                          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{gap.title}</div>
                          <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{gap.detail}</div>
                          {gap.action && <div style={{ font: "500 11px var(--sans)", color: "var(--acc)", marginTop: "4px", cursor: "pointer" }}>{gap.action}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "18px", font: "400 12px var(--sans)", color: "var(--tx3)", textAlign: "center" }}>
                      Loading risk analysis...
                    </div>
                  )}
                </div>
              </div>

              {/* Ways to Reduce Premium */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Ways to Reduce Your Premium</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--grn)" }}>
                    {insuranceRisk?.premiumReductionActions
                      ? `$${(insuranceRisk.premiumReductionActions.reduce((sum, a) => sum + a.annualSaving, 0) / 1000).toFixed(1)}k potential`
                      : "Loading..."}
                  </span>
                </div>
                <div>
                  {insuranceRisk?.premiumReductionActions && insuranceRisk.premiumReductionActions.length > 0 ? (
                    insuranceRisk.premiumReductionActions.slice(0, 4).map((action, idx) => (
                      <div key={action.id} style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px", borderBottom: idx < Math.min(insuranceRisk.premiumReductionActions.length, 4) - 1 ? "1px solid var(--bdr-lt)" : "none" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: "0", marginTop: "2px" }}>📊</div>
                        <div style={{ flex: "1" }}>
                          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{action.action}</div>
                          <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{action.why}</div>
                        </div>
                        <div style={{ font: "500 11px var(--mono)", color: "var(--grn)", whiteSpace: "nowrap", flexShrink: "0", marginTop: "2px" }}>
                          ~${(action.annualSaving / 1000).toFixed(1)}k/yr
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "18px", font: "400 12px var(--sans)", color: "var(--tx3)", textAlign: "center" }}>
                      Loading premium reduction insights...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* All Policies Section */}
            <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>All Policies</div>
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "14px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Property</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Carrier</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Premium</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Cover</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Deductible</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>Renewal</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}>vs Market</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bdr)" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.id} style={{ borderBottom: "1px solid var(--bdr-lt)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{policy.propertyName}</div>
                        <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>{policy.sqft.toLocaleString()} sqft · {policy.propertyType}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>{policy.carrier || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 11px var(--mono)", color: policy.status === "bound" ? "var(--grn)" : "var(--tx)" }}>{policy.premium ? `$${(policy.premium / 1000).toFixed(1)}k` : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>{policy.cover ? `$${policy.cover / 1000000}M` : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>{policy.deductible ? `$${(policy.deductible / 1000).toFixed(0)}k` : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <div style={{ font: "500 11px var(--mono)", color: "var(--tx)" }}>{policy.renewal || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        {policy.status === "bound" ? (
                          <span style={{ font: "600 8px/1 var(--mono)", padding: "3px 7px", borderRadius: "4px", letterSpacing: ".3px", background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" }}>✓ Done</span>
                        ) : policy.status === "missing" ? (
                          <span style={{ font: "600 8px/1 var(--mono)", padding: "3px 7px", borderRadius: "4px", letterSpacing: ".3px", background: "var(--s3)", color: "var(--tx3)", border: "1px solid var(--bdr)" }}>No data</span>
                        ) : (
                          <span style={{ font: "600 8px/1 var(--mono)", padding: "3px 7px", borderRadius: "4px", letterSpacing: ".3px", background: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)" }}>+{policy.vsMarket}%</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <button onClick={() => setShowQuotes(!showQuotes)} style={{ height: "26px", padding: "0 10px", borderRadius: "6px", font: "600 10px/1 var(--sans)", cursor: "pointer", border: "none", background: policy.status === "bound" ? "transparent" : "var(--acc)", color: policy.status === "bound" ? "var(--tx3)" : "#fff" }}>
                          {policy.status === "bound" ? "View" : policy.status === "missing" ? "Upload" : "Get quotes"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quotes Section (shown when showQuotes is true) */}
            {showQuotes && (
              <>
                <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>Quotes</div>
                <p style={{ font: "300 12px var(--sans)", color: "var(--tx3)", margin: "-8px 0 14px" }}>Live quotes from CoverForce — compared on price, cover, carrier strength, claims history, and renewal stability.</p>

                {quotes.length === 0 && (
                  <div style={{ padding: "32px", textAlign: "center", background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "8px" }}>
                    <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", marginBottom: "6px" }}>CoverForce integration coming soon</div>
                    <div style={{ font: "300 12px var(--sans)", color: "var(--tx3)" }}>Upload your policy documents and sign in to receive live quotes.</div>
                  </div>
                )}
                {quotes.map((quote) => (
                  <div key={quote.id} style={{ background: "var(--s1)", border: quote.isBest ? "1px solid var(--grn-bdr)" : "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "8px", overflow: "hidden", transition: "border-color .15s" }}>
                    {/* Quote Top */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: "16px", padding: "14px 18px" }}>
                      <div>
                        <div style={{ font: "600 14px var(--sans)", color: "var(--tx)" }}>
                          {quote.carrier}
                          {quote.isBest && <span style={{ font: "600 8px/1 var(--mono)", padding: "2px 6px", borderRadius: "3px", background: "var(--grn)", color: "#fff", letterSpacing: ".3px", marginLeft: "6px", verticalAlign: "middle" }}>BEST VALUE</span>}
                        </div>
                        <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "1px" }}>{quote.policyType} · ${quote.cover / 1000000}M cover · ${quote.deductible / 1000}k deductible</div>
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em" }}>${(quote.premium / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                      <div style={{ font: "600 12px var(--mono)", color: "var(--grn)", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", padding: "4px 10px", borderRadius: "5px" }}>−${(quote.saving / 1000).toFixed(1)}k/yr</div>
                      <button style={{ height: "34px", padding: "0 16px", borderRadius: "8px", font: "600 12px/1 var(--sans)", cursor: "pointer", border: "none", background: quote.isBest ? "var(--grn)" : "transparent", color: quote.isBest ? "#fff" : "var(--tx2)" }}>
                        {quote.isBest ? "Bind this policy →" : "Select"}
                      </button>
                    </div>

                    {/* Quote Details (3 columns) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0", borderTop: "1px solid var(--bdr-lt)" }}>
                      <div style={{ padding: "14px 18px", borderRight: "1px solid var(--bdr-lt)" }}>
                        <div style={{ font: "600 10px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "10px" }}>Coverage</div>
                        {Object.entries({ Building: quote.coverage.building, "Business Interruption": quote.coverage.businessInterruption, Liability: quote.coverage.liability, Deductible: quote.coverage.deductible, Flood: quote.coverage.flood.included ? "Included" : "Not included", "Wind/Hurricane": quote.coverage.hurricane.included ? "Included" : "Not included" }).map(([label, value]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{label}</div>
                            <div style={{ font: "500 11px var(--sans)", color: value.toString().includes("Included") ? "var(--grn)" : "var(--tx)" }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "14px 18px", borderRight: "1px solid var(--bdr-lt)" }}>
                        <div style={{ font: "600 10px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "10px" }}>Carrier Intelligence</div>
                        {Object.entries({ "AM Best Rating": quote.carrierIntel.amBestRating, "Avg Claims Pay Time": quote.carrierIntel.avgClaimsPay, "Claims Satisfaction": "★".repeat(quote.carrierIntel.claimsSatisfaction) + "☆".repeat(5 - quote.carrierIntel.claimsSatisfaction), "FL Market Presence": quote.carrierIntel.flMarketPresence, "CRE Specialism": quote.carrierIntel.creSpecialism, "Renewal Stability": quote.carrierIntel.renewalStability }).map(([label, value]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>{label}</div>
                            <div style={{ font: "500 11px var(--sans)", color: label === "AM Best Rating" && value.includes("A+") ? "var(--grn)" : "var(--tx)" }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "14px 18px" }}>
                        <div style={{ font: "600 10px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "10px" }}>Pros & Cons</div>
                        {quote.pros.map((pro, idx) => (
                          <div key={idx} style={{ padding: "4px 0" }}>
                            <div style={{ font: "400 11px var(--sans)", color: "var(--grn)" }}>✓ {pro}</div>
                          </div>
                        ))}
                        {quote.warnings.map((warning, idx) => (
                          <div key={idx} style={{ padding: "4px 0" }}>
                            <div style={{ font: "400 11px var(--sans)", color: "var(--amb)" }}>⚠ {warning}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Review */}
                    {quote.review && (
                      <div style={{ padding: "10px 14px", background: "var(--s2)", borderRadius: "6px", margin: "8px 18px 14px", font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", fontStyle: "italic" }}>
                        <strong style={{ fontWeight: "500", color: "var(--tx2)", fontStyle: "normal" }}>What owners say:</strong> &quot;{quote.review}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

          </div>
        </main>
      </div>
      </AppShell>
    </>
  );
}

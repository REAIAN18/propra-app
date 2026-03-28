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
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [benchmarkMin, setBenchmarkMin] = useState<number | null>(null);
  const [benchmarkMax, setBenchmarkMax] = useState<number | null>(null);

  // Fetch insurance summary from API
  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((r) => r.json())
      .then((data) => {
        setBenchmarkMin(data.benchmarkMin);
        setBenchmarkMax(data.benchmarkMax);

        // Transform API data to UI format
        if (data.hasPolicies && data.policies) {
          const transformedPolicies: PolicyData[] = data.policies.map((p: any) => {
            const benchmarkMid = ((data.benchmarkMin || 0) + (data.benchmarkMax || 0)) / 2;
            const vsMarket = benchmarkMid > 0 ? Math.round(((p.premium - benchmarkMid) / benchmarkMid) * 100) : 0;

            return {
              id: p.id,
              propertyName: p.propertyAddress || p.filename || "Unknown Property",
              propertyType: p.coverageType || "Commercial",
              sqft: 0, // Not in API response
              carrier: p.insurer,
              premium: p.premium,
              cover: p.sumInsured,
              deductible: p.excess,
              renewal: p.renewalDate || "",
              vsMarket,
              status: vsMarket > 10 ? "overpaying" : "bound",
            };
          });
          setPolicies(transformedPolicies);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalPremium = policies.reduce((sum, p) => sum + p.premium, 0);
  const marketRate = benchmarkMax || 0;
  const overpaying = totalPremium - ((benchmarkMin || 0) + (benchmarkMax || 0)) / 2;
  const coverageGaps = 0; // Would need coverage audit API
  const savedThisYear = 0; // Would need historical data

  return (
    <AppShell>
      <TopBar />
      <div style={{ display: "grid", gridTemplateColumns: "192px 1fr", minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>

        {/* Sidebar */}
        <aside style={{ backgroundColor: "var(--s1)", borderRight: "1px solid var(--bdr)", padding: "14px 10px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Total Premium</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(totalPremium / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>5 policies across 5 assets</div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Market Rate</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(marketRate / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>FL mixed benchmark Q1 2026</div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Overpaying</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(overpaying / 1000).toFixed(1)}k <small style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--tx3)", fontWeight: "400" }}>/yr</small></div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--red)" }}>23% above market avg</span></div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Coverage Gaps</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>{coverageGaps}</div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--amb)" }}>1 missing · 1 underinsured</span></div>
              </div>
              <div style={{ background: "var(--s1)", padding: "14px 16px" }}>
                <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Saved This Year</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: "1" }}>${(savedThisYear / 1000).toFixed(1)}k</div>
                <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>Tampa retendered</span></div>
              </div>
            </div>

            {/* Bound Banner */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: "10px", marginBottom: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "var(--grn)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", flexShrink: "0" }}>✓</div>
              <div style={{ flex: "1" }}>
                <div style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Tampa Industrial — retendered and bound via CoverForce</div>
                <div style={{ font: "400 11px var(--sans)", color: "var(--tx2)", marginTop: "1px" }}>Zurich ($22.1k) → Hartford ($18.4k) · Bound 12 Mar 2026 · Same cover, lower premium</div>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--grn)" }}>${savedThisYear}/yr saved</div>
            </div>

            {/* Risks & Coverage Gaps + Ways to Reduce Premium (2-column grid) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "28px" }}>

              {/* Risks & Coverage Gaps */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Risks & Coverage Gaps</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--red)" }}>2 issues</span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--red-lt)", border: "1px solid var(--red-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: "0", marginTop: "2px" }}>⚠</div>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Ft Lauderdale has no insurance on record</div>
                      <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>22,000 sqft flex space with no policy uploaded. If uninsured, this is a $7–9M exposure. Lenders require proof of cover.</div>
                      <div style={{ font: "500 11px var(--sans)", color: "var(--acc)", marginTop: "4px", cursor: "pointer" }}>Upload policy schedule →</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--amb-lt)", border: "1px solid var(--amb-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: "0", marginTop: "2px" }}>⚠</div>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Coral Gables appears underinsured</div>
                      <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>Cover is $16M but rebuild cost estimate is $19.2M ($457/sqft FL office). Gap of $3.2M means a total loss claim leaves you $3.2M short.</div>
                      <div style={{ font: "500 11px var(--sans)", color: "var(--acc)", marginTop: "4px", cursor: "pointer" }}>Update rebuild valuation →</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: "0", marginTop: "2px" }}>✓</div>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>Flood zones verified — no FEMA high-risk</div>
                      <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>All 5 properties checked. None in Zone A or V. No surcharges needed.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ways to Reduce Premium */}
              <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
                  <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Ways to Reduce Your Premium</h4>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--grn)" }}>$8.4k potential</span>
                </div>
                <div>
                  {[
                    { name: "Provide updated valuations", detail: "3 of 5 properties using 2022 valuations. Stale values = higher premiums. Updated rebuild costs typically cut 5–10%.", value: "~$4.2k/yr" },
                    { name: "Bundle Orlando + Brickell renewal", detail: "Both renew within 60 days. Combined placement through one carrier qualifies for 8–12% portfolio discount.", value: "~$2.8k/yr" },
                    { name: "Upload fire safety compliance", detail: "Coral Gables fire cert expired. Renewing and providing to insurer reduces premium 3–5% — expired certs inflate risk rating.", value: "~$900/yr" },
                    { name: "Increase deductible on low-claim assets", detail: "Tampa and Orlando: zero claims in 5 years. $10k → $25k deductible saves premium with minimal real risk.", value: "~$500/yr" },
                  ].map((insight, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "start", gap: "12px", padding: "12px 18px", borderBottom: idx < 3 ? "1px solid var(--bdr-lt)" : "none" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: "0", marginTop: "2px" }}>📊</div>
                      <div style={{ flex: "1" }}>
                        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{insight.name}</div>
                        <div style={{ font: "300 11px/1.5 var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{insight.detail}</div>
                      </div>
                      <div style={{ font: "500 11px var(--mono)", color: "var(--grn)", whiteSpace: "nowrap", flexShrink: "0", marginTop: "2px" }}>{insight.value}</div>
                    </div>
                  ))}
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
                <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", margin: "28px 0 14px" }}>Quotes — Coral Gables Office Park</div>
                <p style={{ font: "300 12px var(--sans)", color: "var(--tx3)", margin: "-8px 0 14px" }}>4 quotes from CoverForce in 8 seconds. Compared on price, cover, carrier strength, claims history, and renewal stability.</p>

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
                        <strong style={{ fontWeight: "500", color: "var(--tx2)", fontStyle: "normal" }}>What owners say:</strong> "{quote.review}"
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
  );
}

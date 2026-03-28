"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { InsuranceBindModal } from "@/components/insurance/InsuranceBindModal";

// ── Types ─────────────────────────────────────────────────────────────
type ApiPolicy = {
  id: string;
  insurer: string;
  premium: number;
  renewalDate: string | null;
  propertyAddress: string | null;
  coverageType: string | null;
  sumInsured: number;
  excess: number;
  currency: string | null;
  filename: string;
};

type ApiAsset = {
  id: string;
  name: string;
  location: string;
  floodZone: string | null;
  country: string | null;
};

type InsuranceSummary = {
  hasPolicies: boolean;
  totalPremium: number;
  earliestRenewal: string | null;
  policies: ApiPolicy[];
  assets: ApiAsset[];
  benchmarkMin: number | null;
  benchmarkMax: number | null;
};

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
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [bindingQuote, setBindingQuote] = useState<QuoteData | null>(null);

  useEffect(() => {
    fetch("/api/user/insurance-summary")
      .then((res) => res.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <AppShell>
        <TopBar />
        <div style={{ display: "grid", gridTemplateColumns: "192px 1fr", minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>
          <aside style={{ backgroundColor: "var(--s1)", borderRight: "1px solid var(--bdr)" }} />
          <main style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
            <div style={{ font: "400 13px var(--sans)", color: "var(--tx3)" }}>Loading insurance data...</div>
          </main>
        </div>
      </AppShell>
    );
  }

  // Mock data for demo purposes - detailed policy data not yet in API
  const policies: PolicyData[] = [
    {
      id: "1",
      propertyName: "Coral Gables Office Park",
      propertyType: "Office",
      sqft: 42000,
      carrier: "Zurich",
      premium: 18400,
      cover: 16000000,
      deductible: 25000,
      renewal: "Dec 2026",
      vsMarket: 22,
      status: "overpaying",
    },
    {
      id: "2",
      propertyName: "Brickell Retail Center",
      propertyType: "Retail",
      sqft: 18000,
      carrier: "AIG",
      premium: 24800,
      cover: 11000000,
      deductible: 10000,
      renewal: "Aug 2026",
      vsMarket: 18,
      status: "overpaying",
    },
    {
      id: "3",
      propertyName: "Orlando Medical Office",
      propertyType: "Medical",
      sqft: 15000,
      carrier: "Nationwide",
      premium: 16200,
      cover: 8000000,
      deductible: 10000,
      renewal: "Sep 2026",
      vsMarket: 15,
      status: "overpaying",
    },
    {
      id: "4",
      propertyName: "Tampa Industrial Park",
      propertyType: "Industrial",
      sqft: 28000,
      carrier: "Hartford",
      premium: 18400,
      cover: 9000000,
      deductible: 25000,
      renewal: "Mar 2027",
      vsMarket: 0,
      status: "bound",
    },
    {
      id: "5",
      propertyName: "Ft Lauderdale Flex Space",
      propertyType: "Flex",
      sqft: 22000,
      carrier: "",
      premium: 0,
      cover: 0,
      deductible: 0,
      renewal: "",
      vsMarket: 0,
      status: "missing",
    },
  ];

  const quotes: QuoteData[] = [
    {
      id: "1",
      carrier: "Hartford",
      carrierRating: "A+ (Superior)",
      policyType: "Property All-Risk",
      premium: 13300,
      cover: 16000000,
      deductible: 25000,
      saving: 5100,
      isBest: true,
      coverage: {
        building: "$16M",
        businessInterruption: "12 months",
        liability: "$2M",
        deductible: "$25,000",
        flood: { included: true },
        hurricane: { included: true },
      },
      carrierIntel: {
        amBestRating: "A+ (Superior)",
        avgClaimsPay: "14 days",
        claimsSatisfaction: 4,
        flMarketPresence: "Strong",
        creSpecialism: "Office focus",
        renewalStability: "Low rate volatility",
      },
      pros: [
        "Best price at same cover level",
        "Fastest claims — 14 day avg payout",
        "Strong CRE specialism in FL",
        "Flood + wind included, no sub-deductible",
      ],
      cons: [],
      warnings: ["Market value basis, not agreed value"],
      review: "Hartford paid our hurricane claim within 10 business days. No arguments, no reductions. Adjuster on site within 48 hours.",
    },
  ];

  // Filter data based on selected property
  const selectedAsset = selectedProperty === "all" ? null : summary.assets.find(a => a.id === selectedProperty);

  const filteredPolicies = selectedProperty === "all"
    ? summary.policies
    : summary.policies.filter(p => {
        // Match policy to asset by address/location
        if (!p.propertyAddress || !selectedAsset) return false;
        const addr = p.propertyAddress.toLowerCase();
        const loc = selectedAsset.location.toLowerCase();
        // Simple match: policy address contains asset location
        return addr.includes(loc) || loc.includes(addr);
      });

  // Calculate KPIs from filtered data
  const totalPremium = filteredPolicies.reduce((sum, p) => sum + p.premium, 0);
  const marketRate = summary.benchmarkMin && summary.benchmarkMax
    ? Math.round((summary.benchmarkMin + summary.benchmarkMax) / 2)
    : null;
  const overpaying = marketRate ? Math.max(0, totalPremium - marketRate) : null;
  const coverageGaps = selectedProperty === "all"
    ? summary.assets.length - summary.policies.length
    : (filteredPolicies.length === 0 ? 1 : 0); // Single property: 1 gap if no policy, 0 if has policy
  const savedThisYear = 0; // TODO: Track from bound quotes

  // Format KPI values for display
  const totalPremiumDisplay = totalPremium > 0 ? `$${(totalPremium / 1000).toFixed(1)}k` : "$0";
  const marketRateDisplay = marketRate ? `$${(marketRate / 1000).toFixed(1)}k` : "—";
  const overpayingDisplay = overpaying ? `$${(overpaying / 1000).toFixed(1)}k` : "$0";
  const overpayingPct = marketRate && totalPremium > 0 ? Math.round(((totalPremium - marketRate) / marketRate) * 100) : 0;

  // Get short name for toggle buttons (e.g., "123 Main St, Tampa" -> "Tampa")
  const getShortName = (location: string) => {
    const parts = location.split(",").map(p => p.trim());
    return parts[parts.length - 1] || parts[0]; // Last part (city) or full if no comma
  };

  // Handle bind policy action
  const handleBind = async (quoteId: string) => {
    try {
      const response = await fetch("/api/quotes/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, quoteType: "insurance" }),
      });

      if (!response.ok) {
        throw new Error("Failed to bind policy");
      }

      // Success - modal will show success state
      console.log("Policy bound successfully");
    } catch (error) {
      console.error("Bind error:", error);
      throw error; // Re-throw to let modal handle it
    }
  };

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
            <div className="view-toggle">
              <button onClick={() => setSelectedProperty("all")} className={`view-btn ${selectedProperty === "all" ? "on" : ""}`}>
                All properties
              </button>
              {summary.assets.slice(0, 6).map(asset => (
                <button key={asset.id} onClick={() => setSelectedProperty(asset.id)} className={`view-btn ${selectedProperty === asset.id ? "on" : ""}`}>
                  {getShortName(asset.location)}
                </button>
              ))}
            </div>

            {/* Page Header */}
            <div style={{ marginBottom: "20px" }}>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: "400", color: "var(--tx)", marginBottom: "4px" }}>Insurance</h1>
              <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Portfolio insurance analysis. Every policy benchmarked, risks surfaced, and quotes available in seconds via CoverForce.</p>
            </div>

            {/* KPIs */}
            <div className="kpis">
              <div className="kpi">
                <div className="kpi-l">Total Premium</div>
                <div className="kpi-v">
                  {totalPremiumDisplay} {totalPremium > 0 && <small>/yr</small>}
                </div>
                <div className="kpi-note">
                  {selectedProperty === "all"
                    ? `${summary.policies.length} ${summary.policies.length === 1 ? "policy" : "policies"} across ${summary.assets.length} ${summary.assets.length === 1 ? "asset" : "assets"}`
                    : filteredPolicies.length > 0
                      ? `${filteredPolicies.length} ${filteredPolicies.length === 1 ? "policy" : "policies"} for this property`
                      : "No policy on record"}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Market Rate</div>
                <div className="kpi-v">
                  {marketRateDisplay} {marketRate && <small>/yr</small>}
                </div>
                <div className="kpi-note">
                  {marketRate ? "Estimated benchmark" : "Add property data for benchmark"}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Overpaying</div>
                <div className="kpi-v">
                  {overpayingDisplay} {overpaying && overpaying > 0 && <small>/yr</small>}
                </div>
                <div className="kpi-note">
                  {overpaying && overpaying > 0 ? (
                    <span className="neg">{overpayingPct}% above market avg</span>
                  ) : marketRate ? (
                    <span className="pos">At or below market</span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Coverage Gaps</div>
                <div className="kpi-v">{Math.max(0, coverageGaps)}</div>
                <div className="kpi-note">
                  {coverageGaps > 0 ? (
                    <span className="warn">
                      {selectedProperty === "all"
                        ? `${coverageGaps} ${coverageGaps === 1 ? "asset" : "assets"} without policy`
                        : "No policy uploaded"}
                    </span>
                  ) : (
                    <span className="pos">
                      {selectedProperty === "all" ? "All assets covered" : "Policy on file"}
                    </span>
                  )}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Saved This Year</div>
                <div className="kpi-v">
                  ${(savedThisYear / 1000).toFixed(1)}k
                </div>
                <div className="kpi-note">
                  {savedThisYear > 0 ? <span className="pos">From retendered policies</span> : "No savings tracked yet"}
                </div>
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
                      <button
                        onClick={() => setBindingQuote(quote)}
                        style={{ height: "34px", padding: "0 16px", borderRadius: "8px", font: "600 12px/1 var(--sans)", cursor: "pointer", border: "none", background: quote.isBest ? "var(--grn)" : "transparent", color: quote.isBest ? "#fff" : "var(--tx2)" }}
                      >
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

      {/* Bind Modal */}
      {bindingQuote && (
        <InsuranceBindModal
          quote={bindingQuote}
          currentPolicy={
            // Find current policy for Coral Gables (hardcoded for demo)
            policies.find(p => p.id === "1")
              ? {
                  carrier: policies.find(p => p.id === "1")!.carrier,
                  premium: policies.find(p => p.id === "1")!.premium,
                  cover: policies.find(p => p.id === "1")!.cover,
                  deductible: policies.find(p => p.id === "1")!.deductible,
                }
              : null
          }
          propertyName="Coral Gables Office Park"
          onClose={() => setBindingQuote(null)}
          onBind={handleBind}
        />
      )}
    </AppShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

// ── Types ─────────────────────────────────────────────────────────────
type PlanningApplication = {
  id: string;
  reference: string;
  address: string;
  description: string;
  distance: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  impact: "positive" | "negative" | "neutral";
  impactReason?: string;
  submittedDate: string;
};

type DevPotential = {
  level: "high" | "medium" | "low";
  upliftValue: number;
  description: string;
  zoningSummary: {
    zone: string;
    maxHeight: string;
    maxFAR: string;
    currentFAR: string;
    permittedUses: string;
    setback: string;
    parking: string;
  };
  options: Array<{
    title: string;
    description: string;
    cost: number;
    gdv: number;
    net: number;
  }>;
};

// ── Main Page ─────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Planning — RealHQ";
    setLoading(false);
  }, []);

  // Demo data - in production this comes from API
  const applications: PlanningApplication[] = [
    {
      id: "app-1",
      reference: "APP-2026-0142",
      address: "2801 SW 3rd Ave",
      description: "New office development — 120-unit Class A office",
      distance: "0.2mi",
      status: "PENDING",
      impact: "negative",
      impactReason: "Competing use (Class A office) within 0.2 miles of your property. 120 units adds approximately 85,000 sq ft of competing office supply to the submarket. Current vacancy is 11.2% — additional supply could increase vacancy and suppress rental growth. The development is also likely to create construction disruption for 18–24 months.",
      submittedDate: "Jan 2026",
    },
    {
      id: "app-2",
      reference: "APP-2025-0987",
      address: "3200 Ponce de Leon",
      description: "Mixed-use tower — 22-storey residential + retail",
      distance: "0.4mi",
      status: "APPROVED",
      impact: "negative",
      impactReason: "High-density development creating traffic impact. 22 storeys with 180 residential units will generate significant additional vehicle movements during peak hours. Construction phase (24-30 months) will cause access disruption.",
      submittedDate: "Dec 2025",
    },
    {
      id: "app-3",
      reference: "APP-2026-0203",
      address: "2725 Ponce de Leon",
      description: "Restaurant & bar — Change of use from retail",
      distance: "0.1mi",
      status: "PENDING",
      impact: "positive",
      impactReason: "Adds amenity value. Restaurant/bar at ground level improves neighbourhood appeal for office tenants. Similar amenity additions in comparable submarkets have correlated with 2–4% rental premium for nearby office space. No competing use or traffic concerns at this scale.",
      submittedDate: "Feb 2026",
    },
    {
      id: "app-4",
      reference: "APP-2025-0756",
      address: "Merrick Park",
      description: "Public space renovation — Landscaping + seating + lighting",
      distance: "0.3mi",
      status: "APPROVED",
      impact: "positive",
      impactReason: "Public realm improvement enhancing neighbourhood quality. Green space improvements correlate with 3–5% value uplift for nearby commercial properties. Zero negative impact.",
      submittedDate: "Nov 2025",
    },
    {
      id: "app-5",
      reference: "APP-2026-0124",
      address: "148 Almeria Ave",
      description: "Residential addition — Single family extension",
      distance: "0.6mi",
      status: "PENDING",
      impact: "neutral",
      impactReason: "Small-scale residential work with no material impact on commercial property values or market conditions. Too distant and different use class to affect your property.",
      submittedDate: "Mar 2026",
    },
  ];

  const devPotential: DevPotential = {
    level: "medium",
    upliftValue: 420000,
    description: "Current zoning (C-MX2) permits mixed-use up to 5 storeys. Your site has 0.4 FAR remaining. Options include: vertical extension (2 additional floors), rear lot conversion, or change of use to residential on upper floors.",
    zoningSummary: {
      zone: "C-MX2 (Mixed Use)",
      maxHeight: "75 ft / 5 storeys",
      maxFAR: "3.0",
      currentFAR: "2.6",
      permittedUses: "Office, Retail, Residential",
      setback: "10 ft",
      parking: "1 per 400 sq ft",
    },
    options: [
      {
        title: "Vertical extension (+2 floors)",
        description: "Add 8,400 sq ft office. Est cost: $1.2M. GDV uplift: $1.6M. Net: +$420k.",
        cost: 1200000,
        gdv: 1600000,
        net: 420000,
      },
      {
        title: "Rear lot conversion",
        description: "Convert parking area to small retail unit. Est cost: $380k. GDV uplift: $520k. Net: +$140k.",
        cost: 380000,
        gdv: 520000,
        net: 140000,
      },
      {
        title: "Change of use (upper floors → resi)",
        description: "Convert floors 2–3 to 6 apartments. Est cost: $960k. GDV uplift: $1.3M. Net: +$340k.",
        cost: 960000,
        gdv: 1300000,
        net: 340000,
      },
    ],
  };

  const stats = {
    total: applications.length,
    negative: applications.filter((a) => a.impact === "negative").length,
    positive: applications.filter((a) => a.impact === "positive").length,
    monitoring: "Active",
  };

  const impactColor = (impact: string) => {
    if (impact === "positive") return "var(--grn)";
    if (impact === "negative") return "var(--red)";
    return "var(--amb)";
  };

  const statusColor = (status: string) => {
    if (status === "APPROVED") return "ok";
    if (status === "REJECTED") return "danger";
    return "warn";
  };

  return (
    <AppShell>
      <TopBar />
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "28px 32px 40px", maxWidth: "1080px", margin: "0 auto" }}>

        {/* Property Title */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
          {portfolio.assets[0]?.location?.split(",")[0] || "Portfolio Planning"}
        </div>

        {/* Tab Bar - Planning active */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--bdr)", marginBottom: "24px" }}>
          {["Overview", "Tenants", "Financials", "Income", "Work Orders", "Compliance", "Planning", "Documents"].map((tab) => (
            <div
              key={tab}
              style={{
                padding: "10px 18px",
                font: "500 12px var(--sans)",
                color: tab === "Planning" ? "var(--acc)" : "var(--tx3)",
                cursor: "pointer",
                borderBottom: tab === "Planning" ? "2px solid var(--acc)" : "2px solid transparent",
                transition: "all .12s",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Applications</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.total}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>within 1 mile · last 12mo</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Negative</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.negative}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--red)" }}>{stats.negative} could impact value</span></div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Positive</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.positive}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}><span style={{ color: "var(--grn)" }}>neighbourhood improving</span></div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Dev Potential</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--acc)", letterSpacing: "-.02em", lineHeight: 1, textTransform: "capitalize" }}>{devPotential.level}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>+${(devPotential.upliftValue / 1000).toFixed(0)}k potential uplift</div>
          </div>
          <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background .12s" }}>
            <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "6px" }}>Monitoring</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-.02em", lineHeight: 1 }}>{stats.monitoring}</div>
            <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>Checked weekly</div>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px" }}>Nearby Applications</div>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--bdr)", borderRadius: "7px", overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 14px",
                font: "500 10px var(--sans)",
                color: viewMode === "list" ? "var(--acc)" : "var(--tx3)",
                background: viewMode === "list" ? "var(--acc-dim)" : "var(--s1)",
                cursor: "pointer",
                border: "none",
                borderRight: "1px solid var(--bdr)",
                transition: "all .12s",
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              style={{
                padding: "6px 14px",
                font: "500 10px var(--sans)",
                color: viewMode === "map" ? "var(--acc)" : "var(--tx3)",
                background: viewMode === "map" ? "var(--acc-dim)" : "var(--s1)",
                cursor: "pointer",
                border: "none",
                transition: "all .12s",
              }}
            >
              Map
            </button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div style={{ background: "var(--s2)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", height: "320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
            {/* Distance rings */}
            {[120, 220, 340].map((size) => (
              <div key={size} style={{ position: "absolute", width: `${size}px`, height: `${size}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1px dashed var(--bdr)", borderRadius: "50%" }} />
            ))}

            {/* Your property pin */}
            <div style={{ position: "absolute", top: "45%", left: "48%", width: "32px", height: "32px", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: "var(--acc)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)", zIndex: 2 }}>
              <span style={{ transform: "rotate(45deg)", fontSize: "14px", fontWeight: 700 }}>★</span>
            </div>

            {/* Application pins */}
            {[
              { top: "32%", left: "42%", type: "neg", label: "−" },
              { top: "55%", left: "62%", type: "neg", label: "−" },
              { top: "38%", left: "58%", type: "pos", label: "+" },
              { top: "62%", left: "40%", type: "pos", label: "+" },
              { top: "50%", left: "30%", type: "neu", label: "·" },
            ].map((pin, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  top: pin.top,
                  left: pin.left,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: pin.type === "pos" ? "var(--grn)" : pin.type === "neg" ? "var(--red)" : "var(--amb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span style={{ transform: "rotate(45deg)" }}>{pin.label}</span>
              </div>
            ))}

            {/* Legend */}
            <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "10px", font: "400 9px var(--sans)", color: "var(--tx3)" }}>
              {[
                { label: "Your property", color: "var(--acc)" },
                { label: "Positive", color: "var(--grn)" },
                { label: "Neutral", color: "var(--amb)" },
                { label: "Negative", color: "var(--red)" },
              ].map((item) => (
                <span key={item.label}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: item.color, marginRight: "3px" }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div style={{ position: "absolute", bottom: "12px", right: "12px", font: "400 8px var(--mono)", color: "var(--tx3)" }}>Rings: 0.25mi · 0.5mi · 1mi</div>
            <div style={{ position: "absolute", top: "12px", right: "12px", font: "300 10px var(--sans)", color: "var(--tx3)" }}>Illustrative — actual view uses Google Maps</div>
          </div>
        )}

        {/* Application List */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>All Applications — Last 12 Months</h4>
            <span style={{ font: "500 11px var(--sans)", color: "var(--acc)", cursor: "pointer" }}>Filter by impact ↓</span>
          </div>

          {applications.map((app) => (
            <div key={app.id}>
              <div
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 18px",
                  borderBottom: "1px solid var(--bdr-lt)",
                  borderLeft: `3px solid ${impactColor(app.impact)}`,
                  cursor: "pointer",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{app.description}</div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)" }}>{app.address} · {app.distance} away · {app.submittedDate}</div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "100px", font: "600 9px/1 var(--mono)", letterSpacing: ".3px", textTransform: "uppercase", background: `var(--${app.impact === "positive" ? "grn" : app.impact === "negative" ? "red" : "amb"}-lt)`, color: impactColor(app.impact), border: `1px solid var(--${app.impact === "positive" ? "grn" : app.impact === "negative" ? "red" : "amb"}-bdr)` }}>
                  {app.impact.toUpperCase()}
                </span>
                <span style={{ font: "500 11px/1 var(--mono)", color: "var(--tx2)" }}>{app.distance}</span>
                <span style={{ font: "500 9px/1 var(--mono)", padding: "3px 7px", borderRadius: "5px", letterSpacing: ".3px", whiteSpace: "nowrap" }} className={`tag-${statusColor(app.status)}`}>
                  {app.status}
                </span>
                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>→</span>
              </div>

              {/* AI Explanation (expanded) */}
              {expandedApp === app.id && app.impactReason && (
                <div style={{ padding: "14px 18px", background: "var(--s2)", borderRadius: "8px", margin: "0 18px 18px", font: "300 12px/1.7 var(--sans)", color: "var(--tx2)" }}>
                  <div style={{ font: "500 8px/1 var(--mono)", padding: "2px 6px", borderRadius: "4px", background: "var(--acc-dim)", color: "var(--acc)", border: "1px solid var(--acc-bdr)", marginBottom: "8px", display: "inline-block" }}>AI CLASSIFICATION</div>
                  <br />
                  <strong style={{ color: "var(--tx)", fontWeight: 500 }}>Classified as {app.impact.toUpperCase()} because:</strong> {app.impactReason}
                  {app.impact === "negative" && (
                    <div style={{ marginTop: "8px" }}>
                      <a href="#" style={{ color: "var(--red)", font: "500 11px var(--sans)" }}>Draft objection letter →</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dev Potential Summary */}
        <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Development Potential</div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--acc-bdr)", borderRadius: "var(--r)", padding: "22px 24px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ font: "500 9px/1 var(--mono)", color: "var(--acc)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Your Property</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px", textTransform: "capitalize" }}>{devPotential.level} development potential</div>
            <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: 1.6, maxWidth: "480px" }}>{devPotential.description}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: 400, color: "var(--grn)", letterSpacing: "-.03em", lineHeight: 1 }}>+${(devPotential.upliftValue / 1000).toFixed(0)}k</div>
            <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>potential value uplift</div>
            <button style={{ marginTop: "14px", display: "inline-block", padding: "8px 16px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: "7px", font: "600 11px/1 var(--sans)", cursor: "pointer" }}>Full report →</button>
          </div>
        </div>

        {/* Zoning + Options Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {/* Zoning Summary */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Zoning Summary</h4>
            </div>
            <div style={{ padding: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(devPotential.zoningSummary).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", marginBottom: "3px" }}>{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-Application Options */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
              <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Pre-Application Options</h4>
            </div>
            <div style={{ padding: "18px" }}>
              {devPotential.options.map((option, idx) => (
                <div key={idx} style={{ marginBottom: idx < devPotential.options.length - 1 ? "12px" : 0 }}>
                  <div style={{ font: "500 11px var(--sans)", color: "var(--tx)", marginBottom: "3px" }}>{option.title}</div>
                  <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>{option.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .tag-ok {
          background: var(--grn-lt);
          color: var(--grn);
          border: 1px solid var(--grn-bdr);
        }
        .tag-warn {
          background: var(--amb-lt);
          color: var(--amb);
          border: 1px solid var(--amb-bdr);
        }
        .tag-danger {
          background: var(--red-lt);
          color: var(--red);
          border: 1px solid var(--red-bdr);
        }
      `}</style>
    </AppShell>
  );
}

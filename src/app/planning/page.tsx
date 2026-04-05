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

// ── API response types ─────────────────────────────────────────────────
type ApiEntry = {
  id: string;
  refNumber: string;
  description: string;
  applicant?: string;
  type: string;
  status: string;
  distanceFt?: number;
  impact: "opportunity" | "threat" | "neutral";
  impactScore: number;
  submittedDate: string;
  decisionDate?: string;
  notes: string;
  holdSellLink?: string;
  alertAcked?: boolean;
  sourceUrl?: string | null;
};

type ApiAsset = {
  assetId: string;
  assetName: string;
  location: string;
  planningHistory: ApiEntry[];
  planningImpactSignal?: string | null;
  devPotential?: {
    level: "high" | "medium" | "low";
    upliftEstimate: number;
    description: string;
    zoningSummary?: Record<string, string>;
    options?: Array<{ title: string; description: string; cost: number; gdv: number; net: number }>;
  } | null;
};

function ftToMi(ft: number): string {
  return `${(ft / 5280).toFixed(1)}mi`;
}

function mapImpact(impact: string): "positive" | "negative" | "neutral" {
  if (impact === "opportunity") return "positive";
  if (impact === "threat") return "negative";
  return "neutral";
}

function mapStatus(status: string): "PENDING" | "APPROVED" | "REJECTED" {
  if (status === "approved") return "APPROVED";
  if (status === "rejected" || status === "withdrawn") return "REJECTED";
  return "PENDING";
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [applications, setApplications] = useState<PlanningApplication[]>([]);
  const [devPotential, setDevPotential] = useState<DevPotential>({
    level: "medium",
    upliftValue: 0,
    description: "",
    zoningSummary: { zone: "—", maxHeight: "—", maxFAR: "—", currentFAR: "—", permittedUses: "—", setback: "—", parking: "—" },
    options: [],
  });

  useEffect(() => {
    document.title = "Planning — RealHQ";
    fetch("/api/user/planning")
      .then((r) => r.json())
      .then((data: { assets?: ApiAsset[] }) => {
        const assets = data.assets ?? [];
        // Flatten all planning entries across assets
        const apps: PlanningApplication[] = assets.flatMap((asset) =>
          (asset.planningHistory ?? []).map((e) => ({
            id: e.id,
            reference: e.refNumber,
            address: asset.location,
            description: e.description,
            distance: e.distanceFt ? ftToMi(e.distanceFt) : "—",
            status: mapStatus(e.status),
            impact: mapImpact(e.impact),
            impactReason: e.notes,
            submittedDate: e.submittedDate ? new Date(e.submittedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—",
          }))
        );
        setApplications(apps);

        // Use devPotential from first asset if available
        const firstAsset = assets[0];
        if (firstAsset?.devPotential) {
          const dp = firstAsset.devPotential;
          setDevPotential({
            level: dp.level ?? "medium",
            upliftValue: dp.upliftEstimate ?? 0,
            description: dp.description ?? "",
            zoningSummary: dp.zoningSummary as DevPotential["zoningSummary"] ?? devPotential.zoningSummary,
            options: dp.options ?? [],
          });
        }
      })
      .catch(() => {});
  }, []);

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

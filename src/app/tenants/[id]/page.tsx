"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

// Mock data for now - will be replaced with real API calls
interface TenantDetail {
  id: string;
  name: string;
  unit: string;
  sqft: number;
  since: string;
  rentMonthly: number;
  covenantScore: string;
  covenantLevel: "strong" | "adequate" | "weak";
  arrears: number;
  arrearsEscalation: "none" | "reminder" | "formal_demand" | "solicitor" | "legal";
  paymentTrend: "improving" | "stable" | "deteriorating";
  engagementScore: number;
  leaseStart: string;
  leaseEnd: string;
  propertyName: string;
  propertyId: string;
}

// Payment history chart
function PaymentHistoryChart({ payments }: { payments: Array<{ month: string; status: "on-time" | "late" | "missed" }> }) {
  return (
    <div style={{ padding: "18px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
        {payments.map((p, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <div
              style={{
                width: "100%",
                borderRadius: "3px 3px 0 0",
                minHeight: "2px",
                height: "60px",
                background: p.status === "on-time" ? "var(--grn)" : p.status === "late" ? "var(--amb)" : "var(--red)",
                opacity: 0.7,
              }}
            />
            <div style={{ font: "400 8px var(--mono, monospace)", color: "var(--tx3, #555568)" }}>{p.month}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "12px", marginTop: "10px", font: "400 9px sans-serif", color: "var(--tx3, #555568)" }}>
        <span>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: "var(--grn, #34d399)", marginRight: "3px", opacity: 0.7 }} />
          On time ({payments.filter((p) => p.status === "on-time").length})
        </span>
        <span>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: "var(--amb, #fbbf24)", marginRight: "3px", opacity: 0.7 }} />
          Late ({payments.filter((p) => p.status === "late").length})
        </span>
        <span>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: "var(--red, #f87171)", marginRight: "3px", opacity: 0.7 }} />
          Missed ({payments.filter((p) => p.status === "missed").length})
        </span>
      </div>
    </div>
  );
}

// Escalation steps
function EscalationSteps({ current }: { current: string }) {
  const steps = [
    { key: "reminder", label: "Friendly Reminder" },
    { key: "formal_demand", label: "Formal Demand" },
    { key: "solicitor", label: "Solicitor" },
    { key: "legal", label: "Legal Action" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "16px" }}>
      {steps.map((step, i) => (
        <div
          key={step.key}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "8px 4px",
            background: i < currentIndex ? "var(--grn-lt, rgba(52,211,153,.07))" : i === currentIndex ? "var(--red-lt, rgba(248,113,113,.07))" : "var(--s1, #111116)",
            border: `1px solid ${i < currentIndex ? "var(--grn-bdr, rgba(52,211,153,.22))" : i === currentIndex ? "var(--red-bdr, rgba(248,113,113,.22))" : "var(--bdr, #252533)"}`,
            font: "500 9px/1 monospace",
            textTransform: "uppercase",
            letterSpacing: ".3px",
            color: i < currentIndex ? "var(--grn, #34d399)" : i === currentIndex ? "var(--red, #f87171)" : "var(--tx3, #555568)",
            borderRadius: i === 0 ? "10px 0 0 10px" : i === steps.length - 1 ? "0 10px 10px 0" : "0",
          }}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}

// Source badge
function SourceBadge({ source }: { source: "extracted" | "manual" | "missing" }) {
  const styles = {
    extracted: { bg: "var(--grn-lt, rgba(52,211,153,.07))", color: "var(--grn, #34d399)", border: "var(--grn-bdr, rgba(52,211,153,.22))" },
    manual: { bg: "var(--amb-lt, rgba(251,191,36,.07))", color: "var(--amb, #fbbf24)", border: "var(--amb-bdr, rgba(251,191,36,.22))" },
    missing: { bg: "var(--red-lt, rgba(248,113,113,.07))", color: "var(--red, #f87171)", border: "var(--red-bdr, rgba(248,113,113,.22))" },
  };

  const s = styles[source];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "1px 6px",
        borderRadius: "100px",
        font: "500 7px/1 monospace",
        letterSpacing: ".3px",
        textTransform: "uppercase",
        verticalAlign: "middle",
        marginLeft: "4px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {source.toUpperCase()}
    </span>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);

  useEffect(() => {
    // Mock data for now - will be replaced with real API call
    const mockTenant: TenantDetail = {
      id: tenantId,
      name: "Verde Health LLC",
      unit: "Suite 2B",
      sqft: 900,
      since: "Mar 2024",
      rentMonthly: 4200,
      covenantScore: "C",
      covenantLevel: "weak",
      arrears: 4200,
      arrearsEscalation: "formal_demand",
      paymentTrend: "deteriorating",
      engagementScore: 4.2,
      leaseStart: "Mar 2024",
      leaseEnd: "Mar 2027",
      propertyName: "Coral Gables Office Park",
      propertyId: "asset-123",
    };

    setTimeout(() => {
      setTenant(mockTenant);
      setLoading(false);
    }, 300);
  }, [tenantId]);

  const paymentHistory = [
    { month: "Apr", status: "on-time" as const },
    { month: "May", status: "on-time" as const },
    { month: "Jun", status: "on-time" as const },
    { month: "Jul", status: "on-time" as const },
    { month: "Aug", status: "on-time" as const },
    { month: "Sep", status: "on-time" as const },
    { month: "Oct", status: "late" as const },
    { month: "Nov", status: "on-time" as const },
    { month: "Dec", status: "late" as const },
    { month: "Jan", status: "late" as const },
    { month: "Feb", status: "on-time" as const },
    { month: "Mar", status: "missed" as const },
  ];

  if (loading || !tenant) {
    return (
      <AppShell>
        <TopBar title="Tenant Detail" />
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 32px 80px" }}>
          <div>Loading...</div>
        </div>
      </AppShell>
    );
  }

  const covenantColors = {
    strong: { bg: "var(--grn-lt, rgba(52,211,153,.07))", color: "var(--grn, #34d399)", border: "var(--grn-bdr, rgba(52,211,153,.22))" },
    adequate: { bg: "var(--amb-lt, rgba(251,191,36,.07))", color: "var(--amb, #fbbf24)", border: "var(--amb-bdr, rgba(251,191,36,.22))" },
    weak: { bg: "var(--red-lt, rgba(248,113,113,.07))", color: "var(--red, #f87171)", border: "var(--red-bdr, rgba(248,113,113,.22))" },
  };

  const cc = covenantColors[tenant.covenantLevel];

  return (
    <AppShell>
      <TopBar title={`${tenant.name} · Tenant Detail`} />
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 32px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "100px",
              font: "600 9px/1 monospace",
              letterSpacing: ".3px",
              background: cc.bg,
              color: cc.color,
              border: `1px solid ${cc.border}`,
            }}
          >
            {tenant.covenantScore} COVENANT
          </span>
          {tenant.arrears > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 7px",
                borderRadius: "5px",
                font: "500 9px/1 monospace",
                letterSpacing: ".3px",
                whiteSpace: "nowrap",
                background: "var(--red-lt, rgba(248,113,113,.07))",
                color: "var(--red, #f87171)",
                border: "1px solid var(--red-bdr, rgba(248,113,113,.22))",
              }}
            >
              14D ARREARS
            </span>
          )}
          <span style={{ font: "300 12px sans-serif", color: "var(--tx3, #555568)" }}>
            {tenant.unit} · {tenant.sqft} sq ft · Since {tenant.since}
          </span>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "24px", fontWeight: 400, color: "var(--tx, #e4e4ec)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: "4px" }}>
            {tenant.name}
          </div>
          <div style={{ font: "300 13px sans-serif", color: "var(--tx3, #555568)" }}>
            {tenant.propertyName} · Healthcare consulting
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {/* LEFT COLUMN */}
          <div>
            {/* Payment History */}
            <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>
              Payment History — 12 Months
            </div>
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Payment Pattern</h4>
                <span style={{ font: "500 11px sans-serif", color: "var(--red, #f87171)" }}>Trend: {tenant.paymentTrend === "deteriorating" ? "Deteriorating ↓" : tenant.paymentTrend === "improving" ? "Improving ↑" : "Stable →"}</span>
              </div>
              <PaymentHistoryChart payments={paymentHistory} />
            </div>

            {/* Arrears Management */}
            {tenant.arrears > 0 && (
              <>
                <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Arrears Management</div>
                <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Current Arrears: ${tenant.arrears.toLocaleString()}</h4>
                    <span style={{ font: "500 11px sans-serif", color: "var(--acc, #7c6af0)" }}>14 days overdue</span>
                  </div>
                  <div style={{ padding: "18px" }}>
                    <EscalationSteps current={tenant.arrearsEscalation} />

                    {/* Timeline */}
                    <div style={{ borderLeft: "2px solid var(--bdr, #252533)", paddingLeft: "16px", marginLeft: "4px" }}>
                      <div style={{ marginBottom: "12px", position: "relative" }}>
                        <div style={{ position: "absolute", left: "-21px", top: "3px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--red, #f87171)", border: "2px solid var(--bg, #09090b)" }} />
                        <div style={{ font: "500 11px sans-serif", color: "var(--red, #f87171)" }}>Formal demand letter due</div>
                        <div style={{ font: "300 10px sans-serif", color: "var(--tx3, #555568)" }}>Today · RealHQ can draft a formal demand letter</div>
                      </div>
                      <div style={{ marginBottom: "12px", position: "relative" }}>
                        <div style={{ position: "absolute", left: "-21px", top: "3px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--grn, #34d399)", border: "2px solid var(--bg, #09090b)" }} />
                        <div style={{ font: "500 11px sans-serif", color: "var(--tx, #e4e4ec)" }}>Friendly reminder sent</div>
                        <div style={{ font: "300 10px sans-serif", color: "var(--tx3, #555568)" }}>Mar 18 · Email reminder sent via Resend. Opened but no response.</div>
                      </div>
                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: "-21px", top: "3px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--tx3, #555568)", border: "2px solid var(--bg, #09090b)" }} />
                        <div style={{ font: "500 11px sans-serif", color: "var(--tx, #e4e4ec)" }}>Rent due date</div>
                        <div style={{ font: "300 10px sans-serif", color: "var(--tx3, #555568)" }}>Mar 1 · ${tenant.arrears.toLocaleString()} due. Not received.</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                      <button
                        style={{
                          flex: 1,
                          height: "38px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--red, #f87171)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          font: "600 12px/1 sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Draft formal demand →
                      </button>
                      <button
                        style={{
                          flex: 1,
                          height: "38px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          color: "var(--tx2, #8888a0)",
                          border: "1px solid var(--bdr, #252533)",
                          borderRadius: "10px",
                          font: "500 12px/1 sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Log phone call
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Engagement */}
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Engagement Score</h4>
                <span style={{ font: "500 11px sans-serif", color: "var(--acc, #7c6af0)" }}>{tenant.engagementScore} / 10</span>
              </div>
              <div style={{ padding: "18px", font: "300 12px/1.6 sans-serif", color: "var(--tx2, #8888a0)" }}>
                Low engagement. Verde Health has not responded to the last 2 satisfaction surveys. Arrears pattern suggests possible business difficulties. Consider: direct conversation with tenant principal to understand situation before escalating further.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Lease Abstract */}
            <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Lease Abstract</div>
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Key Terms</h4>
                <span style={{ font: "500 11px sans-serif", color: "var(--acc, #7c6af0)", cursor: "pointer" }}>View full lease →</span>
              </div>
              <div style={{ padding: "0" }}>
                {[
                  { label: "Rent", value: `$${tenant.rentMonthly.toLocaleString()}/mo ($${(tenant.rentMonthly * 12).toLocaleString()}/yr)`, source: "extracted" as const },
                  { label: "Term", value: `3 years (${tenant.leaseStart} – ${tenant.leaseEnd})`, source: "extracted" as const },
                  { label: "Rent Review", value: "None (short lease)", source: "extracted" as const },
                  { label: "Break Clause", value: "None", source: "extracted" as const },
                  { label: "Permitted Use", value: "Healthcare consulting / office", source: "extracted" as const },
                  { label: "Repair Obligation", value: "Tenant: internal repairs. Landlord: structure + exterior.", source: "extracted" as const },
                  { label: "Service Charge", value: "Pro-rata share (8.5%) capped at $6,200/yr", source: "extracted" as const },
                  { label: "Alienation", value: "—", source: "missing" as const },
                  { label: "Rent Deposit", value: "$8,400 (2 months)", source: "extracted" as const },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--bdr-lt, #1a1a26)" }}>
                    <div style={{ padding: "8px 18px", font: "500 10px sans-serif", color: "var(--tx3, #555568)" }}>{item.label}</div>
                    <div style={{ padding: "8px 18px", font: "400 12px sans-serif", color: item.source === "missing" ? "var(--red, #f87171)" : "var(--tx, #e4e4ec)" }}>
                      {item.value}
                      <SourceBadge source={item.source} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--bdr, #252533)", font: "300 10px sans-serif", color: "var(--tx3, #555568)" }}>
                8 of 9 fields auto-extracted from uploaded lease. 1 field not found in document — RealHQ will re-attempt if a clearer scan is uploaded.
              </div>
            </div>

            {/* Company Intelligence */}
            <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Company Intelligence</div>
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>{tenant.name}</h4>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "100px",
                    font: "600 9px/1 monospace",
                    letterSpacing: ".3px",
                    background: "var(--red-lt, rgba(248,113,113,.07))",
                    color: "var(--red, #f87171)",
                    border: "1px solid var(--red-bdr, rgba(248,113,113,.22))",
                  }}
                >
                  HIGH RISK
                </span>
              </div>
              <div style={{ padding: "0" }}>
                {[
                  { label: "Entity Type", value: "Florida LLC · Single-member" },
                  { label: "Incorporated", value: 'Jan 14, 2024 (2 years old)', warn: true },
                  { label: "Registered Agent", value: "Dr. Maria Santos · 2801 Ponce de Leon Blvd, Suite 2B" },
                  { label: "Employees", value: "3–5 (estimated from LinkedIn)", dim: true },
                  { label: "Est. Revenue", value: "$180k–$320k/yr (D&B estimate)", dim: true },
                  { label: "Credit Score", value: "Not rated (entity too new for D&B PAYDEX)", dim: true, warn: true },
                  { label: "FL Sunbiz Status", value: "Active ✓ · Annual report filed Jan 2026", ok: true },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--bdr-lt, #1a1a26)" }}>
                    <div style={{ padding: "8px 18px", font: "500 10px sans-serif", color: "var(--tx3, #555568)" }}>{item.label}</div>
                    <div style={{ padding: "8px 18px", font: "400 12px sans-serif", color: item.ok ? "var(--grn, #34d399)" : item.warn ? "var(--amb, #fbbf24)" : "var(--tx, #e4e4ec)" }}>
                      {item.value.includes("(") ? (
                        <>
                          {item.value.split("(")[0]}
                          <span style={{ color: "var(--tx3, #555568)" }}>({item.value.split("(")[1]}</span>
                        </>
                      ) : (
                        item.value
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Summary */}
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Risk Summary</h4>
                  <span
                    style={{
                      font: "500 8px/1 monospace",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "var(--acc-lt, rgba(124,106,240,.10))",
                      color: "var(--acc, #7c6af0)",
                      border: "1px solid var(--acc-bdr, rgba(124,106,240,.22))",
                    }}
                  >
                    AI ASSESSED
                  </span>
                </div>
                <span style={{ font: "500 11px sans-serif", color: "var(--acc, #7c6af0)", cursor: "pointer" }}>Refresh →</span>
              </div>
              <div style={{ padding: "18px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {[
                    { text: "⚠ New entity (2 years)", type: "danger" },
                    { text: "⚠ Single-member LLC", type: "danger" },
                    { text: "⚠ No credit rating", type: "danger" },
                    { text: "⚠ Rent high vs revenue", type: "warn" },
                    { text: "⚠ Deteriorating payment pattern", type: "danger" },
                    { text: "✓ Entity active & compliant", type: "ok" },
                    { text: "✓ Rent deposit held (2 months)", type: "ok" },
                  ].map((tag, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        background: tag.type === "ok" ? "var(--grn-lt, rgba(52,211,153,.07))" : tag.type === "warn" ? "var(--amb-lt, rgba(251,191,36,.07))" : "var(--red-lt, rgba(248,113,113,.07))",
                        border: `1px solid ${tag.type === "ok" ? "var(--grn-bdr, rgba(52,211,153,.22))" : tag.type === "warn" ? "var(--amb-bdr, rgba(251,191,36,.22))" : "var(--red-bdr, rgba(248,113,113,.22))"}`,
                        borderRadius: "6px",
                        font: "400 11px sans-serif",
                        color: tag.type === "ok" ? "var(--grn, #34d399)" : tag.type === "warn" ? "var(--amb, #fbbf24)" : "var(--red, #f87171)",
                      }}
                    >
                      {tag.text}
                    </div>
                  ))}
                </div>
                <div style={{ font: "300 12px/1.7 sans-serif", color: "var(--tx2, #8888a0)" }}>
                  <strong style={{ color: "var(--tx, #e4e4ec)" }}>Assessment:</strong> High tenant risk. Verde Health is a micro-business with no credit history and a worsening payment pattern. The single-member LLC structure offers limited recourse. Rent represents an
                  estimated 16–28% of revenue, which is above the 15% comfort threshold. The 2-month deposit provides short-term protection but will be eroded if arrears continue.{" "}
                  <strong style={{ color: "var(--red, #f87171)" }}>Recommend escalating to formal demand immediately</strong> and beginning contingency planning for re-letting Suite 2B if payment does not resume within 30 days.
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Contact Details</h4>
                <span style={{ font: "400 10px sans-serif", color: "var(--tx3, #555568)" }}>Auto-populated</span>
              </div>
              <div style={{ padding: "18px" }}>
                {[
                  { label: "Principal", value: "Dr. Maria Santos", source: "SUNBIZ" },
                  { label: "Email", value: "maria@verdehealth.com", source: "LEASE" },
                  { label: "Phone", value: "(305) 555-0477", source: "D&B" },
                  { label: "Website", value: "verdehealth.com", source: "WEB", link: true },
                  { label: "LinkedIn", value: "linkedin.com/in/mariasantos-verde", source: "WEB", link: true },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: i === 4 ? "0" : "10px" }}>
                    <div style={{ font: "500 10px sans-serif", color: "var(--tx3, #555568)", marginBottom: "2px" }}>
                      {item.label} <SourceBadge source="extracted" />
                    </div>
                    <div style={{ font: item.link ? "400 12px sans-serif" : "500 12px sans-serif", color: item.link ? "var(--acc, #7c6af0)" : "var(--tx, #e4e4ec)" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Activity Timeline</div>
        <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Auto-Aggregated from All Systems</h4>
            <span style={{ font: "400 10px sans-serif", color: "var(--tx3, #555568)" }}>7 events · last 6 months</span>
          </div>

          {[
            { type: "PAYMENT", date: "Mar 27, 2026", text: "March rent not received. $4,200 overdue · 27 days. Auto-escalated to formal demand stage.", color: "red" },
            { type: "EMAIL · RESEND", date: "Mar 18, 2026 · 9:00 AM", text: "Friendly payment reminder sent to maria@verdehealth.com. Opened Mar 18 at 11:23 AM. No response.", color: "blue", badge: "AUTO REMINDER" },
            { type: "PAYMENT", date: "Feb 1, 2026", text: "February rent received ($4,200). Paid 3 days late.", color: "amber" },
            { type: "ENGAGEMENT", date: "Jan 15, 2026", text: "Satisfaction survey sent. No response received (2nd consecutive non-response).", color: "amber" },
            { type: "PAYMENT", date: "Jan 5, 2026", text: "January rent received ($4,200). Paid 5 days late.", color: "amber" },
            { type: "PAYMENT", date: "Dec 1, 2025", text: "December rent received ($4,200). Paid on time.", color: "green" },
            { type: "ENGAGEMENT", date: "Oct 20, 2025", text: "Satisfaction survey sent. No response received.", color: "muted" },
          ].map((event, i, arr) => {
            const colors = {
              red: { bg: "var(--red-lt, rgba(248,113,113,.07))", color: "var(--red, #f87171)", border: "var(--red-bdr, rgba(248,113,113,.22))" },
              blue: { bg: "rgba(56,189,248,.07)", color: "#38bdf8", border: "rgba(56,189,248,.22)" },
              amber: { bg: "var(--amb-lt, rgba(251,191,36,.07))", color: "var(--amb, #fbbf24)", border: "var(--amb-bdr, rgba(251,191,36,.22))" },
              green: { bg: "var(--grn-lt, rgba(52,211,153,.07))", color: "var(--grn, #34d399)", border: "var(--grn-bdr, rgba(52,211,153,.22))" },
              muted: { bg: "var(--s3, #1f1f28)", color: "var(--tx3, #555568)", border: "var(--bdr, #252533)" },
            };

            const c = colors[event.color as keyof typeof colors];

            return (
              <div key={i} style={{ padding: "14px 18px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--bdr-lt, #1a1a26)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      font: "500 8px/1 monospace",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: c.bg,
                      color: c.color,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    {event.type}
                  </span>
                  <span style={{ font: "400 10px sans-serif", color: "var(--tx3, #555568)" }}>{event.date}</span>
                  {event.badge && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 7px",
                        borderRadius: "5px",
                        font: "500 7px/1 monospace",
                        letterSpacing: ".3px",
                        whiteSpace: "nowrap",
                        background: "var(--red-lt, rgba(248,113,113,.07))",
                        color: "var(--red, #f87171)",
                        border: "1px solid var(--red-bdr, rgba(248,113,113,.22))",
                      }}
                    >
                      {event.badge}
                    </span>
                  )}
                </div>
                <div style={{ font: "300 12px/1.6 sans-serif", color: event.color === "red" ? "var(--red, #f87171)" : event.color === "amber" ? "var(--amb, #fbbf24)" : "var(--tx2, #8888a0)" }}>{event.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

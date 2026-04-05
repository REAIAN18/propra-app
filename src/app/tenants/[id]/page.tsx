"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

interface TenantDetail {
  id: string;
  name: string;
  unit: string;
  sqft: number;
  since: string;
  rentMonthly: number;
  annualRent: number;
  rentPerSqft: number;
  marketERV: number | null;
  covenantScore: string;
  covenantLevel: "strong" | "adequate" | "weak";
  arrears: number;
  arrearsEscalation: "none" | "reminder" | "formal_demand" | "solicitor" | "legal";
  paymentTrend: "improving" | "stable" | "deteriorating";
  engagementScore: number;
  leaseStart: string;
  leaseEnd: string;
  breakDate: string | null;
  reviewDate: string | null;
  daysToExpiry: number | null;
  propertyName: string;
  propertyId: string;
  sector: string | null;
  sym: string;
  healthScore: number;
}

interface ApiPaymentRecord {
  period: string;
  status: string;
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
  const tenantId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<ApiPaymentRecord[]>([]);
  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; title: string; description: string; status: string; date: string }>>([]);
  const [tenantEmail, setTenantEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/user/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        const t = data.tenant ?? data;
        const covenantLevel: "strong" | "adequate" | "weak" =
          (t.covenantLevel === "strong" || t.covenantLevel === "adequate" || t.covenantLevel === "weak")
            ? t.covenantLevel
            : t.covenantScore === "Strong" ? "strong"
            : t.covenantScore === "Weak" ? "weak"
            : "adequate";

        setTenant({
          id: t.id ?? tenantId,
          name: t.name ?? "Unknown Tenant",
          unit: t.unit ?? t.location ?? "—",
          sqft: t.sqft ?? 0,
          since: t.leaseStart ? new Date(t.leaseStart).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—",
          rentMonthly: Math.round((t.annualRent ?? 0) / 12),
          annualRent: t.annualRent ?? 0,
          rentPerSqft: t.rentPerSqft ?? 0,
          marketERV: t.marketERV ?? null,
          covenantScore: t.covenantScore ?? "—",
          covenantLevel,
          arrears: t.arrears ?? 0,
          arrearsEscalation: t.arrearsEscalation ?? "none",
          paymentTrend: t.paymentTrend ?? "stable",
          engagementScore: t.engagementScore ?? 0,
          leaseStart: t.leaseStart ?? "",
          leaseEnd: t.leaseEnd ?? t.expiryDate ?? "",
          breakDate: t.breakDate ?? null,
          reviewDate: t.reviewDate ?? null,
          daysToExpiry: t.daysToExpiry ?? null,
          propertyName: t.propertyName ?? "—",
          propertyId: t.propertyId ?? "—",
          sector: t.sector ?? null,
          sym: t.sym ?? "£",
          healthScore: t.healthScore ?? 0,
        });
        setPaymentHistory(data.paymentHistory ?? []);
        setTimeline(data.timeline ?? []);
        setTenantEmail(t.email ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Convert API paymentHistory (period+status) to chart format
  const chartPayments = paymentHistory.map((p) => ({
    month: p.period ? new Date(p.period + "-01").toLocaleDateString("en-GB", { month: "short" }) : "—",
    status: (p.status === "paid" ? "on-time" : p.status === "late" ? "late" : "missed") as "on-time" | "late" | "missed",
  }));

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
              <PaymentHistoryChart payments={chartPayments} />
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
                {tenant.engagementScore >= 7
                  ? "Active engagement. Tenant is responsive and satisfaction surveys show positive trend. Maintain regular check-ins."
                  : tenant.engagementScore >= 4
                  ? "Moderate engagement. Some survey non-responses. Schedule a quarterly check-in to maintain relationship."
                  : "Low engagement. Tenant has not responded to recent satisfaction surveys. Consider a direct conversation with the tenant principal to understand their situation before escalating."}
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
                  { label: "Annual Rent", value: tenant.annualRent > 0 ? `${tenant.sym}${tenant.annualRent.toLocaleString()}/yr` : "—", source: "extracted" as const },
                  { label: "Term", value: tenant.leaseStart && tenant.leaseEnd ? `${tenant.leaseStart} – ${tenant.leaseEnd}` : "—", source: tenant.leaseStart ? "extracted" as const : "missing" as const },
                  { label: "Rent Review", value: tenant.reviewDate ? tenant.reviewDate : "—", source: tenant.reviewDate ? "extracted" as const : "missing" as const },
                  { label: "Break Clause", value: tenant.breakDate ? tenant.breakDate : "None", source: "extracted" as const },
                  { label: "Sector", value: tenant.sector ?? "—", source: tenant.sector ? "extracted" as const : "missing" as const },
                  { label: "Repair Obligation", value: "—", source: "missing" as const },
                  { label: "Service Charge", value: "—", source: "missing" as const },
                  { label: "Alienation", value: "—", source: "missing" as const },
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
                Upload lease documents to auto-extract full terms via document parser.
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
                    background: tenant.covenantLevel === "strong" ? "var(--grn-lt, rgba(52,211,153,.07))" : tenant.covenantLevel === "weak" ? "var(--red-lt, rgba(248,113,113,.07))" : "var(--amb-lt, rgba(251,191,36,.07))",
                    color: tenant.covenantLevel === "strong" ? "var(--grn, #34d399)" : tenant.covenantLevel === "weak" ? "var(--red, #f87171)" : "var(--amb, #fbbf24)",
                    border: `1px solid ${tenant.covenantLevel === "strong" ? "var(--grn-bdr, rgba(52,211,153,.22))" : tenant.covenantLevel === "weak" ? "var(--red-bdr, rgba(248,113,113,.22))" : "var(--amb-bdr, rgba(251,191,36,.22))"}`,
                  }}
                >
                  {tenant.covenantScore}
                </span>
              </div>
              <div style={{ padding: "18px", font: "300 12px/1.6 sans-serif", color: "var(--tx3, #555568)", textAlign: "center" }}>
                Run a covenant check to see full company intelligence — entity type, registration, filing history, credit indicators, and key contacts.
                <div style={{ marginTop: 10 }}>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--acc, #7c6af0)", cursor: "pointer" }}>Run covenant check →</span>
                </div>
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
                    tenant.covenantLevel === "weak" && { text: "⚠ Weak covenant", type: "danger" },
                    tenant.paymentTrend === "deteriorating" && { text: "⚠ Deteriorating payment trend", type: "danger" },
                    tenant.arrears > 0 && { text: `⚠ ${tenant.sym}${tenant.arrears.toLocaleString()} in arrears`, type: "danger" },
                    tenant.covenantLevel === "adequate" && { text: "⚠ Covenant ungraded", type: "warn" },
                    tenant.paymentTrend === "improving" && { text: "✓ Payment trend improving", type: "ok" },
                    tenant.covenantLevel === "strong" && { text: "✓ Strong covenant", type: "ok" },
                    tenant.arrears === 0 && { text: "✓ No arrears", type: "ok" },
                  ].filter(Boolean).map((tag, i) => {
                    const t2 = tag as { text: string; type: string };
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "6px 10px",
                          background: t2.type === "ok" ? "var(--grn-lt, rgba(52,211,153,.07))" : t2.type === "warn" ? "var(--amb-lt, rgba(251,191,36,.07))" : "var(--red-lt, rgba(248,113,113,.07))",
                          border: `1px solid ${t2.type === "ok" ? "var(--grn-bdr, rgba(52,211,153,.22))" : t2.type === "warn" ? "var(--amb-bdr, rgba(251,191,36,.22))" : "var(--red-bdr, rgba(248,113,113,.22))"}`,
                          borderRadius: "6px",
                          font: "400 11px sans-serif",
                          color: t2.type === "ok" ? "var(--grn, #34d399)" : t2.type === "warn" ? "var(--amb, #fbbf24)" : "var(--red, #f87171)",
                        }}
                      >
                        {t2.text}
                      </div>
                    );
                  })}
                </div>
                <div style={{ font: "300 12px/1.7 sans-serif", color: "var(--tx2, #8888a0)" }}>
                  {tenant.covenantLevel === "weak" || tenant.arrears > 0
                    ? <><strong style={{ color: "var(--tx, #e4e4ec)" }}>Assessment:</strong> Elevated tenant risk. {tenant.arrears > 0 ? `Current arrears of ${tenant.sym}${tenant.arrears.toLocaleString()} require immediate attention. ` : ""}Review lease terms and consider direct engagement with the tenant before escalating further.</>
                    : <><strong style={{ color: "var(--tx, #e4e4ec)" }}>Assessment:</strong> {tenant.covenantLevel === "strong" ? "Low risk tenant with strong covenant. Continue regular monitoring." : "Moderate risk. Run a covenant check for full intelligence on this tenant."}</>
                  }
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
                {tenantEmail ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ font: "500 10px sans-serif", color: "var(--tx3, #555568)", marginBottom: 2 }}>
                      Email <SourceBadge source="extracted" />
                    </div>
                    <div style={{ font: "500 12px sans-serif", color: "var(--tx, #e4e4ec)" }}>{tenantEmail}</div>
                  </div>
                ) : (
                  <div style={{ font: "300 12px/1.5 sans-serif", color: "var(--tx3, #555568)", paddingBottom: 8 }}>
                    Contact details not available. Upload the lease or tenancy agreement to auto-extract contact information.
                  </div>
                )}
                <div>
                  <div style={{ font: "500 10px sans-serif", color: "var(--tx3, #555568)", marginBottom: 2 }}>Sector</div>
                  <div style={{ font: "500 12px sans-serif", color: "var(--tx, #e4e4ec)" }}>{tenant.sector ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div style={{ font: "500 9px/1 monospace", color: "var(--tx3, #555568)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", paddingTop: "4px" }}>Activity Timeline</div>
        <div style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr, #252533)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ font: "600 13px sans-serif", color: "var(--tx, #e4e4ec)" }}>Auto-Aggregated from All Systems</h4>
            <span style={{ font: "400 10px sans-serif", color: "var(--tx3, #555568)" }}>{timeline.length} events</span>
          </div>

          {timeline.length === 0 ? (
            <div style={{ padding: "24px 18px", color: "var(--tx3, #555568)", font: "400 12px sans-serif", textAlign: "center" }}>
              No activity recorded yet. Events will appear here as payments are received, letters are sent, and engagements are logged.
            </div>
          ) : timeline.map((event, i, arr) => {
            const typeColorMap: Record<string, string> = {
              payment: event.status === "paid_on_time" ? "green" : "amber",
              letter: "blue",
              engagement: "amber",
              covenant_check: "muted",
            };
            const colorKey = typeColorMap[event.type] ?? "muted";
            const colors = {
              red: { bg: "var(--red-lt, rgba(248,113,113,.07))", color: "var(--red, #f87171)", border: "var(--red-bdr, rgba(248,113,113,.22))" },
              blue: { bg: "rgba(56,189,248,.07)", color: "#38bdf8", border: "rgba(56,189,248,.22)" },
              amber: { bg: "var(--amb-lt, rgba(251,191,36,.07))", color: "var(--amb, #fbbf24)", border: "var(--amb-bdr, rgba(251,191,36,.22))" },
              green: { bg: "var(--grn-lt, rgba(52,211,153,.07))", color: "var(--grn, #34d399)", border: "var(--grn-bdr, rgba(52,211,153,.22))" },
              muted: { bg: "var(--s3, #1f1f28)", color: "var(--tx3, #555568)", border: "var(--bdr, #252533)" },
            };

            const c = colors[colorKey as keyof typeof colors];
            const eventDisplay = {
              type: event.type.toUpperCase().replace(/_/g, " "),
              date: event.date ? new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
              text: `${event.title}${event.description ? ` — ${event.description}` : ""}`,
              color: colorKey,
              badge: undefined as string | undefined,
            };

            return (
              <div key={event.id} style={{ padding: "14px 18px", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--bdr-lt, #1a1a26)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ font: "500 8px/1 monospace", padding: "2px 6px", borderRadius: "4px", background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    {eventDisplay.type}
                  </span>
                  <span style={{ font: "400 10px sans-serif", color: "var(--tx3, #555568)" }}>{eventDisplay.date}</span>
                </div>
                <div style={{ font: "300 12px/1.6 sans-serif", color: eventDisplay.color === "red" ? "var(--red, #f87171)" : eventDisplay.color === "amber" ? "var(--amb, #fbbf24)" : "var(--tx2, #8888a0)" }}>{eventDisplay.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

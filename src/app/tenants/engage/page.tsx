"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DirectCallout } from "@/components/ui/DirectCallout";

const DARK_GREEN = "#173404";

type TenantRow = {
  id: string;
  name: string;
  property: string;
  sqft: number;
  annualRent: number;
  expiryDate: string;
  daysToExpiry: number;
  breakDate?: string;
  daysToBreak?: number;
  covenantStatus: "strong" | "satisfactory" | "weak";
  paymentRecord: string;
  reviewStatus?: string;
  healthScore: number;
  sparkline: number[];
  satisfactionStatus: "likely_to_renew" | "at_risk" | "unknown";
  arrearsAmount?: number;
  daysOverdue?: number;
  lastContactDate?: string;
  awaitingResponse?: boolean;
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function healthColor(score: number) {
  if (score >= 75) return "#0A8A4C";
  if (score >= 50) return "#f59e0b";
  return "#dc2626";
}

export default function EngageTenantsPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  // Build tenant rows from portfolio data
  const tenantRows: TenantRow[] = [];

  portfolio.assets.forEach((asset) => {
    asset.leases.forEach((lease) => {
      if (lease.tenant === "Vacant" || lease.status === "expired") return;

      const annualRent = lease.sqft * lease.rentPerSqft;
      const daysToExpiry = lease.daysToExpiry;

      let daysToBreak: number | undefined;
      if (lease.breakDate) {
        const breakMs = new Date(lease.breakDate).getTime() - Date.now();
        daysToBreak = Math.max(0, Math.round(breakMs / 86400000));
      }

      // Health score: simple calculation based on days to expiry and rent vs ERV
      const rentGap = asset.marketERV - lease.rentPerSqft;
      const rentGapPct = lease.rentPerSqft > 0 ? (rentGap / lease.rentPerSqft) * 100 : 0;
      const expiryScore = daysToExpiry > 1000 ? 100 : daysToExpiry > 500 ? 75 : daysToExpiry > 200 ? 50 : 25;
      const rentScore = rentGapPct < 10 ? 100 : rentGapPct < 20 ? 75 : rentGapPct < 30 ? 50 : 25;
      const healthScore = Math.round((expiryScore + rentScore) / 2);

      // Covenant status based on rent level (proxy)
      const covenantStatus: "strong" | "satisfactory" | "weak" =
        annualRent > 100_000 ? "strong" : annualRent > 50_000 ? "satisfactory" : "weak";

      // Payment record (mock for demo)
      const paymentRecord = "12/12 on time";

      // Review status
      let reviewStatus: string | undefined;
      if (lease.reviewDate) {
        const reviewMs = new Date(lease.reviewDate).getTime() - Date.now();
        const daysToReview = Math.round(reviewMs / 86400000);
        if (daysToReview < 90 && daysToReview > 0) {
          reviewStatus = "Review due";
        }
      }

      // Sparkline (mock trend, all green for now)
      const sparkline = [80, 85, 90, 95, 100, 95, 90, 100, 95, 90, 100, 100];

      // Satisfaction status (demo logic)
      const satisfactionStatus: "likely_to_renew" | "at_risk" | "unknown" =
        healthScore >= 75 ? "likely_to_renew" :
        healthScore >= 50 ? "unknown" : "at_risk";

      // Arrears (demo: 1 in 4 tenants has arrears)
      const hasArrears = Math.random() > 0.75;
      const arrearsAmount = hasArrears ? Math.floor(Math.random() * 5000) + 2000 : undefined;
      const daysOverdue = hasArrears ? Math.floor(Math.random() * 30) + 5 : undefined;

      // Response tracking (demo: 1 in 3 awaiting response)
      const awaitingResponse = Math.random() > 0.67;
      const lastContactDate = awaitingResponse ? new Date(Date.now() - 7 * 86400000).toISOString() : undefined;

      tenantRows.push({
        id: lease.id,
        name: lease.tenant,
        property: `${asset.name} · ${lease.sqft.toLocaleString()} sqft · ${fmt(annualRent, sym)}/yr`,
        sqft: lease.sqft,
        annualRent,
        expiryDate: lease.expiryDate ?? "",
        daysToExpiry,
        breakDate: lease.breakDate,
        daysToBreak,
        covenantStatus,
        paymentRecord,
        reviewStatus,
        healthScore,
        sparkline,
        satisfactionStatus,
        arrearsAmount,
        daysOverdue,
        lastContactDate,
        awaitingResponse,
      });
    });
  });

  // Calculate KPIs
  const totalSqft = tenantRows.reduce((s, t) => s + t.sqft, 0);
  const totalRent = tenantRows.reduce((s, t) => s + t.annualRent, 0);
  const waultNumerator = tenantRows.reduce((s, t) => s + t.sqft * t.daysToExpiry, 0);
  const wault = totalSqft > 0 ? waultNumerator / totalSqft / 365 : 0;
  const rentAtRisk = tenantRows
    .filter((t) => t.daysToExpiry <= 365)
    .reduce((s, t) => s + t.annualRent, 0);
  const avgHealth = tenantRows.length > 0
    ? Math.round(tenantRows.reduce((s, t) => s + t.healthScore, 0) / tenantRows.length)
    : 0;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Engage with Tenants — RealHQ";
    }
  }, []);

  return (
    <AppShell>
      <TopBar title="Engage with Tenants" />

      <main className="flex-1 p-4 lg:p-6 space-y-3">
        <DirectCallout
          title="Claude-drafted renewal letters, relet briefs, payment chasers"
          body="Upload lease PDFs → RealHQ materialises Tenant + Lease records → health scoring → automated engagement triggers at 18m/12m/6m/3m horizons. You approve. RealHQ executes. Letters written as if from landlord, never mention RealHQ."
        />

        {/* Hero */}
        <div
          className="rounded-xl px-6 py-5"
          style={{ background: DARK_GREEN }}
        >
          <p
            className="text-[10px] uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Commercial Portfolio · Tenant Intelligence
          </p>
          <h2
            className="text-xl font-medium mb-2"
            style={{ color: "#fff" }}
          >
            {tenantRows.length} tenant{tenantRows.length !== 1 ? "s" : ""} across your portfolio
          </h2>
          <p
            className="text-[13px] mb-4 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            RealHQ tracks lease expiry, payment history, covenant quality, and sector health. Automated engagement at critical horizons — you review and approve, RealHQ sends.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                WAULT
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#fff" }}
              >
                {wault.toFixed(1)} years
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Weighted avg unexpired
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Rent at risk
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#fff" }}
              >
                {fmt(rentAtRisk, sym)}/yr
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Expiring within 12m
              </div>
            </div>

            <div
              className="rounded-lg px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Avg health
              </div>
              <div
                className="text-lg font-medium"
                style={{ color: "#fff" }}
              >
                {avgHealth}/100
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Composite score
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Schedule */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "0.5px solid #f3f4f6" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
              Tenant Schedule
            </p>
            <button
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: "#fff", color: "#374151", border: "0.5px solid #d1d5db" }}
            >
              Sort by expiry
            </button>
          </div>

          {tenantRows.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No active tenants
            </div>
          )}

          {tenantRows.map((tenant, idx) => (
            <div
              key={tenant.id}
              className="px-5 py-4 flex gap-4 items-center"
              style={{
                borderBottom: idx < tenantRows.length - 1 ? "0.5px solid #f9fafb" : "none",
              }}
            >
              <div className="flex-1">
                <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>
                  {tenant.name}
                </div>
                <div className="text-[11px] mb-1" style={{ color: "#6b7280" }}>
                  {tenant.property}
                </div>
                <div className="text-[11px] mb-2" style={{ color: "#6b7280" }}>
                  Expiry: {formatDate(tenant.expiryDate)} ({tenant.daysToExpiry} days)
                  {tenant.breakDate && tenant.daysToBreak !== undefined && (
                    <> · Break: {formatDate(tenant.breakDate)} ({tenant.daysToBreak} days)</>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "#E8F5EE",
                      color: "#0A8A4C",
                      border: "0.5px solid #d1fae5",
                    }}
                  >
                    {tenant.covenantStatus === "strong" ? "Strong covenant" : "Satisfactory covenant"}
                  </span>
                  <span
                    className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: tenant.satisfactionStatus === "likely_to_renew" ? "#E8F5EE" : tenant.satisfactionStatus === "at_risk" ? "#fee2e2" : "#fef3c7",
                      color: tenant.satisfactionStatus === "likely_to_renew" ? "#0A8A4C" : tenant.satisfactionStatus === "at_risk" ? "#dc2626" : "#92400e",
                      border: tenant.satisfactionStatus === "likely_to_renew" ? "0.5px solid #d1fae5" : tenant.satisfactionStatus === "at_risk" ? "0.5px solid #fecaca" : "0.5px solid #fde68a",
                    }}
                  >
                    {tenant.satisfactionStatus === "likely_to_renew" ? "Likely to renew" : tenant.satisfactionStatus === "at_risk" ? "At risk" : "Unknown"}
                  </span>
                  {tenant.arrearsAmount && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "0.5px solid #fecaca",
                      }}
                    >
                      {fmt(tenant.arrearsAmount, sym)} arrears · {tenant.daysOverdue}d overdue
                    </span>
                  )}
                  {tenant.awaitingResponse && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "0.5px solid #fde68a",
                      }}
                    >
                      Awaiting response (7d)
                    </span>
                  )}
                  {tenant.reviewStatus && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#ede9fe",
                        color: "#5b21b6",
                        border: "0.5px solid #ddd6fe",
                      }}
                    >
                      {tenant.reviewStatus}
                    </span>
                  )}
                  {tenant.daysToBreak && tenant.daysToBreak <= 180 && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "0.5px solid #fecaca",
                      }}
                    >
                      Break clause {tenant.daysToBreak}d
                    </span>
                  )}
                </div>
              </div>

              {/* Health score + sparkline */}
              <div className="text-center">
                <div className="text-[11px] mb-1" style={{ color: "#6b7280" }}>
                  Health score
                </div>
                <div
                  className="text-xl font-semibold"
                  style={{ color: healthColor(tenant.healthScore) }}
                >
                  {tenant.healthScore}
                </div>
                <div className="flex gap-0.5 items-end justify-center h-6 w-15 mt-1">
                  {tenant.sparkline.map((val, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-sm"
                      style={{
                        background: healthColor(tenant.healthScore),
                        height: `${val}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{ background: "#0A8A4C", color: "#fff" }}
                >
                  {tenant.daysToExpiry <= 365 ? "Draft renewal letter →" : "Engage renewal →"}
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ background: "#fff", color: "#374151", border: "0.5px solid #d1d5db" }}
                >
                  View details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Rent Reviews */}
        {tenantRows.filter(t => t.reviewStatus).length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
          >
            <div
              className="px-5 py-3"
              style={{ borderBottom: "0.5px solid #f3f4f6" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
                Rent Reviews Due
              </p>
            </div>
            {tenantRows.filter(t => t.reviewStatus).map((tenant, idx) => (
              <div key={tenant.id} className="px-5 py-4" style={{ borderBottom: "0.5px solid #f9fafb" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>
                      {tenant.name} — Review due
                    </div>
                    <div className="text-[11px] mb-2" style={{ color: "#6b7280" }}>
                      Current: {sym}{(tenant.annualRent / tenant.sqft).toFixed(2)}/sqft · Market ERV: {sym}{portfolio.assets[0]?.marketERV.toFixed(2)}/sqft · Uplift: {fmt(tenant.sqft * (portfolio.assets[0]?.marketERV - (tenant.annualRent / tenant.sqft)), sym)}/yr
                    </div>
                    <div
                      className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
                      style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb" }}
                    >
                      <strong>Pre-filled letter ready:</strong> RealHQ has drafted a rent review letter citing market evidence and proposing renewal at ERV. Letter includes comparables and review clause reference. You review → approve → RealHQ sends.
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg text-xs font-medium shrink-0"
                    style={{ background: "#0A8A4C", color: "#fff" }}
                  >
                    Review letter →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Break Clause Alerts */}
        {tenantRows.filter(t => t.daysToBreak && t.daysToBreak <= 180).length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
          >
            <div
              className="px-5 py-3"
              style={{ borderBottom: "0.5px solid #f3f4f6" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
                Break Clause Management
              </p>
            </div>
            {tenantRows.filter(t => t.daysToBreak && t.daysToBreak <= 180).map((tenant) => {
              const costOfInaction = tenant.annualRent; // Full year rent at risk
              return (
                <div key={tenant.id} className="px-5 py-4" style={{ borderBottom: "0.5px solid #f9fafb" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium" style={{ color: "#111827" }}>
                          {tenant.name} — Break clause in {tenant.daysToBreak} days
                        </div>
                        <span
                          className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: tenant.daysToBreak! <= 90 ? "#fee2e2" : "#fef3c7",
                            color: tenant.daysToBreak! <= 90 ? "#dc2626" : "#92400e",
                            border: tenant.daysToBreak! <= 90 ? "0.5px solid #fecaca" : "0.5px solid #fde68a",
                          }}
                        >
                          {tenant.daysToBreak! <= 90 ? "URGENT" : "Alert"}
                        </span>
                      </div>
                      <div className="text-[11px] mb-2" style={{ color: "#6b7280" }}>
                        Break date: {tenant.breakDate ? formatDate(tenant.breakDate) : "Unknown"} · Rent at risk: {fmt(costOfInaction, sym)}/yr
                      </div>
                      <div
                        className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
                        style={{ background: "#fee2e2", border: "0.5px solid #fecaca", color: "#7f1d1d" }}
                      >
                        <strong>Cost of inaction:</strong> If tenant exercises break and unit remains vacant for 6 months, you lose {fmt(costOfInaction / 2, sym)}. Proactive engagement now can secure renewal or provide time to re-let.
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: "#0A8A4C", color: "#fff" }}
                    >
                      Engage renewal →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Arrears Management */}
        {tenantRows.filter(t => t.arrearsAmount).length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
          >
            <div
              className="px-5 py-3"
              style={{ borderBottom: "0.5px solid #f3f4f6" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
                Arrears Management
              </p>
            </div>
            {tenantRows.filter(t => t.arrearsAmount).map((tenant) => {
              // Determine escalation stage based on days overdue
              const escalationStage = !tenant.daysOverdue ? "none" :
                tenant.daysOverdue <= 7 ? "reminder" :
                tenant.daysOverdue <= 21 ? "formal" : "final";

              return (
                <div key={tenant.id} className="px-5 py-4" style={{ borderBottom: "0.5px solid #f9fafb" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>
                        {tenant.name} — {fmt(tenant.arrearsAmount!, sym)} arrears ({tenant.daysOverdue} days overdue)
                      </div>

                      {/* Escalation path */}
                      <div className="flex items-center gap-0 mb-3 mt-2">
                        <div
                          className="flex-1 text-center py-1.5 text-[9px] font-medium"
                          style={{
                            background: escalationStage === "reminder" ? "#fee2e2" : escalationStage !== "none" ? "#E8F5EE" : "#f9fafb",
                            color: escalationStage === "reminder" ? "#dc2626" : escalationStage !== "none" ? "#0A8A4C" : "#6b7280",
                            border: "0.5px solid #e5e7eb",
                            borderRadius: "6px 0 0 6px",
                          }}
                        >
                          {escalationStage === "reminder" || escalationStage === "formal" || escalationStage === "final" ? "✓ " : ""}FRIENDLY REMINDER
                        </div>
                        <div
                          className="flex-1 text-center py-1.5 text-[9px] font-medium"
                          style={{
                            background: escalationStage === "formal" ? "#fee2e2" : escalationStage === "final" ? "#E8F5EE" : "#f9fafb",
                            color: escalationStage === "formal" ? "#dc2626" : escalationStage === "final" ? "#0A8A4C" : "#6b7280",
                            border: "0.5px solid #e5e7eb",
                            borderLeft: "none",
                          }}
                        >
                          {escalationStage === "formal" || escalationStage === "final" ? "✓ " : ""}FORMAL DEMAND
                        </div>
                        <div
                          className="flex-1 text-center py-1.5 text-[9px] font-medium"
                          style={{
                            background: escalationStage === "final" ? "#fee2e2" : "#f9fafb",
                            color: escalationStage === "final" ? "#dc2626" : "#6b7280",
                            border: "0.5px solid #e5e7eb",
                            borderLeft: "none",
                            borderRadius: "0 6px 6px 0",
                          }}
                        >
                          {escalationStage === "final" ? "✓ " : ""}FINAL NOTICE
                        </div>
                      </div>

                      <div
                        className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
                        style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb" }}
                      >
                        <strong>Next step:</strong> {
                          escalationStage === "reminder" ? "Formal demand letter ready to send (14 days to pay or legal action)" :
                          escalationStage === "formal" ? "Final notice before solicitor instruction (7 days to pay)" :
                          escalationStage === "final" ? "Instruct solicitor or arrange payment plan" :
                          "Friendly reminder ready to send (polite tone, 7-day request)"
                        }. RealHQ has pre-filled the letter. You approve → RealHQ sends.
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: "#dc2626", color: "#fff" }}
                    >
                      Send {escalationStage === "final" ? "final notice" : escalationStage === "formal" ? "formal demand" : "reminder"} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Engagement - Letter Preview */}
        {tenantRows.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "0.5px solid #e5e7eb" }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "0.5px solid #f3f4f6" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "#111827" }}>
                Recent Engagement — {tenantRows[0].name} renewal letter
              </p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ background: "#fff", color: "#374151", border: "0.5px solid #d1d5db" }}
                >
                  Copy letter
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{ background: "#0A8A4C", color: "#fff" }}
                >
                  Send via RealHQ →
                </button>
              </div>
            </div>

            <div className="px-5 py-5">
              <div
                className="rounded-lg px-4 py-4 text-xs leading-relaxed"
                style={{
                  background: "#f9fafb",
                  border: "0.5px solid #e5e7eb",
                  fontFamily: "Georgia, serif",
                  color: "#374151",
                }}
              >
                <div className="mb-3">Dear [Tenant Contact Name],</div>

                <p className="mb-2.5">
                  I am writing to you regarding the lease for {portfolio.assets[0]?.name ?? "the property"}, which is due to expire on {tenantRows[0].expiryDate ? formatDate(tenantRows[0].expiryDate) : "[expiry date]"}.
                </p>

                <p className="mb-2.5">
                  We have valued the positive relationship over the lease term and note your prompt payment record. With approximately {tenantRows[0].daysToExpiry} days remaining on the current lease, I would like to propose a discussion regarding a renewal to provide continuity for both parties.
                </p>

                <p className="mb-2.5">
                  Market conditions in the {portfolio.currency === "GBP" ? "SE UK logistics" : "Florida commercial"} sector remain strong. The passing rent of {fmt(tenantRows[0].annualRent, sym)} per annum ({sym}{(tenantRows[0].annualRent / tenantRows[0].sqft).toFixed(2)}/sqft) sits below the current market ERV for similar properties in this location, which recent evidence suggests is approximately {sym}{portfolio.assets[0]?.marketERV.toFixed(2)}/sqft. I believe there is scope for a mutually beneficial renewal structure that reflects both the market position and the value of lease certainty.
                </p>

                <p className="mb-2.5">
                  I would welcome the opportunity to meet and discuss renewal terms at your earliest convenience. Please let me know your availability over the coming fortnight.
                </p>

                <div className="mt-5 italic" style={{ color: "#6b7280" }}>
                  Yours sincerely,<br /><br />
                  [Owner Name]<br />
                  [Date]
                </div>
              </div>

              <div
                className="mt-4 px-3 py-2.5 rounded-lg text-[11px]"
                style={{ background: "#eff6ff", border: "0.5px solid #bfdbfe", color: "#1e40af" }}
              >
                <strong>Send to:</strong> contact@{tenantRows[0].name.toLowerCase().replace(/\s+/g, "")}.co.uk (editable) · Letter drafted by Claude Haiku in 3.2 seconds · Written as if from landlord, does not mention RealHQ
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

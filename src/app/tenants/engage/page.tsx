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
  if (score >= 75) return "#059669";
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

                <div className="flex items-center gap-2">
                  <span
                    className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "#f0fdf4",
                      color: "#065f46",
                      border: "0.5px solid #d1fae5",
                    }}
                  >
                    {tenant.covenantStatus === "strong" ? "Strong covenant" : "Satisfactory covenant"}
                  </span>
                  <span
                    className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "#f0fdf4",
                      color: "#065f46",
                      border: "0.5px solid #d1fae5",
                    }}
                  >
                    {tenant.paymentRecord}
                  </span>
                  {tenant.reviewStatus && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "0.5px solid #fde68a",
                      }}
                    >
                      {tenant.reviewStatus}
                    </span>
                  )}
                  {tenant.daysToExpiry <= 365 && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#ede9fe",
                        color: "#5b21b6",
                        border: "0.5px solid #ddd6fe",
                      }}
                    >
                      Renewal trigger 12m
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

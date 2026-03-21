"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArcaDirectCallout } from "@/components/ui/ArcaDirectCallout";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import { Portfolio } from "@/lib/data/types";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

// ── Health score (0–100) derived from days to expiry ─────────────────────────
function healthScore(daysToExpiry: number, status: string): number {
  if (status === "expired" || daysToExpiry === 0) return 0;
  if (daysToExpiry < 180) return Math.round(25 + (daysToExpiry / 180) * 20);
  if (daysToExpiry < 365) return Math.round(45 + ((daysToExpiry - 180) / 185) * 20);
  if (daysToExpiry < 730) return Math.round(65 + ((daysToExpiry - 365) / 365) * 20);
  return Math.min(97, Math.round(85 + ((daysToExpiry - 730) / 365) * 12));
}

function renewalProbability(daysToExpiry: number, status: string): number {
  if (status === "expired") return 0;
  if (daysToExpiry < 180) return Math.round(40 + (daysToExpiry / 180) * 20);
  if (daysToExpiry < 365) return Math.round(60 + ((daysToExpiry - 180) / 185) * 15);
  return Math.min(95, Math.round(75 + ((daysToExpiry - 365) / 730) * 20));
}

function scoreColor(score: number) {
  if (score >= 75) return { bg: "#F0FDF4", border: "#0A8A4C40", text: "#0A8A4C", label: "green" };
  if (score >= 50) return { bg: "#FFFBEB", border: "#F5A94A40", text: "#D97706", label: "amber" };
  return { bg: "#FEF2F2", border: "#DC262640", text: "#DC2626", label: "red" };
}

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDays(days: number) {
  if (days <= 0) return "Expired";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

// ── Sparkline (static 12-month payment history) ───────────────────────────────
function PaymentSparkline({ status }: { status: string }) {
  const bars = Array.from({ length: 12 }, (_, i) => {
    // Expired tenants might have missed recent payments
    const missed = status === "expired" && i >= 9;
    return missed ? 0.3 : 1;
  });

  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm"
          style={{
            height: `${h * 100}%`,
            backgroundColor: h === 1 ? "#0A8A4C" : "#DC2626",
            opacity: 0.7 + i * 0.025,
          }}
        />
      ))}
    </div>
  );
}

// ── Tenant data shape ─────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  tenant: string;
  assetId: string;
  assetName: string;
  sqft: number;
  rentPerSqft: number;
  annualRent: number;
  startDate: string;
  expiryDate: string;
  daysToExpiry: number;
  leaseStatus: string;
  healthScore: number;
  renewalProbability: number;
  currency: string;
  sym: string;
  portfolio: string;
  breakDate?: string;
  reviewDate?: string;
}

function buildTenants(portfolioData: Portfolio): TenantRow[] {
  const sym = portfolioData.currency === "USD" ? "$" : "£";
  const portfolioKey = portfolioData.id;
  const rows: TenantRow[] = [];

  for (const asset of portfolioData.assets) {
    for (const lease of asset.leases) {
      if (lease.tenant === "Vacant" || lease.tenant.startsWith("Vacant")) continue;
      const score = healthScore(lease.daysToExpiry, lease.status);
      rows.push({
        id: lease.id,
        tenant: lease.tenant,
        assetId: asset.id,
        assetName: asset.name,
        sqft: lease.sqft,
        rentPerSqft: lease.rentPerSqft,
        annualRent: lease.sqft * lease.rentPerSqft,
        startDate: lease.startDate,
        expiryDate: lease.expiryDate,
        daysToExpiry: lease.daysToExpiry,
        leaseStatus: lease.status,
        healthScore: score,
        renewalProbability: renewalProbability(lease.daysToExpiry, lease.status),
        currency: portfolioData.currency,
        sym,
        portfolio: portfolioKey as "fl-mixed" | "se-logistics",
        breakDate: (lease as { breakDate?: string }).breakDate,
        reviewDate: (lease as { reviewDate?: string }).reviewDate,
      });
    }
  }

  return rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

// ── Row component ─────────────────────────────────────────────────────────────
function TenantRow({ row }: { row: TenantRow }) {
  const [open, setOpen] = useState(false);
  const c = scoreColor(row.healthScore);

  return (
    <div style={{ borderBottom: "1px solid #E5E7EB" }}>
      {/* Main row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 gap-3 transition-colors hover:bg-[#F9FAFB] text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Health score bar */}
          <div className="h-10 w-1 rounded-full shrink-0" style={{ backgroundColor: c.text }} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-medium" style={{ color: "#111827" }}>{row.tenant}</span>
              {row.leaseStatus === "expiring_soon" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#F5A94A20", color: "#F5A94A" }}
                >
                  Expiring soon
                </span>
              )}
              {row.leaseStatus === "expired" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#DC262620", color: "#DC2626" }}
                >
                  Expired
                </span>
              )}
              {row.breakDate && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: "#1647E820", color: "#6699ff" }}
                >
                  Break clause
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              {row.assetName} · {row.sqft.toLocaleString()} sqft · {row.sym}{row.rentPerSqft}/sqft/yr
            </div>
            {/* Mobile-only key metrics shown inline */}
            <div className="flex items-center gap-2 mt-1 sm:hidden">
              <span className="text-xs font-semibold" style={{ color: "#111827", fontFamily: SERIF }}>{fmt(row.annualRent, row.sym)}/yr</span>
              <span style={{ color: "#D1D5DB" }}>·</span>
              <span className="text-xs font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "#6B7280" }}>
                {fmtDays(row.daysToExpiry)} to expiry
              </span>
            </div>
          </div>
        </div>

        {/* Right side metrics */}
        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          {/* Annual rent */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold" style={{ color: "#111827", fontFamily: SERIF }}>
              {fmt(row.annualRent, row.sym)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>annual rent</div>
          </div>

          {/* Expiry */}
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "#6B7280" }}>
              {fmtDays(row.daysToExpiry)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              {row.expiryDate ? row.expiryDate.slice(0, 7) : "—"}
            </div>
          </div>

          {/* Health score badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
          >
            <span className="text-sm font-bold" style={{ color: c.text, fontFamily: SERIF }}>{row.healthScore}</span>
            <span className="text-xs" style={{ color: c.text, opacity: 0.7 }}>/100</span>
          </div>

          {/* Chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="shrink-0 transition-transform duration-150"
            style={{ color: "#D1D5DB", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div
          className="px-5 pb-5 pt-1"
          style={{ backgroundColor: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Lease start</div>
              <div className="text-sm font-medium" style={{ color: "#6B7280" }}>{row.startDate || "—"}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Lease expiry</div>
              <div className="text-sm font-medium" style={{ color: row.daysToExpiry < 365 ? "#F5A94A" : "#6B7280" }}>
                {row.expiryDate || "—"}
              </div>
            </div>
            {row.breakDate && (
              <div>
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Break clause</div>
                <div className="text-sm font-medium" style={{ color: "#6699ff" }}>{row.breakDate}</div>
              </div>
            )}
            {row.reviewDate && (
              <div>
                <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Rent review</div>
                <div className="text-sm font-medium" style={{ color: "#6B7280" }}>{row.reviewDate}</div>
              </div>
            )}
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Renewal probability</div>
              <div className="text-sm font-bold" style={{ color: c.text, fontFamily: SERIF }}>
                {row.renewalProbability}%
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Passing rent (pa)</div>
              <div className="text-sm font-bold" style={{ color: "#111827", fontFamily: SERIF }}>
                {fmt(row.annualRent, row.sym)}
              </div>
            </div>
          </div>

          {/* Payment history sparkline */}
          <div>
            <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>12-month payment history</div>
            <div className="flex items-end gap-3">
              <PaymentSparkline status={row.leaseStatus} />
              <span className="text-xs pb-0.5" style={{ color: row.leaseStatus === "expired" ? "#DC2626" : "#0A8A4C" }}>
                {row.leaseStatus === "expired" ? "Payments lapsed" : "All payments on time"}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex items-center gap-3">
            {row.daysToExpiry < 365 && row.daysToExpiry > 0 && (
              <button
                onClick={() => fetch("/api/leads/tenant-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "Engage on renewal", tenantName: row.tenant, assetName: row.assetName, leaseExpiry: row.expiryDate, passingRent: fmt(row.annualRent, row.sym) }) }).catch(() => {})}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#1647E8", color: "#fff" }}
              >
                Engage on renewal →
              </button>
            )}
            {row.daysToExpiry === 0 && (
              <button
                onClick={() => fetch("/api/leads/tenant-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "Re-letting required", tenantName: row.tenant, assetName: row.assetName, leaseExpiry: row.expiryDate, passingRent: fmt(row.annualRent, row.sym) }) }).catch(() => {})}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#DC2626", color: "#fff" }}
              >
                Re-letting required →
              </button>
            )}
            {row.breakDate && (
              <button
                onClick={() => fetch("/api/leads/tenant-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "Review break clause", tenantName: row.tenant, assetName: row.assetName, leaseExpiry: row.breakDate }) }).catch(() => {})}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#E5E7EB", color: "#6699ff" }}
              >
                Review break clause →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio: portfolioData, loading: customLoading } = usePortfolio(portfolioId);

  const [userTenants, setUserTenants] = useState<TenantRow[]>([]);
  const [userTenantsLoading, setUserTenantsLoading] = useState(false);
  const [userTenantsLoaded, setUserTenantsLoaded] = useState(false);
  useEffect(() => {
    if (portfolioId !== "user") return;
    setUserTenantsLoading(true);
    fetch("/api/user/lease-summary")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasLeases) {
          setUserTenants([]);
          return;
        }
        const rows: TenantRow[] = (data.leases ?? []).map(
          (l: {
            id: string;
            tenant: string;
            propertyAddress: string | null;
            sqft: number;
            passingRent: number;
            startDate: string | null;
            expiryDate: string | null;
            breakClause: string | null;
            daysToExpiry: number | null;
            status: string;
          }) => {
            const days = l.daysToExpiry ?? 9999;
            const score = healthScore(days, l.status);
            return {
              id: l.id,
              tenant: l.tenant,
              assetId: l.id,
              assetName: l.propertyAddress ?? "Unknown property",
              sqft: l.sqft,
              rentPerSqft: l.sqft > 0 ? l.passingRent / l.sqft : 0,
              annualRent: l.passingRent,
              startDate: l.startDate ?? "",
              expiryDate: l.expiryDate ?? "",
              daysToExpiry: days,
              leaseStatus: l.status,
              healthScore: score,
              renewalProbability: renewalProbability(days, l.status),
              currency: "GBP",
              sym: "£",
              portfolio: "user",
              breakDate: l.breakClause ?? undefined,
            } satisfies TenantRow;
          }
        );
        setUserTenants(rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry));
      })
      .catch(() => setUserTenants([]))
      .finally(() => { setUserTenantsLoading(false); setUserTenantsLoaded(true); });
  }, [portfolioId]);

  const sym = portfolioId === "user" ? "£" : (portfolioData.currency === "USD" ? "$" : "£");
  const tenants = portfolioId === "user" ? userTenants : buildTenants(portfolioData);

  const isUserMode = portfolioId === "user";
  const isLoading = loading || customLoading || (isUserMode && userTenantsLoading);

  const atRisk = tenants.filter((t) => t.daysToExpiry > 0 && t.daysToExpiry < 365);
  const expired = tenants.filter((t) => t.leaseStatus === "expired" || t.daysToExpiry === 0);
  const revenueAtRisk = atRisk.reduce((s, t) => s + t.annualRent, 0);

  const avgHealth = tenants.length
    ? Math.round(tenants.reduce((s, t) => s + t.healthScore, 0) / tenants.length)
    : 0;
  const avgC = scoreColor(avgHealth);

  return (
    <AppShell>
      <TopBar title="Tenant Intelligence" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">

        {/* Page Hero */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title="Tenant Intelligence"
            cells={[
              { label: "Tenants", value: `${tenants.length}`, sub: `Across ${new Set(tenants.map((t) => t.assetId)).size} assets` },
              { label: "Avg Health Score", value: `${avgHealth}/100`, valueColor: avgC.text, sub: avgHealth >= 75 ? "Portfolio in good shape" : avgHealth >= 50 ? "Moderate renewal risk" : "High renewal risk" },
              { label: "Expiring ≤12mo", value: `${atRisk.length}`, valueColor: atRisk.length > 0 ? "#F5A94A" : "#0A8A4C", sub: atRisk.length > 0 ? `${fmt(revenueAtRisk, sym)}/yr at risk` : "No near-term expiries" },
              { label: "Revenue at Risk", value: `${fmt(revenueAtRisk, sym)}/yr`, valueColor: revenueAtRisk > 0 ? "#F5A94A" : "#0A8A4C", sub: "From leases expiring <12mo" },
            ]}
          />
        )}

        {/* Issue / Cost / Arca Action bar */}
        {!isLoading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <div className="text-xs" style={{ color: "#6B7280" }}>
              <span style={{ color: atRisk.length > 0 ? "#F5A94A" : "#0A8A4C", fontWeight: 600 }}>Issue:</span>{" "}
              {atRisk.length > 0
                ? `${atRisk.length} tenant${atRisk.length !== 1 ? "s" : ""} at risk of non-renewal in the next 12 months`
                : "No tenants expiring within 12 months"}
              {atRisk.length > 0 && (
                <>
                  {" "}·{" "}
                  <span style={{ color: "#DC2626", fontWeight: 600 }}>Cost:</span>{" "}
                  <span style={{ color: "#DC2626" }}>{fmt(revenueAtRisk, sym)}/yr</span> passing rent at risk of vacancy ·{" "}
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
                  proactive tenant engagement, rent review advisory, and re-letting — earns 8–10% of uplift or contract value
                </>
              )}
              {atRisk.length === 0 && (
                <>
                  {" "}·{" "}
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
                  monitors lease events and flags renewal windows 12+ months ahead
                </>
              )}
            </div>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!isLoading && (
          <ArcaDirectCallout
            title="RealHQ triggers rent reviews at the optimal window — not when it's too late"
            body={`RealHQ monitors every lease event and engages tenants 12+ months before expiry to avoid void risk. ${atRisk.length > 0 ? `${atRisk.length} tenants need attention now.` : "All leases currently within safe renewal windows."} 8% of first-year uplift, success-only.`}
          />
        )}

        {/* Insight bar */}
        {!isLoading && atRisk.length > 0 && (
          <div
            className="rounded-xl px-5 py-3 flex items-center gap-3"
            style={{ backgroundColor: "#1f1a0d", border: "1px solid #F5A94A30" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M8 2L2 13H14L8 2Z" stroke="#F5A94A" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 7V9.5" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.75" fill="#F5A94A" />
            </svg>
            <span className="text-xs font-medium" style={{ color: "#F5A94A" }}>
              {atRisk.length} tenant{atRisk.length !== 1 ? "s" : ""} at risk of non-renewal in next 12 months
              {" "}— {fmt(revenueAtRisk, sym)}/yr passing rent exposed
              {expired.length > 0 && ` · ${expired.length} space${expired.length !== 1 ? "s" : ""} currently vacant`}
            </span>
          </div>
        )}

        {/* Tenant list */}
        {isLoading ? (
          <CardSkeleton rows={6} />
        ) : isUserMode && userTenantsLoaded && tenants.length === 0 ? (
          <div
            className="rounded-xl px-6 py-10 flex flex-col items-center gap-3 text-center"
            style={{ backgroundColor: "#F9FAFB", border: "1px dashed #D1D5DB" }}
          >
            <div className="text-2xl">📄</div>
            <div className="text-sm font-semibold" style={{ color: "#111827" }}>No lease data yet</div>
            <div className="text-xs max-w-xs" style={{ color: "#6B7280" }}>
              Upload your first lease from Rent Clock to see tenant analysis, lease health scores, and expiry tracking.
            </div>
            <Link
              href="/rent-clock"
              className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              Go to Rent Clock →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader
                title="All Tenants"
                subtitle={`${tenants.length} leases · sorted by expiry`}
              />
            </div>

            {/* Column headers */}
            <div
              className="hidden md:flex items-center px-5 py-2 text-xs gap-3"
              style={{ color: "#D1D5DB", borderBottom: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}
            >
              <div className="w-1 shrink-0" />
              <div className="flex-1 pl-3">Tenant · Asset</div>
              <div className="w-28 text-right">Annual rent</div>
              <div className="w-20 text-right">Expiry</div>
              <div className="w-24 text-right pr-1">Health</div>
              <div className="w-4" />
            </div>

            <div>
              {tenants.map((row) => (
                <TenantRow key={row.id} row={row} />
              ))}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

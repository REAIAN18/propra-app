"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio, Lease, Asset } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

function daysToYears(days: number) {
  const yrs = days / 365;
  if (yrs < 1) return `${Math.round(days / 30)}m`;
  return `${yrs.toFixed(1)}y`;
}

function urgencyColor(days: number, status: string) {
  if (status === "expired" || days === 0) return "#f06040";
  if (days < 90) return "#f06040";
  if (days < 365) return "#F5A94A";
  return "#0A8A4C";
}

function urgencyBg(days: number, status: string) {
  if (status === "expired" || days === 0) return "#2e0f0a";
  if (days < 90) return "#2e0f0a";
  if (days < 365) return "#2e1e0a";
  return "#0f2a1c";
}

function leaseAction(lease: Lease): { label: string; color: string } {
  if (lease.status === "expired" || (lease.tenant === "Vacant" && lease.daysToExpiry === 0)) {
    return { label: "Market Unit", color: "#f06040" };
  }
  if (lease.daysToExpiry < 90) return { label: "Prepare Review", color: "#f06040" };
  if (lease.daysToExpiry < 365) return { label: "Prepare Review", color: "#F5A94A" };
  if (lease.breakDate) return { label: "Monitor Break", color: "#1647E8" };
  return { label: "On Track", color: "#3d5a72" };
}

type LeaseWithAsset = { lease: Lease; asset: Asset };

export default function RentClockPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  // Flatten all leases with asset reference, sorted by urgency
  const allLeases: LeaseWithAsset[] = portfolio.assets
    .flatMap((asset) => asset.leases.map((lease) => ({ lease, asset })))
    .sort((a, b) => {
      // Vacant/expired first, then by days ascending
      if (a.lease.tenant === "Vacant") return -1;
      if (b.lease.tenant === "Vacant") return 1;
      return a.lease.daysToExpiry - b.lease.daysToExpiry;
    });

  // KPI calculations
  const occupiedLeases = allLeases.filter(
    ({ lease }) => lease.tenant !== "Vacant" && lease.daysToExpiry > 0
  );

  const expiringUrgent = occupiedLeases.filter(({ lease }) => lease.daysToExpiry < 90).length;
  const expiringSoon = occupiedLeases.filter(
    ({ lease }) => lease.daysToExpiry >= 90 && lease.daysToExpiry < 365
  ).length;

  // WAULT: weighted average unexpired lease term by sqft
  const waultNumerator = occupiedLeases.reduce(
    (s, { lease }) => s + lease.sqft * lease.daysToExpiry,
    0
  );
  const waultDenominator = occupiedLeases.reduce((s, { lease }) => s + lease.sqft, 0);
  const waultYears = waultDenominator > 0 ? waultNumerator / waultDenominator / 365 : 0;

  // ERV reversion: total annual uplift if all passing rents moved to ERV
  const totalERVReversion = portfolio.assets.reduce((sum, asset) => {
    const gap = Math.max(0, asset.marketERV - asset.passingRent);
    const occupiedSqft = asset.leases
      .filter((l) => l.tenant !== "Vacant" && l.rentPerSqft > 0)
      .reduce((s, l) => s + l.sqft, 0);
    return sum + gap * occupiedSqft;
  }, 0);

  const arcaFee = totalERVReversion * 0.1;

  const vacantCount = allLeases.filter(
    ({ lease }) => lease.tenant === "Vacant" || (lease.status === "expired" && lease.daysToExpiry === 0)
  ).length;

  // Group back by asset for display, but keep sorted by most urgent lease per asset
  const assetGroups = portfolio.assets
    .map((asset) => ({
      asset,
      leases: asset.leases.slice().sort((a, b) => {
        if (a.tenant === "Vacant") return -1;
        if (b.tenant === "Vacant") return 1;
        return a.daysToExpiry - b.daysToExpiry;
      }),
      mostUrgentDays: Math.min(
        ...asset.leases.map((l) => (l.tenant === "Vacant" ? 0 : l.daysToExpiry))
      ),
    }))
    .sort((a, b) => a.mostUrgentDays - b.mostUrgentDays);

  const [actioned, setActioned] = useState<Set<string>>(new Set());

  return (
    <AppShell>
      <TopBar title="Rent Clock" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard
              label="Expiring < 90 days"
              value={`${expiringUrgent}`}
              sub={vacantCount > 0 ? `+ ${vacantCount} vacant unit${vacantCount > 1 ? "s" : ""}` : `${expiringSoon} more <1yr`}
              accent={expiringUrgent > 0 ? "red" : "green"}
              trend={expiringUrgent > 0 ? "down" : "up"}
              trendLabel={expiringUrgent > 0 ? "Immediate action needed" : "No urgent expiries"}
            />
            <MetricCard
              label="WAULT"
              value={`${waultYears.toFixed(1)}y`}
              sub="Weighted avg unexpired term"
              accent={waultYears >= 4 ? "green" : waultYears >= 2 ? "amber" : "red"}
              trendLabel={waultYears >= 4 ? "Strong lease length" : waultYears >= 2 ? "Review pipeline building" : "Short book — act now"}
            />
            <MetricCard
              label="ERV Reversion"
              value={fmt(totalERVReversion, sym)}
              sub="Annual uplift at market rents"
              accent="amber"
              trend="up"
              trendLabel="Available via rent review"
            />
            <MetricCard
              label="Arca Fee"
              value={fmt(arcaFee, sym)}
              sub="10% of first-year uplift"
              accent="green"
            />
          </div>
        )}

        {/* Issue context bar */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {expiringUrgent + expiringSoon} leases expiring within 12 months
              {totalERVReversion > 0 && (
                <>
                  {" "}·{" "}
                  <span style={{ color: "#F5A94A", fontWeight: 600 }}>Cost:</span>{" "}
                  {fmt(totalERVReversion, sym)}/yr passing rents below ERV
                </>
              )}
              {" "}·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
              prepares rent review, instructs agent, captures reversion
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#f06040" }} /> &lt;90d
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#F5A94A" }} /> &lt;1yr
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a7a96" }}>
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#0A8A4C" }} /> Current
              </div>
            </div>
          </div>
        )}

        {/* Lease table — per asset */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Lease Register"
                subtitle={`${allLeases.length} leases · ${portfolio.assets.length} assets`}
              />
            </div>

            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {assetGroups.map(({ asset, leases }) => {
                const ervGap = Math.max(0, asset.marketERV - asset.passingRent);
                const occupiedSqft = leases
                  .filter((l) => l.tenant !== "Vacant" && l.rentPerSqft > 0)
                  .reduce((s, l) => s + l.sqft, 0);
                const annualReversion = ervGap * occupiedSqft;

                return (
                  <div key={asset.id}>
                    {/* Asset header */}
                    <div
                      className="flex items-center justify-between px-5 py-3"
                      style={{ backgroundColor: "#0d1825", borderBottom: "1px solid #1a2d45" }}
                    >
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                          {asset.name}
                        </span>
                        <span className="text-xs ml-2" style={{ color: "#5a7a96" }}>
                          {asset.location} · {asset.type}
                        </span>
                      </div>
                      {annualReversion > 0 && (
                        <div className="text-xs" style={{ color: "#F5A94A" }}>
                          {fmt(annualReversion, sym)}/yr reversion potential
                        </div>
                      )}
                    </div>

                    {/* Lease rows */}
                    {leases.map((lease) => {
                      const isVacant = lease.tenant === "Vacant" || (lease.status === "expired" && lease.daysToExpiry === 0);
                      const color = urgencyColor(lease.daysToExpiry, lease.status);
                      const bg = urgencyBg(lease.daysToExpiry, lease.status);
                      const action = leaseAction(lease);
                      const annualRent = lease.rentPerSqft * lease.sqft;
                      const annualERV = asset.marketERV * lease.sqft;
                      const rentGap = Math.max(0, annualERV - annualRent);
                      const gapPct = lease.rentPerSqft > 0
                        ? Math.round(((asset.marketERV - lease.rentPerSqft) / lease.rentPerSqft) * 100)
                        : 0;
                      // Progress bar: 0 = 0 days, full = 1825 days (5yr horizon)
                      const barPct = Math.min(100, (lease.daysToExpiry / 1825) * 100);
                      const isActioned = actioned.has(lease.id);

                      return (
                        <div
                          key={lease.id}
                          className="px-5 py-4 transition-colors hover:bg-[#0d1825]"
                          style={{ borderBottom: "1px solid #111e2e" }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: urgency dot + tenant info */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div
                                className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: bg }}
                              >
                                {isVacant ? (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.5" />
                                    <path d="M6 3.5V6L7.5 7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium" style={{ color: isVacant ? "#5a7a96" : "#e8eef5" }}>
                                    {isVacant ? "Vacant unit" : lease.tenant}
                                  </span>
                                  {!isVacant && (
                                    <Badge
                                      variant={
                                        lease.daysToExpiry < 90 ? "red" :
                                        lease.daysToExpiry < 365 ? "amber" : "green"
                                      }
                                    >
                                      {isVacant ? "Vacant" : lease.daysToExpiry < 90 ? "Critical" : lease.daysToExpiry < 365 ? "Expiring" : "Current"}
                                    </Badge>
                                  )}
                                  {isVacant && <Badge variant="red">Vacant</Badge>}
                                </div>

                                {/* Countdown bar */}
                                {!isVacant && (
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs" style={{ color: "#5a7a96" }}>
                                        {lease.sqft.toLocaleString()} sqft · expires {lease.expiryDate}
                                        {lease.breakDate && (
                                          <span style={{ color: "#1647E8" }}> · break {lease.breakDate}</span>
                                        )}
                                      </span>
                                      <span className="text-xs font-semibold" style={{ color }}>
                                        {daysToYears(lease.daysToExpiry)} remaining
                                      </span>
                                    </div>
                                    <div className="h-1 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${barPct}%`, backgroundColor: color }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {isVacant && (
                                  <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>
                                    {lease.sqft.toLocaleString()} sqft · no income · ERV {sym}{asset.marketERV}/sqft
                                  </div>
                                )}

                                {/* Rent vs ERV */}
                                {!isVacant && lease.rentPerSqft > 0 && (
                                  <div className="flex items-center gap-4 text-xs mt-1">
                                    <div>
                                      <span style={{ color: "#5a7a96" }}>Passing </span>
                                      <span style={{ color: "#e8eef5", fontWeight: 600 }}>{sym}{lease.rentPerSqft}/sqft</span>
                                    </div>
                                    <div>
                                      <span style={{ color: "#5a7a96" }}>ERV </span>
                                      <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{sym}{asset.marketERV}/sqft</span>
                                    </div>
                                    {rentGap > 0 && (
                                      <div style={{ color: "#F5A94A" }}>
                                        <span className="font-semibold">{fmt(rentGap, sym)}/yr</span>
                                        <span className="ml-1">below market{gapPct > 0 ? ` (${gapPct}%)` : ""}</span>
                                      </div>
                                    )}
                                    {rentGap === 0 && (
                                      <div style={{ color: "#0A8A4C" }}>At market</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: action button */}
                            <div className="shrink-0">
                              {isActioned ? (
                                <div
                                  className="text-xs font-medium px-3 py-1.5 rounded-md"
                                  style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
                                >
                                  Arca instructed ✓
                                </div>
                              ) : action.label === "On Track" ? (
                                <div className="text-xs px-3 py-1.5 rounded-md" style={{ color: "#3d5a72" }}>
                                  On track
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActioned((prev) => new Set([...prev, lease.id]))}
                                  className="text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 hover:opacity-80 active:scale-95 whitespace-nowrap"
                                  style={{
                                    backgroundColor: action.color === "#3d5a72" ? "#1a2d45" : action.color,
                                    color: "#fff",
                                  }}
                                >
                                  {action.label}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

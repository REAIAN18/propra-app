"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton, MetricCardSkeleton } from "@/components/ui/Skeleton";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const TYPE_LABELS: Record<string, string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  mixed: "Mixed-Use",
  warehouse: "Warehouse",
  flex: "Flex",
};

const TYPE_COLORS: Record<string, string> = {
  office: "#1647E8",
  retail: "#D97706",
  industrial: "#6366F1",
  mixed: "#0891B2",
  warehouse: "#059669",
  flex: "#DC2626",
};

export default function AssetsPage() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalValue = portfolio.assets.reduce((s, a) => {
    const v = a.currency === "USD" ? (a.valuationUSD ?? 0) : (a.valuationGBP ?? 0);
    return s + v;
  }, 0);
  const totalGross = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const avgOccupancy = portfolio.assets.length
    ? Math.round(portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length)
    : 0;
  const totalOpps = portfolio.assets.reduce((s, a) => s + a.additionalIncomeOpportunities.length, 0);

  if (loading || customLoading) {
    return (
      <AppShell>
        <TopBar title="Properties" />
        <main className="flex-1 p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
          <CardSkeleton rows={5} />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Properties" />
      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-5">

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Portfolio Value", value: fmt(totalValue, sym), sub: `${portfolio.assets.length} assets` },
            { label: "Gross Income", value: `${fmt(totalGross, sym)}/yr`, sub: "Annual across portfolio" },
            { label: "Avg Occupancy", value: `${avgOccupancy}%`, sub: "Weighted by sqft" },
            { label: "Income Opportunities", value: `${totalOpps}`, sub: "Across all assets" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>{kpi.label}</div>
              <div className="text-2xl font-bold leading-none mb-1" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{kpi.value}</div>
              <div className="text-xs" style={{ color: "#6B7280" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Assets table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#111827" }}>All Properties</h2>
              <p className="text-sm mt-0.5" style={{ color: "#9CA3AF" }}>{portfolio.name} · {portfolio.assets.length} assets</p>
            </div>
            <Link
              href="/properties/add"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              + Add property
            </Link>
          </div>

          {/* Header row */}
          <div className="hidden lg:grid px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", color: "#9CA3AF", borderBottom: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
            <span>Property</span>
            <span>Type</span>
            <span className="text-right">Value</span>
            <span className="text-right">Gross Income</span>
            <span className="text-right">Occupancy</span>
            <span className="text-right">Opportunities</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
            {portfolio.assets.map((asset) => {
              const val = asset.currency === "USD" ? (asset.valuationUSD ?? 0) : (asset.valuationGBP ?? 0);
              const oppCount = asset.additionalIncomeOpportunities.length;
              const expiringLeases = asset.leases.filter(l => l.daysToExpiry < 90).length;
              const typeColor = TYPE_COLORS[asset.type] ?? "#6B7280";

              return (
                <div
                  key={asset.id}
                  className="px-5 py-4 lg:grid transition-colors hover:bg-[#F9FAFB]"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", alignItems: "center" }}
                >
                  {/* Name + location */}
                  <div className="mb-2 lg:mb-0">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="text-sm font-semibold hover:underline underline-offset-2"
                      style={{ color: "#111827" }}
                    >
                      {asset.name}
                    </Link>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{asset.location}</div>
                    {expiringLeases > 0 && (
                      <div className="mt-1">
                        <Badge variant="red">{expiringLeases} lease{expiringLeases > 1 ? "s" : ""} expiring</Badge>
                      </div>
                    )}
                  </div>

                  {/* Mobile grid: 3-col for key stats */}
                  <div className="grid grid-cols-3 gap-2 lg:contents text-xs">
                    {/* Type */}
                    <div className="lg:block">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
                      >
                        {TYPE_LABELS[asset.type] ?? asset.type}
                      </span>
                    </div>

                    {/* Value */}
                    <div className="lg:text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wide lg:hidden mb-0.5" style={{ color: "#9CA3AF" }}>Value</div>
                      <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                        {val > 0 ? fmt(val, sym) : "—"}
                      </span>
                    </div>

                    {/* Gross Income */}
                    <div className="lg:text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wide lg:hidden mb-0.5" style={{ color: "#9CA3AF" }}>Income</div>
                      <span className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>
                        {fmt(asset.grossIncome, sym)}/yr
                      </span>
                    </div>

                    {/* Occupancy */}
                    <div className="lg:text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wide lg:hidden mb-0.5" style={{ color: "#9CA3AF" }}>Occupancy</div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: asset.occupancy >= 90 ? "#0A8A4C" : asset.occupancy >= 70 ? "#D97706" : "#DC2626" }}
                      >
                        {asset.occupancy}%
                      </span>
                    </div>

                    {/* Opportunities */}
                    <div className="lg:text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wide lg:hidden mb-0.5" style={{ color: "#9CA3AF" }}>Opps</div>
                      <span className="text-sm" style={{ color: oppCount > 0 ? "#0A8A4C" : "#9CA3AF" }}>
                        {oppCount > 0 ? `${oppCount} identified` : "—"}
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="lg:text-right">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="text-xs font-semibold transition-colors hover:underline"
                        style={{ color: "#1647E8" }}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 flex items-center justify-between text-xs" style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
            <span style={{ color: "#9CA3AF" }}>{portfolio.assets.length} properties · demo data</span>
            <Link href="/properties/add" className="font-semibold transition-colors hover:underline" style={{ color: "#0A8A4C" }}>
              + Add your properties →
            </Link>
          </div>
        </div>

      </main>
    </AppShell>
  );
}

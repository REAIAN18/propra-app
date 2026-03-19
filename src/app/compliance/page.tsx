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
import { Portfolio, ComplianceItem } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}

function urgencyColor(days: number, status: ComplianceItem["status"]) {
  if (status === "expired") return "#f06040";
  if (days <= 30) return "#f06040";
  if (days <= 90) return "#F5A94A";
  return "#0A8A4C";
}

function urgencyVariant(days: number, status: ComplianceItem["status"]): "red" | "amber" | "green" | "gray" {
  if (status === "expired") return "red";
  if (days <= 30) return "red";
  if (days <= 90) return "amber";
  return "green";
}

export default function CompliancePage() {
  const { portfolioId } = useNav();
  const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set());
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const allItems = portfolio.assets.flatMap((a) =>
    a.compliance.map((c) => ({ ...c, assetName: a.name, assetLocation: a.location, assetId: a.id }))
  );

  const totalFineExposure = allItems
    .filter((c) => !renewedIds.has(c.id) && (c.status === "expiring_soon" || c.status === "expired"))
    .reduce((s, c) => s + c.fineExposure, 0);

  const expiredCount = allItems.filter((c) => !renewedIds.has(c.id) && c.status === "expired").length;
  const expiringSoonCount = allItems.filter((c) => !renewedIds.has(c.id) && c.status === "expiring_soon").length;
  const validCount = allItems.filter((c) => renewedIds.has(c.id) || c.status === "valid").length;
  const totalCount = allItems.length;

  const sortedItems = [...allItems].sort((a, b) => {
    const aRenewed = renewedIds.has(a.id);
    const bRenewed = renewedIds.has(b.id);
    if (aRenewed !== bRenewed) return aRenewed ? 1 : -1;
    if (a.status === "expired" && b.status !== "expired") return -1;
    if (b.status === "expired" && a.status !== "expired") return 1;
    return a.daysToExpiry - b.daysToExpiry;
  });

  const handleRenew = (id: string) => {
    setRenewedIds(prev => new Set([...prev, id]));
  };

  return (
    <AppShell>
      <TopBar title="Compliance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard label="Fine Exposure" value={fmt(totalFineExposure, sym)} sub={`${expiredCount + expiringSoonCount} items at risk`} trend={totalFineExposure > 0 ? "down" : "up"} trendLabel={totalFineExposure > 0 ? "Action required" : "Fully compliant"} accent={totalFineExposure > 0 ? "red" : "green"} />
            <MetricCard label="Expired" value={`${expiredCount}`} sub="Certificates overdue" accent="red" />
            <MetricCard label="Expiring Soon" value={`${expiringSoonCount}`} sub="Within 90 days" accent="amber" />
            <MetricCard label="Valid" value={`${validCount}/${totalCount}`} sub="Certificates current" accent="green" />
          </div>
        )}

        {/* Issue / Cost / Action */}
        {!loading && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: totalFineExposure > 0 ? "#f06040" : "#0A8A4C", fontWeight: 600 }}>Issue:</span>{" "}
              {totalFineExposure > 0
                ? `${expiredCount + expiringSoonCount} certificates expired or expiring`
                : "All certificates current"}{" "}
              {totalFineExposure > 0 && (
                <>
                  ·{" "}
                  <span style={{ color: "#f06040", fontWeight: 600 }}>Cost:</span>{" "}
                  <span style={{ color: "#f06040" }}>{fmt(totalFineExposure, sym)}</span> in potential fines if renewals missed ·{" "}
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>Arca action:</span>{" "}
                  tracks all certificates, files renewals before expiry — included in platform
                </>
              )}
              {totalFineExposure === 0 && (
                <> · portfolio fully compliant</>
              )}
            </div>
          </div>
        )}

        {/* Fine Exposure Summary */}
        {!loading && totalFineExposure > 0 && (
          <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="text-sm font-semibold mb-4" style={{ color: "#e8eef5" }}>Fine Exposure by Asset</div>
            <div className="space-y-3">
              {portfolio.assets
                .map((a) => {
                  const exposure = a.compliance
                    .filter(c => !renewedIds.has(c.id) && (c.status === "expiring_soon" || c.status === "expired"))
                    .reduce((s, c) => s + c.fineExposure, 0);
                  return { asset: a, exposure };
                })
                .filter(({ exposure }) => exposure > 0)
                .sort((a, b) => b.exposure - a.exposure)
                .map(({ asset, exposure }) => {
                  const pct = Math.round((exposure / (totalFineExposure || 1)) * 100);
                  return (
                    <div key={asset.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: "#8ba0b8" }}>{asset.name}</span>
                        <span className="text-sm font-semibold" style={{ color: "#f06040" }}>{fmt(exposure, sym)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#f06040" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Certificate Tracker */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Certificate Tracker" subtitle={`${totalCount} certificates across ${portfolio.assets.length} assets`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {sortedItems.map((item) => {
                const isRenewed = renewedIds.has(item.id);
                const effectiveStatus = isRenewed ? "valid" : item.status;
                const effectiveDays = isRenewed ? 365 : item.daysToExpiry;
                const color = urgencyColor(effectiveDays, effectiveStatus as ComplianceItem["status"]);
                const variant = urgencyVariant(effectiveDays, effectiveStatus as ComplianceItem["status"]);

                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#0d1825]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{item.certificate}</span>
                          <Badge variant={variant}>
                            {isRenewed ? "Renewed" : effectiveStatus === "expired" ? "Expired" : effectiveStatus === "expiring_soon" ? `${item.daysToExpiry}d` : "Valid"}
                          </Badge>
                        </div>
                        <div className="text-xs" style={{ color: "#5a7a96" }}>
                          <Link href={`/assets/${item.assetId}`} className="hover:underline underline-offset-1">{item.assetName}</Link> · {item.type}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>
                          {isRenewed ? "Renewal initiated by Arca" : `Expires ${item.expiryDate}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                      {item.fineExposure > 0 && !isRenewed && (
                        <div className="text-right hidden sm:block">
                          <div className="text-xs" style={{ color: "#5a7a96" }}>Fine risk</div>
                          <div className="text-sm font-semibold" style={{ color: "#f06040" }}>{fmt(item.fineExposure, sym)}</div>
                        </div>
                      )}
                      {isRenewed ? (
                        <span className="text-xs" style={{ color: "#0A8A4C" }}>Arca renewing ✓</span>
                      ) : effectiveStatus !== "valid" ? (
                        <button
                          onClick={() => handleRenew(item.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                          style={{ backgroundColor: effectiveStatus === "expired" ? "#f06040" : "#F5A94A", color: "#0B1622" }}
                        >
                          {effectiveStatus === "expired" ? "Renew Now" : "Schedule"}
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "#0A8A4C" }}>✓ Current</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalFineExposure === 0 && (
              <div className="px-5 py-4 flex items-center justify-center" style={{ borderTop: "1px solid #1a2d45" }}>
                <span className="text-sm" style={{ color: "#0A8A4C" }}>All certificates current — portfolio fully compliant</span>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio, ComplianceItem } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { ActionAlert } from "@/components/ui/ActionAlert";

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

type ComplianceSummary = {
  hasCerts: boolean;
  fineExposure: number;
  expired: number;
  expiringSoon: number;
  compliant: number;
  total: number;
  certs: {
    id: string;
    certType: string;
    propertyAddress: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    daysToExpiry: number | null;
    status: string;
    fineExposure: number;
    filename: string;
  }[];
};

export default function CompliancePage() {
  const { portfolioId } = useNav();
  const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set());
  const loading = useLoading(450, portfolioId);
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  useEffect(() => {
    fetch("/api/user/compliance-summary")
      .then((r) => r.json())
      .then((data) => setComplianceSummary(data))
      .catch(() => {});
  }, []);

  const hasRealData = complianceSummary?.hasCerts === true;

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
        {/* Page Hero */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <PageHero
            title={`Compliance — ${hasRealData ? "Your Portfolio" : portfolio.name}`}
            cells={[
              {
                label: "Fine Exposure",
                value: fmt(hasRealData ? complianceSummary!.fineExposure : totalFineExposure, sym),
                valueColor: (hasRealData ? complianceSummary!.fineExposure : totalFineExposure) > 0 ? "#FF8080" : "#5BF0AC",
                sub: `${hasRealData ? (complianceSummary!.expired + complianceSummary!.expiringSoon) : (expiredCount + expiringSoonCount)} items at risk`,
              },
              {
                label: "Expired",
                value: `${hasRealData ? complianceSummary!.expired : expiredCount}`,
                valueColor: (hasRealData ? complianceSummary!.expired : expiredCount) > 0 ? "#FF8080" : "#5BF0AC",
                sub: "Certificates overdue",
              },
              {
                label: "Due <30 days",
                value: `${hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount}`,
                valueColor: (hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount) > 0 ? "#F5A94A" : "#5BF0AC",
                sub: "Within 30–90 days",
              },
              {
                label: "Compliant",
                value: hasRealData
                  ? `${complianceSummary!.compliant}/${complianceSummary!.total}`
                  : `${validCount}/${totalCount}`,
                valueColor: hasRealData
                  ? (complianceSummary!.compliant === complianceSummary!.total ? "#5BF0AC" : "#F5A94A")
                  : (validCount === totalCount ? "#5BF0AC" : "#F5A94A"),
                sub: "Certificates current",
              },
            ]}
          />
        )}

        {/* Upload CTA when no real data */}
        {!loading && !hasRealData && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#0d1630", border: "1px solid #1647E8" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 3v10M5 8l5-5 5 5" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h14" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#e8eef5" }}>Showing demo data</div>
              <div className="text-xs" style={{ color: "#5a7a96" }}>Upload your compliance certificates to see real expiry dates, fine exposure, and renewal alerts.</div>
            </div>
            <Link href="/documents" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#1647E8", color: "#fff" }}>
              Upload →
            </Link>
          </div>
        )}

        {/* Action Alert */}
        {!loading && (hasRealData ? complianceSummary!.fineExposure > 0 : totalFineExposure > 0) && (
          <ActionAlert
            type="red"
            icon="⚠️"
            title={`${hasRealData ? (complianceSummary!.expired + complianceSummary!.expiringSoon) : (expiredCount + expiringSoonCount)} certificates expired or expiring soon`}
            description="Renewals must be filed before expiry to avoid statutory fines. Arca tracks all certificates and files renewals automatically."
            badges={[
              ...((hasRealData ? complianceSummary!.expired : expiredCount) > 0 ? [{ label: `${hasRealData ? complianceSummary!.expired : expiredCount} expired`, type: "red" as const }] : []),
              ...((hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount) > 0 ? [{ label: `${hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount} due soon`, type: "amber" as const }] : []),
            ]}
            valueDisplay={fmt(hasRealData ? complianceSummary!.fineExposure : totalFineExposure, sym)}
            valueSub="fine exposure"
          />
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
                        <span className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(exposure, sym)}</span>
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
        ) : hasRealData ? (
          <div className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Your Certificates" subtitle={`${complianceSummary!.total} cert${complianceSummary!.total === 1 ? "" : "s"} from uploaded documents`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {complianceSummary!.certs
                .slice()
                .sort((a, b) => {
                  if (a.status === "expired" && b.status !== "expired") return -1;
                  if (b.status === "expired" && a.status !== "expired") return 1;
                  return (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999);
                })
                .map((cert) => {
                  const isRenewed = renewedIds.has(cert.id);
                  const effectiveStatus = isRenewed ? "compliant" : cert.status;
                  const effectiveDays = isRenewed ? 365 : (cert.daysToExpiry ?? 365);
                  const color = effectiveStatus === "expired" ? "#f06040" : effectiveStatus === "due_30d" ? "#f06040" : effectiveStatus === "due_90d" ? "#F5A94A" : "#0A8A4C";
                  const variant: "red" | "amber" | "green" | "gray" = effectiveStatus === "expired" || effectiveStatus === "due_30d" ? "red" : effectiveStatus === "due_90d" ? "amber" : "green";
                  const borderLeftStyle = effectiveStatus === "expired" ? "4px solid #CC1A1A" : effectiveStatus === "due_30d" ? "4px solid #f06040" : effectiveStatus === "due_90d" ? "4px solid #F5A94A" : "none";
                  return (
                    <div key={cert.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#0d1825]" style={{ borderLeft: borderLeftStyle }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: "#e8eef5" }}>{cert.certType}</span>
                            <Badge variant={variant}>
                              {isRenewed ? "Renewed" : effectiveStatus === "expired" ? "Expired" : effectiveDays <= 90 ? `${effectiveDays}d` : "Valid"}
                            </Badge>
                          </div>
                          {cert.propertyAddress && <div className="text-xs" style={{ color: "#5a7a96" }}>{cert.propertyAddress}</div>}
                          <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>
                            {isRenewed ? "Renewal initiated by Arca" : cert.expiryDate ? `Expires ${cert.expiryDate}` : cert.filename}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                        {cert.fineExposure > 0 && !isRenewed && (
                          <div className="text-right hidden sm:block">
                            <div className="text-xs" style={{ color: "#5a7a96" }}>Fine risk</div>
                            <div className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(cert.fineExposure, sym)}</div>
                          </div>
                        )}
                        {isRenewed ? (
                          <span className="text-xs" style={{ color: "#0A8A4C" }}>Arca renewing ✓</span>
                        ) : effectiveStatus !== "compliant" ? (
                          <button
                            onClick={() => handleRenew(cert.id)}
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
          </div>
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

                const borderLeftStyle = effectiveStatus === "expired" ? "4px solid #CC1A1A" : effectiveStatus === "expiring_soon" ? "4px solid #F5A94A" : "none";
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#0d1825]" style={{ borderLeft: borderLeftStyle }}>
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
                          <div className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(item.fineExposure, sym)}</div>
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

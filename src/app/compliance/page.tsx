"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ComplianceItem } from "@/lib/data/types";
import { useLoading } from "@/hooks/useLoading";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { ActionAlert } from "@/components/ui/ActionAlert";
import { DirectCallout } from "@/components/ui/DirectCallout";

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
  const loading = useLoading(450, portfolioId);
  const { portfolio, loading: customLoading } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  useEffect(() => {
    fetch("/api/user/compliance-summary")
      .then((r) => r.json())
      .then((data) => setComplianceSummary(data))
      .catch(() => {});
  }, []);

  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set());
  const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set());

  async function fireRenew(params: {
    certId: string; certType: string; assetName?: string; assetLocation?: string;
    expiryDate?: string | null; daysToExpiry?: number | null; fineExposure?: number; status: string;
  }) {
    if (renewingIds.has(params.certId) || renewedIds.has(params.certId)) return;
    setRenewingIds(prev => new Set(prev).add(params.certId));
    try {
      await fetch("/api/user/compliance/renew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          certId: params.certId,
          certType: params.certType,
          assetName: params.assetName,
          assetLocation: params.assetLocation,
          expiryDate: params.expiryDate,
          daysToExpiry: params.daysToExpiry,
          fineExposure: params.fineExposure,
          action: params.status === "expired" ? "renew_now" : "schedule_renewal",
        }),
      });
      setRenewedIds(prev => new Set(prev).add(params.certId));
    } catch { /* non-fatal */ } finally {
      setRenewingIds(prev => { const s = new Set(prev); s.delete(params.certId); return s; });
    }
  }

  const hasRealData = complianceSummary?.hasCerts === true;

  const allItems = portfolio.assets.flatMap((a) =>
    a.compliance.map((c) => ({ ...c, assetName: a.name, assetLocation: a.location, assetId: a.id }))
  );

  const totalFineExposure = allItems
    .filter((c) => c.status === "expiring_soon" || c.status === "expired")
    .reduce((s, c) => s + c.fineExposure, 0);

  const expiredCount = allItems.filter((c) => c.status === "expired").length;
  const expiringSoonCount = allItems.filter((c) => c.status === "expiring_soon").length;
  const validCount = allItems.filter((c) => c.status === "valid").length;
  const totalCount = allItems.length;

  const sortedItems = [...allItems].sort((a, b) => {
    if (a.status === "expired" && b.status !== "expired") return -1;
    if (b.status === "expired" && a.status !== "expired") return 1;
    return a.daysToExpiry - b.daysToExpiry;
  });

  return (
    <AppShell>
      <TopBar title="Compliance" />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Page Hero */}
        {loading || customLoading ? (
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
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 3v10M5 8l5-5 5 5" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h14" stroke="#1647E8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>Dates estimated from public records</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>Upload your certificates and we&apos;ll track exact expiry dates and automate renewals.</div>
            </div>
            <Link href="/documents" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#1647E8", color: "#fff" }}>
              Upload →
            </Link>
          </div>
        )}

        {/* RealHQ Direct callout */}
        {!loading && (
          <DirectCallout
            title="RealHQ manages every renewal — no certificates expire on your watch"
            body={`${expiredCount + expiringSoonCount > 0 ? `${expiredCount + expiringSoonCount} cert${expiredCount + expiringSoonCount === 1 ? "" : "s"} need attention now. ` : ""}RealHQ tracks all ${totalCount} certificates, schedules renewals before expiry, and coordinates the contractor — so nothing lapses on your watch. Compliance monitoring is included in the platform.`}
          />
        )}

        {/* Action Alert */}
        {!loading && (hasRealData ? complianceSummary!.fineExposure > 0 : totalFineExposure > 0) && (
          <ActionAlert
            type="red"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                <path d="M10 2L18.66 17H1.34L10 2Z" stroke="#f06040" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(204,26,26,.15)" />
                <path d="M10 8v4" stroke="#f06040" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14.5" r="0.75" fill="#f06040" />
              </svg>
            }
            title={`${hasRealData ? (complianceSummary!.expired + complianceSummary!.expiringSoon) : (expiredCount + expiringSoonCount)} certificates expired or expiring soon`}
            description="Renewals must be filed before expiry to avoid statutory fines. RealHQ tracks all certificates and files renewals automatically."
            badges={[
              ...((hasRealData ? complianceSummary!.expired : expiredCount) > 0 ? [{ label: `${hasRealData ? complianceSummary!.expired : expiredCount} expired`, type: "red" as const }] : []),
              ...((hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount) > 0 ? [{ label: `${hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount} due soon`, type: "amber" as const }] : []),
            ]}
            valueDisplay={fmt(hasRealData ? complianceSummary!.fineExposure : totalFineExposure, sym)}
            valueSub="fine exposure"
            href="#cert-tracker"
          />
        )}

        {/* Fine Exposure Summary */}
        {!loading && totalFineExposure > 0 && (
          <div className="rounded-xl p-5 transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="text-sm font-semibold mb-4" style={{ color: "#111827" }}>Fine Exposure by Asset</div>
            <div className="space-y-3">
              {portfolio.assets
                .map((a) => {
                  const exposure = a.compliance
                    .filter(c => c.status === "expiring_soon" || c.status === "expired")
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
                        <span className="text-xs" style={{ color: "#6B7280" }}>{asset.name}</span>
                        <span className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(exposure, sym)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
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
          <div id="cert-tracker" className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Your Certificates" subtitle={`${complianceSummary!.total} cert${complianceSummary!.total === 1 ? "" : "s"} from uploaded documents`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {complianceSummary!.certs
                .slice()
                .sort((a, b) => {
                  if (a.status === "expired" && b.status !== "expired") return -1;
                  if (b.status === "expired" && a.status !== "expired") return 1;
                  return (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999);
                })
                .map((cert) => {
                  const status = cert.status;
                  const days = cert.daysToExpiry ?? 365;
                  const color = status === "expired" ? "#f06040" : status === "due_30d" ? "#f06040" : status === "due_90d" ? "#F5A94A" : "#0A8A4C";
                  const variant: "red" | "amber" | "green" | "gray" = status === "expired" || status === "due_30d" ? "red" : status === "due_90d" ? "amber" : "green";
                  const borderLeftStyle = status === "expired" ? "4px solid #CC1A1A" : status === "due_30d" ? "4px solid #f06040" : status === "due_90d" ? "4px solid #F5A94A" : "none";
                  return (
                    <div key={cert.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#F9FAFB]" style={{ borderLeft: borderLeftStyle }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: "#111827" }}>{cert.certType}</span>
                            <Badge variant={variant}>
                              {status === "expired" ? "Expired" : days <= 90 ? `${days}d` : "Valid"}
                            </Badge>
                          </div>
                          {cert.propertyAddress && <div className="text-xs" style={{ color: "#9CA3AF" }}>{cert.propertyAddress}</div>}
                          <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>
                            {cert.expiryDate ? `Expires ${cert.expiryDate}` : cert.filename}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                        {cert.fineExposure > 0 && (
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "#9CA3AF" }}>Fine risk</div>
                            <div className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(cert.fineExposure, sym)}</div>
                          </div>
                        )}
                        {status !== "compliant" ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs" style={{ color: status === "expired" ? "#f06040" : "#F5A94A" }}>
                              {cert.expiryDate ? `Expires ${cert.expiryDate}` : "Expired"}
                            </span>
                            {renewedIds.has(cert.id) ? (
                              <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Renewal requested ✓</span>
                            ) : (
                              <button
                                onClick={() => fireRenew({ certId: cert.id, certType: cert.certType, assetName: cert.propertyAddress ?? undefined, expiryDate: cert.expiryDate, daysToExpiry: cert.daysToExpiry, fineExposure: cert.fineExposure, status })}
                                disabled={renewingIds.has(cert.id)}
                                className="text-xs font-semibold hover:underline disabled:opacity-50"
                                style={{ color: status === "expired" ? "#f06040" : "#1647E8", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                              >
                                {renewingIds.has(cert.id) ? "Requesting…" : status === "expired" ? "Renew Now →" : "Schedule Renewal →"}
                              </button>
                            )}
                          </div>
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
          <div id="cert-tracker" className="rounded-xl transition-all duration-150 hover:shadow-lg" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Certificate Tracker" subtitle={`${totalCount} certificates across ${portfolio.assets.length} assets`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {sortedItems.map((item) => {
                const color = urgencyColor(item.daysToExpiry, item.status as ComplianceItem["status"]);
                const variant = urgencyVariant(item.daysToExpiry, item.status as ComplianceItem["status"]);
                const borderLeftStyle = item.status === "expired" ? "4px solid #CC1A1A" : item.status === "expiring_soon" ? "4px solid #F5A94A" : "none";
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#F9FAFB]" style={{ borderLeft: borderLeftStyle }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#111827" }}>{item.certificate}</span>
                          <Badge variant={variant}>
                            {item.status === "expired" ? "Expired" : item.status === "expiring_soon" ? `${item.daysToExpiry}d` : "Valid"}
                          </Badge>
                        </div>
                        <div className="text-xs" style={{ color: "#9CA3AF" }}>
                          <Link href={`/assets/${item.assetId}`} className="hover:underline underline-offset-1">{item.assetName}</Link> · {item.type}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>Expires {item.expiryDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                      {item.fineExposure > 0 && (
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "#9CA3AF" }}>Fine risk</div>
                          <div className="text-sm font-semibold" style={{ color: "#f06040", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{fmt(item.fineExposure, sym)}</div>
                        </div>
                      )}
                      {item.status !== "valid" ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs" style={{ color: item.status === "expired" ? "#f06040" : "#F5A94A" }}>
                            Expires {item.expiryDate}
                          </span>
                          {renewedIds.has(item.id) ? (
                            <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>Renewal requested ✓</span>
                          ) : (
                            <button
                              onClick={() => fireRenew({ certId: item.id, certType: item.certificate, assetName: item.assetName, expiryDate: item.expiryDate, daysToExpiry: item.daysToExpiry, fineExposure: item.fineExposure, status: item.status })}
                              disabled={renewingIds.has(item.id)}
                              className="text-xs font-semibold hover:underline disabled:opacity-50"
                              style={{ color: item.status === "expired" ? "#f06040" : "#1647E8", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                            >
                              {renewingIds.has(item.id) ? "Requesting…" : item.status === "expired" ? "Renew Now →" : "Schedule Renewal →"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#0A8A4C" }}>✓ Current</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalFineExposure === 0 && (
              <div className="px-5 py-4 flex items-center justify-center" style={{ borderTop: "1px solid #E5E7EB" }}>
                <span className="text-sm" style={{ color: "#0A8A4C" }}>All certificates current — portfolio fully compliant</span>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

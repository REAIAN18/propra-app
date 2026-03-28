"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
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
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/compliance-summary")
      .then((r) => r.json())
      .then((data) => {
        setComplianceSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Compliance — RealHQ";
    }
  }, []);

  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set());
  const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCert, setUploadCert] = useState<{ certId: string; certType: string; propertyName: string } | null>(null);

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

  function openUploadModal(certId: string, certType: string, propertyName: string) {
    setUploadCert({ certId, certType, propertyName });
    setUploadModalOpen(true);
  }

  function closeUploadModal() {
    setUploadModalOpen(false);
    setUploadCert(null);
  }

  function handleUploadSuccess() {
    // Refetch compliance summary to show updated data
    fetch("/api/user/compliance-summary")
      .then((r) => r.json())
      .then((data) => setComplianceSummary(data))
      .catch(() => {});
    // Reload the page to refresh all data
    window.location.reload();
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

  const fineExposure = hasRealData ? complianceSummary!.fineExposure : totalFineExposure;
  const expired = hasRealData ? complianceSummary!.expired : expiredCount;
  const expiringSoon = hasRealData ? complianceSummary!.expiringSoon : expiringSoonCount;
  const compliant = hasRealData ? complianceSummary!.compliant : validCount;
  const total = hasRealData ? complianceSummary!.total : totalCount;

  return (
    <AppShell>
      <TopBar title="Compliance" />

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl mb-1"
              style={{
                fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
                color: "var(--tx)",
                letterSpacing: "-0.02em",
              }}
            >
              Compliance
            </h1>
            <p className="text-[13px]" style={{ color: "var(--tx3)" }}>
              Track renewals, avoid fines, stay compliant across your portfolio
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/documents">
              <button
                className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background: "transparent",
                  color: "var(--tx2)",
                  borderColor: "var(--bdr)",
                }}
              >
                Upload certificates
              </button>
            </Link>
          </div>
        </div>

        {/* KPI ROW */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div
            className="grid grid-cols-4 gap-px rounded-xl overflow-hidden border"
            style={{
              background: "var(--bdr)",
              borderColor: "var(--bdr)",
            }}
          >
            {/* Fine Exposure */}
            <div
              className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
              style={{ background: "var(--s1)" }}
            >
              <div
                className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                  color: "var(--tx3)",
                  letterSpacing: "0.8px",
                }}
              >
                Fine Exposure
              </div>
              <div
                className="text-xl leading-none"
                style={{
                  fontFamily: "var(--serif, 'Instrument Serif', Georgia, serif)",
                  color: fineExposure > 0 ? "var(--red)" : "var(--grn)",
                  letterSpacing: "-0.02em",
                }}
              >
                {fmt(fineExposure, sym)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
                {expired + expiringSoon} items at risk
              </div>
            </div>

            {/* Expired */}
            <div
              className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
              style={{ background: "var(--s1)" }}
            >
              <div
                className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--tx3)",
                  letterSpacing: "0.8px",
                }}
              >
                Expired
              </div>
              <div
                className="text-xl leading-none"
                style={{
                  fontFamily: "var(--serif)",
                  color: expired > 0 ? "var(--red)" : "var(--grn)",
                  letterSpacing: "-0.02em",
                }}
              >
                {expired}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
                Certificates overdue
              </div>
            </div>

            {/* Due <30 days */}
            <div
              className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
              style={{ background: "var(--s1)" }}
            >
              <div
                className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--tx3)",
                  letterSpacing: "0.8px",
                }}
              >
                Due &lt;90 days
              </div>
              <div
                className="text-xl leading-none"
                style={{
                  fontFamily: "var(--serif)",
                  color: expiringSoon > 0 ? "var(--amb)" : "var(--grn)",
                  letterSpacing: "-0.02em",
                }}
              >
                {expiringSoon}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
                Within 30–90 days
              </div>
            </div>

            {/* Compliant */}
            <div
              className="px-4 py-3.5 cursor-pointer transition-colors hover:opacity-90"
              style={{ background: "var(--s1)" }}
            >
              <div
                className="text-[8px] font-medium uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--tx3)",
                  letterSpacing: "0.8px",
                }}
              >
                Compliant
              </div>
              <div
                className="text-xl leading-none"
                style={{
                  fontFamily: "var(--serif)",
                  color: compliant === total ? "var(--grn)" : "var(--amb)",
                  letterSpacing: "-0.02em",
                }}
              >
                {compliant}<span className="text-[10px] ml-1" style={{ color: "var(--tx3)", fontFamily: "var(--sans)" }}>of {total}</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--tx3)" }}>
                Certificates current
              </div>
            </div>
          </div>
        )}

        {/* Upload CTA when no real data */}
        {!loading && !hasRealData && (
          <div
            className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed"
            style={{
              background: "var(--acc-lt)",
              border: "1px solid var(--acc-bdr)",
              color: "var(--acc)",
            }}
          >
            <div className="text-base mt-0.5">📤</div>
            <div className="flex-1">
              <strong className="block mb-0.5" style={{ color: "var(--tx)" }}>
                Dates estimated from public records
              </strong>
              <span style={{ opacity: 0.8 }}>
                Upload your certificates and we&apos;ll track exact expiry dates and automate renewals.
              </span>
            </div>
            <Link href="/documents">
              <button
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "var(--acc)", color: "#fff" }}
              >
                Upload →
              </button>
            </Link>
          </div>
        )}

        {/* RealHQ Direct Callout */}
        {!loading && (
          <div
            className="flex items-start gap-3 px-6 py-4 rounded-xl text-[12px] leading-relaxed"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
            }}
          >
            <div
              className="text-lg mt-0.5"
              style={{ color: "var(--acc)" }}
            >
              ⚡
            </div>
            <div className="flex-1">
              <strong className="block mb-0.5 text-sm" style={{ color: "var(--tx)" }}>
                RealHQ manages every renewal — no certificates expire on your watch
              </strong>
              <p style={{ color: "var(--tx3)" }}>
                {expired + expiringSoon > 0 ? `${expired + expiringSoon} cert${expired + expiringSoon === 1 ? "" : "s"} need attention now. ` : ""}
                RealHQ tracks all {total} certificates, schedules renewals before expiry, and coordinates the contractor — so nothing lapses on your watch. Compliance monitoring is included in the platform.
              </p>
            </div>
          </div>
        )}

        {/* Action Alert */}
        {!loading && fineExposure > 0 && (
          <div
            className="grid grid-cols-[1fr,auto] gap-6 items-center px-6 py-5 rounded-xl"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--red-bdr)",
            }}
          >
            <div>
              <div
                className="text-[9px] font-medium uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--red)",
                  letterSpacing: "2px",
                }}
              >
                Compliance Alert
              </div>
              <h3
                className="text-lg font-normal mb-1"
                style={{
                  fontFamily: "var(--serif)",
                  color: "var(--tx)",
                }}
              >
                {expired + expiringSoon} certificates expired or expiring soon
              </h3>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--tx3)" }}>
                Renewals must be filed before expiry to avoid statutory fines. RealHQ tracks all certificates and files renewals automatically.
              </p>
              <div className="flex gap-2">
                {expired > 0 && (
                  <span
                    className="inline-flex px-2 py-1 rounded text-[9px] font-medium uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--mono)",
                      background: "var(--red-lt)",
                      color: "var(--red)",
                      border: "1px solid var(--red-bdr)",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {expired} expired
                  </span>
                )}
                {expiringSoon > 0 && (
                  <span
                    className="inline-flex px-2 py-1 rounded text-[9px] font-medium uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--mono)",
                      background: "var(--amb-lt)",
                      color: "var(--amb)",
                      border: "1px solid var(--amb-bdr)",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {expiringSoon} due soon
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-3xl leading-none mb-1"
                style={{
                  fontFamily: "var(--serif)",
                  color: "var(--red)",
                  letterSpacing: "-0.03em",
                }}
              >
                {fmt(fineExposure, sym)}
              </div>
              <div className="text-[11px] mb-3.5" style={{ color: "var(--tx3)" }}>
                fine exposure
              </div>
              <a href="#cert-tracker">
                <button
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "var(--red)",
                    color: "#fff",
                  }}
                >
                  View certificates
                </button>
              </a>
            </div>
          </div>
        )}

        {/* Upcoming Renewals Timeline + Fine Exposure Breakdown */}
        {!loading && totalCount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Renewal Timeline */}
            <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <h4 className="text-base font-semibold mb-0.5" style={{ color: "var(--tx)" }}>Next 6 Months</h4>
                <span className="text-sm" style={{ color: "var(--tx3)" }}>
                  {sortedItems.filter(c => c.status === "expired" || c.status === "expiring_soon").length} renewals due
                </span>
              </div>
              <div style={{ padding: "18px" }}>
                <div className="space-y-4">
                  {sortedItems
                    .filter(c => c.status === "expired" || c.status === "expiring_soon")
                    .slice(0, 5)
                    .map((item) => {
                      const isExpired = item.status === "expired";
                      const dotColor = isExpired ? "var(--red)" : "var(--amb)";
                      const daysText = isExpired
                        ? `${Math.abs(item.daysToExpiry)} days overdue`
                        : `${item.daysToExpiry} days`;
                      return (
                        <div key={item.id} className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full" style={{ backgroundColor: dotColor }} />
                          <div className="text-xs mb-1" style={{ color: "var(--tx2)", fontFamily: "var(--mono)" }}>
                            {item.expiryDate} — {daysText}
                          </div>
                          <div className="text-sm font-medium mb-0.5" style={{ color: "var(--tx)" }}>
                            {item.certificate}
                          </div>
                          <div className="text-xs" style={{ color: "var(--tx3)" }}>
                            {item.assetName}
                            {item.fineExposure > 0 && (
                              <span style={{ color: "var(--red)" }}> · {fmt(item.fineExposure, sym)} fine exposure</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {sortedItems.filter(c => c.status === "expired" || c.status === "expiring_soon").length === 0 && (
                    <div className="text-sm text-center py-4" style={{ color: "var(--tx3)" }}>
                      No renewals due in the next 6 months
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fine Exposure Breakdown */}
            <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <h4 className="text-base font-semibold mb-0.5" style={{ color: "var(--tx)" }}>Fine Exposure Breakdown</h4>
                <span className="text-sm font-semibold" style={{ color: totalFineExposure > 0 ? "var(--red)" : "var(--grn)" }}>
                  {fmt(totalFineExposure, sym)} total
                </span>
              </div>
              <div style={{ padding: "18px" }}>
                <div className="space-y-4 mb-4">
                  {sortedItems
                    .filter(c => c.fineExposure > 0)
                    .slice(0, 4)
                    .map((item) => {
                      const pct = totalFineExposure > 0 ? Math.round((item.fineExposure / totalFineExposure) * 100) : 0;
                      const isRisk = item.status !== "expired";
                      return (
                        <div key={item.id}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: "var(--tx2)" }}>
                              {item.certificate} — {item.assetName}
                            </span>
                            <span className="text-sm font-semibold" style={{
                              color: isRisk ? "var(--amb)" : "var(--red)",
                              fontFamily: "var(--mono)"
                            }}>
                              {fmt(item.fineExposure, sym)}{isRisk ? " risk" : ""}
                            </span>
                          </div>
                          <div className="h-2 rounded" style={{ backgroundColor: isRisk ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)" }}>
                            <div
                              className="h-full rounded transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isRisk ? "var(--amb)" : "var(--red)",
                                opacity: isRisk ? 0.5 : 1
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {sortedItems.filter(c => c.fineExposure > 0).length === 0 && (
                    <div className="text-sm text-center py-4" style={{ color: "var(--grn)" }}>
                      No fine exposure — portfolio fully compliant
                    </div>
                  )}
                </div>
                {totalFineExposure > 0 && (
                  <div className="p-3 rounded-lg" style={{
                    backgroundColor: "rgba(248,113,113,0.07)",
                    border: "1px solid rgba(248,113,113,0.22)"
                  }}>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--red)" }}>
                      <strong>Fines grow daily.</strong> Fire Risk: $150/day. EICR: $200/day.
                      Every day these remain expired costs you money. Renew now to stop the meter.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Certificate Tracker */}
        {loading ? (
          <CardSkeleton rows={6} />
        ) : hasRealData ? (
          <div id="cert-tracker" className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <h4 className="text-base font-semibold mb-0.5" style={{ color: "var(--tx)" }}>Your Certificates</h4>
              <span className="text-sm" style={{ color: "var(--tx3)" }}>
                {complianceSummary!.total} cert{complianceSummary!.total === 1 ? "" : "s"} from uploaded documents
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
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
                  const color = status === "expired" ? "#f87171" : status === "due_30d" ? "#f87171" : status === "due_90d" ? "#fbbf24" : "#34d399";
                  const variant: "red" | "amber" | "green" | "gray" = status === "expired" || status === "due_30d" ? "red" : status === "due_90d" ? "amber" : "green";
                  const borderLeftStyle = status === "expired" ? "4px solid #f87171" : status === "due_30d" ? "4px solid #f87171" : status === "due_90d" ? "4px solid #fbbf24" : "none";
                  return (
                    <div key={cert.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--s2)]" style={{ borderLeft: borderLeftStyle }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{cert.certType}</span>
                            <Badge variant={variant}>
                              {status === "expired" ? "Expired" : days <= 90 ? `${days}d` : "Valid"}
                            </Badge>
                          </div>
                          {cert.propertyAddress && <div className="text-xs" style={{ color: "var(--tx3)" }}>{cert.propertyAddress}</div>}
                          <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                            {cert.expiryDate ? `Expires ${cert.expiryDate}` : cert.filename}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                        {cert.fineExposure > 0 && (
                          <div className="text-right">
                            <div className="text-xs" style={{ color: "var(--tx3)" }}>Fine risk</div>
                            <div className="text-sm font-semibold" style={{ color: "#f87171", fontFamily: "var(--serif)" }}>{fmt(cert.fineExposure, sym)}</div>
                          </div>
                        )}
                        {status !== "compliant" ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs" style={{ color: status === "expired" ? "#f87171" : "#fbbf24" }}>
                              {cert.expiryDate ? `Expires ${cert.expiryDate}` : "Expired"}
                            </span>
                            {renewedIds.has(cert.id) ? (
                              <span className="text-xs font-semibold" style={{ color: "#34d399" }}>Renewal requested ✓</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => fireRenew({ certId: cert.id, certType: cert.certType, assetName: cert.propertyAddress ?? undefined, expiryDate: cert.expiryDate, daysToExpiry: cert.daysToExpiry, fineExposure: cert.fineExposure, status })}
                                  disabled={renewingIds.has(cert.id)}
                                  className="text-xs font-semibold hover:underline disabled:opacity-50"
                                  style={{ color: status === "expired" ? "#f87171" : "#7c6af0", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                >
                                  {renewingIds.has(cert.id) ? "Requesting…" : status === "expired" ? "Renew" : "Schedule"}
                                </button>
                                {status === "expired" && (
                                  <>
                                    <span className="text-xs" style={{ color: "var(--tx3)" }}>·</span>
                                    <button
                                      onClick={() => openUploadModal(cert.id, cert.certType, cert.propertyAddress ?? "Property")}
                                      className="text-xs font-semibold hover:underline"
                                      style={{ color: "#7c6af0", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                    >
                                      Upload →
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "#34d399" }}>✓ Current</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div id="cert-tracker" className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <h4 className="text-base font-semibold mb-0.5" style={{ color: "var(--tx)" }}>Certificate Tracker</h4>
              <span className="text-sm" style={{ color: "var(--tx3)" }}>
                {totalCount} certificates across {portfolio.assets.length} assets
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {sortedItems.map((item) => {
                const color = item.status === "expired" ? "#f87171" : item.status === "expiring_soon" ? "#fbbf24" : "#34d399";
                const variant: "red" | "amber" | "green" | "gray" = item.status === "expired" ? "red" : item.status === "expiring_soon" ? "amber" : "green";
                const borderLeftStyle = item.status === "expired" ? "4px solid #f87171" : item.status === "expiring_soon" ? "4px solid #fbbf24" : "none";
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--s2)]" style={{ borderLeft: borderLeftStyle }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{item.certificate}</span>
                          <Badge variant={variant}>
                            {item.status === "expired" ? "Expired" : item.status === "expiring_soon" ? `${item.daysToExpiry}d` : "Valid"}
                          </Badge>
                        </div>
                        <div className="text-xs" style={{ color: "var(--tx3)" }}>
                          <Link href={`/assets/${item.assetId}`} className="hover:underline underline-offset-1">{item.assetName}</Link> · {item.type}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>Expires {item.expiryDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-3">
                      {item.fineExposure > 0 && (
                        <div className="text-right">
                          <div className="text-xs" style={{ color: "var(--tx3)" }}>Fine risk</div>
                          <div className="text-sm font-semibold" style={{ color: "#f87171", fontFamily: "var(--serif)" }}>{fmt(item.fineExposure, sym)}</div>
                        </div>
                      )}
                      {item.status !== "valid" ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs" style={{ color: item.status === "expired" ? "#f87171" : "#fbbf24" }}>
                            Expires {item.expiryDate}
                          </span>
                          {renewedIds.has(item.id) ? (
                            <span className="text-xs font-semibold" style={{ color: "#34d399" }}>Renewal requested ✓</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => fireRenew({ certId: item.id, certType: item.certificate, assetName: item.assetName, expiryDate: item.expiryDate, daysToExpiry: item.daysToExpiry, fineExposure: item.fineExposure, status: item.status })}
                                disabled={renewingIds.has(item.id)}
                                className="text-xs font-semibold hover:underline disabled:opacity-50"
                                style={{ color: item.status === "expired" ? "#f87171" : "#7c6af0", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                              >
                                {renewingIds.has(item.id) ? "Requesting…" : item.status === "expired" ? "Renew" : "Schedule"}
                              </button>
                              {item.status === "expired" && (
                                <>
                                  <span className="text-xs" style={{ color: "var(--tx3)" }}>·</span>
                                  <button
                                    onClick={() => openUploadModal(item.id, item.certificate, item.assetName)}
                                    className="text-xs font-semibold hover:underline"
                                    style={{ color: "#7c6af0", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                  >
                                    Upload →
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#34d399" }}>✓ Current</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalFineExposure === 0 && (
              <div className="px-5 py-4 flex items-center justify-center" style={{ borderTop: "1px solid var(--bdr)" }}>
                <span className="text-sm" style={{ color: "#34d399" }}>All certificates current — portfolio fully compliant</span>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

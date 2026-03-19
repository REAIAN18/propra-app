"use client";

import { useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Portfolio } from "@/lib/data/types";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

const portfolios: Record<string, Portfolio> = {
  "fl-mixed": flMixed,
  "se-logistics": seLogistics,
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ReportPage() {
  const { portfolioId } = useNav();
  const portfolio = portfolios[portfolioId];
  const sym = portfolio.currency === "USD" ? "$" : "£";
  const printRef = useRef<HTMLDivElement>(null);

  const totalGross = portfolio.assets.reduce((s, a) => s + a.grossIncome, 0);
  const totalNet = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const g2n = Math.round((totalNet / totalGross) * 100);
  const totalAUM = portfolio.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
  const totalInsuranceOverpay = portfolio.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
  const totalEnergyOverpay = portfolio.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
  const totalAddIncome = portfolio.assets.flatMap((a) => a.additionalIncomeOpportunities).reduce((s, o) => s + o.annualIncome, 0);
  const totalOpportunity = totalInsuranceOverpay + totalEnergyOverpay + totalAddIncome;
  const avgOccupancy = Math.round(portfolio.assets.reduce((s, a) => s + a.occupancy, 0) / portfolio.assets.length);
  const expiredCompliance = portfolio.assets.flatMap((a) => a.compliance.filter((c) => c.status !== "valid"));
  const totalFineExposure = expiredCompliance.reduce((s, c) => s + c.fineExposure, 0);
  const expiringLeases = portfolio.assets.flatMap((a) => a.leases.filter((l) => l.status === "expiring_soon" || l.daysToExpiry < 90));

  const arcaFee = Math.round(
    totalInsuranceOverpay * 0.15 +
    totalEnergyOverpay * 0.10 +
    totalAddIncome * 0.10
  );

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const subject = encodeURIComponent(
      `Arca found ${fmt(totalOpportunity, sym)}/yr of opportunity in ${portfolio.name}`
    );
    const body = encodeURIComponent(
      `Hi,\n\nI've been using Arca to analyse our portfolio and wanted to share the results.\n\n` +
      `PORTFOLIO: ${portfolio.name} (${portfolio.assets.length} assets)\n` +
      `───────────────────────────────\n` +
      `Total opportunity: ${fmt(totalOpportunity, sym)}/yr\n` +
      `  · Insurance overpay: ${fmt(totalInsuranceOverpay, sym)}/yr\n` +
      `  · Energy overpay: ${fmt(totalEnergyOverpay, sym)}/yr\n` +
      `  · Additional income: ${fmt(totalAddIncome, sym)}/yr\n` +
      (totalFineExposure > 0 ? `  · Compliance fine exposure: ${fmt(totalFineExposure, sym)}\n` : "") +
      `\nArca works on commission-only — you pay nothing until they deliver.\n` +
      `Arca fee on delivery: ${fmt(arcaFee, sym)}/yr\n\n` +
      `Worth a look: ${typeof window !== "undefined" ? window.location.origin : "https://arca.ai"}\n\n` +
      `Best`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <AppShell>
      <TopBar title="Portfolio Report" />

      <main className="flex-1 p-4 lg:p-6">
        {/* Print/share controls — hidden on print */}
        <div className="max-w-3xl mx-auto mb-5 flex items-center justify-between print:hidden">
          <div className="text-sm" style={{ color: "#5a7a96" }}>
            Portfolio intelligence report · {fmtDate()}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C", color: "#0A8A4C" }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="11.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="11.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="3.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5.4 6.6l4.2-2.2M5.4 8.4l4.2 2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#e8eef5" }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3.5 5V1.5H11.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1" y="5" width="13" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3.5 9.5H11.5V13.5H3.5V9.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              Print / Save PDF
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:opacity-70"
              style={{ color: "#5a7a96" }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Report content */}
        <div
          ref={printRef}
          className="max-w-3xl mx-auto space-y-6"
          style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        >
          {/* ── Header ── */}
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#5a7a96", letterSpacing: "0.12em" }}>
                    Arca · Portfolio Intelligence Report
                  </span>
                </div>
                <h1
                  className="text-3xl font-semibold mb-1"
                  style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#e8eef5" }}
                >
                  {portfolio.name}
                </h1>
                <p className="text-sm" style={{ color: "#5a7a96" }}>
                  {portfolio.assets.length} assets · {portfolio.currency} · Report date: {fmtDate()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                  {fmt(totalOpportunity, sym)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Total annual opportunity identified</div>
              </div>
            </div>
          </div>

          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "AUM", value: fmt(totalAUM, sym), sub: `${portfolio.assets.length} assets` },
              { label: "Gross Income", value: fmt(totalGross, sym), sub: "per year" },
              { label: "Net Income (G2N)", value: `${g2n}%`, sub: `benchmark ${portfolio.benchmarkG2N}%` },
              { label: "Avg Occupancy", value: `${avgOccupancy}%`, sub: "across portfolio" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
                <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>{k.label}</div>
                <div className="text-xl font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{k.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Opportunity Summary ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Opportunity Summary</div>
              <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Annual value recoverable via Arca — commission-only, success fee basis</div>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {[
                {
                  label: "Insurance Retender",
                  value: totalInsuranceOverpay,
                  color: "#F5A94A",
                  fee: `Arca fee: 15% of saving (${fmt(Math.round(totalInsuranceOverpay * 0.15), sym)})`,
                  desc: `Portfolio paying above market rate across ${portfolio.assets.length} assets. Retender with competing carriers to close the gap.`,
                },
                {
                  label: "Energy Switching",
                  value: totalEnergyOverpay,
                  color: "#1647E8",
                  fee: `Arca fee: 10% of yr 1 saving (${fmt(Math.round(totalEnergyOverpay * 0.10), sym)})`,
                  desc: "Current energy spend above benchmark. Arca sources competing supplier rates and manages the switch.",
                },
                {
                  label: "Additional Income",
                  value: totalAddIncome,
                  color: "#0A8A4C",
                  fee: `Arca fee: 10% of first-year income (${fmt(Math.round(totalAddIncome * 0.10), sym)})`,
                  desc: `Solar, EV charging, 5G masts, and other income streams identified. ${portfolio.assets.flatMap((a) => a.additionalIncomeOpportunities).length} opportunities across portfolio.`,
                },
                ...(totalFineExposure > 0
                  ? [{
                      label: "Compliance Fine Exposure",
                      value: totalFineExposure,
                      color: "#f06040",
                      fee: "Included in platform at no extra cost",
                      desc: `${expiredCompliance.length} certificates expiring or expired. Arca tracks all certificates and files renewals.`,
                    }]
                  : []),
              ].map((row) => {
                const pct = Math.round((row.value / (totalOpportunity || 1)) * 100);
                return (
                  <div key={row.label} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>{row.label}</span>
                        </div>
                        <div className="text-xs" style={{ color: "#5a7a96" }}>{row.desc}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold" style={{ color: row.color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                          {fmt(row.value, sym)}/yr
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#3d5a72" }}>{row.fee}</div>
                      </div>
                    </div>
                    <div className="h-1 rounded-full" style={{ backgroundColor: "#1a2d45" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ backgroundColor: "#0d1825", borderTop: "1px solid #1a2d45" }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Total annual opportunity</div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>Arca success fee on delivery: {fmt(arcaFee, sym)}/yr</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                {fmt(totalOpportunity, sym)}/yr
              </div>
            </div>
          </div>

          {/* ── Asset Breakdown ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #1a2d45" }}>
              <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>Asset-Level Breakdown</div>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {portfolio.assets.map((asset) => {
                const insOverpay = asset.insurancePremium - asset.marketInsurance;
                const energyOverpay = asset.energyCost - asset.marketEnergyCost;
                const addIncome = asset.additionalIncomeOpportunities.reduce((s, o) => s + o.annualIncome, 0);
                const assetOpp = insOverpay + energyOverpay + addIncome;
                const g2nA = Math.round((asset.netIncome / asset.grossIncome) * 100);
                const expiringCount = asset.leases.filter((l) => l.status === "expiring_soon" || l.daysToExpiry < 90).length;

                return (
                  <div key={asset.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>{asset.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                          {asset.location} · {asset.type} · {asset.sqft.toLocaleString()} sqft · {asset.occupancy}% occupied · G2N {g2nA}%
                        </div>
                      </div>
                      {assetOpp > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold" style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                            {fmt(assetOpp, sym)}/yr
                          </div>
                          <div className="text-xs" style={{ color: "#3d5a72" }}>opportunity</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {insOverpay > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                          <div style={{ color: "#5a7a96" }}>Insurance</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#F5A94A" }}>−{fmt(insOverpay, sym)}/yr</div>
                        </div>
                      )}
                      {energyOverpay > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                          <div style={{ color: "#5a7a96" }}>Energy</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#1647E8" }}>−{fmt(energyOverpay, sym)}/yr</div>
                        </div>
                      )}
                      {addIncome > 0 && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                          <div style={{ color: "#5a7a96" }}>Add. income</div>
                          <div className="font-semibold mt-0.5" style={{ color: "#0A8A4C" }}>+{fmt(addIncome, sym)}/yr</div>
                        </div>
                      )}
                    </div>

                    {expiringCount > 0 && (
                      <div className="mt-2 text-xs flex items-center gap-1.5" style={{ color: "#F5A94A" }}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
                          <circle cx="5.5" cy="5.5" r="4.5" stroke="#F5A94A" strokeWidth="1.2" />
                          <path d="M5.5 3.5V5.5" stroke="#F5A94A" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="5.5" cy="7.5" r="0.6" fill="#F5A94A" />
                        </svg>
                        {expiringCount} lease{expiringCount > 1 ? "s" : ""} expiring &lt;90 days
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Urgent alerts ── */}
          {(expiringLeases.length > 0 || totalFineExposure > 0) && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#2e0f0a", border: "1px solid #f06040" }}>
              <div className="text-sm font-semibold mb-3" style={{ color: "#f06040" }}>Immediate Actions Required</div>
              <div className="space-y-2 text-sm">
                {totalFineExposure > 0 && (
                  <div style={{ color: "#e8eef5" }}>
                    · <span style={{ color: "#f06040" }}>{fmt(totalFineExposure, sym)} fine exposure</span> — {expiredCompliance.length} compliance certificates expiring
                  </div>
                )}
                {expiringLeases.slice(0, 3).map((lease) => {
                  const asset = portfolio.assets.find((a) => a.leases.some((l) => l.id === lease.id));
                  return (
                    <div key={lease.id} style={{ color: "#e8eef5" }}>
                      · <span style={{ color: "#F5A94A" }}>{lease.tenant}</span> — lease expires in {lease.daysToExpiry} days ({asset?.name})
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}>
            <div
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", color: "#e8eef5" }}
            >
              Arca recovers this on commission-only terms
            </div>
            <p className="text-sm mb-6" style={{ color: "#5a7a96" }}>
              No setup fees. No retainer. No contracts. Arca charges a success fee only when value is delivered. The total fee on the {fmt(totalOpportunity, sym)}/yr opportunity is {fmt(arcaFee, sym)}/yr — you keep the rest.
            </p>
            <a
              href="mailto:hello@arca.ai?subject=Run%20Arca%20on%20my%20real%20portfolio"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 print:hidden"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Run this on my real portfolio →
            </a>
            <div className="mt-4 text-xs" style={{ color: "#3d5a72" }}>
              hello@arca.ai · arca.ai · This report is generated from demo portfolio data
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

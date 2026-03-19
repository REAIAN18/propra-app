"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Asset } from "@/lib/data/types";
import { portfolioFinancing } from "@/lib/data/financing";

const allAssets: Asset[] = [
  ...flMixed.assets,
  ...seLogistics.assets,
];

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function urgencyColor(days: number) {
  if (days < 90) return "#f06040";
  if (days < 365) return "#F5A94A";
  return "#0A8A4C";
}

const TYPE_LABELS: Record<Asset["type"], string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  mixed: "Mixed-Use",
  warehouse: "Warehouse",
  flex: "Flex",
};

const INCOME_TYPE_ICONS: Record<string, string> = {
  "5g_mast": "5G",
  ev_charging: "EV",
  solar: "☀",
  parking: "P",
  billboard: "AD",
};

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const asset = allAssets.find((a) => a.id === id);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  if (!asset) {
    return (
      <AppShell>
        <TopBar title="Asset" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm font-medium mb-2" style={{ color: "#e8eef5" }}>Asset not found</div>
            <Link href="/dashboard" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>← Back to Dashboard</Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = asset.currency === "USD" ? "$" : "£";
  const g2n = Math.round((asset.netIncome / asset.grossIncome) * 100);
  const insOverpay = asset.insurancePremium - asset.marketInsurance;
  const energyOverpay = asset.energyCost - asset.marketEnergyCost;
  const addIncome = asset.additionalIncomeOpportunities.reduce((s, o) => s + o.annualIncome, 0);
  const totalOpportunity = insOverpay + energyOverpay + addIncome;
  const complianceIssues = asset.compliance.filter((c) => c.status !== "valid");
  const totalFineRisk = complianceIssues.reduce((s, c) => s + c.fineExposure, 0);
  const valuation = asset.valuationUSD ?? asset.valuationGBP ?? 0;
  const rentGap = asset.marketERV - asset.passingRent;
  const rentReversionPct = asset.passingRent > 0
    ? Math.round((rentGap / asset.passingRent) * 100)
    : 0;

  const portfolio = flMixed.assets.some((a) => a.id === asset.id) ? flMixed : seLogistics;
  const benchmarkG2N = portfolio.benchmarkG2N;
  const loan = portfolioFinancing[portfolio.id]?.find((l) => l.assetId === asset.id) ?? null;

  return (
    <AppShell>
      <TopBar title={asset.name} />

      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "#5a7a96" }}>
          <Link href="/dashboard" className="hover:opacity-70">Dashboard</Link>
          <span>›</span>
          <span style={{ color: "#e8eef5" }}>{asset.name}</span>
        </div>

        {/* Asset header */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl font-semibold" style={{ color: "#e8eef5" }}>{asset.name}</h2>
                <Badge variant="gray">{TYPE_LABELS[asset.type]}</Badge>
              </div>
              <div className="text-sm" style={{ color: "#5a7a96" }}>
                {asset.location} · {asset.sqft.toLocaleString()} sqft · {asset.occupancy}% occupied
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), Georgia, serif" }}>
                {fmt(valuation, sym)}
              </div>
              <div className="text-xs" style={{ color: "#5a7a96" }}>Estimated valuation</div>
            </div>
          </div>

          {totalOpportunity > 0 && (
            <div
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: "#0f2a1c", border: "1px solid #0A8A4C" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="#0A8A4C" strokeWidth="1.5" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ color: "#0A8A4C" }}>
                <strong>{fmt(totalOpportunity, sym)}/yr</strong> opportunity identified across this asset
              </span>
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <MetricCard
            label="Net Efficiency"
            value={`${g2n}%`}
            sub={`Benchmark ${benchmarkG2N}%`}
            trend={g2n >= benchmarkG2N ? "up" : "down"}
            trendLabel={`${g2n >= benchmarkG2N ? "+" : ""}${g2n - benchmarkG2N}pp vs benchmark`}
            accent={g2n >= benchmarkG2N ? "green" : "amber"}
          />
          <MetricCard
            label="Gross Income"
            value={fmt(asset.grossIncome, sym)}
            sub={`Net: ${fmt(asset.netIncome, sym)}`}
            accent="blue"
          />
          <MetricCard
            label="Passing Rent"
            value={`${sym}${asset.passingRent}/sqft`}
            sub={rentGap > 0 ? `ERV ${sym}${asset.marketERV} (+${rentReversionPct}%)` : `At market ERV`}
            trend={rentGap > 0 ? "up" : "neutral"}
            trendLabel={rentGap > 0 ? `${fmt(rentGap * asset.sqft * (asset.occupancy / 100), sym)}/yr reversion` : "At market"}
            accent={rentGap > 0 ? "amber" : "green"}
          />
          <MetricCard
            label="Total Opportunity"
            value={fmt(totalOpportunity, sym)}
            sub="/yr recoverable"
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Lease Register */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Leases" subtitle={`${asset.leases.length} unit${asset.leases.length !== 1 ? "s" : ""}`} />
              <Link href="/rent-clock" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>Rent Clock →</Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {asset.leases.map((lease) => {
                const isVacant = lease.tenant === "Vacant";
                const color = urgencyColor(lease.daysToExpiry);
                const barPct = Math.min(100, (lease.daysToExpiry / 1825) * 100);
                const annualRent = lease.rentPerSqft * lease.sqft;
                const ervGap = (asset.marketERV - lease.rentPerSqft) * lease.sqft;
                return (
                  <div key={lease.id} className="px-5 py-3.5 transition-colors hover:bg-[#0d1825]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: isVacant ? "#5a7a96" : "#e8eef5" }}>
                          {isVacant ? "Vacant" : lease.tenant}
                        </span>
                        {!isVacant && (
                          <Badge variant={lease.daysToExpiry < 90 ? "red" : lease.daysToExpiry < 365 ? "amber" : "green"}>
                            {lease.daysToExpiry < 90 ? "Critical" : lease.daysToExpiry < 365 ? "Expiring" : "Current"}
                          </Badge>
                        )}
                        {isVacant && <Badge variant="red">Vacant</Badge>}
                      </div>
                      {!isVacant && (
                        <span className="text-xs font-semibold" style={{ color }}>
                          {lease.daysToExpiry}d
                        </span>
                      )}
                    </div>
                    <div className="text-xs mb-2" style={{ color: "#5a7a96" }}>
                      {lease.sqft.toLocaleString()} sqft · {sym}{lease.rentPerSqft}/sqft · {fmt(annualRent, sym)}/yr
                      {lease.breakDate && <span style={{ color: "#1647E8" }}> · break {lease.breakDate}</span>}
                    </div>
                    {!isVacant && (
                      <div>
                        <div className="h-1 rounded-full mb-1" style={{ backgroundColor: "#1a2d45" }}>
                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color }} />
                        </div>
                        {ervGap > 0 && (
                          <div className="text-xs" style={{ color: "#F5A94A" }}>
                            {fmt(ervGap, sym)}/yr below ERV
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: Insurance + Energy */}
          <div className="space-y-4">
            {/* Insurance */}
            <div className="rounded-xl p-5" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Insurance" subtitle="" />
                <Link href="/insurance" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View →</Link>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Current premium</div>
                  <div className="text-lg font-semibold" style={{ color: "#F5A94A", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(asset.insurancePremium, sym)}/yr</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M12 6L16 10L12 14" stroke="#5a7a96" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Market rate</div>
                  <div className="text-lg font-semibold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(asset.marketInsurance, sym)}/yr</div>
                </div>
              </div>
              {insOverpay > 0 && (
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45" }}>
                  <span className="text-xs" style={{ color: "#F5A94A" }}>Overpaying {fmt(insOverpay, sym)}/yr</span>
                  <Link href="/insurance" className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                    style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}>
                    Retender →
                  </Link>
                </div>
              )}
            </div>

            {/* Energy */}
            <div className="rounded-xl p-5" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Energy" subtitle="" />
                <Link href="/energy" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View →</Link>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Current cost</div>
                  <div className="text-lg font-semibold" style={{ color: "#1647E8" }}>{fmt(asset.energyCost, sym)}/yr</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M12 6L16 10L12 14" stroke="#5a7a96" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Market rate</div>
                  <div className="text-lg font-semibold" style={{ color: "#0A8A4C" }}>{fmt(asset.marketEnergyCost, sym)}/yr</div>
                </div>
              </div>
              {energyOverpay > 0 && (
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45" }}>
                  <span className="text-xs" style={{ color: "#1647E8" }}>Overpaying {fmt(energyOverpay, sym)}/yr</span>
                  <Link href="/energy" className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}>
                    Switch →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Income + Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Additional Income */}
          {asset.additionalIncomeOpportunities.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
                <SectionHeader title="Additional Income" subtitle={`${fmt(addIncome, sym)}/yr identified`} />
                <Link href="/income" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View →</Link>
              </div>
              <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
                {asset.additionalIncomeOpportunities.map((opp) => {
                  const isActioned = actioned.has(opp.id);
                  const statusColor = opp.status === "live" ? "#0A8A4C" : opp.status === "in_progress" ? "#1647E8" : "#5a7a96";
                  return (
                    <div key={opp.id} className="px-5 py-3.5 flex items-center justify-between gap-3 transition-colors hover:bg-[#0d1825]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ backgroundColor: "#1a2d45", color: "#8ba0b8" }}
                        >
                          {INCOME_TYPE_ICONS[opp.type] ?? "•"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "#e8eef5" }}>{opp.label}</div>
                          <div className="text-xs" style={{ color: statusColor }}>
                            {opp.status === "live" ? "Live" : opp.status === "in_progress" ? "In progress" : "Identified"}
                            {" · "}{opp.probability}% probability
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: "#0A8A4C" }}>{fmt(opp.annualIncome, sym)}</div>
                          <div className="text-xs" style={{ color: "#5a7a96" }}>/yr</div>
                        </div>
                        {opp.status === "identified" && !isActioned && (
                          <button
                            onClick={() => setActioned((p) => new Set([...p, opp.id]))}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80 active:scale-95"
                            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                          >
                            Activate
                          </button>
                        )}
                        {isActioned && (
                          <div className="text-xs px-3 py-1.5 rounded-md" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}>
                            Arca on it ✓
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compliance */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader
                title="Compliance"
                subtitle={complianceIssues.length > 0 ? `${fmt(totalFineRisk, sym)} fine exposure` : "All certificates valid"}
              />
              <Link href="/compliance" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>View →</Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a2d45" }}>
              {asset.compliance.map((cert) => {
                const isIssue = cert.status !== "valid";
                return (
                  <div key={cert.id} className="px-5 py-3.5 flex items-center justify-between gap-3 transition-colors hover:bg-[#0d1825]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: isIssue ? "#2e0f0a" : "#0f2a1c" }}
                      >
                        {isIssue ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1L11 10H1L6 1Z" fill="#f06040" />
                            <path d="M6 5V7" stroke="#0B1622" strokeWidth="1.2" strokeLinecap="round" />
                            <circle cx="6" cy="8.5" r="0.5" fill="#0B1622" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 4" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "#e8eef5" }}>{cert.certificate}</div>
                        <div className="text-xs" style={{ color: isIssue ? "#f06040" : "#5a7a96" }}>
                          {cert.status === "expired" ? "Expired" : cert.status === "expiring_soon" ? `Expiring in ${cert.daysToExpiry} days` : `Valid · expires ${cert.expiryDate}`}
                        </div>
                      </div>
                    </div>
                    {cert.fineExposure > 0 && (
                      <div className="text-xs font-medium shrink-0" style={{ color: "#f06040" }}>
                        {fmt(cert.fineExposure, sym)} risk
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageHero } from "@/components/ui/PageHero";
import { flMixed } from "@/lib/data/fl-mixed";
import { seLogistics } from "@/lib/data/se-logistics";
import { Asset, HoldSellScenario } from "@/lib/data/types";
import { portfolioFinancing } from "@/lib/data/financing";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";

const holdSellData: Record<string, HoldSellScenario> = {
  "fl-001": { assetId: "fl-001", holdIRR: 7.2, sellIRR: 9.1, recommendation: "sell", sellPrice: 15800000, rationale: "Strong Miami-Dade office demand drives exit premium. Two leases expiring within 12m add execution risk to hold." },
  "fl-002": { assetId: "fl-002", holdIRR: 8.9, sellIRR: 7.8, recommendation: "hold", sellPrice: 7200000, rationale: "Retail in Brickell is supply-constrained. Hold for lease review cycle and capture reversion before exit." },
  "fl-003": { assetId: "fl-003", holdIRR: 9.6, sellIRR: 8.2, recommendation: "hold", sellPrice: 6100000, rationale: "Full occupancy, long WAULT, industrial fundamentals improving. Solar addition adds 90bps to hold IRR." },
  "fl-004": { assetId: "fl-004", holdIRR: 6.8, sellIRR: 8.4, recommendation: "sell", sellPrice: 10200000, rationale: "Vacancy and dual lease expiry create compounding risk. Exit now captures current valuation." },
  "fl-005": { assetId: "fl-005", holdIRR: 8.1, sellIRR: 7.9, recommendation: "review", sellPrice: 4900000, rationale: "Marginal case. Rent reversion potential supports hold; strong flex demand could support sell. Monitor lease outcome." },
  "se-001": { assetId: "se-001", holdIRR: 7.8, sellIRR: 8.9, recommendation: "sell", sellPrice: 24500000, rationale: "Break clause risk on key tenant. Logistics cap rate compression provides exceptional exit now." },
  "se-002": { assetId: "se-002", holdIRR: 8.5, sellIRR: 7.4, recommendation: "hold", sellPrice: 36200000, rationale: "Amazon covenant, 9yr unexpired. Sub-5% yield implies insufficient premium for grade-A logistics income." },
  "se-003": { assetId: "se-003", holdIRR: 7.1, sellIRR: 8.0, recommendation: "review", sellPrice: 10400000, rationale: "Vacancy in unit C weighs on income. Lease up before sale to maximise exit value." },
  "se-004": { assetId: "se-004", holdIRR: 9.2, sellIRR: 8.1, recommendation: "hold", sellPrice: 7800000, rationale: "Both tenants at ERV on 5yr leases. Clean income, no near-term expiry. EV charging uplift available." },
  "se-005": { assetId: "se-005", holdIRR: 6.4, sellIRR: 9.3, recommendation: "sell", sellPrice: 19200000, rationale: "XPO exiting in 289 days — void risk crystallising. Sell now with 9 months income unexpired." },
};

const holdSellConfig = {
  hold: { label: "Hold", color: "#0A8A4C", variant: "green" as const },
  sell: { label: "Sell", color: "#F5A94A", variant: "amber" as const },
  review: { label: "Review", color: "#1647E8", variant: "blue" as const },
};

const STATIC_ASSETS: Asset[] = [
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
  solar: "Sol",
  parking: "P",
  billboard: "AD",
};

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const { portfolioId } = useNav();
  const { portfolio: activePortfolio } = usePortfolio(portfolioId);
  // Look in active portfolio first (supports custom portfolios), then fall back to static assets
  const asset = activePortfolio.assets.find((a) => a.id === id) ?? STATIC_ASSETS.find((a) => a.id === id);
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

  const benchmarkG2N = activePortfolio.benchmarkG2N;
  const loan = portfolioFinancing[portfolioId]?.find((l) => l.assetId === asset.id) ?? null;
  const hs = holdSellData[asset.id] ?? null;
  const hsCfg = hs ? holdSellConfig[hs.recommendation] : null;

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

        {/* Page Hero */}
        <PageHero
          title={`${asset.name} — ${TYPE_LABELS[asset.type]}`}
          subtitle={`${asset.location} · ${asset.sqft.toLocaleString()} sqft · ${asset.occupancy}% occupied`}
          cells={[
            { label: "Valuation", value: fmt(valuation, sym), sub: "Book value" },
            { label: "Total Opportunity", value: `${fmt(totalOpportunity, sym)}/yr`, valueColor: totalOpportunity > 0 ? "#F5A94A" : "#5BF0AC", sub: "Insurance · energy · income" },
            { label: "G2N Ratio", value: `${g2n}%`, valueColor: g2n >= benchmarkG2N ? "#5BF0AC" : "#F5A94A", sub: `Benchmark ${benchmarkG2N}% · ${g2n >= benchmarkG2N ? "+" : ""}${g2n - benchmarkG2N}pp` },
            {
              label: "Hold / Sell",
              value: hs ? holdSellConfig[hs.recommendation].label : "—",
              valueColor: hs ? holdSellConfig[hs.recommendation].color : "#8ba0b8",
              sub: hs ? `Hold ${hs.holdIRR}% · Exit ${hs.sellIRR}%` : "Analysis pending",
            },
          ]}
        />

        {/* Issue / Cost / Action */}
        {(totalOpportunity > 0 || totalFineRisk > 0) && (
          <div
            className="rounded-xl px-5 py-3.5"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Issue:</span>{" "}
              {[
                insOverpay > 0 && `insurance ${Math.round((insOverpay / asset.insurancePremium) * 100)}% above market`,
                energyOverpay > 0 && `energy ${Math.round((energyOverpay / asset.energyCost) * 100)}% above market`,
                totalFineRisk > 0 && `${complianceIssues.length} cert${complianceIssues.length !== 1 ? "s" : ""} expiring`,
                addIncome > 0 && asset.additionalIncomeOpportunities.filter(o => o.status === "identified").length > 0
                  && `${asset.additionalIncomeOpportunities.filter(o => o.status === "identified").length} income opp${asset.additionalIncomeOpportunities.filter(o => o.status === "identified").length !== 1 ? "s" : ""} not activated`,
              ].filter(Boolean).join(" · ")}{" "}·{" "}
              <span style={{ color: "#F5A94A", fontWeight: 600 }}>Opportunity:</span>{" "}
              <span style={{ color: "#F5A94A" }}>{fmt(totalOpportunity + totalFineRisk, sym)}/yr</span> recoverable ·{" "}
              <span style={{ color: "#0A8A4C", fontWeight: 600 }}>RealHQ action:</span>{" "}
              retenders insurance, switches energy, activates income — success-only commissions
            </div>
          </div>
        )}

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
                  <div className="text-lg font-semibold" style={{ color: "#FF8080", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(asset.energyCost, sym)}/yr</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M12 6L16 10L12 14" stroke="#5a7a96" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Market rate</div>
                  <div className="text-lg font-semibold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(asset.marketEnergyCost, sym)}/yr</div>
                </div>
              </div>
              {energyOverpay > 0 && (
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1a2d45" }}>
                  <span className="text-xs" style={{ color: "#F5A94A" }}>Overpaying {fmt(energyOverpay, sym)}/yr</span>
                  <Link href="/energy" className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}>
                    Switch →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financing */}
        {loan && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2d45" }}>
              <SectionHeader title="Financing" subtitle={`${loan.lender} · matures ${loan.maturityDate}`} />
              <Link href="/financing" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>Refinance →</Link>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Outstanding</div>
                  <div className="text-base font-bold" style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                    {fmt(loan.outstandingBalance, sym)}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>Rate</div>
                  <div className="text-base font-bold" style={{ color: loan.interestRate > loan.marketRate ? "#f06040" : "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                    {loan.interestRate}%
                  </div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Market {loan.marketRate}%</div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>ICR</div>
                  <div className="text-base font-bold" style={{ color: loan.icr < loan.icrCovenant ? "#f06040" : loan.icr < loan.icrCovenant + 0.25 ? "#F5A94A" : "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                    {loan.icr.toFixed(2)}x
                  </div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Min {loan.icrCovenant}x</div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "#5a7a96" }}>LTV</div>
                  <div className="text-base font-bold" style={{ color: loan.currentLTV >= loan.ltvCovenant ? "#f06040" : loan.currentLTV >= loan.ltvCovenant - 5 ? "#F5A94A" : "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>
                    {loan.currentLTV}%
                  </div>
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Max {loan.ltvCovenant}%</div>
                </div>
              </div>
              {loan.interestRate > loan.marketRate && (
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #1a2d45" }}>
                  <span className="text-xs" style={{ color: "#F5A94A" }}>
                    Paying {(loan.interestRate - loan.marketRate).toFixed(2)}pp above market · {fmt(Math.round((loan.interestRate - loan.marketRate) / 100 * loan.outstandingBalance), sym)}/yr overpay
                  </span>
                  <Link href="/financing" className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                    style={{ backgroundColor: "#1647E8", color: "#fff" }}>
                    Refinance →
                  </Link>
                </div>
              )}
              {loan.daysToMaturity < 180 && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "#2e1e0a", border: "1px solid #4f330d", color: "#F5A94A" }}>
                  <span>Matures in {loan.daysToMaturity} days — begin refinance process now</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hold / Sell */}
        {hs && hsCfg && (
          <div className="rounded-xl p-5" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Hold / Sell Analysis" subtitle={`${hsCfg.label} recommendation`} />
              <Badge variant={hsCfg.variant}>{hsCfg.label}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Hold IRR</div>
                <div className="text-lg font-bold" style={{ color: "#0A8A4C", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{hs.holdIRR}%</div>
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Sell IRR</div>
                <div className="text-lg font-bold" style={{ color: hsCfg.color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{hs.sellIRR}%</div>
              </div>
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "#0d1825" }}>
                <div className="text-xs mb-0.5" style={{ color: "#5a7a96" }}>Exit value</div>
                <div className="text-lg font-bold" style={{ color: hsCfg.color, fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}>{fmt(hs.sellPrice, sym)}</div>
              </div>
            </div>
            <div className="rounded-lg p-3 text-xs mb-3" style={{ backgroundColor: "#0d1825", color: "#8ba0b8" }}>
              {hs.rationale}
            </div>
            <Link href="/hold-sell" className="text-xs font-medium" style={{ color: hsCfg.color }}>
              Full portfolio hold/sell analysis →
            </Link>
          </div>
        )}

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
                            onClick={() => {
                              setActioned((p) => new Set([...p, opp.id]));
                              fetch("/api/leads/income-activation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  opportunityType: opp.type,
                                  opportunityLabel: opp.label,
                                  assetName: asset.name,
                                  assetLocation: asset.location,
                                  annualIncome: opp.annualIncome,
                                  probability: opp.probability,
                                }),
                              }).catch(() => {});
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-all hover:opacity-80 active:scale-95"
                            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                          >
                            Activate
                          </button>
                        )}
                        {isActioned && (
                          <div className="text-xs px-3 py-1.5 rounded-md" style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}>
                            RealHQ on it ✓
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

"use client";

import Link from "next/link";
import { Portfolio } from "@/lib/data/types";

function fmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(0)}k`;
  return `${currency}${v.toLocaleString()}`;
}
function fmtMo(v: number, currency: string) {
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(1)}k/mo`;
  return `${currency}${v.toLocaleString()}/mo`;
}

interface NOIBridgeProps {
  portfolio: Portfolio;
}

interface Segment {
  label: string;
  annualValue: number;
  moValue: number;
  color: string;
  lightColor: string;
  href: string;
}

export function NOIBridge({ portfolio }: NOIBridgeProps) {
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const totalNOIAnnual = portfolio.assets.reduce((s, a) => s + a.netIncome, 0);
  const totalNOIMonthly = Math.round(totalNOIAnnual / 12);

  // Rent uplift: (marketERV - passingRent) * occupied sqft
  const rentUpliftAnnual = portfolio.assets.reduce((s, a) => {
    const gap = a.marketERV - a.passingRent;
    if (gap <= 0) return s;
    const occupiedSqft = a.sqft * (a.occupancy / 100);
    return s + gap * occupiedSqft;
  }, 0);

  // Insurance saving
  const insuranceSavingAnnual = portfolio.assets.reduce(
    (s, a) => s + Math.max(0, a.insurancePremium - a.marketInsurance),
    0
  );

  // Energy saving
  const energySavingAnnual = portfolio.assets.reduce(
    (s, a) => s + Math.max(0, a.energyCost - a.marketEnergyCost),
    0
  );

  // Additional income (5G, EV, solar etc) — identified/in_progress only
  const additionalIncome = portfolio.assets.reduce((s, a) => {
    return s + a.additionalIncomeOpportunities
      .filter(o => o.status !== "live")
      .reduce((ss, o) => ss + Math.round(o.annualIncome * o.probability / 100), 0);
  }, 0);

  const segments: Segment[] = [];
  if (rentUpliftAnnual > 0) segments.push({
    label: "Rent Uplift",
    annualValue: rentUpliftAnnual,
    moValue: Math.round(rentUpliftAnnual / 12),
    color: "#0A8A4C",
    lightColor: "#E8F5EE",
    href: "/rent-clock",
  });
  if (insuranceSavingAnnual > 0) segments.push({
    label: "Insurance",
    annualValue: insuranceSavingAnnual,
    moValue: Math.round(insuranceSavingAnnual / 12),
    color: "#1647E8",
    lightColor: "#EEF2FF",
    href: "/insurance",
  });
  if (energySavingAnnual > 0) segments.push({
    label: "Energy",
    annualValue: energySavingAnnual,
    moValue: Math.round(energySavingAnnual / 12),
    color: "#0891B2",
    lightColor: "#E0F9FF",
    href: "/energy",
  });
  if (additionalIncome > 0) segments.push({
    label: "Add. Income",
    annualValue: additionalIncome,
    moValue: Math.round(additionalIncome / 12),
    color: "#D97706",
    lightColor: "#FEF3C7",
    href: "/income",
  });

  const totalUpliftAnnual = segments.reduce((s, seg) => s + seg.annualValue, 0);
  const totalUpliftMonthly = Math.round(totalUpliftAnnual / 12);
  const projectedNOIMonthly = totalNOIMonthly + totalUpliftMonthly;

  // Cap rate for value uplift (use median of 6.5%)
  const totalPortfolioValue = portfolio.assets.reduce(
    (s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0
  );
  const impliedCapRate = totalPortfolioValue > 0 ? totalNOIAnnual / totalPortfolioValue : 0.065;
  const capRatePct = (impliedCapRate * 100).toFixed(1);
  const valueUplift = impliedCapRate > 0 ? Math.round(totalUpliftAnnual / impliedCapRate) : 0;

  // Bar heights — base + each segment proportional to monthly value
  const maxMo = projectedNOIMonthly;
  const basePct = Math.round((totalNOIMonthly / maxMo) * 100);

  if (segments.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: "#111827" }}>NOI Optimisation Bridge</div>
          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
            {fmt(totalUpliftAnnual, sym)}/yr unlockable across {segments.length} opportunity types
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-90"
          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
        >
          Action all →
        </Link>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-end gap-6">
          {/* Left: Current NOI bar */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="text-xs font-semibold text-center"
              style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: "13px" }}
            >
              {fmtMo(totalNOIMonthly, sym)}
            </div>
            <div className="w-20 flex flex-col justify-end rounded-lg overflow-hidden" style={{ height: 140, backgroundColor: "#F3F4F6" }}>
              <div
                className="w-full rounded-lg transition-all duration-700"
                style={{
                  height: `${basePct}%`,
                  backgroundColor: "#374151",
                  minHeight: 8,
                }}
              />
            </div>
            <div className="text-[10px] font-medium text-center" style={{ color: "#6B7280" }}>Current NOI</div>
          </div>

          {/* Arrow */}
          <div className="flex items-center self-center pb-6 shrink-0">
            <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
              <path d="M0 7h28M22 1l8 6-8 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Middle: stacked segments */}
          <div className="flex-1 flex flex-col gap-1.5 self-end">
            {/* Stacked bar */}
            <div className="flex flex-col-reverse w-full rounded-lg overflow-hidden mb-2" style={{ height: 140, backgroundColor: "#F3F4F6" }}>
              {/* Base layer */}
              <div style={{ height: `${basePct}%`, backgroundColor: "#374151", minHeight: 6 }} />
              {/* Opportunity segments */}
              {segments.map((seg) => {
                const pct = Math.round((seg.moValue / maxMo) * 100);
                return (
                  <div
                    key={seg.label}
                    style={{ height: `${pct}%`, backgroundColor: seg.color, minHeight: pct > 0 ? 4 : 0 }}
                  />
                );
              })}
            </div>

            {/* Segment legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {segments.map((seg) => (
                <Link key={seg.label} href={seg.href} className="flex items-center gap-1.5 group">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[10.5px] font-medium group-hover:underline" style={{ color: "#4B5563" }}>
                    {seg.label}
                  </span>
                  <span className="text-[10.5px]" style={{ color: "#9CA3AF" }}>
                    +{fmtMo(seg.moValue, sym)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center self-center pb-6 shrink-0">
            <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
              <path d="M0 7h28M22 1l8 6-8 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Right: Projected NOI */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="text-xs font-semibold text-center"
              style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: "13px" }}
            >
              {fmtMo(projectedNOIMonthly, sym)}
            </div>
            <div className="w-20 flex flex-col justify-end rounded-lg overflow-hidden" style={{ height: 140, backgroundColor: "#F3F4F6" }}>
              <div className="w-full rounded-lg overflow-hidden" style={{ height: "100%", display: "flex", flexDirection: "column-reverse" }}>
                <div style={{ height: `${basePct}%`, backgroundColor: "#374151", minHeight: 6 }} />
                {segments.map((seg) => {
                  const pct = Math.round((seg.moValue / maxMo) * 100);
                  return (
                    <div key={seg.label} style={{ height: `${pct}%`, backgroundColor: seg.color, minHeight: pct > 0 ? 4 : 0 }} />
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] font-medium text-center" style={{ color: "#6B7280" }}>Projected NOI</div>
          </div>
        </div>

        {/* Value uplift footer */}
        {valueUplift > 0 && (
          <div className="mt-4 px-4 py-3 rounded-xl flex items-center justify-between gap-4" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
            <div className="text-xs" style={{ color: "#6B7280" }}>
              Implied portfolio value uplift at <span className="font-medium" style={{ color: "#374151" }}>{capRatePct}% cap rate</span>
            </div>
            <div
              className="text-base font-bold shrink-0"
              style={{ color: "#0A8A4C", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}
            >
              +{fmt(valueUplift, sym)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";

export interface EPCUpgrade {
  label: string;
  cost: number;
  annualSaving: number;
}

export interface EPCCardProps {
  currentRating?: string;
  currentScore?: number;
  potentialRating?: string;
  potentialScore?: number;
  certificateDate?: string;
  validUntil?: string;
  assessmentType?: string;
  floorAreaM2?: number;
  floorAreaSqft?: number;
  mainHeating?: string;
  co2Emissions?: string;
  meesCompliance?: string;
  meesDeadline?: string;
  meesAction?: string;
  upgrades?: EPCUpgrade[];
  totalUpgradeCost?: number;
  annualSavings?: number;
  paybackYears?: number;
  valueUplift?: number;
}

const RATING_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "rgba(45,212,168,.08)", color: "var(--grn,#34d399)" },
  B: { bg: "rgba(45,212,168,.08)", color: "var(--grn,#34d399)" },
  C: { bg: "rgba(45,212,168,.08)", color: "var(--grn,#34d399)" },
  D: { bg: "rgba(234,176,32,.08)", color: "var(--amb,#fbbf24)" },
  E: { bg: "rgba(234,176,32,.08)", color: "var(--amb,#fbbf24)" },
  F: { bg: "rgba(240,96,96,.08)",  color: "var(--red,#f87171)" },
  G: { bg: "rgba(240,96,96,.08)",  color: "var(--red,#f87171)" },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${Math.round(n / 1_000).toLocaleString()}k`;
  return `£${n.toLocaleString()}`;
}

function DR({ label, value, color, sans }: { label: string; value: React.ReactNode; color?: string; sans?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--tx3,#555566)" }}>{label}</span>
      <span style={{ fontFamily: sans ? "'DM Sans',sans-serif" : "'JetBrains Mono',monospace", fontWeight: 500, color: color ?? "var(--tx,#e4e4ec)" }}>
        {value}
      </span>
    </div>
  );
}

function Sep() {
  return <div style={{ borderTop: "1px solid var(--s3,#1f1f2c)", margin: "8px 0" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx2,#8e8ea0)", marginBottom: 6 }}>{children}</div>;
}

export function EPCCard({
  currentRating = "–",
  currentScore,
  potentialRating,
  potentialScore,
  certificateDate,
  validUntil,
  assessmentType,
  floorAreaM2,
  floorAreaSqft,
  mainHeating,
  co2Emissions,
  meesCompliance,
  meesDeadline,
  meesAction,
  upgrades,
  totalUpgradeCost,
  annualSavings,
  paybackYears,
  valueUplift,
}: EPCCardProps) {
  const rs = RATING_COLORS[currentRating] ?? { bg: "var(--s2,#18181f)", color: "var(--tx2,#8e8ea0)" };

  return (
    <div style={{ background: "var(--s1,#111116)", border: "1px solid var(--s2,#18181f)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3,#555566)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>
        Energy performance
      </div>

      {/* Rating badge */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: rs.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: rs.color }}>
          {currentRating}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>
            Current rating: {currentRating}{currentScore !== undefined ? ` (${currentScore})` : ""}
          </div>
          {potentialRating && (
            <div style={{ fontSize: 10, color: "var(--tx3,#555566)" }}>
              Potential rating: {potentialRating}{potentialScore !== undefined ? ` (${potentialScore})` : ""}
            </div>
          )}
        </div>
      </div>

      {certificateDate && <DR label="Certificate date" value={certificateDate} />}
      {validUntil       && <DR label="Valid until"      value={validUntil} />}
      {assessmentType   && <DR label="Assessment type"  value={assessmentType} sans />}
      {(floorAreaM2 !== undefined || floorAreaSqft !== undefined) && (
        <DR
          label="Floor area (EPC)"
          value={
            floorAreaM2 !== undefined && floorAreaSqft !== undefined
              ? `${floorAreaM2} m² (${floorAreaSqft.toLocaleString()} sqft)`
              : floorAreaM2 !== undefined
              ? `${floorAreaM2} m²`
              : `${floorAreaSqft!.toLocaleString()} sqft`
          }
        />
      )}
      {mainHeating   && <DR label="Main heating"    value={mainHeating} sans />}
      {co2Emissions  && <DR label="CO₂ emissions"   value={co2Emissions} />}

      {(meesCompliance || meesDeadline || meesAction) && (
        <>
          <Sep />
          <SectionLabel>MEES STATUS</SectionLabel>
          {meesCompliance && <DR label="Current compliance" value={meesCompliance} color="var(--amb,#fbbf24)" />}
          {meesDeadline   && <DR label="Deadline"           value={meesDeadline}   color="var(--amb,#fbbf24)" />}
          {meesAction     && <DR label="Action required"    value={meesAction} sans />}
        </>
      )}

      {upgrades && upgrades.length > 0 && (
        <>
          <Sep />
          <SectionLabel>UPGRADE PATH (EPC recommendations)</SectionLabel>
          {upgrades.map((u, i) => (
            <DR key={i} label={u.label} value={`${fmt(u.cost)} · saves ${fmt(u.annualSaving)}/yr`} />
          ))}
        </>
      )}

      {(totalUpgradeCost !== undefined || annualSavings !== undefined || paybackYears !== undefined || valueUplift !== undefined) && (
        <>
          <Sep />
          {totalUpgradeCost !== undefined && <DR label="Total upgrade cost" value={fmt(totalUpgradeCost)} />}
          {annualSavings    !== undefined && <DR label="Annual savings"     value={`${fmt(annualSavings)}/yr`} color="var(--grn,#34d399)" />}
          {paybackYears     !== undefined && <DR label="Payback period"     value={`${paybackYears} years`}    color="var(--grn,#34d399)" />}
          {valueUplift      !== undefined && <DR label="Value uplift (est.)" value={`+${fmt(valueUplift)}`}   color="var(--grn,#34d399)" />}
        </>
      )}
    </div>
  );
}

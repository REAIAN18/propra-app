"use client";

import { Skeleton } from "./ui/Skeleton";

/* ═══════════════════════════════════════════════════
   BuildingSpecCard — DS-T09 — matches 02-dossier-full.html
   Building specification card with .dr row pattern
   ═══════════════════════════════════════════════════ */

export interface BuildingSpec {
  address?: string;
  construction?: string;
  cladding?: string;
  roof?: string;
  floor?: string;
  eavesHeight?: string;
  loadingDoors?: string;
  officeContent?: string;
  parking?: string;
  yard?: string;
  utilities?: string;
  broadband?: string;
  drainage?: string;
  extra?: Array<{ label: string; value: string }>;
}

interface BuildingSpecCardProps {
  spec: BuildingSpec;
  isLoading?: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--tx3, #555566)" }}>{label}</span>
      <span style={{ color: "var(--tx)", fontFamily: "'DM Sans', sans-serif", textAlign: "right", maxWidth: "55%" }}>{value}</span>
    </div>
  );
}

export function BuildingSpecCard({ spec, isLoading = false }: BuildingSpecCardProps) {
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <Skeleton height={12} width="35%" />
            <Skeleton height={12} width="40%" />
          </div>
        ))}
      </div>
    );
  }

  const mainFields: Array<[string, string | undefined]> = [
    ["Address",       spec.address],
    ["Construction",  spec.construction],
    ["Cladding",      spec.cladding],
    ["Roof",          spec.roof],
    ["Floor",         spec.floor],
    ["Eaves height",  spec.eavesHeight],
    ["Loading doors", spec.loadingDoors],
    ["Office content",spec.officeContent],
    ["Parking",       spec.parking],
    ["Yard",          spec.yard],
  ];

  const utilityFields: Array<[string, string | undefined]> = [
    ["Utilities",  spec.utilities],
    ["Broadband",  spec.broadband],
    ["Drainage",   spec.drainage],
  ];

  const hasMain    = mainFields.some(([, v]) => v);
  const hasUtil    = utilityFields.some(([, v]) => v);
  const hasExtra   = (spec.extra ?? []).length > 0;

  if (!hasMain && !hasUtil && !hasExtra) {
    return (
      <div style={{ padding: 10, background: "var(--s2)", borderRadius: 6, border: "1px dashed var(--s3)", fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
        No building specification available
      </div>
    );
  }

  return (
    <div>
      {mainFields.filter(([, v]) => v).map(([label, value]) => (
        <Row key={label} label={label} value={value!} />
      ))}
      {hasUtil && (
        <>
          <div style={{ borderTop: "1px solid var(--s3, #1f1f2c)", margin: "8px 0" }} />
          {utilityFields.filter(([, v]) => v).map(([label, value]) => (
            <Row key={label} label={label} value={value!} />
          ))}
        </>
      )}
      {hasExtra && (spec.extra ?? []).map(({ label, value }) => (
        <Row key={label} label={label} value={value} />
      ))}
    </div>
  );
}

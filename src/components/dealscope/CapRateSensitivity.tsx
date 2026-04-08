"use client";

/**
 * Wave I3 — client-side cap-rate sensitivity slider.
 *
 * Recomputes Wave F as-is and refurb-net values when the user nudges the
 * exit cap rate. The base cap rate comes from the enrich pipeline; we
 * apply ±50bps / ±100bps offsets and re-divide NOI for both scenarios.
 */

import { useState } from "react";
import s from "@/app/scope/property/[id]/dossier.module.css";

interface Props {
  baseCapRate: number;        // decimal, e.g. 0.075
  asIsNoi: number;
  refurbNoi: number;
  refurbCapex: number;
  askingPrice: number;
}

function fmtCcy(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

export function CapRateSensitivity({ baseCapRate, asIsNoi, refurbNoi, refurbCapex, askingPrice }: Props) {
  const [bps, setBps] = useState(0);
  const cap = Math.max(0.001, baseCapRate + bps / 10000);
  const asIsValue = asIsNoi / cap;
  const refurbNetValue = refurbNoi / cap - refurbCapex;
  const asIsClears = asIsValue >= askingPrice;
  const refurbClears = refurbNetValue >= askingPrice;

  return (
    <div className={`${s.card} ${s.a2}`}>
      <div className={s.cardTitle}>Cap-rate sensitivity (Wave I)</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--tx2)" }}>
        <span style={{ minWidth: 100 }}>Exit cap rate</span>
        <input
          type="range"
          min={-100}
          max={100}
          step={25}
          value={bps}
          onChange={(e) => setBps(parseInt(e.target.value, 10))}
          style={{ flex: 1 }}
        />
        <span className={s.mono} style={{ minWidth: 80, textAlign: "right" }}>
          {(cap * 100).toFixed(2)}% ({bps >= 0 ? "+" : ""}{bps}bps)
        </span>
      </div>
      <div className={s.sep} />
      <div className={s.row}>
        <span className={s.rowL}>As-is value @ new cap</span>
        <span className={`${s.rowV} ${s.mono}`} style={{ color: asIsClears ? "var(--grn)" : "var(--red)" }}>
          {fmtCcy(asIsValue)}
        </span>
      </div>
      <div className={s.row}>
        <span className={s.rowL}>Refurb-net value @ new cap</span>
        <span className={`${s.rowV} ${s.mono}`} style={{ color: refurbClears ? "var(--grn)" : "var(--red)" }}>
          {fmtCcy(refurbNetValue)}
        </span>
      </div>
    </div>
  );
}

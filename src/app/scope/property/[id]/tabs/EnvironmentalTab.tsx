"use client";

// Design source: 02-dossier-full.html — tab "Environmental".
// Real fields only. Flood data comes from EA via the enrichment pipeline.
// Other environmental factors (contamination, radon, mining, etc.) are
// not yet wired and render as "—" per Rule 3.

import s from "../dossier.module.css";
import type { RawDeal } from "./types";

interface Props {
  deal: RawDeal;
}

function Row({ l, v, color }: { l: string; v: string; color?: "green" | "amber" | "red" }) {
  const c = color === "green" ? "var(--grn)" : color === "red" ? "var(--red)" : color === "amber" ? "var(--amb)" : "var(--tx)";
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={s.rowV} style={{ color: c }}>{v}</span>
    </div>
  );
}

export function EnvironmentalTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const flood = ds.flood as Record<string, unknown> | undefined;

  // Flood data shape (from enrich → fetchFloodRisk):
  //   { inFloodZone, riverFloodRisk, surfaceFloodRisk, floodZone, ... }
  const inFloodZone = (flood?.inFloodZone as boolean | undefined) ?? deal.inFloodZone ?? false;
  const riverRisk = (flood?.riverFloodRisk ?? flood?.riverSeaRisk) as string | undefined;
  const surfaceRisk = flood?.surfaceFloodRisk as string | undefined;
  const reservoirRisk = flood?.reservoirRisk as string | undefined;
  const floodZone = flood?.floodZone as string | undefined;
  const floodSummary = flood?.summary as string | undefined;

  function riskColor(r: string | undefined): "green" | "amber" | "red" | undefined {
    if (!r) return undefined;
    const lower = r.toLowerCase();
    if (lower.includes("very low") || lower === "low") return "green";
    if (lower.includes("medium") || lower.includes("moderate")) return "amber";
    if (lower.includes("high")) return "red";
    return undefined;
  }

  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Flood risk</div>
          {flood ? (
            <>
              <Row
                l="In flood zone"
                v={inFloodZone ? "Yes" : "No"}
                color={inFloodZone ? "amber" : "green"}
              />
              {floodZone && <Row l="Flood zone" v={floodZone} color={riskColor(floodZone)} />}
              <Row l="River / sea" v={riverRisk ?? "—"} color={riskColor(riverRisk)} />
              <Row l="Surface water" v={surfaceRisk ?? "—"} color={riskColor(surfaceRisk)} />
              <Row l="Reservoir breach" v={reservoirRisk ?? "—"} color={riskColor(reservoirRisk)} />
              {floodSummary && (
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 10, lineHeight: 1.5 }}>
                  {floodSummary}
                </div>
              )}
              <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
                Source: Environment Agency flood map (live API).
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
              Flood data not yet retrieved for this property. Re-run enrichment to populate.
            </div>
          )}
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}>Ground & contamination</div>
          <Row l="Contaminated land" v="—" />
          <Row l="Made ground" v="—" />
          <Row l="Landfill proximity" v="—" />
          <Row l="Radon" v="—" />
          <Row l="Subsidence" v="—" />
          <Row l="Mining records" v="—" />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
            Ground / contamination feeds (BGS, UKradon, Coal Authority) not yet wired.
            Commission a Phase 1 environmental search to populate.
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>EPC & energy</div>
        {deal.epcRating ? (
          <Row l="EPC rating" v={deal.epcRating} color={["F", "G"].includes(deal.epcRating) ? "red" : ["E"].includes(deal.epcRating) ? "amber" : "green"} />
        ) : (
          <>
            <Row l="EPC rating" v="—" />
            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>
              EPC register lookup pending. MEES risk cannot be assessed until a certificate is retrieved.
            </div>
          </>
        )}
        {/* MEES warning only fires on a real (register-confirmed) F/G rating */}
        {(deal.epcRating === "F" || deal.epcRating === "G") && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(240,96,96,.06)", border: "1px solid rgba(240,96,96,.2)", borderRadius: 6, fontSize: 12, color: "var(--tx2)" }}>
            <strong style={{ color: "var(--red)" }}>MEES risk:</strong> EPC {deal.epcRating} cannot be let after 1 Apr 2027 without exemption. Upgrade to E or above required.
          </div>
        )}
      </div>
    </>
  );
}

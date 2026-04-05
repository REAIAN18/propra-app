"use client";

/**
 * DS-T21: Property Tab Assembly
 * Assembles HeroPanel (T06), Gallery (T08), BuildingSpec (T09), EPC (T10), AISummary (T20).
 */

import { HeroPanel, AISummary } from "@/lib/dealscope/components";
import type { RawDeal } from "./types";
import s from "../dossier.module.css";

interface Props {
  deal: RawDeal;
  onBack?: () => void;
  onExportMemo?: () => void;
}

function Row({
  l, v, color, mono,
}: { l: string; v: string; color?: "green" | "amber" | "red"; mono?: boolean }) {
  const c = color === "green" ? "var(--grn)" : color === "amber" ? "var(--amb)" : color === "red" ? "var(--red)" : "var(--tx)";
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""}`} style={{ color: c }}>{v}</span>
    </div>
  );
}

export function PropertyTab({ deal, onBack, onExportMemo }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = ds.aiAnalysis as Record<string, unknown> | undefined;
  const listing = ds.listing as Record<string, unknown> | undefined;
  const epcData = ds.epcData as Record<string, unknown> | undefined;
  const images = (ds.images as string[] | undefined) ?? [];
  const features = (ai?.keyFeatures as string[] | undefined) ?? [];
  const description = (listing?.description ?? listing?.summary ?? ai?.summary) as string | undefined;
  const size = deal.buildingSizeSqft ?? deal.sqft;

  return (
    <>
      {/* T06 — Hero Panel */}
      <HeroPanel
        property={{
          address: deal.address,
          assetType: deal.assetType,
          buildingSizeSqft: size,
          yearBuilt: deal.yearBuilt,
          epcRating: deal.epcRating,
          tenure: deal.tenure,
          askingPrice: deal.askingPrice ?? deal.guidePrice,
          signals: deal.signals,
          hasInsolvency: deal.hasInsolvency,
          hasLisPendens: deal.hasLisPendens,
          dataSources: deal.dataSources,
        }}
        onBack={onBack}
        onExportMemo={onExportMemo}
      />

      {/* T20 — AI Summary */}
      {ai?.summary && (
        <AISummary
          summary={ai.summary as string}
          play={(ai.play as string | undefined) ?? undefined}
        />
      )}

      {/* Description */}
      {description && !ai?.summary && (
        <div className={s.card}>
          <div className={s.cardTitle}>Description</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {description}
          </div>
        </div>
      )}

      {/* Key features */}
      {features.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Key features</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--tx2)", lineHeight: 2 }}>
            {features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {/* T09 — Building Spec  |  T10 — EPC */}
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Building specification</div>
          {size != null && <Row l="Size" v={`${size.toLocaleString()} sqft`} mono />}
          {deal.tenure && <Row l="Tenure" v={deal.tenure} />}
          {deal.yearBuilt && <Row l="Year built" v={String(deal.yearBuilt)} mono />}
          {deal.occupancyPct != null && <Row l="Occupancy" v={`${Math.round(deal.occupancyPct * 100)}%`} />}
          {deal.brokerName && <Row l="Agent" v={deal.brokerName} />}
          {deal.daysOnMarket != null && <Row l="Days on market" v={String(deal.daysOnMarket)} mono />}
          {deal.sourceTag && <Row l="Source" v={deal.sourceTag} />}
          {!size && !deal.tenure && !deal.yearBuilt && !deal.brokerName && (
            <p style={{ fontSize: 11, color: "var(--tx3)", margin: 0 }}>No building data available yet.</p>
          )}
        </div>

        {(epcData ?? deal.epcRating) ? (
          <div className={s.card}>
            <div className={s.cardTitle}>Energy performance</div>
            <div className={s.epcRow}>
              <div className={s.epcBadge}>{(epcData?.epcRating as string | undefined) ?? deal.epcRating}</div>
              <div>
                <div className={s.epcRating}>Current: {(epcData?.epcRating as string | undefined) ?? deal.epcRating}</div>
                {epcData?.epcPotential != null && (
                  <div className={s.epcPotential}>Potential: {epcData.epcPotential as string}</div>
                )}
              </div>
            </div>
            {epcData?.validUntil != null && <Row l="Valid until" v={epcData.validUntil as string} mono />}
            {epcData?.meesRisk != null && <Row l="MEES compliance" v={epcData.meesRisk as string} color="amber" />}
            {epcData?.co2Emissions != null && <Row l="CO₂ emissions" v={epcData.co2Emissions as string} />}
          </div>
        ) : (
          <div className={s.card}>
            <div className={s.cardTitle}>Energy performance</div>
            <p style={{ fontSize: 11, color: "var(--tx3)", margin: 0 }}>EPC data not available.</p>
          </div>
        )}
      </div>

      {/* T08 — Image Gallery */}
      {images.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Gallery</div>
          <div className={s.gallery}>
            {images.slice(0, 8).map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Property view ${i + 1}`}
                className={s.galImg}
                style={{ width: "100%", height: 78, objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Agent contact */}
      {listing?.agentContact != null && (listing.agentContact as Record<string, unknown>).name != null && (
        <div className={s.card}>
          <div className={s.cardTitle}>Agent contact</div>
          <Row l="Name" v={(listing.agentContact as Record<string, unknown>).name as string} />
          {(listing.agentContact as Record<string, unknown>).phone != null && (
            <Row l="Phone" v={(listing.agentContact as Record<string, unknown>).phone as string} />
          )}
          {(listing.agentContact as Record<string, unknown>).email != null && (
            <Row l="Email" v={(listing.agentContact as Record<string, unknown>).email as string} />
          )}
        </div>
      )}
    </>
  );
}

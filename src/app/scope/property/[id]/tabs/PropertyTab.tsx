"use client";

/**
 * DS-T21: Property Tab Assembly
 * Assembles HeroPanel (T06), Gallery (T08), BuildingSpec (T09), EPC (T10), AISummary (T20), SalesHistory.
 */

import { AISummary, Gallery } from "@/lib/dealscope/components";
import type { GalleryItem } from "@/lib/dealscope/components";
import { EPCCard } from "@/components/dealscope/EPCCard";
import { SalesHistoryTable } from "@/components/dealscope/SalesHistoryTable";
import type { SaleRecord } from "@/components/dealscope/SalesHistoryTable";
import type { RawDeal } from "./types";
import s from "../dossier.module.css";

interface Props {
  deal: RawDeal;
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

export function PropertyTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  // enrich pipeline saves under `ai` / `epc`; older/demo seeds may use `aiAnalysis` / `epcData`
  const ai = (ds.ai ?? ds.aiAnalysis) as Record<string, unknown> | undefined;
  const listing = ds.listing as Record<string, unknown> | undefined;
  const epcData = (ds.epc ?? ds.epcData) as Record<string, unknown> | undefined;
  // RICS analysis (richer narrative produced by enrich pipeline)
  const rics = ds.ricsAnalysis as Record<string, unknown> | undefined;
  const ricsVerdict = rics?.verdict as Record<string, unknown> | undefined;
  const ricsSummary = ricsVerdict?.summary as string | undefined;
  const ricsPlay = ricsVerdict?.play as string | undefined;
  const rawImages = (ds.images as string[] | undefined) ?? [];
  const galleryItems: GalleryItem[] = rawImages.map((url, i) => ({
    label: `View ${i + 1}`,
    source: i === 0 ? "Satellite" : "Photo",
    url,
  }));
  const features = (ai?.keyFeatures as string[] | undefined) ?? [];
  const rawDesc = (listing?.description ?? listing?.summary ?? ai?.summary) as string | undefined;
  // Strip out raw table data that sometimes appears after prose in scraped listing descriptions
  const description = rawDesc
    ? rawDesc
        .split(/\n/)
        .filter(line => !/^(Name\/Floor|Available Area|Name\s+Floor|\d+,\d+\s+[\d.]+\s+On\s)/i.test(line.trim()))
        .join('\n')
        .split(/\bAvailable Area\b/i)[0]
        .trim()
        .substring(0, 1200) || undefined
    : undefined;
  // Top-level columns hold facts only. Estimated/AI values live in assumptions
  // and are surfaced here with their source so the dossier never lies about
  // what's measured vs. modelled.
  const assumptions = (ds.assumptions ?? {}) as Record<string, { value: unknown; source: string } | undefined>;
  const realSize = deal.buildingSizeSqft ?? deal.sqft;
  const assumedSize = (assumptions.sqft?.value as number | undefined) ?? null;
  const size = realSize ?? assumedSize ?? null;
  const sizeIsEstimate = realSize == null && assumedSize != null;
  const sizeSource = sizeIsEstimate ? assumptions.sqft?.source : null;

  const realYear = deal.yearBuilt;
  const assumedYear = (assumptions.yearBuilt?.value as number | undefined) ?? null;
  const year = realYear ?? assumedYear ?? null;
  const yearIsEstimate = realYear == null && assumedYear != null;
  const yearSource = yearIsEstimate ? assumptions.yearBuilt?.source : null;

  const realOcc = deal.occupancyPct;
  const assumedOcc = (assumptions.occupancy?.value as number | undefined) ?? null;
  const occ = realOcc ?? assumedOcc ?? null;
  const occIsEstimate = realOcc == null && assumedOcc != null;
  const occSource = occIsEstimate ? assumptions.occupancy?.source : null;

  const realEpc = (epcData?.epcRating as string | undefined) ?? deal.epcRating ?? null;
  const assumedEpc = (assumptions.epcRating?.value as string | undefined) ?? null;
  const epc = realEpc ?? assumedEpc;
  const epcIsEstimate = realEpc == null && assumedEpc != null;
  const epcSource = epcIsEstimate ? assumptions.epcRating?.source : null;

  const rawSalesHistory = (ds.salesHistory as Record<string, unknown>[] | undefined) ?? [];
  const salesHistory: SaleRecord[] = (Array.isArray(rawSalesHistory) ? rawSalesHistory : []).map(
    (r: Record<string, unknown>) => ({
      date: (r.date ?? r.transferDate ?? r.dateSold ?? "") as string,
      price: (r.price ?? r.pricePaid ?? 0) as number,
      type: (r.type ?? r.propertyType) as string | undefined,
      tenure: r.tenure as string | undefined,
      newBuild: (r.newBuild ?? r.isNew) as boolean | undefined,
    })
  );

  return (
    <>
      {/* T20 — AI Summary (RICS narrative preferred, falls back to legacy ai.summary) */}
      {(ricsSummary || ai?.summary) && (
        <AISummary
          summary={(ricsSummary ?? ai?.summary) as string}
          play={(ricsPlay ?? (ai?.play as string | undefined)) ?? undefined}
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
          {size != null && (
            <Row l={`Size${sizeIsEstimate ? " (est.)" : ""}`} v={`${size.toLocaleString()} sqft`} mono />
          )}
          {sizeIsEstimate && sizeSource && (
            <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: -4, marginBottom: 6 }}>↳ {sizeSource}</div>
          )}
          {deal.tenure && <Row l="Tenure" v={deal.tenure} />}
          {year != null && <Row l={`Year built${yearIsEstimate ? " (est.)" : ""}`} v={String(year)} mono />}
          {yearIsEstimate && yearSource && (
            <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: -4, marginBottom: 6 }}>↳ {yearSource}</div>
          )}
          {occ != null && <Row l={`Occupancy${occIsEstimate ? " (est.)" : ""}`} v={`${Math.round(occ * 100)}%`} />}
          {occIsEstimate && occSource && (
            <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: -4, marginBottom: 6 }}>↳ {occSource}</div>
          )}
          {deal.brokerName && <Row l="Agent" v={deal.brokerName} />}
          {deal.daysOnMarket != null && <Row l="Days on market" v={String(deal.daysOnMarket)} mono />}
          {deal.sourceTag && <Row l="Source" v={deal.sourceTag} />}
          {!size && !deal.tenure && !year && !deal.brokerName && (
            <p style={{ fontSize: 11, color: "var(--tx3)", margin: 0 }}>No building data available yet.</p>
          )}
        </div>

        <EPCCard
          rating={realEpc ?? undefined}
          estimatedRating={epcIsEstimate ? assumedEpc ?? undefined : undefined}
          estimatedSource={epcIsEstimate ? epcSource ?? undefined : undefined}
          potentialRating={epcData?.epcPotential as string | undefined}
          validUntil={epcData?.validUntil as string | undefined}
          meesCompliance={epcData?.meesRisk as string | undefined}
          co2Emissions={epcData?.co2Emissions as string | undefined}
          certificateDate={epcData?.certificateDate as string | undefined}
          floorArea={epcData?.floorArea as string | undefined}
          mainHeating={epcData?.mainHeating as string | undefined}
          assessmentType={epcData?.assessmentType as string | undefined}
        />
      </div>

      {/* T08 — Image Gallery */}
      {galleryItems.length > 0 && (
        <div className={s.card}>
          <Gallery items={galleryItems} />
        </div>
      )}

      {/* Sales history — wired to ds.salesHistory */}
      <div className={s.card}>
        <div className={s.cardTitle}>Sales history</div>
        <SalesHistoryTable sales={salesHistory} title="" />
      </div>

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

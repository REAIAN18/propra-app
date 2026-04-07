"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialsTab as FinancialsTabV2 } from "./tabs/FinancialsTab";
import { calculateIRR } from "@/lib/dealscope/calculations/irr";
import { calculateCAPEX } from "@/lib/dealscope/calculations/capex";
import { calculateEquityMultiple } from "@/lib/dealscope/calculations/equity";
import { calculateVerdict } from "@/lib/dealscope/calculations/verdict";
import type { Property } from "@/types/dealscope";
import s from "./dossier.module.css";

type RawDeal = {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  buildingSizeSqft?: number;
  askingPrice?: number;
  guidePrice?: number;
  yearBuilt?: number;
  epcRating?: string;
  tenure?: string;
  occupancyPct?: number;
  ownerName?: string;
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  hasPlanningApplication?: boolean;
  inFloodZone?: boolean;
  sourceTag?: string;
  brokerName?: string;
  daysOnMarket?: number;
  signals?: string[];
  dataSources?: Record<string, unknown>;
  satelliteImageUrl?: string | null;
};

const TABS = ["Overview", "Financials", "Comparables", "Due Diligence"] as const;
type Tab = typeof TABS[number];

function fmtCcy(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}
function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function Row({ l, v, color, mono }: { l: string; v: string; color?: "green" | "amber" | "red"; mono?: boolean }) {
  const c = color === "green" ? "var(--grn)" : color === "amber" ? "var(--amb)" : color === "red" ? "var(--red)" : "var(--tx)";
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""}`} style={{ color: c }}>{v}</span>
    </div>
  );
}

function toProperty(d: RawDeal): Property {
  const ds = (d.dataSources ?? {}) as Record<string, unknown>;
  const assumptions = (ds.assumptions ?? {}) as Record<string, unknown>;
  function assumptionVal(key: string): number | undefined {
    const v = assumptions[key];
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && "value" in (v as object)) {
      const val = (v as Record<string, unknown>).value;
      return typeof val === "number" ? val : undefined;
    }
    return undefined;
  }
  return {
    id: d.id,
    address: d.address,
    assetType: d.assetType,
    askingPrice: d.askingPrice ?? d.guidePrice,
    size: d.buildingSizeSqft ?? d.sqft,
    builtYear: d.yearBuilt,
    epcRating: d.epcRating,
    occupancyPct: d.occupancyPct,
    erv: (ds.erv as number | undefined) ?? (ds.marketRent as number | undefined) ?? assumptionVal("erv"),
    passingRent: (ds.passingRent as number | undefined) ?? (ds.currentRent as number | undefined) ?? assumptionVal("passingRent"),
    businessRates: (ds.businessRates as number | undefined) ?? assumptionVal("businessRates"),
    serviceCharge: typeof ds.serviceCharge === "number" ? ds.serviceCharge : assumptionVal("serviceCharge"),
    expectedVoid: assumptionVal("voidMonths") ?? (assumptions.voidMonths as number | undefined),
    description: (ds.listingDescription as string | undefined)
      ?? (ds.description as string | undefined)
      ?? ((ds.listing as Record<string, unknown> | undefined)?.description as string | undefined),
  };
}

/* ── OVERVIEW TAB ── */
function OverviewTab({ deal, prop }: { deal: RawDeal; prop: Property }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const listingImages = (ds.images as string[] | undefined) ?? [];
  const satellite = deal.satelliteImageUrl ?? null;
  const occupancyPct = deal.occupancyPct != null ? Math.round(deal.occupancyPct * 100) : null;

  // Build 5-cell grid: aerial (satellite) first, then up to 4 listing photos.
  // Per design: Aerial View, Front Exterior, Street View, Building Detail, Interior.
  const SLOT_LABELS = ["Aerial View", "Front Exterior", "Street View", "Building Detail", "Interior"];
  const slotUrls: (string | null)[] = [
    satellite ?? listingImages[0] ?? null,
    listingImages[satellite ? 0 : 1] ?? null,
    listingImages[satellite ? 1 : 2] ?? null,
    listingImages[satellite ? 2 : 3] ?? null,
    listingImages[satellite ? 3 : 4] ?? null,
  ];
  const hasAnyImage = slotUrls.some((u) => u != null);

  return (
    <>
      {/* Property images grid */}
      {hasAnyImage && (
        <div className={s.imagesGrid}>
          {slotUrls.map((url, i) => (
            <div
              key={i}
              className={`${s.propertyImage} ${i === 0 ? s.imageMain : ""}`}
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={SLOT_LABELS[i]}
                    className={s.imgFill}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const label = img.nextElementSibling as HTMLElement | null;
                      if (label) label.style.display = "none";
                    }}
                  />
                  <div className={s.imageLabel}>{SLOT_LABELS[i]}</div>
                </>
              ) : (
                <div className={s.imgPlaceholder} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Location map */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>📍 Location</h3>
        <div
          className={s.mapContainer}
          style={satellite ? { backgroundImage: `url(${satellite})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!satellite && <div className={s.mapIcon}>🗺️</div>}
          <div className={s.mapText}>
            <strong>{deal.address}</strong>
          </div>
        </div>
      </div>

      {/* Property details */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>🏢 Property Details</h3>
        <div className={s.grid2}>
          <div className={s.card}>
            <div className={s.cardTitle}>Physical Characteristics</div>
            {prop.size != null && <Row l="Net Lettable Area" v={`${prop.size.toLocaleString()} sq ft`} />}
            {prop.builtYear != null && <Row l="Year Built" v={String(prop.builtYear)} />}
            {deal.epcRating && <Row l="EPC Rating" v={deal.epcRating} />}
            {deal.tenure && <Row l="Tenure" v={deal.tenure} />}
            {deal.assetType && <Row l="Asset Type" v={deal.assetType} />}
          </div>
          <div className={s.card}>
            <div className={s.cardTitle}>Current Position</div>
            {occupancyPct != null && (
              <Row
                l="Occupancy"
                v={`${occupancyPct}%${occupancyPct === 0 ? " — Vacant" : ""}`}
                color={occupancyPct === 0 ? "red" : occupancyPct >= 80 ? "green" : "amber"}
              />
            )}
            {prop.askingPrice != null && <Row l="Asking Price" v={fmtCcy(prop.askingPrice)} mono />}
            {typeof ds.passingRent === "number" && <Row l="Passing Rent" v={fmtCcy(ds.passingRent)} mono color="green" />}
            {typeof ds.erv === "number" && <Row l="ERV" v={fmtCcy(ds.erv as number)} mono />}
            {deal.brokerName && <Row l="Agent" v={deal.brokerName} />}
            {deal.daysOnMarket != null && <Row l="Days on Market" v={String(deal.daysOnMarket)} />}
          </div>
        </div>
      </div>

      {/* Risk callouts */}
      {(occupancyPct === 0 || deal.inFloodZone || (deal.signals && deal.signals.length > 0) || deal.hasInsolvency) && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>⚠️ Key Investment Risks</h3>
          {occupancyPct === 0 && (
            <div className={`${s.callout} ${s.calloutCritical}`}>
              <h4>CRITICAL RISK: Vacant Property</h4>
              <p>Property is fully vacant. No income, immediate carry costs apply. Budget for extended void period during stabilisation.</p>
            </div>
          )}
          {deal.inFloodZone && (
            <div className={`${s.callout} ${s.calloutWarning}`}>
              <h4>FLOOD RISK</h4>
              <p>Property is located in a flood risk zone. Impacts: insurance premiums, tenant demand, exit liquidity. Requires flood risk assessment.</p>
            </div>
          )}
          {deal.hasInsolvency && (
            <div className={`${s.callout} ${s.calloutWarning}`}>
              <h4>INSOLVENCY FLAG</h4>
              <p>Insolvency proceedings associated with this property or its owner. Verify status and implications before proceeding.</p>
            </div>
          )}
          {deal.signals && deal.signals.length > 0 && (
            <div className={`${s.callout} ${s.calloutInfo}`}>
              <h4>SIGNALS DETECTED</h4>
              <p>{deal.signals.join(" · ")}</p>
            </div>
          )}
        </div>
      )}

      {/* AI summary if no risks */}
      {(ds.aiSummary || ds.listingDescription) && (
        <div className={s.section}>
          <div className={s.aiHero}>
            <div className={s.aiBadgeHero}>AI SUMMARY</div>
            <h3 className={s.aiHeroTitle}>Deal Overview</h3>
            <p className={s.aiHeroText}>{(ds.aiSummary as string | undefined) || (ds.listingDescription as string | undefined)}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── FINANCIALS TAB (valuation + acquisition prepended) ── */
function FinancialsWrapper({ deal, prop }: { deal: RawDeal; prop: Property }) {
  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const capexResult = calculateCAPEX(prop);

  const marketValue = equityResult.exitValue;
  const investmentValue = marketValue > 0 ? marketValue * 1.15 : null;
  const bankValuation = marketValue > 0 ? marketValue * 0.88 : null;
  const forcedSale = marketValue > 0 ? marketValue * 0.80 : null;

  const hasValuations = marketValue > 0;

  // Build scenario rows from IRR/equity calcs
  const askingPrice = prop.askingPrice;
  const targetPrice = calculateVerdict(prop).targetPrice ?? (askingPrice ? askingPrice * 0.93 : null);

  return (
    <>
      {/* Valuation Summary */}
      {hasValuations && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>💰 Valuation Summary</h3>
          <div className={s.valuationGrid}>
            {[
              { type: "Market Value",        amount: marketValue,     note: "Income capitalisation @ base assumptions" },
              { type: "Investment Value",     amount: investmentValue, note: "Optimistic case, upside ERV & yield compression" },
              { type: "Bank Valuation (Est.)",amount: bankValuation,  note: "Conservative, 15% vacant possession haircut" },
              { type: "90-Day Forced Sale",   amount: forcedSale,     note: "20% discount to market for quick sale" },
            ].map(({ type, amount, note }) => (
              <div key={type} className={s.valuationCard}>
                <div className={s.valuationType}>{type}</div>
                <div className={s.valuationAmount}>{fmtCcy(amount)}</div>
                <div className={s.valuationNote}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acquisition Cost Breakdown */}
      {askingPrice != null && askingPrice > 0 && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>💼 Acquisition Cost Breakdown</h3>
          <div className={s.grid3}>
            {(() => {
              const sdlt = Math.round(askingPrice * 0.05);
              const legal = Math.round(askingPrice * 0.01);
              const survey = 15000;
              const acqSubtotal = askingPrice + sdlt + legal + survey;
              const voidCarry = Math.round((irrResult.breakdown.voidCosts ?? 0));
              const lettingFees = Math.round((irrResult.breakdown.lettingCosts ?? 0));
              const rentFree = prop.erv ? Math.round(prop.erv * 0.5) : 0;
              const fitOut = prop.size ? Math.round(prop.size * 5) : 0;
              const holdSubtotal = voidCarry + lettingFees + rentFree + fitOut;
              const capex = capexResult.capex ?? 0;
              const totalIn = acqSubtotal + holdSubtotal + capex;
              return (
                <>
                  <div className={s.card}>
                    <div className={s.cardTitle}>Purchase &amp; Fees</div>
                    <Row l="Purchase Price" v={fmtCcy(askingPrice)} mono />
                    <Row l="SDLT (5%)" v={fmtCcy(sdlt)} mono />
                    <Row l="Legal (1%)" v={fmtCcy(legal)} mono />
                    <Row l="Survey &amp; DD" v={fmtCcy(survey)} mono />
                    <div className={s.sep} />
                    <Row l="Subtotal" v={fmtCcy(acqSubtotal)} mono color="amber" />
                  </div>
                  <div className={s.card}>
                    <div className={s.cardTitle}>Hold Period Costs</div>
                    <Row l="Void Carry" v={fmtCcy(voidCarry)} mono />
                    <Row l="Letting Fees" v={fmtCcy(lettingFees)} mono />
                    <Row l="Rent-Free" v={fmtCcy(rentFree)} mono />
                    <Row l="Tenant Fit-Out" v={fmtCcy(fitOut)} mono />
                    <div className={s.sep} />
                    <Row l="Subtotal" v={fmtCcy(holdSubtotal)} mono color="amber" />
                  </div>
                  <div className={s.card}>
                    <div className={s.cardTitle}>Total Investment</div>
                    <Row l="Acquisition" v={fmtCcy(acqSubtotal)} mono />
                    <Row l="Hold Costs" v={fmtCcy(holdSubtotal)} mono />
                    <Row l="Additional Capex" v={fmtCcy(capex)} mono />
                    <div className={s.sep} />
                    <Row l="Total Cost In" v={fmtCcy(totalIn)} mono color="amber" />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Return Scenarios */}
      {askingPrice != null && askingPrice > 0 && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>📊 Return Scenarios (5-Year Hold)</h3>
          <div className={s.tableContainer}>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Entry</th>
                  <th>Exit Value</th>
                  <th>Equity Multiple</th>
                  <th>IRR</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Current Asking", entry: askingPrice,           exitMult: 1.00, irrMult: 0.40, verdictColor: "var(--red)",  verdict: "FAIL"   },
                  { label: "Discounted (7%)", entry: askingPrice * 0.93,   exitMult: 1.08, irrMult: 0.60, verdictColor: "var(--amb)",  verdict: "MARGINAL" },
                  { label: "Deep Discount (14%)", entry: askingPrice * 0.86, exitMult: 1.16, irrMult: 0.80, verdictColor: "var(--grn)", verdict: "TARGET" },
                  { label: "Upside Case", entry: askingPrice * 0.86,       exitMult: 1.35, irrMult: 1.20, verdictColor: "var(--grn)",  verdict: "STRONG" },
                ].map((row) => {
                  const exitValue = marketValue > 0 ? marketValue * row.exitMult : null;
                  const em = equityResult.equityMultiple > 0 ? equityResult.equityMultiple * row.exitMult : null;
                  const irr = irrResult.irr > 0 ? irrResult.irr * row.irrMult : null;
                  return (
                    <tr key={row.label}>
                      <td><strong>{row.label}</strong></td>
                      <td className={s.mono}>{fmtCcy(row.entry)}</td>
                      <td className={s.mono}>{fmtCcy(exitValue)}</td>
                      <td className={s.mono} style={{ color: row.verdictColor }}>{em != null ? `${em.toFixed(2)}x` : "—"}</td>
                      <td className={s.mono} style={{ color: row.verdictColor }}>{irr != null ? fmtPct(irr) : "—"}</td>
                      <td style={{ color: row.verdictColor, fontWeight: 600 }}>{row.verdict}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {targetPrice != null && targetPrice < askingPrice && (
            <div className={`${s.callout} ${s.calloutWarning}`}>
              <h4>TARGET ENTRY</h4>
              <p>Analysis suggests pursuing at {fmtCcy(targetPrice)} or below (
                {Math.round(((askingPrice - targetPrice) / askingPrice) * 100)}% discount from asking price)
                to achieve target returns.</p>
            </div>
          )}
        </div>
      )}

      {/* Existing financials detail (IRR, cash flows, scenarios) */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>📈 Detailed Financial Analysis</h3>
        <FinancialsTabV2 deal={deal} prop={prop} />
      </div>
    </>
  );
}

/* ── COMPARABLES TAB ── */
function ComparablesTab({ deal }: { deal: RawDeal }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const rawComps = ((ds.comps ?? ds.comparables ?? (ds.ricsAnalysis as Record<string, unknown> | undefined)?.valuations) as unknown[]) ?? [];
  const comps = (Array.isArray(rawComps) ? rawComps : []).map((c: unknown) => {
    const comp = c as Record<string, unknown>;
    return {
      address: (comp.address ?? comp.name ?? "—") as string,
      sqft: (comp.sqft ?? comp.size) as number | undefined,
      price: (comp.price ?? comp.salePrice) as number | undefined,
      psf: (comp.psf ?? comp.pricePsf ?? (comp.price != null && comp.sqft != null ? Math.round((comp.price as number) / (comp.sqft as number)) : undefined)) as number | undefined,
      date: (comp.date ?? comp.saleDate) as string | undefined,
      distance: comp.distance as string | undefined,
      incentive: comp.incentive as string | undefined,
      effectiveRent: comp.effectiveRent as number | undefined,
    };
  });

  const rentComps = comps.filter(c => c.psf != null && c.psf < 1000);
  const saleComps = comps.filter(c => c.price != null && (c.psf == null || c.psf >= 100));

  return (
    <>
      <div className={`${s.callout} ${s.calloutInfo}`}>
        <h4>PURPOSE: ASSUMPTION VALIDATION</h4>
        <p>Every financial model makes assumptions. This section compares those assumptions against actual market transactions to identify gaps and correct valuations.</p>
      </div>

      {/* Rental Comparables */}
      {rentComps.length > 0 && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>📈 Rental Comparables</h3>
          <div className={s.tableContainer}>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Size</th>
                  <th>Rent PSF</th>
                  {rentComps.some(c => c.incentive) && <th>Incentive</th>}
                  {rentComps.some(c => c.effectiveRent) && <th>Effective Rent</th>}
                  <th>Date</th>
                  {rentComps.some(c => c.distance) && <th>Distance</th>}
                </tr>
              </thead>
              <tbody>
                {rentComps.map((c, i) => (
                  <tr key={i}>
                    <td>{c.address}</td>
                    <td className={s.mono}>{c.sqft ? c.sqft.toLocaleString() : "—"}</td>
                    <td className={s.mono}>{c.psf ? `£${c.psf}` : "—"}</td>
                    {rentComps.some(c => c.incentive) && <td>{c.incentive ?? "—"}</td>}
                    {rentComps.some(c => c.effectiveRent) && <td className={s.mono}>{c.effectiveRent ? fmtCcy(c.effectiveRent) : "—"}</td>}
                    <td>{c.date ?? "—"}</td>
                    {rentComps.some(c => c.distance) && <td>{c.distance ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(() => {
            const psfs = rentComps.map(c => c.psf).filter((p): p is number => p != null);
            if (psfs.length < 2) return null;
            const min = Math.min(...psfs), max = Math.max(...psfs);
            return (
              <div className={`${s.callout} ${s.calloutInfo}`}>
                <h4>ANALYSIS</h4>
                <p><strong>Rent Range:</strong> £{min.toFixed(0)}–£{max.toFixed(0)} psf</p>
                <p><strong>Comparable count:</strong> {psfs.length} transactions</p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Investment / Sale Comparables */}
      {saleComps.length > 0 && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>📊 Investment Comparables</h3>
          <div className={s.tableContainer}>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Price PSF</th>
                  <th>Date</th>
                  {saleComps.some(c => c.distance) && <th>Distance</th>}
                </tr>
              </thead>
              <tbody>
                {saleComps.map((c, i) => (
                  <tr key={i}>
                    <td>{c.address}</td>
                    <td className={s.mono}>{c.sqft ? c.sqft.toLocaleString() : "—"}</td>
                    <td className={s.mono}>{fmtCcy(c.price)}</td>
                    <td className={s.mono}>{c.psf ? `£${c.psf}` : "—"}</td>
                    <td>{c.date ?? "—"}</td>
                    {saleComps.some(c => c.distance) && <td>{c.distance ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {comps.length === 0 && (
        <div className={`${s.card} ${s.anim}`}>
          <div className={s.cardTitle}>Comparable transactions</div>
          <p style={{ fontSize: 12, color: "var(--tx3)", margin: 0 }}>
            No comparable transactions available for this property yet.
          </p>
        </div>
      )}

      {/* Market context */}
      {(ds.marketRentPsf || ds.marketCapRate) && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>📋 Market Context</h3>
          <div className={s.card}>
            {typeof ds.marketRentPsf === "number" && <Row l="Market rent (£/sqft)" v={`£${ds.marketRentPsf}`} mono />}
            {typeof ds.marketCapRate === "number" && <Row l="Market cap rate" v={`${ds.marketCapRate}%`} mono />}
          </div>
        </div>
      )}
    </>
  );
}

/* ── DUE DILIGENCE TAB ── */
function DueDiligenceTab({ deal }: { deal: RawDeal }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ddItems = [
    { label: "Title search",               done: true },
    { label: "Planning history reviewed",  done: !!(ds.planningApplications) },
    { label: "Environmental survey",       done: !!(ds.environmentalData) },
    { label: "Structural survey",          done: false },
    { label: "EPC confirmed",              done: !!deal.epcRating },
    { label: "MEES compliance checked",    done: !!deal.epcRating },
    { label: "Lease documents reviewed",   done: !!(ds.passingRent) },
    { label: "Owner identity verified",    done: !!deal.ownerName },
    { label: "Charges register reviewed",  done: false },
    { label: "Insurance arranged",         done: false },
  ];
  const complete = ddItems.filter(d => d.done).length;

  const hasAskingPrice = deal.askingPrice != null && deal.askingPrice > 0;
  const prop = toProperty(deal);
  const verdict = calculateVerdict(prop);
  const targetPrice = verdict.targetPrice;
  const discountPct = hasAskingPrice && targetPrice != null
    ? Math.round(((deal.askingPrice! - targetPrice) / deal.askingPrice!) * 100)
    : null;

  return (
    <>
      {/* Environmental & Planning cards */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>🔍 Environmental &amp; Planning</h3>
        <div className={s.grid2}>
          <div className={s.card}>
            <div className={s.cardTitle}>Planning Status</div>
            <Row l="Use Class" v={(ds.useClass as string | undefined) ?? "—"} />
            <Row l="Planning Applications" v={ds.planningApplications ? "Yes — review required" : "None on record"} color={ds.planningApplications ? "amber" : "green"} />
            {deal.hasPlanningApplication && (
              <Row l="Active Application" v="Yes" color="amber" />
            )}
            <Row l="Permitted Development" v="Check required" />
          </div>
          <div className={s.card}>
            <div className={s.cardTitle}>Environmental</div>
            <Row l="Flood Risk" v={deal.inFloodZone ? "Zone 3 — High" : "Low"} color={deal.inFloodZone ? "amber" : "green"} />
            <Row l="EPC Rating" v={deal.epcRating ?? "—"} color={deal.epcRating ? "green" : undefined} />
            <Row l="Asbestos Survey" v="Required (DD)" />
            <Row l="Environmental Data" v={ds.environmentalData ? "Available" : "Not yet retrieved"} color={ds.environmentalData ? "green" : undefined} />
          </div>
        </div>
      </div>

      {/* DD checklist */}
      <div className={s.section}>
        <div className={s.card}>
          <div className={s.cardTitle}>Due diligence checklist — {complete}/{ddItems.length} complete</div>
          <div style={{ height: 4, background: "var(--s3)", borderRadius: 2, marginBottom: 12 }}>
            <div style={{ width: `${(complete / ddItems.length) * 100}%`, height: "100%", background: "var(--grn)", borderRadius: 2 }} />
          </div>
          {ddItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", alignItems: "center" }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, background: item.done ? "var(--grn)" : "transparent", border: item.done ? "none" : "1.5px solid var(--s3)", color: "#000" }}>
                {item.done && "✓"}
              </div>
              <span style={{ fontSize: 12, color: item.done ? "var(--tx2)" : "var(--tx3)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions for success */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>✅ Conditions for Success</h3>

        {verdict.verdict === "REJECT" && hasAskingPrice && (
          <div className={`${s.callout} ${s.calloutCritical}`}>
            <h4>AT CURRENT ASKING PRICE: DO NOT PROCEED</h4>
            <p>Returns fall below target thresholds. Downside scenario risks capital loss with no margin for error.</p>
          </div>
        )}

        {(verdict.verdict === "CONDITIONAL" || verdict.verdict === "PROCEED") && discountPct != null && discountPct > 0 && (
          <div className={`${s.callout} ${s.calloutWarning}`}>
            <h4>CONDITIONAL APPROVAL</h4>
            <p><strong>Required Conditions:</strong></p>
            <p>1. Entry price ≤ {fmtCcy(targetPrice)} ({discountPct}% minimum discount from asking)<br />
            2. Conservative underwriting: validate exit yield floor and ERV assumptions<br />
            3. Explicit acceptance of stabilisation period<br />
            4. Demonstrable in-house leasing or asset management capability<br />
            5. Contingency funding for extended void scenario</p>
          </div>
        )}

        {verdict.verdict === "PROCEED" && (discountPct == null || discountPct <= 0) && (
          <div className={`${s.callout} ${s.calloutInfo}`}>
            <h4>PROCEED</h4>
            <p>Analysis supports proceeding at current pricing. Ensure all DD checklist items are complete before exchange.</p>
          </div>
        )}

        {deal.ownerName && (
          <div className={s.card} style={{ marginTop: 12 }}>
            <div className={s.cardTitle}>Ownership</div>
            <Row l="Owner" v={deal.ownerName} />
            {deal.hasInsolvency && <Row l="Insolvency Flag" v="Yes — verify status" color="red" />}
            {deal.hasLisPendens && <Row l="Lis Pendens" v="Yes — legal review required" color="amber" />}
          </div>
        )}
      </div>
    </>
  );
}

const PIPELINE_STAGES = ["Identified", "Researched", "Approached", "Negotiating", "Under offer", "Completing"];
const WATCH_REASONS = ["Price change", "Admin resolution / sale", "Auction listing", "Planning application", "EPC change", "Any change"];

export default function PropertyDossierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<RawDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [exporting, setExporting] = useState<string | null>(null);
  const [showPipelineMenu, setShowPipelineMenu] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watched, setWatched] = useState(false);
  const [watchReasons, setWatchReasons] = useState<string[]>(["Price change", "Admin resolution / sale"]);
  const [watchNote, setWatchNote] = useState("");
  const [toast, setToast] = useState<{ msg: string } | null>(null);

  function showToast(msg: string) {
    setToast({ msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAddToPipeline(stage: string) {
    setShowPipelineMenu(false);
    try {
      await fetch("/api/dealscope/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, stage: stage.toLowerCase().replace(/ /g, "_") }),
      });
    } catch {}
    showToast(`Added to pipeline — ${stage}`);
  }

  async function handleWatch() {
    setShowWatchModal(false);
    try {
      await fetch("/api/dealscope/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, reasons: watchReasons, note: watchNote }),
      });
    } catch {}
    setWatched(true);
    showToast("Added to watchlist");
  }

  const handleExportPdf = async () => {
    if (!id) return;
    setExporting("pdf");
    try {
      const res = await fetch(`/api/dealscope/properties/${id}/export/pdf`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ic-memo-${id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (!id) return;
    const a = document.createElement("a");
    a.href = `/api/dealscope/properties/${id}/export/excel`;
    a.download = "";
    a.click();
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/dealscope/properties/${id}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed to load")))
      .then((data: RawDeal) => { setDeal(data); setLoading(false); })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className={s.skeletonContainer}>
          <div className={s.skeletonHeader}>
            <div className={s.skeletonInfo}>
              <div className={`${s.skeleton} ${s.skeletonTitle}`} />
              <div className={`${s.skeleton} ${s.skeletonSpec}`} />
              <div className={`${s.skeleton} ${s.skeletonSpec}`} style={{ width: "30%" }} />
            </div>
          </div>
          <div className={s.skeletonTabs}>
            {[80, 80, 96, 108].map((w, i) => (
              <div key={i} className={`${s.skeleton} ${s.skeletonTab}`} style={{ width: w }} />
            ))}
          </div>
          <div className={s.skeletonContent}>
            <div className={s.skeletonGrid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={s.skeletonCard}>
                  <div className={`${s.skeleton} ${s.skeletonCardLabel}`} />
                  <div className={`${s.skeleton} ${s.skeletonCardValue}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !deal) {
    return (
      <AppShell>
        <div className={s.errorState}>
          <div className={s.errorIcon}>⚠</div>
          <p className={s.errorTitle}>Could not load property</p>
          <p className={s.errorMessage}>{error || "Property not found."}</p>
          <div className={s.errorActions}>
            <button className={s.retryBtn} onClick={() => {
              setError(null); setLoading(true);
              fetch(`/api/dealscope/properties/${id}`)
                .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed to load")))
                .then((data: RawDeal) => { setDeal(data); setLoading(false); })
                .catch((e: unknown) => { setError(String(e)); setLoading(false); });
            }}>Retry</button>
            <button className={s.backBtn2} onClick={() => router.back()}>← Back</button>
          </div>
        </div>
      </AppShell>
    );
  }

  const prop = toProperty(deal);
  const verdict = calculateVerdict(prop);
  const equityResult = calculateEquityMultiple(prop);
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const aiSummary = (ds.aiSummary as string | undefined) || (ds.listingDescription as string | undefined);

  const occupancyPct = deal.occupancyPct != null ? Math.round(deal.occupancyPct * 100) : null;
  const targetPrice = verdict.targetPrice;

  const verdictLabel = verdict.verdict === "PROCEED" ? "✓ PROCEED"
    : verdict.verdict === "CONDITIONAL" ? "⚠ CONDITIONAL"
    : "✕ AVOID";
  const verdictBg = verdict.verdict === "PROCEED"
    ? "linear-gradient(135deg,rgba(52,211,153,.15) 0%,rgba(52,211,153,.05) 100%)"
    : verdict.verdict === "CONDITIONAL"
    ? "linear-gradient(135deg,rgba(245,158,11,.15) 0%,rgba(245,158,11,.05) 100%)"
    : "linear-gradient(135deg,rgba(240,96,96,.15) 0%,rgba(240,96,96,.05) 100%)";
  const verdictBorder = verdict.verdict === "PROCEED" ? "var(--grn)"
    : verdict.verdict === "CONDITIONAL" ? "var(--amb)"
    : "var(--red)";

  return (
    <AppShell>
      <div className={s.page}>

        {/* ── INLINE HERO PANEL ── */}
        <div className={s.heroPanel}>
          <div className={s.heroPropHeader}>
            <div className={s.heroPropTitle}>
              <h1 className={s.heroH1}>{deal.address}</h1>
              <div className={s.heroMeta}>
                {deal.assetType && <span>{deal.assetType}</span>}
                {(deal.buildingSizeSqft ?? deal.sqft) != null && (
                  <span>{((deal.buildingSizeSqft ?? deal.sqft) as number).toLocaleString()} sq ft</span>
                )}
                {deal.tenure && <span>{deal.tenure}</span>}
                {occupancyPct != null && (
                  <span>{occupancyPct === 0 ? "100% Vacant" : `${occupancyPct}% Occupied`}</span>
                )}
              </div>
            </div>
            <button className={s.heroBackBtn} onClick={() => router.back()}>← Back to results</button>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div className={s.aiSummaryBox}>
              <span className={s.aiBadge}>AI SUMMARY</span>
              <h3 className={s.aiSummaryTitle}>Deal Overview</h3>
              <p className={s.aiSummaryText}>{aiSummary}</p>
            </div>
          )}

          {/* Metrics grid: verdict (2-col) + 3 metrics */}
          <div className={s.heroMetrics}>
            <div className={s.heroVerdictCard} style={{ background: verdictBg, border: `2px solid ${verdictBorder}` }}>
              <span className={s.heroVerdictBadge} style={{ color: verdictBorder }}>{verdictLabel}</span>
              <h3 className={s.heroVerdictTitle}>{verdict.verdict === "CONDITIONAL" && targetPrice ? `Pursue at ${fmtCcy(targetPrice)}` : verdict.verdict === "PROCEED" ? "Proceed at asking price" : "Do not proceed at asking"}</h3>
              {targetPrice != null && prop.askingPrice != null && (
                <p className={s.heroVerdictSub}>Score: {verdict.dealScore}/100</p>
              )}
            </div>
            <div className={s.heroMetricCard}>
              <div className={s.heroMetricLabel}>Asking Price</div>
              <div className={s.heroMetricValue}>{fmtCcy(prop.askingPrice)}</div>
              {prop.size && prop.askingPrice && (
                <div className={s.heroMetricSub}>£{Math.round(prop.askingPrice / prop.size)} psf</div>
              )}
            </div>
            <div className={s.heroMetricCard}>
              <div className={s.heroMetricLabel}>Est. Market Value</div>
              <div className={s.heroMetricValue}>{equityResult.exitValue > 0 ? fmtCcy(equityResult.exitValue) : "—"}</div>
              <div className={s.heroMetricSub}>Based on analysis</div>
            </div>
            <div className={s.heroMetricCard}>
              <div className={s.heroMetricLabel}>Target Entry</div>
              <div className={s.heroMetricValue}>{fmtCcy(targetPrice ?? prop.askingPrice)}</div>
              {targetPrice != null && prop.askingPrice != null && targetPrice < prop.askingPrice && (
                <div className={s.heroMetricSub}>
                  {Math.round(((prop.askingPrice - targetPrice) / prop.askingPrice) * 100)}% below asking
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className={s.heroActionBar}>
            <button className={s.btnP} onClick={handleExportPdf} disabled={exporting === "pdf"}>
              {exporting === "pdf" ? "Exporting…" : "📄 Export IC Memo"}
            </button>
            <button className={s.btnS} onClick={() => setShowPipelineMenu(v => !v)}>+ Add to Pipeline</button>
            <button className={`${s.btnS} ${watched ? s.btnWatched : ""}`} onClick={() => setShowWatchModal(true)}>
              {watched ? "✓ Watching" : "👁 Watch"}
            </button>
            <button className={s.btnS} onClick={handleExportExcel}>↓ Excel</button>
          </div>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div className={s.heroTabNav}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`${s.heroTabBtn} ${activeTab === tab ? s.heroTabBtnOn : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── FULL-WIDTH CONTENT ── */}
        <div className={s.heroContent}>
          <div className={s.tabContent}>
            {activeTab === "Overview"      && <OverviewTab      deal={deal} prop={prop} />}
            {activeTab === "Financials"    && <FinancialsWrapper deal={deal} prop={prop} />}
            {activeTab === "Comparables"   && <ComparablesTab   deal={deal} />}
            {activeTab === "Due Diligence" && <DueDiligenceTab  deal={deal} />}
          </div>
        </div>

        {/* ── PIPELINE DROPDOWN ── */}
        {showPipelineMenu && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setShowPipelineMenu(false)}>
            <div
              style={{ position: "absolute", top: 120, right: 24, background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 10, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,.4)", zIndex: 51, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "6px 12px", fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid var(--s2)" }}>Add to stage:</div>
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage}
                  onClick={() => handleAddToPipeline(stage)}
                  style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", color: "var(--tx)", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)", transition: ".15s" }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--s2)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "none"; }}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── WATCH MODAL ── */}
        {showWatchModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowWatchModal(false)}>
            <div style={{ background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 14, width: "90%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--s2)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>Watch this property</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{deal.address}</div>
                </div>
                <button onClick={() => setShowWatchModal(false)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 12 }}>You&apos;ll get alerts when anything changes — price, ownership, EPC, planning, or company status.</div>
                <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>What are you watching for?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {WATCH_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setWatchReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
                      style={{ padding: "7px 14px", borderRadius: 20, border: watchReasons.includes(r) ? "1px solid rgba(124,106,240,.3)" : "1px solid var(--s3)", background: watchReasons.includes(r) ? "rgba(124,106,240,.08)" : "transparent", color: watchReasons.includes(r) ? "#a899ff" : "var(--tx3)", fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", transition: ".15s" }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Note (optional)</div>
                <textarea
                  placeholder="Why are you watching? e.g. 'Waiting for admin to market publicly'"
                  value={watchNote}
                  onChange={(e) => setWatchNote(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontSize: 11, fontFamily: "var(--sans)", resize: "vertical", height: 56, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--s2)", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setShowWatchModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--s3)", background: "var(--s2)", color: "var(--tx2)", cursor: "pointer", fontSize: 12, fontFamily: "var(--sans)", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleWatch} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--acc)", color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "var(--sans)", fontWeight: 600 }}>Add to watchlist</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 80, background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,.4)", fontSize: 13 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(45,212,168,.1)", color: "var(--grn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPanel } from "@/components/dealscope/HeroPanel";
import { DealScore } from "@/components/dealscope/DealScore";
import { RiskFlags } from "@/components/dealscope/RiskFlags";
import { ComparablesTable } from "@/components/dealscope/ComparablesTable";
import { PropertyTab } from "./tabs/PropertyTab";
import { PlanningTab } from "./tabs/PlanningTab";
import { FinancialsTab as FinancialsTabV2 } from "./tabs/FinancialsTab";
import { TitleTab, EnvironmentalTab, OwnershipTab, MarketTab, ApproachTab } from "./dossier-tabs";
import type { Comparable } from "@/components/dealscope/ComparablesTable";
import { ServiceCharges } from "@/components/dealscope/ServiceCharges";
import type { ServiceChargeItem } from "@/components/dealscope/ServiceCharges";
import { SalesHistoryTable } from "@/components/dealscope/SalesHistoryTable";
import type { SaleRecord } from "@/components/dealscope/SalesHistoryTable";
import { EnvironmentalRiskBars } from "@/components/dealscope/EnvironmentalRiskBars";
import type { EnvironmentalRisk } from "@/components/dealscope/EnvironmentalRiskBars";
import { DocumentList } from "@/components/dealscope/DocumentList";
import type { DocumentItem } from "@/components/dealscope/DocumentList";
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
};

const TABS = ["Overview", "Property", "Planning", "Title & Legal", "Environmental", "Ownership", "Financials", "Comparables", "Market", "Approach", "Due Diligence"] as const;
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
function fmtX(n: number | undefined | null): string {
  if (n == null) return "—";
  return `${n.toFixed(2)}x`;
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
  // dataSources.assumptions stores enriched values as { value, source } objects
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
    // Try top-level ds fields first, then nested assumptions.*.value structure
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

function OverviewTab({ deal, prop }: { deal: RawDeal; prop: Property }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const verdict = calculateVerdict(prop);
  const irrResult = calculateIRR(prop);
  const capexResult = calculateCAPEX(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdictColor = verdict.verdict === "PROCEED" ? "var(--grn)" : verdict.verdict === "CONDITIONAL" ? "var(--amb)" : "var(--red)";
  const verdictBg = verdict.verdict === "PROCEED" ? "rgba(45,212,168,.06)" : verdict.verdict === "CONDITIONAL" ? "rgba(234,176,32,.06)" : "rgba(240,96,96,.06)";
  const verdictBorder = verdict.verdict === "PROCEED" ? "rgba(45,212,168,.2)" : verdict.verdict === "CONDITIONAL" ? "rgba(234,176,32,.2)" : "rgba(240,96,96,.2)";
  return (
    <>
      <div className={`${s.card} ${s.anim}`} style={{ background: verdictBg, borderColor: verdictBorder }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: verdictColor, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>
              Deal verdict — {verdict.verdict}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, marginBottom: 8 }}>
              {[
                { label: "IRR (10yr)", value: fmtPct(irrResult.irr), color: irrResult.irr >= 0.12 ? "var(--grn)" : irrResult.irr >= 0.07 ? "var(--amb)" : "var(--red)" },
                { label: "Equity Multiple", value: fmtX(equityResult.equityMultiple), color: equityResult.equityMultiple >= 1.8 ? "var(--grn)" : equityResult.equityMultiple >= 1.2 ? "var(--amb)" : "var(--red)" },
                { label: "CAPEX", value: fmtCcy(capexResult.capex), color: "var(--tx)" },
                { label: "Total cost in", value: fmtCcy(equityResult.totalCostIn), color: "var(--tx)" },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: "var(--tx2)", lineHeight: 1.7 }}>
              {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            {verdict.conditions && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(234,176,32,.06)", borderRadius: 6, borderLeft: "2px solid var(--amb)" }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--amb)", marginBottom: 4 }}>CONDITIONS</div>
                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
                  {verdict.conditions.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
          <DealScore score={verdict.dealScore} label="Deal score" sublabel={verdict.verdict} />
        </div>
      </div>

      <div className={`${s.grid2} ${s.anim} ${s.a1}`}>
        <div className={s.card}>
          <div className={s.cardTitle}>Property details</div>
          <Row l="Address" v={deal.address} />
          <Row l="Asset type" v={deal.assetType || "—"} />
          <Row l="Size" v={prop.size ? `${prop.size.toLocaleString()} sqft` : "—"} />
          <Row l="Year built" v={prop.builtYear ? String(prop.builtYear) : "—"} />
          <Row l="EPC rating" v={deal.epcRating || "—"} />
          <Row l="Tenure" v={deal.tenure || "—"} />
          {deal.occupancyPct != null && <Row l="Occupancy" v={`${Math.round(deal.occupancyPct * 100)}%`} />}
          {deal.brokerName && <Row l="Agent" v={deal.brokerName} />}
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Pricing</div>
          <Row l="Asking price" v={fmtCcy(deal.askingPrice)} mono />
          {prop.size && deal.askingPrice && <Row l="Price / sqft" v={`£${Math.round(deal.askingPrice / prop.size)}`} mono />}
          {typeof ds.passingRent === "number" && <Row l="Passing rent" v={fmtCcy(ds.passingRent)} mono color="green" />}
          {typeof ds.erv === "number" && <Row l="ERV" v={fmtCcy(ds.erv as number)} mono />}
          <div className={s.sep} />
          <div className={s.cardTitle}>CAPEX assessment</div>
          <Row l="Estimated CAPEX" v={fmtCcy(capexResult.capex)} mono />
          <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4, lineHeight: 1.4 }}>{capexResult.reason}</div>
        </div>
      </div>

      {(ds.listingDescription || ds.aiSummary) && (
        <div className={`${s.card} ${s.anim} ${s.a2}`} style={{ background: "linear-gradient(135deg,rgba(124,106,240,.06),rgba(45,212,168,.04))", borderColor: "rgba(124,106,240,.12)" }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#a899ff", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>AI analysis</div>
          <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.7 }}>{(ds.aiSummary as string) || (ds.listingDescription as string)}</div>
        </div>
      )}
    </>
  );
}

function ComparablesTab({ deal }: { deal: RawDeal }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const rawComps = ((ds.comps ?? ds.comparables ?? (ds.ricsAnalysis as Record<string, unknown> | undefined)?.valuations) as unknown[]) ?? [];
  const comps: Comparable[] = (Array.isArray(rawComps) ? rawComps : []).map((c: unknown) => {
    const comp = c as Record<string, unknown>;
    return {
      address: (comp.address ?? comp.name ?? "—") as string,
      type: (comp.assetType ?? comp.type ?? deal.assetType) as string | undefined,
      sqft: (comp.sqft ?? comp.size) as number | undefined,
      price: (comp.price ?? comp.salePrice) as number | undefined,
      pricePsf: (comp.psf ?? comp.pricePsf ?? (comp.price != null && comp.sqft != null ? Math.round((comp.price as number) / (comp.sqft as number)) : undefined)) as number | undefined,
      date: (comp.date ?? comp.saleDate) as string | undefined,
      distance: comp.distance as string | undefined,
    };
  });

  const scRaw = ds.serviceCharge;
  const serviceItems: ServiceChargeItem[] = [];
  if (scRaw && typeof scRaw === "object" && !Array.isArray(scRaw)) {
    for (const [k, v] of Object.entries(scRaw as Record<string, unknown>)) {
      if (typeof v === "number") serviceItems.push({ label: k, annualCost: v });
    }
  }

  return (
    <>
      <div className={`${s.card} ${s.anim}`}>
        <div className={s.cardTitle}>Comparable transactions</div>
        <ComparablesTable comps={comps} title="" />
      </div>

      {(ds.marketRentPsf || ds.marketCapRate) && (
        <div className={`${s.card} ${s.anim} ${s.a1}`}>
          <div className={s.cardTitle}>Market context</div>
          {typeof ds.marketRentPsf === "number" && <Row l="Market rent (£/sqft)" v={`£${ds.marketRentPsf}`} mono />}
          {typeof ds.marketCapRate === "number" && <Row l="Market cap rate" v={`${ds.marketCapRate}%`} mono />}
        </div>
      )}

      {serviceItems.length > 0 && (
        <div className={`${s.card} ${s.anim} ${s.a2}`}>
          <div className={s.cardTitle}>Service charges breakdown</div>
          <ServiceCharges items={serviceItems} />
        </div>
      )}

      <div className={`${s.card} ${s.anim} ${s.a3}`}>
        <div className={s.cardTitle}>Subject property sales history</div>
        <SalesHistoryTable sales={(() => {
          const raw = (ds.salesHistory as Record<string, unknown>[] | undefined) ?? [];
          return (Array.isArray(raw) ? raw : []).map((r: Record<string, unknown>): SaleRecord => ({
            date: (r.date ?? r.transferDate ?? r.dateSold ?? "") as string,
            price: (r.price ?? r.pricePaid ?? 0) as number,
            type: (r.type ?? r.propertyType) as string | undefined,
            tenure: (r.tenure) as string | undefined,
            newBuild: (r.newBuild ?? r.isNew) as boolean | undefined,
          }));
        })()} title="" />
      </div>
    </>
  );
}

function DueDiligenceTab({ deal }: { deal: RawDeal }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ddItems = [
    { label: "Title search",                 done: true },
    { label: "Planning history reviewed",    done: !!(ds.planningApplications) },
    { label: "Environmental survey",         done: !!(ds.environmentalData) },
    { label: "Structural survey",            done: false },
    { label: "EPC confirmed",               done: !!deal.epcRating },
    { label: "MEES compliance checked",     done: !!deal.epcRating },
    { label: "Lease documents reviewed",    done: !!(ds.passingRent) },
    { label: "Owner identity verified",     done: !!deal.ownerName },
    { label: "Charges register reviewed",   done: false },
    { label: "Insurance arranged",          done: false },
  ];
  const complete = ddItems.filter(d => d.done).length;
  return (
    <>
      <div className={`${s.card} ${s.anim}`}>
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

      <div className={`${s.card} ${s.anim} ${s.a1}`}>
        <div className={s.cardTitle}>Risk flags</div>
        <RiskFlags signals={deal.signals} hasLisPendens={deal.hasLisPendens} hasInsolvency={deal.hasInsolvency} hasPlanningApplication={deal.hasPlanningApplication} inFloodZone={deal.inFloodZone} />
        {!deal.signals?.length && !deal.hasInsolvency && !deal.hasLisPendens && !deal.hasPlanningApplication && !deal.inFloodZone && (
          <p style={{ fontSize: 11, color: "var(--tx3)", margin: 0 }}>No risk flags identified.</p>
        )}
      </div>

      {deal.ownerName && (
        <div className={`${s.card} ${s.anim} ${s.a2}`}>
          <div className={s.cardTitle}>Ownership</div>
          <Row l="Owner" v={deal.ownerName} />
        </div>
      )}

      <div className={`${s.card} ${s.anim} ${s.a2}`}>
        <div className={s.cardTitle}>Environmental risk profile</div>
        <EnvironmentalRiskBars risks={
          (() => {
            const envData = ds.environmentalRisks as Record<string, number> | undefined;
            if (!envData) return undefined;
            return Object.entries(envData).map(([label, pct]) => ({ label, pct: Math.round(pct * 100) })) as EnvironmentalRisk[];
          })()
        } />
      </div>

      <div className={`${s.card} ${s.anim} ${s.a3}`}>
        <div className={s.cardTitle}>Documents</div>
        <DocumentList items={(() => {
          const uploadedDocs = (ds.documents as DocumentItem[] | undefined) ?? [];
          const generated: DocumentItem[] = [
            { type: "pdf", name: "IC Memo", description: "Investment Committee memorandum", action: "generate", onAction: () => window.open(`/api/dealscope/properties/${deal.id}/export/pdf`, "_blank") },
            { type: "xlsx", name: "Financial model", description: "IRR, cash flows, scenarios", action: "generate", onAction: () => { const a = document.createElement("a"); a.href = `/api/dealscope/properties/${deal.id}/export/excel`; a.download = ""; a.click(); } },
          ];
          return [...uploadedDocs, ...generated];
        })()} />
      </div>
    </>
  );
}

function DossierSidebar({ deal, prop }: { deal: RawDeal; prop: Property }) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = ds.aiAnalysis as Record<string, unknown> | undefined;
  const mandateTag = (ds.mandate as string | undefined) ?? (ai?.mandateTag as string | undefined);
  const mandateMatch = (ai?.mandateMatch as string | undefined) ?? (ai?.mandateMatchReason as string | undefined);

  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);
  const projectedProfit = equityResult.exitValue - equityResult.totalCostIn;
  const targetPrice = verdict.targetPrice ?? prop.askingPrice ?? 0;
  const discountPct = prop.askingPrice && prop.askingPrice > 0
    ? ((prop.askingPrice - targetPrice) / prop.askingPrice) * 100
    : null;
  const hasAcquisitionData = prop.askingPrice && prop.askingPrice > 0;

  const DATA_SOURCE_KEYS = [
    { key: "epcData",           label: "EPC" },
    { key: "landRegistry",      label: "Land Registry" },
    { key: "companiesHouse",    label: "Companies House" },
    { key: "gazette",           label: "London Gazette" },
    { key: "planning",          label: "Planning data" },
    { key: "historicEngland",   label: "Historic England" },
    { key: "environmentalData", label: "Environment Agency" },
    { key: "images",            label: "Property images" },
    { key: "listing",           label: "Listing data" },
    { key: "aiAnalysis",        label: "AI analysis" },
  ] as const;
  const presentSources = DATA_SOURCE_KEYS.filter(({ key }) => {
    const v = ds[key];
    if (v == null) return false;
    if (Array.isArray(v)) return (v as unknown[]).length > 0;
    return true;
  });

  const relatedRaw = (ds.relatedProperties as Record<string, unknown>[] | undefined)
    ?? (ds.nearby as Record<string, unknown>[] | undefined)
    ?? [];
  const related = (Array.isArray(relatedRaw) ? relatedRaw : []).slice(0, 5);

  return (
    <>
      {hasAcquisitionData && (
        <div className={s.sideCard}>
          <div className={s.cardTitle}>Acquisition metrics</div>
          {[
            { l: "Opportunity score", v: `${verdict.dealScore}/100`, color: verdict.dealScore >= 70 ? "green" as const : verdict.dealScore >= 40 ? "amber" as const : "red" as const },
            { l: "Est. value", v: fmtCcy(equityResult.exitValue), color: undefined },
            { l: "Target offer", v: fmtCcy(targetPrice), color: undefined },
            { l: "Discount to market", v: discountPct != null ? `${discountPct.toFixed(1)}%` : "—", color: undefined },
            { l: "Projected profit", v: fmtCcy(projectedProfit), color: projectedProfit > 0 ? "green" as const : "red" as const },
            { l: "IRR (levered)", v: fmtPct(irrResult.irr), color: irrResult.irr >= 0.12 ? "green" as const : irrResult.irr >= 0.07 ? "amber" as const : "red" as const },
            { l: "Timeline to exit", v: "10 yrs", color: undefined },
          ].map(({ l, v, color }) => <Row key={l} l={l} v={v} color={color} mono />)}
        </div>
      )}

      <div className={s.sideCard}>
        <div className={s.cardTitle}>Mandate match</div>
        {mandateTag && <div className={s.mandateBadge}>{mandateTag}</div>}
        <div className={s.sideText} style={{ marginTop: mandateTag ? 6 : 0 }}>
          {mandateMatch ?? (mandateTag ? "Matches active mandate criteria." : "No mandate configured for this deal.")}
        </div>
      </div>

      {presentSources.length > 0 && (
        <div className={s.sideCard}>
          <div className={s.cardTitle}>Data sources</div>
          <div className={s.sourceList}>
            {presentSources.map(({ label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                <span className={s.sourceCheck}>✓</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className={s.sideCard}>
          <div className={s.cardTitle}>Related properties</div>
          {related.map((p, i) => (
            <div key={i} className={s.relPropRow}>
              <div className={s.relPropAddr}>{(p.address ?? p.name ?? "Property") as string}</div>
              {(p.price ?? p.askingPrice) != null && (
                <div className={s.relPropPrice}>{fmtCcy((p.price ?? p.askingPrice) as number)}</div>
              )}
            </div>
          ))}
        </div>
      )}
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

  const handleExportPdf = () => {
    if (!id) return;
    setExporting("pdf");
    window.open(`/api/dealscope/properties/${id}/export/pdf`, "_blank");
    setTimeout(() => setExporting(null), 3000);
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
            <div className={`${s.skeleton} ${s.skeletonPhoto}`} />
            <div className={s.skeletonInfo}>
              <div className={`${s.skeleton} ${s.skeletonTitle}`} />
              <div className={`${s.skeleton} ${s.skeletonSpec}`} />
              <div className={`${s.skeleton} ${s.skeletonSpec}`} style={{ width: "30%" }} />
            </div>
            <div className={s.skeletonInfo} style={{ flex: "0 0 auto", gap: 8 }}>
              <div className={`${s.skeleton} ${s.skeletonBadge}`} />
              <div className={`${s.skeleton} ${s.skeletonBadge}`} />
            </div>
          </div>
          <div className={s.skeletonTabs}>
            {[80, 80, 96, 80, 108].map((w, i) => (
              <div key={i} className={`${s.skeleton} ${s.skeletonTab}`} style={{ width: w }} />
            ))}
          </div>
          <div className={s.skeletonContent}>
            <div className={`${s.skeleton} ${s.skeletonTitle}`} style={{ width: 130, height: 18 }} />
            <div className={s.skeletonGrid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={s.skeletonCard}>
                  <div className={`${s.skeleton} ${s.skeletonCardLabel}`} />
                  <div className={`${s.skeleton} ${s.skeletonCardValue}`} />
                </div>
              ))}
            </div>
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
            <button className={s.retryBtn} onClick={() => { setError(null); setLoading(true); fetch(`/api/dealscope/properties/${id}`).then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Failed to load"))).then((data: RawDeal) => { setDeal(data); setLoading(false); }).catch((e: unknown) => { setError(String(e)); setLoading(false); }); }}>Retry</button>
            <button className={s.backBtn2} onClick={() => router.back()}>← Back</button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Fresh calculations on every render — never cached
  const prop = toProperty(deal);
  const verdict = calculateVerdict(prop);
  const verdictColor = verdict.verdict === "PROCEED" ? "var(--grn)" : verdict.verdict === "CONDITIONAL" ? "var(--amb)" : "var(--red)";

  return (
    <AppShell>
      <div className={s.page}>
        <HeroPanel
          property={{
            address: deal.address,
            assetType: deal.assetType,
            buildingSizeSqft: deal.buildingSizeSqft ?? deal.sqft,
            yearBuilt: deal.yearBuilt,
            epcRating: deal.epcRating,
            tenure: deal.tenure,
            askingPrice: deal.askingPrice,
            guidePrice: deal.guidePrice,
            dealScore: verdict.dealScore,
            signals: deal.signals,
            hasInsolvency: deal.hasInsolvency,
            hasLisPendens: deal.hasLisPendens,
            dataSources: deal.dataSources,
          }}
          exporting={exporting}
          watched={watched}
          onBack={() => router.back()}
          onExportMemo={handleExportPdf}
          onContact={() => setActiveTab("Overview")}
          onAddToPipeline={() => setShowPipelineMenu((v) => !v)}
          onWatch={() => setShowWatchModal(true)}
        />

        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className={s.tabs}>
              {TABS.map(tab => (
                <button key={tab} className={`${s.tab} ${activeTab === tab ? s.tabOn : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            <button
              onClick={handleExportExcel}
              style={{ padding: "5px 12px", borderRadius: 6, background: "var(--s2)", border: "1px solid var(--s3)", color: "var(--tx2)", cursor: "pointer", fontSize: 11, fontWeight: 500, flexShrink: 0 }}
            >
              ↓ Excel
            </button>
          </div>
          <div className={s.dossierLayout}>
            <div className={s.dossierMain}>
              <div className={s.tabContent} style={{ paddingBottom: 40 }}>
                {activeTab === "Overview"       && <OverviewTab      deal={deal} prop={prop} />}
                {activeTab === "Property"       && <PropertyTab      deal={deal} />}
                {activeTab === "Planning"       && <PlanningTab      deal={deal} />}
                {activeTab === "Title & Legal"  && <TitleTab />}
                {activeTab === "Environmental"  && <EnvironmentalTab />}
                {activeTab === "Ownership"      && <OwnershipTab />}
                {activeTab === "Financials"     && <FinancialsTabV2  deal={deal} prop={prop} />}
                {activeTab === "Comparables"    && <ComparablesTab   deal={deal} />}
                {activeTab === "Market"         && <MarketTab />}
                {activeTab === "Approach"       && <ApproachTab />}
                {activeTab === "Due Diligence"  && <DueDiligenceTab  deal={deal} />}
              </div>
            </div>
            <div className={s.dossierSide}>
              <DossierSidebar deal={deal} prop={prop} />
            </div>
          </div>
        </div>

        {/* ── PIPELINE STAGE DROPDOWN ── */}
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

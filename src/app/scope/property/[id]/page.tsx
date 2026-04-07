"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPanel } from "@/components/dealscope/HeroPanel";
import { PropertyTab } from "./tabs/PropertyTab";
import { PlanningTab } from "./tabs/PlanningTab";
import { FinancialsTab as FinancialsTabV2 } from "./tabs/FinancialsTab";
import { TitleTab, EnvironmentalTab, OwnershipTab, ApproachTab } from "./dossier-tabs";
import { calculateIRR } from "@/lib/dealscope/calculations/irr";
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

// Design source: 02-dossier-full.html — 7 tabs
const TABS = ["Property", "Planning", "Title & Legal", "Environmental", "Ownership", "Financials", "Approach"] as const;
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
  const [activeTab, setActiveTab] = useState<Tab>("Property");
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
            satelliteImageUrl: deal.satelliteImageUrl,
          }}
          exporting={exporting}
          watched={watched}
          onBack={() => router.back()}
          onExportMemo={handleExportPdf}
          onContact={() => setActiveTab("Approach")}
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
                {activeTab === "Property"       && <PropertyTab      deal={deal} />}
                {activeTab === "Planning"       && <PlanningTab      deal={deal} />}
                {activeTab === "Title & Legal"  && <TitleTab />}
                {activeTab === "Environmental"  && <EnvironmentalTab />}
                {activeTab === "Ownership"      && <OwnershipTab />}
                {activeTab === "Financials"     && <FinancialsTabV2  deal={deal} prop={prop} />}
                {activeTab === "Approach"       && <ApproachTab />}
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

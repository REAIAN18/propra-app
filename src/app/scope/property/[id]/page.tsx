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
import type { Comparable } from "@/components/dealscope/ComparablesTable";
import { MultipleValuations } from "@/components/dealscope/MultipleValuations";
import type { ValuationScenario } from "@/components/dealscope/MultipleValuations";
import { ServiceCharges } from "@/components/dealscope/ServiceCharges";
import type { ServiceChargeItem } from "@/components/dealscope/ServiceCharges";
import { LettingScenariosTable } from "@/components/dealscope/LettingScenariosTable";
import { EnvironmentalRiskBars } from "@/components/dealscope/EnvironmentalRiskBars";
import type { EnvironmentalRisk } from "@/components/dealscope/EnvironmentalRiskBars";
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

const TABS = ["Overview", "Property", "Financials", "Comparables", "Planning", "Due Diligence"] as const;
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
  return {
    id: d.id,
    address: d.address,
    assetType: d.assetType,
    askingPrice: d.askingPrice ?? d.guidePrice,
    size: d.buildingSizeSqft ?? d.sqft,
    builtYear: d.yearBuilt,
    epcRating: d.epcRating,
    occupancyPct: d.occupancyPct,
    erv: (ds.erv as number | undefined) ?? (ds.marketRent as number | undefined),
    passingRent: (ds.passingRent as number | undefined) ?? (ds.currentRent as number | undefined),
    businessRates: ds.businessRates as number | undefined,
    serviceCharge: typeof ds.serviceCharge === "number" ? ds.serviceCharge : undefined,
    expectedVoid: (ds.assumptions as Record<string, unknown> | undefined)?.voidMonths as number | undefined,
    description: (ds.listingDescription as string | undefined) ?? (ds.description as string | undefined),
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

function FinancialsTab({ prop }: { prop: Property }) {
  const irrResult = calculateIRR(prop);
  const capexResult = calculateCAPEX(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);
  const scenarios: ValuationScenario[] = [
    { label: "Bear case",    valueLow: equityResult.exitValue * 0.75, valueMid: equityResult.exitValue * 0.80, valueHigh: equityResult.exitValue * 0.85, method: "Exit yield +150bps", confidence: "low" },
    { label: "Base case",    valueLow: equityResult.exitValue * 0.90, valueMid: equityResult.exitValue,        valueHigh: equityResult.exitValue * 1.10, method: "8% exit yield",      confidence: "medium" },
    { label: "Bull case",    valueLow: equityResult.exitValue * 1.10, valueMid: equityResult.exitValue * 1.20, valueHigh: equityResult.exitValue * 1.30, method: "Exit yield -100bps", confidence: "low" },
    { label: "Stabilised",   valueLow: equityResult.exitValue * 0.95, valueMid: equityResult.exitValue * 1.05, valueHigh: equityResult.exitValue * 1.15, method: "Fully let at ERV",   confidence: "medium" },
  ];
  return (
    <>
      <div className={`${s.card} ${s.anim}`}>
        <div className={s.cardTitle}>Returns summary</div>
        <div className={s.statRow}>
          {[
            { label: "IRR (10yr)",     val: fmtPct(irrResult.irr),             sub: `Confidence: ${irrResult.confidence}`, color: irrResult.irr >= 0.12 ? "var(--grn)" : irrResult.irr >= 0.07 ? "var(--amb)" : "var(--red)" },
            { label: "Equity Multiple",val: fmtX(equityResult.equityMultiple),  sub: "Unlevered",  color: equityResult.equityMultiple >= 1.8 ? "var(--grn)" : equityResult.equityMultiple >= 1.2 ? "var(--amb)" : "var(--red)" },
            { label: "Deal score",     val: String(verdict.dealScore),           sub: verdict.verdict, color: "var(--tx)" },
            { label: "Total cost in",  val: fmtCcy(equityResult.totalCostIn),   sub: "Inc. SDLT + fees", color: "var(--tx)" },
          ].map(m => (
            <div key={m.label} className={s.statBox}>
              <div className={s.statLabel}>{m.label}</div>
              <div className={s.statVal} style={{ color: m.color }}>{m.val}</div>
              <div className={s.statSub}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${s.card} ${s.anim} ${s.a1}`}>
        <div className={s.cardTitle}>Cash flow breakdown</div>
        <Row l="Purchase price"             v={fmtCcy(prop.askingPrice)} mono />
        <Row l="SDLT + legal + survey"      v={fmtCcy(equityResult.totalCostIn - (prop.askingPrice ?? 0) - capexResult.capex)} mono />
        {capexResult.capex > 0 && <Row l="CAPEX" v={fmtCcy(capexResult.capex)} mono />}
        <Row l="Total cost in"              v={fmtCcy(equityResult.totalCostIn)} mono color="amber" />
        <div className={s.sep} />
        <Row l="Void + letting costs (yr 1)" v={fmtCcy(irrResult.breakdown.voidCosts + irrResult.breakdown.lettingCosts)} mono color="red" />
        <Row l="Annual NOI (stabilised)"    v={fmtCcy(irrResult.breakdown.annualNOI)} mono color="green" />
        <Row l="Exit proceeds (yr 10)"      v={fmtCcy(irrResult.breakdown.exitProceeds)} mono color="green" />
        <div className={s.sep} />
        <table className={s.tbl}>
          <thead><tr><th>Year</th><th>Cash flow</th><th>Description</th></tr></thead>
          <tbody>
            {irrResult.cashFlows.map(cf => (
              <tr key={cf.year}>
                <td className={s.mono}>{cf.year}</td>
                <td className={s.mono} style={{ color: cf.amount >= 0 ? "var(--grn)" : "var(--red)" }}>
                  {cf.amount >= 0 ? "+" : ""}{fmtCcy(Math.abs(cf.amount))}
                </td>
                <td style={{ color: "var(--tx3)" }}>{cf.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${s.card} ${s.anim} ${s.a2}`}>
        <div className={s.cardTitle}>Exit value scenarios (4 scenarios)</div>
        <MultipleValuations scenarios={scenarios} />
      </div>

      <div className={`${s.card} ${s.anim} ${s.a2}`}>
        <LettingScenariosTable />
      </div>
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
      pricePsf: (comp.psf ?? comp.pricePsf) as number | undefined,
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
    </>
  );
}

export default function PropertyDossierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<RawDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

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
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--red)", marginBottom: 12 }}>{error || "Property not found"}</div>
          <button onClick={() => router.back()} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--s2)", border: "1px solid var(--s3)", color: "var(--tx2)", cursor: "pointer", fontSize: 12 }}>← Back</button>
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
          onBack={() => router.back()}
          onContact={() => setActiveTab("Overview")}
        />

        <div style={{ padding: "0 20px" }}>
          <div className={s.tabs}>
            {TABS.map(tab => (
              <button key={tab} className={`${s.tab} ${activeTab === tab ? s.tabOn : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className={s.tabContent} style={{ paddingBottom: 40 }}>
            {activeTab === "Overview"       && <OverviewTab      deal={deal} prop={prop} />}
            {activeTab === "Property"       && <PropertyTab      deal={deal} onBack={() => router.back()} />}
            {activeTab === "Financials"     && <FinancialsTabV2  deal={deal} />}
            {activeTab === "Comparables"    && <ComparablesTab   deal={deal} />}
            {activeTab === "Planning"       && <PlanningTab      deal={deal} />}
            {activeTab === "Due Diligence"  && <DueDiligenceTab  deal={deal} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

/**
 * DS-T23: Financials Tab Assembly
 * Assembles valuations (T16), returns (T17), comparables (T18), service charges (T19).
 */

import { MultipleValuations, ComparablesTable, MetricCard } from "@/lib/dealscope/components";
import { ServiceChargesBreakdown } from "@/components/dealscope/ServiceChargesBreakdown";
import type { ServiceChargeLineItem } from "@/components/dealscope/ServiceChargesBreakdown";
import { LettingScenariosTable } from "@/components/dealscope/LettingScenariosTable";
import type { LettingScenario } from "@/components/dealscope/LettingScenariosTable";
import type { ValuationScenario } from "@/components/dealscope/MultipleValuations";
import type { Comparable } from "@/components/dealscope/ComparablesTable";
import { calculateIRR } from "@/lib/dealscope/calculations/irr";
import { calculateEquityMultiple } from "@/lib/dealscope/calculations/equity";
import { calculateVerdict } from "@/lib/dealscope/calculations/verdict";
import type { Property } from "@/types/dealscope";
import type { RawDeal } from "./types";
import s from "../dossier.module.css";

interface Props {
  deal: RawDeal;
  prop: Property;
}

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
  return `${n.toFixed(2)}×`;
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

function buildLettingScenarios(prop: Property, irrResult: ReturnType<typeof calculateIRR>, equityResult: ReturnType<typeof calculateEquityMultiple>): LettingScenario[] {
  if (!prop.erv && !prop.size) return [];
  const baseRentPa = prop.erv ?? (prop.size ? prop.size * 6.5 : 0);
  const baseExitValue = equityResult.exitValue;
  return [
    {
      label: "Bear",
      rentPsf: prop.size ? parseFloat(((baseRentPa * 0.85) / prop.size).toFixed(2)) : undefined,
      rentPa: Math.round(baseRentPa * 0.85),
      voidMonths: 12,
      yield: parseFloat((irrResult.irr * 100 * 0.6).toFixed(1)),
      netIncomePa: Math.round(baseRentPa * 0.85 * 0.75),
      exitValue: Math.round(baseExitValue * 0.80),
      irr: parseFloat((irrResult.irr * 100 * 0.55).toFixed(1)),
      equityMultiple: parseFloat((equityResult.equityMultiple * 0.7).toFixed(2)),
    },
    {
      label: "Base",
      rentPsf: prop.size ? parseFloat((baseRentPa / prop.size).toFixed(2)) : undefined,
      rentPa: Math.round(baseRentPa),
      voidMonths: Math.round((prop.expectedVoid ?? 3)),
      yield: parseFloat((irrResult.irr * 100 * 0.9).toFixed(1)),
      netIncomePa: Math.round(irrResult.breakdown.annualNOI),
      exitValue: Math.round(baseExitValue),
      irr: parseFloat((irrResult.irr * 100).toFixed(1)),
      equityMultiple: parseFloat(equityResult.equityMultiple.toFixed(2)),
    },
    {
      label: "Bull",
      rentPsf: prop.size ? parseFloat(((baseRentPa * 1.20) / prop.size).toFixed(2)) : undefined,
      rentPa: Math.round(baseRentPa * 1.20),
      voidMonths: 1,
      yield: parseFloat((irrResult.irr * 100 * 1.25).toFixed(1)),
      netIncomePa: Math.round(baseRentPa * 1.20 * 0.90),
      exitValue: Math.round(baseExitValue * 1.25),
      irr: parseFloat((irrResult.irr * 100 * 1.45).toFixed(1)),
      equityMultiple: parseFloat((equityResult.equityMultiple * 1.4).toFixed(2)),
    },
  ];
}

export function FinancialsTab({ deal, prop }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);

  // Valuation scenarios from equity result
  const scenarios: ValuationScenario[] = [
    { label: "Bear case",  valueLow: equityResult.exitValue * 0.75, valueMid: equityResult.exitValue * 0.80, valueHigh: equityResult.exitValue * 0.85, method: "Exit yield +150bps", confidence: "low" },
    { label: "Base case",  valueLow: equityResult.exitValue * 0.90, valueMid: equityResult.exitValue,        valueHigh: equityResult.exitValue * 1.10, method: "8% exit yield",      confidence: "medium" },
    { label: "Bull case",  valueLow: equityResult.exitValue * 1.10, valueMid: equityResult.exitValue * 1.20, valueHigh: equityResult.exitValue * 1.30, method: "Exit yield -100bps", confidence: "low" },
    { label: "Stabilised", valueLow: equityResult.exitValue * 0.95, valueMid: equityResult.exitValue * 1.05, valueHigh: equityResult.exitValue * 1.15, method: "Fully let at ERV",   confidence: "medium" },
  ];

  // Letting scenarios from live data
  const rawScenarios = ((ds.scenarios ?? ds.lettingScenarios) as unknown[] | undefined) ?? [];
  const lettingScenarios: LettingScenario[] = (Array.isArray(rawScenarios) ? rawScenarios : []).map((sc: unknown) => {
    const s = sc as Record<string, unknown>;
    const label = (s.label ?? s.name ?? "") as string;
    return {
      label: (label.toLowerCase().includes("bear") ? "Bear" : label.toLowerCase().includes("bull") ? "Bull" : "Base") as LettingScenario["label"],
      rentPsf: typeof s.rentPsf === "number" ? s.rentPsf : undefined,
      rentPa: typeof s.rentPa === "number" ? s.rentPa : undefined,
      voidMonths: typeof s.voidMonths === "number" ? s.voidMonths : undefined,
      yield: typeof s.yield === "number" ? s.yield : typeof s.cashYield === "number" ? s.cashYield : undefined,
      netIncomePa: typeof s.netIncomePa === "number" ? s.netIncomePa : undefined,
      exitValue: typeof s.exitValue === "number" ? s.exitValue : typeof s.npv === "number" ? s.npv : undefined,
      irr: typeof s.irr === "number" ? s.irr : undefined,
      equityMultiple: typeof s.equityMultiple === "number" ? s.equityMultiple : undefined,
    };
  });

  // Comparables
  const rawComps = ((ds.comps ?? ds.comparables) as unknown[] | undefined) ?? [];
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

  // Service charges
  const scRaw = ds.serviceCharge;
  const serviceItems: ServiceChargeLineItem[] = [];
  if (scRaw && typeof scRaw === "object" && !Array.isArray(scRaw)) {
    for (const [k, v] of Object.entries(scRaw as Record<string, unknown>)) {
      if (typeof v === "number") serviceItems.push({ label: k, annualCost: v });
    }
  }

  const irrColor: "green" | "amber" | "red" = irrResult.irr >= 0.12 ? "green" : irrResult.irr >= 0.07 ? "amber" : "red";
  const emColor: "green" | "amber" | "red" = equityResult.equityMultiple >= 1.8 ? "green" : equityResult.equityMultiple >= 1.2 ? "amber" : "red";
  return (
    <>
      {/* Returns summary */}
      <div className={s.card}>
        <div className={s.cardTitle}>Returns summary</div>
        <div className={s.statRow}>
          <MetricCard label="IRR (10yr, unlevered)"      value={fmtPct(irrResult.irr)}               subtitle={`Confidence: ${irrResult.confidence}`} color={irrColor} />
          <MetricCard label="Equity multiple (unlevered)" value={fmtX(equityResult.equityMultiple)}    subtitle="No debt assumed"                       color={emColor} />
          <MetricCard label="Deal score"      value={String(verdict.dealScore)}             subtitle={verdict.verdict} />
          <MetricCard label="Total cost in"   value={fmtCcy(equityResult.totalCostIn)}      subtitle="Inc. SDLT + fees" />        </div>
      </div>

      {/* Cash flow breakdown */}
      <div className={`${s.card} ${s.a1}`}>
        <div className={s.cardTitle}>Cash flow breakdown</div>
        <Row l="Purchase price"              v={fmtCcy(prop.askingPrice)} mono />
        <Row l="SDLT + legal + survey"       v={fmtCcy(equityResult.totalCostIn - (prop.askingPrice ?? 0))} mono />
        <Row l="Total cost in"               v={fmtCcy(equityResult.totalCostIn)} mono color="amber" />
        <div className={s.sep} />
        <Row l="Void + letting costs (yr 1)" v={fmtCcy(irrResult.breakdown.voidCosts + irrResult.breakdown.lettingCosts)} mono color="red" />
        <Row l="Annual NOI (stabilised)"     v={fmtCcy(irrResult.breakdown.annualNOI)} mono color="green" />
        <Row l="Exit proceeds (yr 10)"       v={fmtCcy(irrResult.breakdown.exitProceeds)} mono color="green" />
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

      {/* Exit value scenarios */}
      <div className={`${s.card} ${s.a2}`}>
        <div className={s.cardTitle}>Exit value scenarios (4 scenarios)</div>
        <MultipleValuations scenarios={scenarios} />
      </div>

      {/* Letting scenarios */}
      <div className={`${s.card} ${s.a2}`}>
        <div className={s.cardTitle}>Letting scenarios</div>
        <LettingScenariosTable scenarios={lettingScenarios} title="" />
      </div>

      {/* Comparables */}
      {comps.length > 0 && (
        <div className={`${s.card} ${s.a2}`}>
          <div className={s.cardTitle}>Comparable transactions</div>
          <ComparablesTable comps={comps} title="" />
        </div>
      )}

      {/* Market context */}
      {(ds.marketRentPsf || ds.marketCapRate) && (
        <div className={`${s.card} ${s.a3}`}>
          <div className={s.cardTitle}>Market context</div>
          {typeof ds.marketRentPsf === "number" && <Row l="Market rent (£/sqft)" v={`£${ds.marketRentPsf}`} mono />}
          {typeof ds.marketCapRate === "number" && <Row l="Market cap rate" v={`${ds.marketCapRate}%`} mono />}
        </div>
      )}

      {/* Service charges */}
      {serviceItems.length > 0 && (
        <div className={`${s.card} ${s.a3}`}>
          <div className={s.cardTitle}>Service charges breakdown</div>
          <ServiceChargesBreakdown items={serviceItems} />
        </div>
      )}

      {/* Letting scenarios */}
      {(() => {
        const lettingScenarios = buildLettingScenarios(prop, irrResult, equityResult);
        if (lettingScenarios.length === 0) return null;
        return (
          <div className={`${s.card} ${s.a3}`}>
            <div className={s.cardTitle}>Letting scenarios</div>
            <LettingScenariosTable scenarios={lettingScenarios} title="" />
          </div>
        );
      })()}
    </>
  );
}

"use client";

/**
 * DS-T23: Financials Tab Assembly
 * Assembles valuations (T16), returns (T17), comparables (T18), service charges (T19).
 */

import { MultipleValuations, ComparablesTable, MetricCard } from "@/lib/dealscope/components";
import { ServiceChargesBreakdown } from "@/components/dealscope/ServiceChargesBreakdown";
import type { ServiceChargeLineItem } from "@/components/dealscope/ServiceChargesBreakdown";
import { LettingScenariosTable } from "@/components/dealscope/LettingScenariosTable";
import { CapRateSensitivity } from "@/components/dealscope/CapRateSensitivity";
import { AssumptionEditor } from "@/components/dealscope/AssumptionEditor";
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

// Wave F shape — written by /api/dealscope/enrich into dataSources.valuations
type WaveFValuations = {
  scenarios?: {
    asIs?: { erv: number; ervPsf: number | null; noi: number; value: number; clearsAsking: boolean };
    refurb?: {
      erv: number; ervPsf: number | null; noi: number;
      capexPsf: number; capexTotal: number; capexSource: string;
      grossValue: number; value: number; clearsAsking: boolean;
    };
  };
  condition?: "unrefurbished" | "average" | "refurbished";
  conditionSignals?: string[];
  recommendation?: "BUY" | "REVIEW" | "PASS";
  recommendationReasons?: string[];
  askingPsf?: number | null;
  compPsfBand?: { low: number | null; mid: number | null; high: number | null; sampleSize: number } | null;
};

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
  const waveF = (ds.valuations as WaveFValuations | undefined) ?? undefined;
  // Wave I: surface enrich-time `returns` block (5yr IRR, CoC, equity needed, DSCR)
  const returnsRaw = ds.returns as
    | { capRate?: number | null; noi?: number | null; irr5yr?: number | null; cashOnCash?: number | null; equityMultiple?: number | null; equityNeeded?: number | null; dscr?: number | null }
    | undefined;
  // Wave P: senior debt structure
  const debt = ds.debt as
    | {
        ltvPct: number;
        loanAmount: number;
        equityRequired: number;
        baseRate: number | null;
        spreadBps: number;
        allInRate: number;
        termYears: number;
        amortising: boolean;
        annualDebtService: number;
        dscr: number | null;
        rateSource: "live_boe" | "scout_default";
      }
    | undefined;
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

        {/* Wave I1 — full returns sub-grid from enrich pipeline */}
        {returnsRaw && (
          <div className={s.statRow} style={{ marginTop: 8 }}>
            {returnsRaw.irr5yr != null && (
              <MetricCard label="IRR (5yr)" value={fmtPct(returnsRaw.irr5yr)} subtitle="Short-hold scenario" />
            )}
            {returnsRaw.cashOnCash != null && (
              <MetricCard label="Cash-on-cash (yr1)" value={fmtPct(returnsRaw.cashOnCash)} subtitle="Pre-stabilisation" />
            )}
            {returnsRaw.equityNeeded != null && (
              <MetricCard label="Equity needed" value={fmtCcy(returnsRaw.equityNeeded)} subtitle="60% LTV assumed" />
            )}
            {returnsRaw.dscr != null && (
              <MetricCard label="DSCR" value={returnsRaw.dscr.toFixed(2)} subtitle="Debt service coverage" />
            )}
          </div>
        )}
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

      {/* Wave F: As-is vs. post-refurb dual-scenario valuation */}
      {waveF?.scenarios?.asIs && waveF?.scenarios?.refurb && (
        <div className={`${s.card} ${s.a2}`}>
          <div className={s.cardTitle}>As-is vs. post-refurb (condition-anchored)</div>
          <Row
            l="Building condition"
            v={
              waveF.condition
                ? waveF.condition.charAt(0).toUpperCase() + waveF.condition.slice(1)
                : "—"
            }
            color={
              waveF.condition === "refurbished"
                ? "green"
                : waveF.condition === "unrefurbished"
                ? "amber"
                : undefined
            }
          />
          {waveF.conditionSignals && waveF.conditionSignals.length > 0 && (
            <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: -4, marginBottom: 8 }}>
              ↳ signals: {waveF.conditionSignals.slice(0, 3).join(", ")}
            </div>
          )}
          <div className={s.sep} />
          <Row l="As-is ERV (p.a.)"          v={fmtCcy(waveF.scenarios.asIs.erv)} mono />
          {waveF.scenarios.asIs.ervPsf != null && (
            <Row l="As-is ERV / sqft"        v={`£${waveF.scenarios.asIs.ervPsf.toFixed(2)}`} mono />
          )}
          <Row l="As-is NOI"                 v={fmtCcy(waveF.scenarios.asIs.noi)} mono />
          <Row
            l="As-is value (capitalised)"
            v={fmtCcy(waveF.scenarios.asIs.value)}
            mono
            color={waveF.scenarios.asIs.clearsAsking ? "green" : "red"}
          />
          <div className={s.sep} />
          <Row l="Refurb ERV (p.a.)"         v={fmtCcy(waveF.scenarios.refurb.erv)} mono />
          {waveF.scenarios.refurb.ervPsf != null && (
            <Row l="Refurb ERV / sqft"       v={`£${waveF.scenarios.refurb.ervPsf.toFixed(2)}`} mono />
          )}
          <Row l="Refurb NOI"                v={fmtCcy(waveF.scenarios.refurb.noi)} mono />
          <Row l="Refurb gross value"        v={fmtCcy(waveF.scenarios.refurb.grossValue)} mono />
          <Row
            l={`Capex (£${waveF.scenarios.refurb.capexPsf}/sqft)`}
            v={`−${fmtCcy(waveF.scenarios.refurb.capexTotal)}`}
            mono
            color="red"
          />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: -4, marginBottom: 6 }}>
            ↳ {waveF.scenarios.refurb.capexSource}
          </div>
          <Row
            l="Refurb-net value"
            v={fmtCcy(waveF.scenarios.refurb.value)}
            mono
            color={waveF.scenarios.refurb.clearsAsking ? "green" : "red"}
          />
          {/* G4: £/psf sanity check */}
          {(waveF.askingPsf != null || waveF.compPsfBand) && (
            <>
              <div className={s.sep} />
              {waveF.askingPsf != null && (
                <Row l="Asking £/sqft" v={`£${waveF.askingPsf.toLocaleString()}`} mono />
              )}
              {waveF.compPsfBand && (waveF.compPsfBand.low != null || waveF.compPsfBand.high != null) && (
                <Row
                  l={`Comp band £/sqft${waveF.compPsfBand.sampleSize ? ` (n=${waveF.compPsfBand.sampleSize})` : ""}`}
                  v={`£${waveF.compPsfBand.low ?? "—"} – £${waveF.compPsfBand.high ?? "—"}`}
                  mono
                />
              )}
              {waveF.askingPsf != null &&
                waveF.compPsfBand?.low != null &&
                waveF.askingPsf < waveF.compPsfBand.low * 0.9 && (
                  <Row
                    l="£/sqft check"
                    v="Below comp band low — clearly cheap"
                    color="green"
                  />
                )}
            </>
          )}
        </div>
      )}

      {/* Wave P — Senior debt structure */}
      {debt && (
        <div className={`${s.card} ${s.a3}`}>
          <div className={s.cardTitle}>Financing structure (senior debt)</div>
          <Row l="LTV"                    v={`${(debt.ltvPct * 100).toFixed(0)}%`} mono />
          <Row l="Loan amount"            v={fmtCcy(debt.loanAmount)} mono />
          <Row l="Equity required"        v={fmtCcy(debt.equityRequired)} mono color="amber" />
          <div className={s.sep} />
          <Row
            l="Base rate (BoE)"
            v={debt.baseRate != null ? `${(debt.baseRate * 100).toFixed(2)}%` : "—"}
            mono
          />
          <Row l="Spread"                 v={`${debt.spreadBps} bps`} mono />
          <Row l="All-in rate"            v={`${(debt.allInRate * 100).toFixed(2)}%`} mono />
          <Row l={`Term (${debt.amortising ? "amortising" : "IO"})`} v={`${debt.termYears} yr`} mono />
          <Row l="Annual debt service"    v={fmtCcy(debt.annualDebtService)} mono color="red" />
          <div className={s.sep} />
          <Row
            l="DSCR (NOI ÷ debt service)"
            v={debt.dscr != null ? debt.dscr.toFixed(2) : "—"}
            mono
            color={debt.dscr != null ? (debt.dscr >= 1.4 ? "green" : debt.dscr >= 1.2 ? "amber" : "red") : undefined}
          />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 6 }}>
            Rate basis: {debt.rateSource === "live_boe" ? "Live BoE base + 175 bps" : "Scout default 5.50% (no live BoE rate)"} · 65% LTV constant
          </div>
        </div>
      )}

      {/* Wave N — RICS reconciled valuation + sensitivity */}
      {(() => {
        const rics = ds.ricsAnalysis as Record<string, unknown> | undefined;
        if (!rics) return null;
        const valuations = rics.valuations as Record<string, unknown> | undefined;
        const reconciled = valuations?.reconciled as { low: number; mid: number; high: number; primary: string; variance: number; opinion: string } | undefined;
        const returnsR = rics.returns as Record<string, unknown> | undefined;
        const dcf = rics.dcf as { irr: number; npv: number; equityMultiple: number; discountRate: number } | undefined;
        const sens = rics.sensitivity as Array<{ scenario: string; voidMonths: string; rent: string; capex: string; irr: string; verdict: string }> | undefined;
        const loc = rics.locationGrade as { grade?: string; reasoning?: string } | undefined;
        return (
          <>
            {reconciled && (
              <div className={`${s.card} ${s.a2}`}>
                <div className={s.cardTitle}>RICS reconciled valuation</div>
                <Row l="Low"        v={fmtCcy(reconciled.low)} mono color="amber" />
                <Row l="Mid"        v={fmtCcy(reconciled.mid)} mono color="green" />
                <Row l="High"       v={fmtCcy(reconciled.high)} mono />
                <Row l="Primary method" v={reconciled.primary ?? "—"} />
                <Row l="Method variance" v={`${reconciled.variance.toFixed(1)}%`} mono />
                {reconciled.opinion && (
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 6, lineHeight: 1.5 }}>
                    {reconciled.opinion}
                  </div>
                )}
                {dcf && (
                  <>
                    <div className={s.sep} />
                    <Row l="DCF IRR (10yr levered)" v={fmtPct(dcf.irr)} mono />
                    <Row l="DCF NPV"               v={fmtCcy(dcf.npv)} mono />
                    <Row l="DCF EM"                v={fmtX(dcf.equityMultiple)} mono />
                    <Row l="Discount rate"         v={fmtPct(dcf.discountRate)} mono />
                  </>
                )}
                {returnsR && (
                  <>
                    <div className={s.sep} />
                    {typeof returnsR.netInitialYield === "number" && (
                      <Row l="Net initial yield" v={fmtPct(returnsR.netInitialYield as number)} mono />
                    )}
                    {typeof returnsR.stabilisedYield === "number" && (
                      <Row l="Stabilised yield" v={fmtPct(returnsR.stabilisedYield as number)} mono />
                    )}
                    {typeof returnsR.debtYield === "number" && (
                      <Row l="Debt yield" v={fmtPct(returnsR.debtYield as number)} mono />
                    )}
                    {typeof returnsR.paybackMonths === "number" && (
                      <Row l="Payback (months)" v={String(returnsR.paybackMonths)} mono />
                    )}
                  </>
                )}
                {loc?.grade && (
                  <>
                    <div className={s.sep} />
                    <Row l="Location grade" v={loc.grade} />
                    {loc.reasoning && (
                      <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: -4 }}>{loc.reasoning}</div>
                    )}
                  </>
                )}
              </div>
            )}
            {sens && sens.length > 0 && (
              <div className={`${s.card} ${s.a3}`}>
                <div className={s.cardTitle}>Sensitivity grid</div>
                <table className={s.tbl}>
                  <thead><tr><th>Scenario</th><th>Void</th><th>Rent</th><th>Capex</th><th>IRR</th><th>Verdict</th></tr></thead>
                  <tbody>
                    {sens.map((row, i) => (
                      <tr key={i}>
                        <td>{row.scenario}</td>
                        <td className={s.mono}>{row.voidMonths}</td>
                        <td className={s.mono}>{row.rent}</td>
                        <td className={s.mono}>{row.capex}</td>
                        <td className={s.mono}>{row.irr}</td>
                        <td>{row.verdict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      })()}

      {/* Wave M — inline assumption editor */}
      <AssumptionEditor
        propertyId={deal.id}
        initial={{
          capRate: returnsRaw?.capRate ?? null,
          erv: prop.erv ?? null,
          passingRent: prop.passingRent ?? null,
        }}
      />

      {/* Wave I3 — cap-rate sensitivity slider */}
      {waveF?.scenarios?.asIs && waveF?.scenarios?.refurb && returnsRaw?.capRate != null && prop.askingPrice != null && (
        <CapRateSensitivity
          baseCapRate={returnsRaw.capRate}
          asIsNoi={waveF.scenarios.asIs.noi}
          refurbNoi={waveF.scenarios.refurb.noi}
          refurbCapex={waveF.scenarios.refurb.capexTotal}
          askingPrice={prop.askingPrice}
        />
      )}

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

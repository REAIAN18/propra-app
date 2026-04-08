/**
 * src/lib/dealscope/exports/populate-ic-memo.ts
 * DS-T25: IC Memo data population.
 *
 * Maps property + analysis data to ICMemoProps.
 * Uses local calculation engine for all financial metrics.
 */

import { calculateIRR } from "@/lib/dealscope/calculations/irr";
import { calculateEquityMultiple } from "@/lib/dealscope/calculations/equity";
import { calculateVerdict } from "@/lib/dealscope/calculations/verdict";
import type { Property } from "@/types/dealscope";
import type { ICMemoProps } from "./ic-memo-template";

export interface DealSourceData {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  buildingSizeSqft?: number;
  yearBuilt?: number;
  epcRating?: string;
  tenure?: string;
  occupancyPct?: number;
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  inFloodZone?: boolean;
  signals?: string[];
  dataSources?: Record<string, unknown>;
  currency?: string;
  askingPrice?: number;
  guidePrice?: number;
  // PSF rates from ScoutDeal model for deriving annual rents when assumptions not stored
  currentRentPsf?: number;
  marketRentPsf?: number;
}

// Unwrap assumption objects stored as { value: number, source: string }
function unwrapAssumption(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v > 0 ? v : undefined;
  if (typeof v === "object" && v !== null && "value" in v) {
    const val = (v as { value: unknown }).value;
    return typeof val === "number" && val > 0 ? val : undefined;
  }
  return undefined;
}

function toProperty(deal: DealSourceData): Property {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const assumptions = ds.assumptions as Record<string, unknown> | undefined;
  const ai = ds.ai as Record<string, unknown> | undefined;
  const size = deal.buildingSizeSqft ?? deal.sqft;

  // Passing rent: dataSources direct → assumptions (unwrapped) → currentRentPsf * size → AI
  const passingRent =
    unwrapAssumption(ds.passingRent) ??
    unwrapAssumption(ds.currentRentPa) ??
    unwrapAssumption(assumptions?.passingRent) ??
    (deal.currentRentPsf != null && size ? deal.currentRentPsf * size : undefined) ??
    unwrapAssumption(ai?.passingRent);

  // ERV: dataSources direct → assumptions (unwrapped) → marketRentPsf * size → AI
  const erv =
    unwrapAssumption(ds.erv) ??
    unwrapAssumption(ds.marketRentPa) ??
    unwrapAssumption(assumptions?.erv) ??
    (deal.marketRentPsf != null && size ? deal.marketRentPsf * size : undefined) ??
    unwrapAssumption(ai?.erv);

  return {
    id: deal.id,
    address: deal.address,
    assetType: deal.assetType,
    askingPrice: deal.askingPrice ?? deal.guidePrice,
    size,
    builtYear: deal.yearBuilt,
    epcRating: deal.epcRating,
    occupancyPct: deal.occupancyPct,
    passingRent,
    erv,
    businessRates: unwrapAssumption(ds.businessRates) ?? unwrapAssumption(assumptions?.businessRates),
    serviceCharge: unwrapAssumption(ds.serviceCharge) ?? unwrapAssumption(assumptions?.serviceCharge),
    expectedVoid: unwrapAssumption(assumptions?.expectedVoidMonths) ?? unwrapAssumption(ds.expectedVoidMonths),
    description: deal.dataSources ? JSON.stringify(deal.dataSources).toLowerCase() : undefined,
  };
}

function deriveThesis(deal: DealSourceData, prop: Property): string {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = ds.ai as Record<string, unknown> | undefined;
  if (ai?.investmentThesis) return ai.investmentThesis as string;
  if (ai?.summary) return ai.summary as string;

  const parts: string[] = [];
  if (prop.passingRent && prop.askingPrice) {
    const grossYield = (prop.passingRent / prop.askingPrice) * 100;
    parts.push(`${grossYield.toFixed(1)}% gross yield`);
  }
  if (deal.tenure) parts.push(`${deal.tenure} tenure`);
  if (deal.occupancyPct != null) parts.push(`${Math.round(deal.occupancyPct * 100)}% occupied`);
  if (deal.assetType) parts.push(`${deal.assetType} asset`);
  return parts.length > 0
    ? `${deal.address} presents a ${parts.join(", ")} opportunity in ${deal.assetType?.toLowerCase() ?? "commercial"} real estate.`
    : `Investment in ${deal.address} — see financial analysis for full detail.`;
}

function deriveRisks(deal: DealSourceData): string[] {
  const risks: string[] = [];
  if ((deal.signals ?? []).length > 0) risks.push(...(deal.signals ?? []).slice(0, 3));
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = ds.ai as Record<string, unknown> | undefined;
  if (Array.isArray(ai?.keyRisks)) risks.push(...(ai.keyRisks as string[]).slice(0, 3));
  return risks.slice(0, 5);
}

function deriveOpportunities(deal: DealSourceData, prop: Property): string[] {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = ds.ai as Record<string, unknown> | undefined;
  if (Array.isArray(ai?.keyOpportunities)) return (ai.keyOpportunities as string[]).slice(0, 4);

  const opps: string[] = [];
  if (prop.passingRent && prop.erv && prop.erv > prop.passingRent) {
    const uplift = ((prop.erv - prop.passingRent) / prop.passingRent) * 100;
    opps.push(`${uplift.toFixed(0)}% ERV uplift potential on rent review`);
  }
  if (deal.epcRating && deal.epcRating >= "D") {
    opps.push("EPC improvement could reduce MEES risk and enhance value");
  }
  return opps;
}

/**
 * populateICMemo — maps a deal + dataSources to ICMemoProps.
 * All financial metrics computed fresh from the local calculation engine.
 */
export function populateICMemo(
  deal: DealSourceData,
  options: {
    confidential?: boolean;
    macroSnapshot?: {
      sofr: number | null;
      boeBase: number | null;
      cpi: number | null;
      gdp: number | null;
      asOf: string | null;
    } | null;
  } = {}
): ICMemoProps {
  const prop = toProperty(deal);
  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);

  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const epcData = ds.epcData as Record<string, unknown> | undefined;

  // Wave H4: surface tenant covenant snapshot from enrich pipeline
  const covenantRaw = ds.covenant as
    | { tenantName?: string | null; strength?: string | null; creditScore?: number | null; revenue?: number | null; summary?: string | null }
    | undefined;
  const covenant = covenantRaw
    ? {
        tenantName: covenantRaw.tenantName ?? null,
        strength: (covenantRaw.strength as "strong" | "satisfactory" | "weak" | null) ?? null,
        creditScore: covenantRaw.creditScore ?? null,
        revenue: covenantRaw.revenue ?? null,
        summary: covenantRaw.summary ?? null,
      }
    : null;

  const capRate =
    prop.passingRent && prop.askingPrice
      ? prop.passingRent / prop.askingPrice
      : null;

  // Wave F: pull dual-scenario valuation written by /api/dealscope/enrich.
  // Memo can run on demo decks too — guard against missing valuations entirely.
  const waveFRaw = ds.valuations as
    | {
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
      }
    | undefined;

  const waveF = waveFRaw
    ? {
        condition: waveFRaw.condition ?? null,
        conditionSignals: waveFRaw.conditionSignals ?? [],
        recommendation: waveFRaw.recommendation ?? null,
        recommendationReasons: waveFRaw.recommendationReasons ?? [],
        askingPsf: waveFRaw.askingPsf ?? null,
        compPsfBand: waveFRaw.compPsfBand ?? null,
        asIs: waveFRaw.scenarios?.asIs ?? null,
        refurb: waveFRaw.scenarios?.refurb ?? null,
      }
    : null;

  return {
    // Executive summary
    headline: deal.address,
    recommendation: verdict.verdict as "PROCEED" | "CONDITIONAL" | "PASS",
    dealScore: verdict.dealScore,
    irr: irrResult.irr,
    equityMultiple: equityResult.equityMultiple,
    totalCostIn: equityResult.totalCostIn,
    currency: deal.currency ?? "GBP",

    // Property
    address: deal.address,
    assetType: deal.assetType,
    sqft: deal.buildingSizeSqft ?? deal.sqft ?? null,
    tenure: deal.tenure ?? null,
    yearBuilt: deal.yearBuilt ?? null,
    epcRating: deal.epcRating ?? null,
    askingPrice: deal.askingPrice ?? null,
    guidePrice: deal.guidePrice ?? null,

    // Financials
    passingRent: prop.passingRent ?? null,
    erv: prop.erv ?? null,
    capRate,
    noi: irrResult.breakdown.annualNOI ?? null,
    exitValue: irrResult.breakdown.exitProceeds ?? null,
    cashFlows: irrResult.cashFlows,

    // Risk
    signals: deal.signals ?? [],
    hasInsolvency: deal.hasInsolvency ?? false,
    hasLisPendens: deal.hasLisPendens ?? false,
    inFloodZone: deal.inFloodZone ?? false,
    epcMeesRisk: (epcData?.meesRisk as string | undefined) ?? null,
    riskSummary: null,

    // Recommendation
    investmentThesis: deriveThesis(deal, prop),
    keyRisks: deriveRisks(deal),
    keyOpportunities: deriveOpportunities(deal, prop),
    confidential: options.confidential ?? true,
    generatedAt: new Date().toISOString(),

    waveF,
    covenant,
    returnsDetail: (() => {
      const r = ds.returns as
        | { irr5yr?: number | null; cashOnCash?: number | null; equityNeeded?: number | null; dscr?: number | null }
        | undefined;
      if (!r) return null;
      return {
        irr5yr: r.irr5yr ?? null,
        cashOnCash: r.cashOnCash ?? null,
        equityNeeded: r.equityNeeded ?? null,
        dscr: r.dscr ?? null,
      };
    })(),
    macroSnapshot: options.macroSnapshot ?? null,
    // Wave R: senior debt structure passthrough
    debt: (() => {
      const d = ds.debt as Record<string, unknown> | undefined;
      if (!d) return null;
      return {
        ltvPct: d.ltvPct as number,
        loanAmount: d.loanAmount as number,
        equityRequired: d.equityRequired as number,
        baseRate: (d.baseRate as number | null) ?? null,
        spreadBps: d.spreadBps as number,
        allInRate: d.allInRate as number,
        termYears: d.termYears as number,
        annualDebtService: d.annualDebtService as number,
        dscr: (d.dscr as number | null) ?? null,
        rateSource: (d.rateSource as "live_boe" | "scout_default") ?? "scout_default",
      };
    })(),
    // Wave R: environmental snapshot passthrough
    environmental: (() => {
      const e = ds.environmental as Record<string, unknown> | undefined;
      if (!e) return null;
      const flood = (e.flood ?? {}) as Record<string, unknown>;
      const epcSnap = (e.epc ?? {}) as Record<string, unknown>;
      const contam = (e.contamination ?? {}) as Record<string, unknown>;
      const rad = (e.radon ?? {}) as Record<string, unknown>;
      const min = (e.mining ?? {}) as Record<string, unknown>;
      return {
        flood: {
          status: (flood.status as string) ?? "missing",
          inFloodZone: (flood.inFloodZone as boolean | null) ?? null,
          floodZone: (flood.floodZone as string | null) ?? null,
        },
        epc: {
          status: (epcSnap.status as string) ?? "missing",
          rating: (epcSnap.rating as string | null) ?? null,
          meesNote: (epcSnap.meesNote as string | null) ?? null,
        },
        contamination: { status: (contam.status as string) ?? "uncommissioned" },
        radon: { status: (rad.status as string) ?? "uncommissioned" },
        mining: { status: (min.status as string) ?? "uncommissioned" },
      };
    })(),
  };
}

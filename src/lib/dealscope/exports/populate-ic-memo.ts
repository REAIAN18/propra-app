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
}

function toProperty(deal: DealSourceData): Property {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const assumptions = ds.assumptions as Record<string, unknown> | undefined;
  return {
    id: deal.id,
    address: deal.address,
    assetType: deal.assetType,
    askingPrice: deal.askingPrice ?? deal.guidePrice,
    size: deal.buildingSizeSqft ?? deal.sqft,
    builtYear: deal.yearBuilt,
    epcRating: deal.epcRating,
    occupancyPct: deal.occupancyPct,
    passingRent: (ds.passingRent ?? ds.currentRentPa ?? assumptions?.passingRent) as number | undefined,
    erv: (ds.erv ?? ds.marketRentPa ?? assumptions?.erv) as number | undefined,
    businessRates: (ds.businessRates ?? assumptions?.businessRates) as number | undefined,
    serviceCharge: (ds.serviceCharge ?? assumptions?.serviceCharge) as number | undefined,
    expectedVoid: (assumptions?.expectedVoidMonths ?? ds.expectedVoidMonths) as number | undefined,
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
  options: { confidential?: boolean } = {}
): ICMemoProps {
  const prop = toProperty(deal);
  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);

  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const epcData = ds.epcData as Record<string, unknown> | undefined;

  const capRate =
    prop.passingRent && prop.askingPrice
      ? prop.passingRent / prop.askingPrice
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
  };
}

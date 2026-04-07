/**
 * src/lib/dealscope/exports/populate-ic-memo.ts
 * DS-T25: IC Memo data population.
 *
 * Maps a ScoutDeal + dataSources blob to a fully populated MemoData payload
 * for the multi-page IC memo template. Pulls every data point that the
 * enrichment pipeline actually writes to dataSources (see
 * src/app/api/dealscope/enrich/route.ts → dataSources: { … }).
 *
 * Source-of-truth keys (verified against enrich/route.ts):
 *   - dataSources.epc        (NOT epcData)
 *   - dataSources.ai         (propertyType, condition, vacancy, keyFeatures,
 *                             risks, opportunities, tenantNames, leaseExpiry,
 *                             breakDates, serviceCharge, groundRent, …)
 *   - dataSources.listing    (description, features, accommodation, agentContact)
 *   - dataSources.comps
 *   - dataSources.planning
 *   - dataSources.flood
 *   - dataSources.geocode
 *   - dataSources.assumptions
 *   - dataSources.valuations
 *   - dataSources.returns
 *   - dataSources.scenarios
 *   - dataSources.rentGap
 *   - dataSources.market
 *   - dataSources.dealAnalysis
 *   - dataSources.ricsAnalysis
 *   - dataSources.covenant
 *   - dataSources.companyOwner
 *   - dataSources.ownerPortfolio
 *   - dataSources.devPotential
 */

import { calculateIRR } from "@/lib/dealscope/calculations/irr";
import { calculateEquityMultiple } from "@/lib/dealscope/calculations/equity";
import { calculateVerdict } from "@/lib/dealscope/calculations/verdict";
import type { Property } from "@/types/dealscope";
import type { MemoData } from "./ic-memo-template";

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
  brokerName?: string;
  ownerName?: string;
  daysOnMarket?: number;
  hasInsolvency?: boolean;
  hasLisPendens?: boolean;
  hasPlanningApplication?: boolean;
  inFloodZone?: boolean;
  signals?: string[];
  dataSources?: Record<string, unknown>;
  currency?: string;
  askingPrice?: number;
  guidePrice?: number;
  satelliteImageUrl?: string | null;
  currentRentPsf?: number;
  marketRentPsf?: number;
  region?: string;
  sourceTag?: string;
}

// Unwrap { value, source } objects produced by the enrichment pipeline
function unwrap<T = number>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (typeof v === "object" && v !== null && "value" in v) {
    return (v as { value: T }).value;
  }
  return v as T;
}

function num(v: unknown): number | undefined {
  const u = unwrap(v);
  return typeof u === "number" && !Number.isNaN(u) ? u : undefined;
}

function str(v: unknown): string | undefined {
  const u = unwrap(v);
  return typeof u === "string" && u.length > 0 ? u : undefined;
}

function arr<T = unknown>(v: unknown): T[] {
  const u = unwrap(v);
  return Array.isArray(u) ? (u as T[]) : [];
}

function obj(v: unknown): Record<string, unknown> | undefined {
  const u = unwrap(v);
  return u && typeof u === "object" && !Array.isArray(u) ? (u as Record<string, unknown>) : undefined;
}

function toProperty(deal: DealSourceData): Property {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const assumptions = obj(ds.assumptions);
  const ai = obj(ds.ai);
  const size = deal.buildingSizeSqft ?? deal.sqft ?? num(assumptions?.sqft);

  const passingRent =
    num(ds.passingRent) ??
    num(assumptions?.passingRent) ??
    (deal.currentRentPsf != null && size ? deal.currentRentPsf * size : undefined) ??
    num(ai?.passingRent);

  const erv =
    num(ds.erv) ??
    num(assumptions?.erv) ??
    (deal.marketRentPsf != null && size ? deal.marketRentPsf * size : undefined);

  return {
    id: deal.id,
    address: deal.address,
    assetType: deal.assetType,
    askingPrice: deal.askingPrice ?? deal.guidePrice,
    size,
    builtYear: deal.yearBuilt ?? num(assumptions?.yearBuilt),
    epcRating: deal.epcRating ?? str(assumptions?.epcRating),
    occupancyPct: deal.occupancyPct ?? num(assumptions?.occupancy),
    passingRent,
    erv,
    businessRates: num(ds.businessRates) ?? num(assumptions?.businessRates),
    serviceCharge: num(ds.serviceCharge) ?? num(assumptions?.serviceCharge) ?? num(ai?.serviceCharge),
    expectedVoid: num(assumptions?.voidPeriod),
    description: str((obj(ds.listing) ?? {}).description) ?? undefined,
  };
}

/**
 * populateICMemo — maps a deal + dataSources to MemoData for the IC memo template.
 * All financial metrics computed fresh from the local calculation engine.
 * Every available data point in `dataSources` is surfaced; sections render
 * conditionally based on what is present.
 */
export function populateICMemo(
  deal: DealSourceData,
  options: { confidential?: boolean } = {}
): MemoData {
  const prop = toProperty(deal);
  const irrResult = calculateIRR(prop);
  const equityResult = calculateEquityMultiple(prop);
  const verdict = calculateVerdict(prop);

  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const ai = obj(ds.ai);
  const listing = obj(ds.listing);
  const epc = obj(ds.epc);
  const valuations = obj(ds.valuations);
  const returns = obj(ds.returns);
  const rentGap = obj(ds.rentGap);
  const market = obj(ds.market);
  const flood = obj(ds.flood);
  const geocode = obj(ds.geocode);
  const dealAnalysis = obj(ds.dealAnalysis);
  const ricsAnalysis = obj(ds.ricsAnalysis);
  const covenant = obj(ds.covenant);
  const companyOwner = obj(ds.companyOwner);
  const ownerPortfolio = arr<Record<string, unknown>>(ds.ownerPortfolio);
  const devPotential = obj(ds.devPotential);
  const assumptions = obj(ds.assumptions);
  const score = obj(ds.score);

  // Listing-derived narrative
  const listingDescription = str(listing?.description);
  const listingFeatures = arr<string>(listing?.features);
  const listingAccommodation = str(listing?.accommodation);

  // AI-derived narrative + structured fields
  const aiCondition = str(ai?.condition);
  const aiVacancy = str(ai?.vacancy);
  const aiKeyFeatures = arr<string>(ai?.keyFeatures);
  const aiRisks = arr<string>(ai?.risks);
  const aiOpportunities = arr<string>(ai?.opportunities);
  const aiTenantNames = arr<string>(ai?.tenantNames);
  const aiLeaseExpiry = str(ai?.leaseExpiry);
  const aiBreakDates = Array.isArray(ai?.breakDates)
    ? (ai!.breakDates as unknown[]).map(String).join(", ")
    : str(ai?.breakDates);
  const aiNumberOfUnits = num(ai?.numberOfUnits);

  // Cap rate & exit yield
  const capRate =
    num(returns?.capRate) != null
      ? (num(returns?.capRate) as number) / 100 // returns.capRate is stored as percent
      : prop.passingRent && prop.askingPrice
        ? prop.passingRent / prop.askingPrice
        : null;

  // Comparables (rental + investment)
  const compsRaw = arr<Record<string, unknown>>(ds.comps);
  const comps = compsRaw.map((c) => ({
    address: str(c.address) ?? str(c.fullAddress) ?? "—",
    sqft: num(c.sqft) ?? num(c.floorArea) ?? num(c.size_sqft) ?? null,
    price: num(c.price) ?? num(c.pricePaid) ?? null,
    rentPsf: num(c.rentPsf) ?? null,
    yieldPct: num(c.yieldPct) ?? num(c.niy) ?? null,
    date: str(c.date) ?? str(c.dateSold) ?? null,
    distance: str(c.distance) ?? (typeof c.distance === "number" ? `${(c.distance as number).toFixed(1)} mi` : null),
    source: str(c.source) ?? null,
    tenancy: str(c.tenancy) ?? null,
    incentive: str(c.incentive) ?? null,
  }));

  // Planning applications
  const planningRaw = arr<Record<string, unknown>>(ds.planning);
  const planningApps = planningRaw.slice(0, 8).map((p) => ({
    reference: str(p.reference) ?? str(p.appRef) ?? null,
    description: str(p.description) ?? str(p.proposal) ?? "—",
    status: str(p.status) ?? str(p.decision) ?? null,
    date: str(p.date) ?? str(p.decidedDate) ?? str(p.receivedDate) ?? null,
  }));

  // Scenarios (returns/exit modelling)
  const scenariosRaw = arr<Record<string, unknown>>(ds.scenarios);
  const scenarios = scenariosRaw.map((sc) => ({
    name: str(sc.name) ?? "—",
    irr: str(sc.irr) ?? (num(sc.irr) != null ? `${num(sc.irr)}%` : null),
    equityMultiple: str(sc.equityMultiple) ?? (num(sc.equityMultiple) != null ? `${num(sc.equityMultiple)}x` : null),
    cashYield: str(sc.cashYield) ?? null,
    npv: num(sc.npv) ?? null,
  }));

  // Owner portfolio (companies house enrichment)
  const ownerProperties = ownerPortfolio.slice(0, 6).map((p) => ({
    address: str(p.address) ?? "—",
    value: num(p.value) ?? num(p.price) ?? null,
  }));

  // Headline thesis: prefer AI summary fields, then listing description, then derived
  const investmentThesis =
    str(ai?.summary) ??
    str(ai?.investmentThesis) ??
    listingDescription ??
    deriveThesis(deal, prop);

  // Aggregate risks: signals + AI risks + structural flags
  const keyRisks: string[] = [];
  if (deal.hasInsolvency) keyRisks.push("Insolvency proceedings registered against the asset or owner");
  if (deal.hasLisPendens) keyRisks.push("Lis pendens recorded — outstanding legal claim against title");
  if (deal.inFloodZone) keyRisks.push("Asset sits within Environment Agency flood risk zone");
  if (aiRisks.length > 0) keyRisks.push(...aiRisks);
  (deal.signals ?? []).forEach((s) => {
    if (!keyRisks.some((r) => r.toLowerCase().includes(s.toLowerCase()))) keyRisks.push(s);
  });

  const keyOpportunities: string[] = [];
  if (aiOpportunities.length > 0) keyOpportunities.push(...aiOpportunities);
  if (prop.passingRent && prop.erv && prop.erv > prop.passingRent) {
    const uplift = ((prop.erv - prop.passingRent) / prop.passingRent) * 100;
    keyOpportunities.push(`${uplift.toFixed(0)}% ERV uplift potential vs current passing rent`);
  }

  return {
    // ── Identity & confidentiality ──
    id: deal.id,
    address: deal.address,
    confidential: options.confidential ?? true,
    generatedAt: new Date().toISOString(),
    currency: deal.currency ?? "GBP",

    // ── Headline / verdict ──
    recommendation: verdict.verdict as "PROCEED" | "CONDITIONAL" | "PASS",
    dealScore: verdict.dealScore,
    verdictReasons: verdict.reasons ?? [],
    verdictConditions: verdict.conditions ?? null,

    // ── Cover metrics ──
    askingPrice: deal.askingPrice ?? null,
    guidePrice: deal.guidePrice ?? null,
    targetEntry: equityResult.totalCostIn ? Math.round(equityResult.totalCostIn * 0.7) : null,
    assetType: deal.assetType,
    sqft: deal.buildingSizeSqft ?? deal.sqft ?? null,

    // ── Executive summary financials ──
    irr: irrResult.irr,
    equityMultiple: equityResult.equityMultiple,
    totalCostIn: equityResult.totalCostIn,
    investmentThesis,

    // ── Asset / physical ──
    tenure: deal.tenure ?? str(ai?.tenure) ?? null,
    yearBuilt: deal.yearBuilt ?? num(ai?.yearBuilt) ?? null,
    occupancyPct: deal.occupancyPct ?? null,
    propertyType: str(ai?.propertyType) ?? null,
    numberOfUnits: aiNumberOfUnits ?? null,
    accommodation: listingAccommodation ?? str(ai?.accommodation) ?? null,
    condition: aiCondition ?? null,
    keyFeatures: [...new Set([...listingFeatures, ...aiKeyFeatures])],
    listingDescription: listingDescription ?? null,
    brokerName: deal.brokerName ?? str(ai?.agentName) ?? null,
    daysOnMarket: deal.daysOnMarket ?? null,

    // ── Tenancy ──
    tenantNames: aiTenantNames,
    leaseExpiry: aiLeaseExpiry ?? null,
    breakDates: aiBreakDates ?? null,
    serviceCharge: num(ai?.serviceCharge) ?? num(ds.serviceCharge) ?? null,
    groundRent: num(ai?.groundRent) ?? null,
    aiVacancy: aiVacancy ?? null,

    // ── Location ──
    geocode: geocode
      ? {
          lat: num(geocode.lat) ?? null,
          lng: num(geocode.lng) ?? null,
          formatted: str(geocode.formatted) ?? null,
        }
      : null,
    satelliteImageUrl: deal.satelliteImageUrl ?? null,
    region: deal.region ?? null,

    // ── Planning & environmental ──
    planningApplications: planningApps,
    epc: epc
      ? {
          rating: str(epc.epcRating) ?? deal.epcRating ?? null,
          potential: str(epc.epcPotential) ?? null,
          validUntil: str(epc.validUntil) ?? null,
          meesRisk: str(epc.meesRisk) ?? null,
          co2: str(epc.co2Emissions) ?? null,
        }
      : deal.epcRating
        ? { rating: deal.epcRating, potential: null, validUntil: null, meesRisk: null, co2: null }
        : null,
    floodZone: flood
      ? {
          inZone: Boolean(flood.inFloodZone),
          zone: str(flood.zone) ?? null,
          description: str(flood.description) ?? null,
        }
      : deal.inFloodZone
        ? { inZone: true, zone: null, description: null }
        : null,
    devPotential: devPotential
      ? {
          summary: str(devPotential.summary) ?? null,
          permittedDevelopment: Boolean(devPotential.permittedDevelopment),
          residualValue: num(devPotential.residualValue) ?? null,
        }
      : null,

    // ── Financials ──
    passingRent: prop.passingRent ?? null,
    erv: prop.erv ?? null,
    capRate,
    noi: irrResult.breakdown.annualNOI ?? num(returns?.noi) ?? null,
    exitValue: irrResult.breakdown.exitProceeds ?? null,
    cashFlows: irrResult.cashFlows,
    rentGap: rentGap
      ? {
          passingRent: num(rentGap.passingRent) ?? null,
          erv: num(rentGap.marketERV) ?? null,
          gap: num(rentGap.gap) ?? null,
          gapPct: num(rentGap.gapPct) ?? null,
          direction: str(rentGap.direction) ?? null,
        }
      : null,
    valuations: valuations
      ? {
          incomeCap: num((obj(valuations.incomeCap) ?? {}).value) ?? null,
          blended: num((obj(valuations.blended) ?? {}).value) ?? null,
          confidence: num((obj(valuations.blended) ?? {}).confidence) ?? null,
          asking: num(valuations.askingPrice) ?? deal.askingPrice ?? null,
          discount: num(valuations.discount) ?? null,
        }
      : null,
    returns: returns
      ? {
          capRate: num(returns.capRate) ?? null,
          irr5yr: num(returns.irr5yr) ?? null,
          cashOnCash: num(returns.cashOnCash) ?? null,
          equityMultiple: num(returns.equityMultiple) ?? null,
          equityNeeded: num(returns.equityNeeded) ?? null,
        }
      : null,
    scenarios,
    assumptions: assumptions
      ? Object.entries(assumptions).reduce<Record<string, { value: unknown; source: string | null }>>(
          (acc, [k, v]) => {
            const o = obj(v);
            if (o && "value" in o) {
              acc[k] = { value: (o as { value: unknown }).value, source: str(o.source) ?? null };
            }
            return acc;
          },
          {}
        )
      : null,

    // ── Market ──
    market: market
      ? {
          capRate: num(market.capRate) ?? null,
          ervPsf: num(market.ervPsf) ?? null,
          vacancyRate: num(market.vacancyRate) ?? null,
          primeYield: num(market.primeYield) ?? null,
          secondaryYield: num(market.secondaryYield) ?? null,
          dscr: num(market.dscr) ?? null,
          annualDebtService: num(market.annualDebtService) ?? null,
          notes: str(market.notes) ?? null,
        }
      : null,

    // ── Comparables ──
    comparables: comps,

    // ── Risk ──
    keyRisks: [...new Set(keyRisks)].slice(0, 8),
    keyOpportunities: [...new Set(keyOpportunities)].slice(0, 6),
    signals: deal.signals ?? [],
    hasInsolvency: deal.hasInsolvency ?? false,
    hasLisPendens: deal.hasLisPendens ?? false,
    inFloodZone: deal.inFloodZone ?? false,
    confidence: num(score?.confidence) ?? null,
    confidenceLevel: str(score?.confidenceLevel) ?? null,

    // ── Ownership ──
    ownerName: deal.ownerName ?? null,
    companyOwner: companyOwner
      ? {
          name: str(companyOwner.name) ?? null,
          number: str(companyOwner.companyNumber) ?? null,
          status: str(companyOwner.status) ?? null,
          incorporated: str(companyOwner.incorporated) ?? null,
        }
      : null,
    ownerPortfolio: ownerProperties,
    covenantStrength: covenant
      ? {
          rating: str(covenant.rating) ?? null,
          summary: str(covenant.summary) ?? null,
        }
      : null,

    // ── Deep analysis ──
    dealAnalysis: dealAnalysis
      ? {
          summary: str(dealAnalysis.summary) ?? null,
          dcfValue: num(dealAnalysis.dcfValue) ?? null,
          npv: num(dealAnalysis.npv) ?? null,
        }
      : null,
    ricsAnalysis: ricsAnalysis
      ? {
          recommendation: str(ricsAnalysis.recommendation) ?? null,
          marketValue: num(ricsAnalysis.marketValue) ?? null,
          confidence: str(ricsAnalysis.confidence) ?? null,
          notes: str(ricsAnalysis.notes) ?? null,
        }
      : null,
  };
}

function deriveThesis(deal: DealSourceData, prop: Property): string {
  const parts: string[] = [];
  if (prop.passingRent && prop.askingPrice) {
    const grossYield = (prop.passingRent / prop.askingPrice) * 100;
    parts.push(`${grossYield.toFixed(1)}% gross yield`);
  }
  if (deal.tenure) parts.push(`${deal.tenure} tenure`);
  if (deal.occupancyPct != null) parts.push(`${Math.round(deal.occupancyPct * 100)}% occupied`);
  if (deal.assetType) parts.push(`${deal.assetType.toLowerCase()} asset`);
  return parts.length > 0
    ? `${deal.address} — ${parts.join(", ")}. See financial analysis for full underwriting.`
    : `Investment opportunity at ${deal.address}. Further analysis required before committee submission.`;
}

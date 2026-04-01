/**
 * src/lib/deal-analysis.ts
 * Deal analysis engine — thinks like a property acquisitions analyst.
 * Never returns blank/null/N/A. Every field has a value with confidence level.
 */

import {
  getMarketCapRate, getMarketERV, SCOUT_FINANCING, calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";

// ── Types ──

export interface DealAnalysis {
  verdict: { rating: "good" | "marginal" | "bad"; summary: string };
  vacancyAssumption: { isVacant: boolean; reasoning: string };
  lettingScenario: {
    marketRent: number;
    marketRentSource: string;
    voidMonths: number;
    voidReasoning: string;
    lettingFee: number;
    rentFreeMonths: number;
    marketingCost: number;
    timeToStabilise: number;
    stabilisedIncome: number;
  } | null;
  capexEstimate: {
    epcUpgrade: number;
    refurb: number;
    contingency: number;
    total: number;
    reasoning: string;
  };
  totalAcquisitionCost: {
    purchasePrice: number;
    sdlt: number;
    legals: number;
    survey: number;
    refurb: number;
    voidCarryCost: number;
    lettingCosts: number;
    total: number;
  };
  stabilisedYield: { pct: number; method: string };
  debtCoverage: { dscr: number; annualDebtService: number; surplus: number; canService: boolean };
  yieldRange: { low: number; mid: number; high: number; label: string };
  sensitivity: Array<{ scenario: string; yield: string; verdict: string }>;
  locationGrade: { grade: "prime" | "secondary" | "tertiary"; reasoning: string };
  confidence: "high" | "medium" | "low";
  estimatedFields: string[];
}

export interface EstimatedField {
  value: any;
  source: string;
  confidence: "high" | "medium" | "low";
  method: string;
}

// ── Estimation functions ──

export function estimateEPC(assetType: string, yearBuilt: number | null): EstimatedField {
  const type = assetType.toLowerCase();
  let rating: string;
  let method: string;
  if (yearBuilt) {
    if (/industrial|warehouse/.test(type)) {
      rating = yearBuilt < 1990 ? "E" : yearBuilt < 2000 ? "D" : yearBuilt < 2010 ? "C" : "B";
    } else if (/office/.test(type)) {
      rating = yearBuilt < 1990 ? "D" : yearBuilt < 2005 ? "C" : "B";
    } else if (/retail/.test(type)) {
      rating = yearBuilt < 1990 ? "D" : yearBuilt < 2000 ? "C" : "B";
    } else {
      rating = yearBuilt < 1990 ? "D" : "C";
    }
    method = `estimated from ${type} built ${yearBuilt}`;
  } else {
    if (/industrial|warehouse/.test(type)) { rating = "D"; method = "typical for industrial"; }
    else if (/office/.test(type)) { rating = "C"; method = "typical for office"; }
    else { rating = "D"; method = "typical for commercial"; }
  }
  return { value: rating, source: "estimated", confidence: "low", method };
}

export function estimateSize(assetType: string, price: number | null, region: string): EstimatedField {
  const type = assetType.toLowerCase();
  if (price) {
    const ervPsf = getMarketERV(assetType, region);
    const capRate = getMarketCapRate(assetType, region);
    const psfBenchmark = ervPsf / capRate;
    const sqft = Math.round(price / psfBenchmark);
    return { value: sqft, source: "estimated", confidence: "medium", method: `from price ÷ £${Math.round(psfBenchmark)}/sqft benchmark` };
  }
  // Type averages
  let sqft: number;
  if (/industrial|warehouse/.test(type)) sqft = 5000;
  else if (/office/.test(type)) sqft = 3000;
  else if (/retail/.test(type)) sqft = 1500;
  else sqft = 3000;
  return { value: sqft, source: "estimated", confidence: "low", method: `typical for ${type}` };
}

export function estimateRent(sqft: number, assetType: string, region: string): EstimatedField {
  const ervPsf = getMarketERV(assetType, region);
  const annualRent = Math.round(sqft * ervPsf);
  return { value: annualRent, source: "estimated", confidence: "medium", method: `${sqft.toLocaleString()} sqft × £${ervPsf.toFixed(2)}/sqft market rate` };
}

export function estimateYearBuilt(assetType: string, epcAgeBand?: string): EstimatedField {
  if (epcAgeBand) {
    const match = epcAgeBand.match(/(\d{4})/);
    if (match) return { value: parseInt(match[1], 10), source: "EPC Register", confidence: "high", method: "EPC construction age band" };
  }
  const type = assetType.toLowerCase();
  let year: number;
  if (/industrial|warehouse/.test(type)) year = 1990;
  else if (/office/.test(type)) year = 2000;
  else if (/retail/.test(type)) year = 1960;
  else year = 1990;
  return { value: year, source: "estimated", confidence: "low", method: `typical for ${type}` };
}

export function estimateOccupancy(listingText: string | null, aiVacancy: string | null): EstimatedField {
  const text = (listingText || "").toLowerCase() + " " + (aiVacancy || "").toLowerCase();
  if (/vacant|empty|unoccupied|available immediately|to let/.test(text)) {
    return { value: 0, source: "listing", confidence: "high", method: "listing indicates vacant" };
  }
  if (/fully let|fully occupied|tenanted|occupied|income producing/.test(text)) {
    return { value: 100, source: "listing", confidence: "high", method: "listing indicates fully let" };
  }
  // Default: assume vacant (conservative — tenanted property would advertise income)
  return { value: 0, source: "estimated", confidence: "medium", method: "assumed vacant (no income mentioned)" };
}

export function estimateVoidPeriod(assetType: string, locationGrade: string, sqft: number): { months: number; reasoning: string } {
  const type = assetType.toLowerCase();
  let base: number;
  if (/industrial|warehouse/.test(type)) base = 3;
  else if (/office/.test(type)) base = 6;
  else if (/retail/.test(type)) base = 9;
  else base = 6;

  // Adjust for location
  if (locationGrade === "tertiary") base = Math.round(base * 2);
  else if (locationGrade === "secondary") base = Math.round(base * 1.5);

  // Adjust for size (larger units take longer)
  if (sqft > 10000) base = Math.round(base * 1.5);
  else if (sqft > 5000) base = Math.round(base * 1.2);

  const parts = [`${base} months typical for ${type}`];
  if (locationGrade !== "prime") parts.push(`${locationGrade} location adds time`);
  if (sqft > 5000) parts.push(`larger unit (${sqft.toLocaleString()} sqft) takes longer`);

  return { months: base, reasoning: parts.join("; ") };
}

export function estimateRentFree(assetType: string): number {
  const type = assetType.toLowerCase();
  if (/industrial|warehouse/.test(type)) return 3;
  if (/office/.test(type)) return 6;
  if (/retail/.test(type)) return 12;
  return 3;
}

function assessLocationGrade(address: string, assetType: string): { grade: "prime" | "secondary" | "tertiary"; reasoning: string } {
  const addr = address.toLowerCase();
  // London zones
  if (/\b(ec[1-4]|wc[12]|w1|sw1|se1|e1|n1|nw1)\b/i.test(address)) {
    return { grade: "prime", reasoning: "Central London postcode" };
  }
  if (/\b(shoreditch|hoxton|clerkenwell|soho|mayfair|covent garden|king'?s cross|canary wharf|city of london|victoria|westminster)\b/i.test(addr)) {
    return { grade: "prime", reasoning: "Prime London location" };
  }
  if (/\b(kingston|richmond|islington|hackney|camden|fulham|battersea|brixton|stratford|greenwich)\b/i.test(addr)) {
    return { grade: "secondary", reasoning: "Inner London / strong suburban location" };
  }
  if (/\blondon\b/i.test(addr) || /\b(sw|se|nw|ne|e|w|n)\d{1,2}\b/i.test(address)) {
    return { grade: "secondary", reasoning: "Greater London location" };
  }
  // Regional cities
  if (/\b(manchester|birmingham|leeds|bristol|edinburgh|glasgow|liverpool|cardiff|nottingham|sheffield)\b/i.test(addr)) {
    return { grade: "secondary", reasoning: "Major regional city" };
  }
  // Industrial estates
  if (/\b(estate|park|trading|business park)\b/i.test(addr)) {
    return { grade: "secondary", reasoning: "Commercial estate / business park" };
  }
  return { grade: "secondary", reasoning: "Regional location" };
}

function calculateSDLT(price: number): number {
  // UK commercial SDLT bands (2026)
  if (price <= 150000) return 0;
  if (price <= 250000) return (price - 150000) * 0.02;
  return 100000 * 0 + 100000 * 0.02 + (price - 250000) * 0.05;
}

function estimateCapex(epcRating: string | null, assetType: string, sqft: number, yearBuilt: number | null): { epcUpgrade: number; refurb: number; contingency: number; total: number; reasoning: string } {
  const type = assetType.toLowerCase();
  let epcUpgrade = 0;
  const epcReasonings: string[] = [];

  // EPC upgrade cost
  if (epcRating) {
    const r = epcRating.toUpperCase();
    if (r === "F" || r === "G") { epcUpgrade = sqft < 3000 ? 40000 : 60000; epcReasonings.push(`EPC ${r}→B upgrade`); }
    else if (r === "E") { epcUpgrade = sqft < 3000 ? 30000 : 45000; epcReasonings.push(`EPC ${r}→B upgrade`); }
    else if (r === "D") { epcUpgrade = sqft < 3000 ? 15000 : 25000; epcReasonings.push(`EPC ${r}→B upgrade`); }
  }

  // Refurb estimate
  let refurbPsf: number;
  if (/industrial|warehouse/.test(type)) refurbPsf = 10;
  else if (/office/.test(type)) refurbPsf = 20;
  else if (/retail/.test(type)) refurbPsf = 15;
  else refurbPsf = 12;

  // Older buildings need more work
  if (yearBuilt && yearBuilt < 1990) refurbPsf = Math.round(refurbPsf * 1.5);

  const refurb = Math.round(sqft * refurbPsf);
  const contingency = Math.round((epcUpgrade + refurb) * 0.15);
  const total = epcUpgrade + refurb + contingency;

  const reasons = [...epcReasonings];
  reasons.push(`Refurb at £${refurbPsf}/sqft for ${type}`);
  if (yearBuilt && yearBuilt < 1990) reasons.push("Older building premium applied");
  reasons.push("15% contingency");

  return { epcUpgrade, refurb, contingency, total, reasoning: reasons.join(". ") };
}

// ── Main analysis function ──

export function analyseDeal(params: {
  address: string;
  assetType: string;
  region: string;
  askingPrice: number;
  sqft: number;
  sqftSource: string;
  passingRent: number;
  passingRentSource: string;
  erv: number;
  ervSource: string;
  epcRating: string | null;
  yearBuilt: number | null;
  occupancyPct: number;
  occupancySource: string;
  listingDescription: string | null;
  aiVacancy: string | null;
  compsCount: number;
  noi: number;
}): DealAnalysis {
  const {
    address, assetType, region, askingPrice, sqft, sqftSource,
    passingRent, passingRentSource, erv, ervSource,
    epcRating, yearBuilt, occupancyPct, occupancySource,
    listingDescription, aiVacancy, compsCount, noi,
  } = params;

  const estimatedFields: string[] = [];
  if (sqftSource.includes("estimated")) estimatedFields.push("size");
  if (ervSource.includes("estimated")) estimatedFields.push("erv");
  if (passingRentSource.includes("estimated")) estimatedFields.push("rent");
  if (occupancySource.includes("estimated") || occupancySource.includes("assumed")) estimatedFields.push("occupancy");

  // Location grade
  const locationGrade = assessLocationGrade(address, assetType);

  // Vacancy assumption
  const isVacant = occupancyPct === 0;
  const vacancyAssumption = {
    isVacant,
    reasoning: isVacant
      ? (occupancySource.includes("listing") ? "Listing indicates property is vacant" : "Assumed vacant — no income mentioned in listing")
      : `${occupancyPct}% occupied (${occupancySource})`,
  };

  // Letting scenario (only for vacant properties)
  let lettingScenario: DealAnalysis["lettingScenario"] = null;
  if (isVacant) {
    const voidEst = estimateVoidPeriod(assetType, locationGrade.grade, sqft);
    const rentFreeMonths = estimateRentFree(assetType);
    const lettingFee = Math.round(erv * 0.12); // 12% of first year
    const marketingCost = 2000;
    const timeToStabilise = voidEst.months + rentFreeMonths + 3; // +3 months marketing

    lettingScenario = {
      marketRent: erv,
      marketRentSource: ervSource,
      voidMonths: voidEst.months,
      voidReasoning: voidEst.reasoning,
      lettingFee,
      rentFreeMonths,
      marketingCost,
      timeToStabilise,
      stabilisedIncome: erv,
    };
  }

  // CAPEX estimate
  const capexEstimate = estimateCapex(epcRating, assetType, sqft, yearBuilt);

  // Total acquisition cost
  const sdlt = calculateSDLT(askingPrice);
  const legals = Math.round(Math.max(5000, askingPrice * 0.01));
  const survey = Math.round(Math.max(2000, askingPrice * 0.003));
  const voidCarryCost = isVacant && lettingScenario
    ? Math.round((calculateAnnualDebtService(askingPrice) / 12) * lettingScenario.voidMonths + askingPrice * 0.01 * (lettingScenario.voidMonths / 12)) // debt service + insurance/rates during void
    : 0;
  const lettingCosts = lettingScenario ? lettingScenario.lettingFee + lettingScenario.marketingCost : 0;

  const totalAcquisitionCost = {
    purchasePrice: askingPrice,
    sdlt,
    legals,
    survey,
    refurb: capexEstimate.total,
    voidCarryCost,
    lettingCosts,
    total: askingPrice + sdlt + legals + survey + capexEstimate.total + voidCarryCost + lettingCosts,
  };

  // Stabilised yield
  const stabilisedIncome = isVacant ? erv * 0.85 : noi; // 85% of ERV (15% opex)
  const stabilisedYieldPct = totalAcquisitionCost.total > 0
    ? (stabilisedIncome / totalAcquisitionCost.total) * 100
    : 0;
  const stabilisedYield = {
    pct: parseFloat(stabilisedYieldPct.toFixed(2)),
    method: isVacant ? "ERV × 85% ÷ total acquisition cost" : "NOI ÷ total acquisition cost",
  };

  // Debt coverage
  const annualDebtService = calculateAnnualDebtService(askingPrice);
  const dscrVal = stabilisedIncome / annualDebtService;
  const debtCoverage = {
    dscr: parseFloat(dscrVal.toFixed(2)),
    annualDebtService: Math.round(annualDebtService),
    surplus: Math.round(stabilisedIncome - annualDebtService),
    canService: dscrVal >= 1.0,
  };

  // Yield range
  const mktCapRate = getMarketCapRate(assetType, region);
  const yieldRange = {
    low: parseFloat((mktCapRate * 100).toFixed(2)),
    mid: parseFloat((mktCapRate * 100 + 1.0).toFixed(2)),
    high: parseFloat((mktCapRate * 100 + 2.0).toFixed(2)),
    label: `${(mktCapRate * 100).toFixed(1)}% – ${(mktCapRate * 100 + 2.0).toFixed(1)}% (prime to distressed)`,
  };

  // Sensitivity
  const costOfDebt = SCOUT_FINANCING.annualRate * 100;
  const sensitivity = [
    {
      scenario: "Void 6 months longer",
      yield: `${(stabilisedIncome / (totalAcquisitionCost.total + annualDebtService * 0.5) * 100).toFixed(1)}%`,
      verdict: stabilisedIncome / (totalAcquisitionCost.total + annualDebtService * 0.5) * 100 > costOfDebt ? "Still works" : "Breaks",
    },
    {
      scenario: "Rent 15% lower",
      yield: `${(stabilisedIncome * 0.85 / totalAcquisitionCost.total * 100).toFixed(1)}%`,
      verdict: stabilisedIncome * 0.85 / totalAcquisitionCost.total * 100 > costOfDebt ? "Still works" : "Tight",
    },
    {
      scenario: "Refurb costs +30%",
      yield: `${(stabilisedIncome / (totalAcquisitionCost.total + capexEstimate.total * 0.3) * 100).toFixed(1)}%`,
      verdict: stabilisedIncome / (totalAcquisitionCost.total + capexEstimate.total * 0.3) * 100 > costOfDebt ? "Still works" : "Tight",
    },
    {
      scenario: `Price needed for ${(costOfDebt + 2).toFixed(0)}% yield`,
      yield: `${(costOfDebt + 2).toFixed(1)}%`,
      verdict: `£${Math.round(stabilisedIncome / ((costOfDebt + 2) / 100)).toLocaleString()}`,
    },
  ];

  // Confidence
  const confidence: "high" | "medium" | "low" = estimatedFields.length === 0 ? "high" : estimatedFields.length <= 2 ? "medium" : "low";

  // ── VERDICT ──
  let rating: "good" | "marginal" | "bad";
  let summary: string;

  if (stabilisedYieldPct >= costOfDebt + 2 && dscrVal >= 1.25) {
    rating = "good";
    const timeStr = isVacant && lettingScenario ? ` within ${lettingScenario.timeToStabilise} months` : "";
    summary = `Stabilised yield of ${stabilisedYieldPct.toFixed(1)}% achievable${timeStr} at total cost of £${totalAcquisitionCost.total.toLocaleString()}. Covers ${costOfDebt}% debt service with ${dscrVal.toFixed(1)}× margin.`;
    if (compsCount > 0) summary += ` Supported by ${compsCount} comparable sales.`;
  } else if (stabilisedYieldPct >= costOfDebt && dscrVal >= 1.0) {
    rating = "marginal";
    const issues: string[] = [];
    if (isVacant && lettingScenario && lettingScenario.voidMonths > 6) issues.push(`${lettingScenario.voidMonths} month estimated void`);
    if (capexEstimate.total > askingPrice * 0.1) issues.push(`£${capexEstimate.total.toLocaleString()} refurb needed`);
    if (dscrVal < 1.25) issues.push(`tight debt coverage at ${dscrVal.toFixed(2)}×`);
    summary = `Stabilised yield of ${stabilisedYieldPct.toFixed(1)}% is marginal. ${issues.join(". ")}. Consider negotiating on price.`;
  } else {
    rating = "bad";
    const priceThatWorks = Math.round(stabilisedIncome / ((costOfDebt + 2) / 100));
    const reduction = Math.round(((askingPrice - priceThatWorks) / askingPrice) * 100);
    summary = `Asking price implies ${stabilisedYieldPct.toFixed(1)}% yield — below ${costOfDebt}% cost of debt. Would need ${reduction > 0 ? `${reduction}%` : "no"} price reduction to £${priceThatWorks.toLocaleString()} to achieve target yield.`;
    if (locationGrade.grade === "tertiary") summary += ` Tertiary location adds letting risk.`;
  }

  return {
    verdict: { rating, summary },
    vacancyAssumption,
    lettingScenario,
    capexEstimate,
    totalAcquisitionCost,
    stabilisedYield,
    debtCoverage,
    yieldRange,
    sensitivity,
    locationGrade,
    confidence,
    estimatedFields,
  };
}

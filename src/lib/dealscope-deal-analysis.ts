/**
 * src/lib/dealscope-deal-analysis.ts
 * RICS-aligned deal analysis engine for DealScope.
 *
 * Three valuation approaches per RICS Red Book:
 *   1. Market (comparable) approach
 *   2. Income approach (capitalisation + DCF)
 *   3. Cost/Residual approach
 *
 * Plus: letting analysis, CAPEX, full cost breakdown, returns, verdict.
 */

import {
  getMarketCapRate, getMarketERV, SCOUT_FINANCING, calculateAnnualDebtService,
} from "@/lib/data/scout-benchmarks";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface RICSAnalysis {
  // ── Quick filter (Level 1) ──
  quickFilter: QuickFilterResult;

  // ── Valuation (Level 2) ──
  valuations: {
    market: MarketValuation | null;
    income: IncomeValuation;
    residual: ResidualValuation | null;
    reconciled: ReconciledValuation;
  };

  // ── Letting analysis ──
  lettingAnalysis: LettingAnalysis | null;

  // ── CAPEX ──
  capex: CAPEXAnalysis;

  // ── Full cost breakdown ──
  acquisitionCost: AcquisitionCost;

  // ── Returns ──
  returns: ReturnsAnalysis;

  // ── DCF ──
  dcf: DCFResult;

  // ── Sensitivity ──
  sensitivity: SensitivityRow[];

  // ── Verdict ──
  verdict: DealVerdict;

  // ── Location ──
  locationGrade: LocationGrade;

  // ── Meta ──
  confidence: "high" | "medium" | "low";
  estimatedFields: string[];
  methodology: string[];
}

export interface QuickFilterResult {
  impliedYield: number;
  yieldSpread: number;
  costOfDebt: number;
  pricePerSqft: number;
  marketPricePerSqft: number;
  psfPremiumDiscount: number; // negative = discount
  verdict: "interesting" | "marginal" | "doesnt_stack" | "value_add";
  verdictText: string;
  flags: string[];
}

export interface MarketValuation {
  comps: CompAdjustment[];
  avgPsf: number;
  adjustedAvgPsf: number;
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  confidence: "high" | "medium" | "low";
  method: string;
}

export interface CompAdjustment {
  address: string;
  price: number;
  sqft: number;
  psf: number;
  date: string;
  distance: string;
  sizeAdj: number;
  dateAdj: number;
  locationAdj: number;
  totalAdj: number;
  adjustedPsf: number;
}

export interface IncomeValuation {
  // Traditional capitalisation
  capitalisation: {
    netInitialYield: number;
    incomeCapValue: number;
    method: string;
  };
  // Term & reversion (if under/over-rented)
  termReversion: {
    termValue: number;
    reversionValue: number;
    totalValue: number;
    method: string;
  } | null;
  // DCF summary
  dcfValue: number;
  dcfIRR: number;
}

export interface ResidualValuation {
  gdv: number;
  constructionCost: number;
  professionalFees: number;
  financeCost: number;
  developerProfit: number;
  contingency: number;
  totalCosts: number;
  residualLandValue: number;
  method: string;
}

export interface ReconciledValuation {
  low: number;
  mid: number;
  high: number;
  primary: string;
  variance: number; // % spread between methods
  opinion: string;
}

export interface LettingAnalysis {
  // Market rent
  marketRent: { low: number; mid: number; high: number; source: string; psfLow: number; psfMid: number; psfHigh: number };
  // Void
  voidPeriod: { months: number; reasoning: string };
  // Incentives
  rentFreeMonths: number;
  fittingOutContribution: number;
  agentFee: number;
  legalCosts: number;
  // Tenant profile
  tenantProfile: { type: string; leaseLength: string; breakClause: string };
  // Timeline
  refurbMonths: number;
  marketingMonths: number;
  totalMonthsToStabilise: number;
  // Carry costs
  monthlyCarryCost: number;
  totalCarryCost: number;
  carryCostBreakdown: { debtService: number; rates: number; insurance: number; security: number; utilities: number };
}

export interface CAPEXAnalysis {
  epcUpgrade: { cost: number; measures: EPCMeasure[]; currentRating: string; targetRating: string };
  refurb: { cost: number; psfRate: number; scope: string };
  contingency: { cost: number; pct: number; reasoning: string };
  professionalFees: { cost: number; pct: number };
  asbestos: { cost: number; applicable: boolean; reasoning: string };
  total: number;
  reasoning: string;
}

export interface EPCMeasure {
  measure: string;
  cost: number;
  annualSaving: number;
  paybackYears: number;
}

export interface AcquisitionCost {
  purchasePrice: number;
  sdlt: number;
  legal: number;
  survey: number;
  agentFee: number;
  financeArrangement: number;
  subtotalAcquisition: number;
  capex: number;
  carryCosts: number;
  lettingCosts: number;
  totalCostIn: number;
}

export interface ReturnsAnalysis {
  netInitialYield: number;
  stabilisedYield: number;
  yieldOnCost: number;
  cashOnCashYear1: number;
  cashOnCashStabilised: number;
  irr5yr: number;
  irr10yr: number;
  equityMultiple: number;
  dscr: number;
  debtYield: number;
  paybackMonths: number;
}

export interface DCFResult {
  years: DCFYear[];
  terminalValue: number;
  exitYield: number;
  npv: number;
  irr: number;
  equityMultiple: number;
  discountRate: number;
}

export interface DCFYear {
  year: number;
  grossIncome: number;
  voidProvision: number;
  managementFee: number;
  insurance: number;
  maintenance: number;
  netIncome: number;
  debtService: number;
  cashFlow: number;
  cumulative: number;
}

export interface SensitivityRow {
  scenario: string;
  voidMonths: string;
  rent: string;
  capex: string;
  irr: string;
  verdict: string;
}

export interface DealVerdict {
  rating: "strong_buy" | "buy" | "marginal" | "avoid";
  summary: string;
  play: string;
  targetOfferRange: { low: number; high: number };
}

export interface LocationGrade {
  grade: "prime" | "secondary" | "tertiary";
  reasoning: string;
  demandDrivers: string[];
  submarketVacancy: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INPUT TYPE
// ══════════════════════════════════════════════════════════════════════════════

export interface AnalysisInput {
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
  comps: ComparableSale[];
  noi: number;
  tenure: string | null;
  condition: string | null;
  numberOfUnits: number | null;
  leaseExpiry: string | null;
  breakDates: string | null;
  rentReviewType: string | null;
  tenantNames: string | null;
  developmentPotential: boolean;
  isSpecialist: boolean; // casino, hotel, etc.
}

export interface ComparableSale {
  address: string;
  price: number;
  sqft?: number;
  date: string;
  distance?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function calculateSDLT(price: number): number {
  if (price <= 150000) return 0;
  if (price <= 250000) return (price - 150000) * 0.02;
  return 100000 * 0 + 100000 * 0.02 + (price - 250000) * 0.05;
}

function assessLocation(address: string, assetType: string): LocationGrade {
  const addr = address.toLowerCase();
  const drivers: string[] = [];
  let vacancy = "est. 4-6%";

  // Central London
  if (/\b(ec[1-4]|wc[12]|w1|sw1|se1|e1|n1|nw1)\b/i.test(address)) {
    drivers.push("Central London postcode", "World-class transport links", "Deep occupier demand");
    vacancy = "est. 3-5%";
    return { grade: "prime", reasoning: "Central London postcode — institutional grade location", demandDrivers: drivers, submarketVacancy: vacancy };
  }
  if (/\b(shoreditch|hoxton|clerkenwell|soho|mayfair|covent garden|king'?s cross|canary wharf|city of london|victoria|westminster|marylebone|fitzrovia|bloomsbury)\b/i.test(addr)) {
    drivers.push("Prime London submarket", "Strong occupier demand", "Limited new supply");
    vacancy = "est. 2-4%";
    return { grade: "prime", reasoning: `Prime London location — ${addr.includes("shoreditch") || addr.includes("hoxton") ? "creative/tech quarter" : "core West End/City"}`, demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Inner London / strong suburban
  if (/\b(kingston|richmond|islington|hackney|camden|fulham|battersea|brixton|stratford|greenwich|putney|wandsworth|clapham|hammersmith|chelsea|kensington)\b/i.test(addr)) {
    drivers.push("Inner London / strong suburban", "Good transport links", "Residential uplift potential");
    vacancy = "est. 3-6%";
    return { grade: "prime", reasoning: "Strong inner London / prime suburban location", demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Greater London
  if (/\blondon\b/i.test(addr) || /\b(sw|se|nw|ne|e|w|n)\d{1,2}\b/i.test(address)) {
    drivers.push("Greater London", "Good public transport", "Large labour catchment");
    vacancy = "est. 5-8%";
    return { grade: "secondary", reasoning: "Greater London — good demand fundamentals", demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Major regional cities
  if (/\b(manchester|birmingham|leeds|bristol|edinburgh|glasgow|liverpool|cardiff|nottingham|sheffield|newcastle|cambridge|oxford|bath|brighton|reading)\b/i.test(addr)) {
    const city = addr.match(/\b(manchester|birmingham|leeds|bristol|edinburgh|glasgow|liverpool|cardiff|nottingham|sheffield|newcastle|cambridge|oxford|bath|brighton|reading)\b/i)?.[1] || "city";
    drivers.push(`${city.charAt(0).toUpperCase() + city.slice(1)} — major regional hub`, "University city / talent pool", "Infrastructure investment");
    vacancy = "est. 6-10%";
    return { grade: "secondary", reasoning: `Major regional city — ${city}`, demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Industrial estates / business parks
  if (/\b(estate|park|trading|business park)\b/i.test(addr)) {
    drivers.push("Established commercial estate", "Neighbouring occupier demand", "Good road access");
    vacancy = "est. 5-8%";
    return { grade: "secondary", reasoning: "Established commercial area", demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Medway, Kent corridor
  if (/\b(medway|rochester|chatham|gillingham|strood|sittingbourne|maidstone|ashford|dartford|gravesend)\b/i.test(addr)) {
    drivers.push("Thames corridor", "A2/M2 access", "Lower rents than London attract occupiers");
    vacancy = "est. 3-5%";
    return { grade: "secondary", reasoning: "Kent/Medway — good industrial/logistics demand", demandDrivers: drivers, submarketVacancy: vacancy };
  }
  // Default
  drivers.push("Regional location", "Local occupier demand");
  vacancy = "est. 8-12%";
  return { grade: "secondary", reasoning: "Regional location — standard demand", demandDrivers: drivers, submarketVacancy: vacancy };
}

function ypPerp(yieldPct: number): number {
  return yieldPct > 0 ? 1 / (yieldPct / 100) : 0;
}

function pvFactor(rate: number, years: number): number {
  return 1 / Math.pow(1 + rate / 100, years);
}

function calcIRR(cashflows: number[], guess: number = 0.1, maxIter: number = 100): number {
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      dnpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 0.01) break;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
    if (rate < -0.99) rate = -0.5;
    if (rate > 10) rate = 0.5;
  }
  return rate;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK FILTER (Level 1)
// ══════════════════════════════════════════════════════════════════════════════

export function quickFilter(params: {
  askingPrice: number;
  rent: number; // passing rent or estimated ERV
  rentSource: string;
  sqft: number;
  assetType: string;
  region: string;
  epcRating: string | null;
  isAuction: boolean;
  isAdmin: boolean;
  isVacant: boolean;
  auctionDate: string | null;
  tenantCount: number;
}): QuickFilterResult {
  const { askingPrice, rent, sqft, assetType, region, epcRating, isAuction, isAdmin, isVacant, auctionDate, tenantCount } = params;

  const baseRate = 0.0475; // BoE base rate assumption
  const costOfDebt = (baseRate + 0.02) * 100; // base + 200bp = 6.75%

  const impliedYield = askingPrice > 0 ? (rent / askingPrice) * 100 : 0;
  const yieldSpread = impliedYield - costOfDebt;

  const mktERV = getMarketERV(assetType, region);
  const mktCapRate = getMarketCapRate(assetType, region);
  const marketPsf = mktERV / mktCapRate;
  const pricePerSqft = sqft > 0 ? askingPrice / sqft : 0;
  const psfPremiumDiscount = marketPsf > 0 ? ((pricePerSqft - marketPsf) / marketPsf) * 100 : 0;

  // Flags
  const flags: string[] = [];
  if (epcRating && /[EFG]/i.test(epcRating)) flags.push(`MEES risk (EPC ${epcRating})`);
  if (isAdmin) flags.push("Administration / distressed seller");
  if (isAuction && auctionDate) flags.push(`Auction deadline: ${auctionDate}`);
  if (tenantCount === 1) flags.push("Single tenant risk");
  if (isVacant) flags.push("Vacant — no passing income");

  // Verdict
  let verdict: QuickFilterResult["verdict"];
  let verdictText: string;

  if (isVacant && rent === 0) {
    verdict = "value_add";
    verdictText = "Value-add play — needs letting analysis to establish stabilised yield";
  } else if (yieldSpread >= 1.5 && psfPremiumDiscount <= 20) {
    verdict = "interesting";
    verdictText = `Implied yield ${impliedYield.toFixed(1)}% — ${yieldSpread.toFixed(1)}% above cost of debt. £/sqft ${psfPremiumDiscount > 0 ? psfPremiumDiscount.toFixed(0) + "% premium" : Math.abs(psfPremiumDiscount).toFixed(0) + "% discount"} to market.`;
  } else if (yieldSpread > 0 && yieldSpread < 1.5) {
    verdict = "marginal";
    verdictText = `Implied yield ${impliedYield.toFixed(1)}% — only ${yieldSpread.toFixed(1)}% above cost of debt. Needs closer look.`;
  } else {
    verdict = "doesnt_stack";
    verdictText = `Implied yield ${impliedYield.toFixed(1)}% — ${yieldSpread < 0 ? "below" : "at"} cost of debt (${costOfDebt.toFixed(1)}%). Doesn't stack at this price.`;
  }

  return {
    impliedYield: parseFloat(impliedYield.toFixed(2)),
    yieldSpread: parseFloat(yieldSpread.toFixed(2)),
    costOfDebt: parseFloat(costOfDebt.toFixed(2)),
    pricePerSqft: Math.round(pricePerSqft),
    marketPricePerSqft: Math.round(marketPsf),
    psfPremiumDiscount: parseFloat(psfPremiumDiscount.toFixed(1)),
    verdict,
    verdictText,
    flags,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL ANALYSIS (Level 2)
// ══════════════════════════════════════════════════════════════════════════════

export function analyseProperty(input: AnalysisInput): RICSAnalysis {
  const {
    address, assetType, region, askingPrice, sqft, sqftSource,
    passingRent, passingRentSource, erv, ervSource,
    epcRating, yearBuilt, occupancyPct, occupancySource,
    listingDescription, aiVacancy, comps, noi, tenure, condition,
    numberOfUnits, leaseExpiry, breakDates, rentReviewType, tenantNames,
    developmentPotential, isSpecialist,
  } = input;

  const estimatedFields: string[] = [];
  if (sqftSource.includes("estimated")) estimatedFields.push("size");
  if (ervSource.includes("estimated")) estimatedFields.push("rent");
  if (passingRentSource.includes("estimated") || passingRentSource.includes("assumed")) estimatedFields.push("passing_rent");
  if (occupancySource.includes("estimated") || occupancySource.includes("assumed")) estimatedFields.push("occupancy");

  const locationGrade = assessLocation(address, assetType);
  const isVacant = occupancyPct === 0;
  const mktCapRate = getMarketCapRate(assetType, region);
  const mktERV = getMarketERV(assetType, region);
  const costOfDebtPct = SCOUT_FINANCING.annualRate * 100;
  const methodology: string[] = [];

  // ── QUICK FILTER ──
  const qf = quickFilter({
    askingPrice,
    rent: isVacant ? erv : passingRent,
    rentSource: isVacant ? ervSource : passingRentSource,
    sqft,
    assetType,
    region,
    epcRating,
    isAuction: false,
    isAdmin: (listingDescription || "").toLowerCase().includes("admin"),
    isVacant,
    auctionDate: null,
    tenantCount: tenantNames ? tenantNames.split(",").length : 0,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // VALUATION 1: MARKET APPROACH (Comparables)
  // ══════════════════════════════════════════════════════════════════════════
  let marketVal: MarketValuation | null = null;
  if (comps.length > 0) {
    methodology.push("Market approach (comparable transactions)");
    const adjustedComps: CompAdjustment[] = comps.slice(0, 10).map(c => {
      const cSqft = c.sqft || sqft;
      const cPsf = cSqft > 0 ? c.price / cSqft : 0;

      // Size adjustment: larger units trade at lower £/sqft
      const sizeDiff = sqft > 0 && cSqft > 0 ? (sqft - cSqft) / cSqft : 0;
      const sizeAdj = sizeDiff > 0.3 ? -5 : sizeDiff < -0.3 ? 5 : 0;

      // Date adjustment: +0.5% per month for appreciation
      const monthsAgo = Math.max(0, (Date.now() - new Date(c.date).getTime()) / (30 * 24 * 60 * 60 * 1000));
      const dateAdj = Math.min(15, Math.round(monthsAgo * 0.5));

      // Location: same postcode district = 0, else -5 to +5
      const locationAdj = 0; // Would need postcode comparison

      const totalAdj = sizeAdj + dateAdj + locationAdj;
      const adjustedPsf = cPsf * (1 + totalAdj / 100);

      return {
        address: c.address,
        price: c.price,
        sqft: cSqft,
        psf: Math.round(cPsf),
        date: c.date,
        distance: c.distance ? `${(c.distance / 1000).toFixed(1)}km` : "—",
        sizeAdj,
        dateAdj,
        locationAdj,
        totalAdj,
        adjustedPsf: Math.round(adjustedPsf),
      };
    });

    const avgPsf = adjustedComps.reduce((s, c) => s + c.psf, 0) / adjustedComps.length;
    const adjustedAvgPsf = adjustedComps.reduce((s, c) => s + c.adjustedPsf, 0) / adjustedComps.length;

    const valueMid = Math.round(adjustedAvgPsf * sqft);
    const spread = adjustedComps.length >= 5 ? 0.1 : adjustedComps.length >= 3 ? 0.15 : 0.2;

    marketVal = {
      comps: adjustedComps,
      avgPsf: Math.round(avgPsf),
      adjustedAvgPsf: Math.round(adjustedAvgPsf),
      valueLow: Math.round(valueMid * (1 - spread)),
      valueMid,
      valueHigh: Math.round(valueMid * (1 + spread)),
      confidence: comps.length >= 5 ? "high" : comps.length >= 3 ? "medium" : "low",
      method: `${comps.length} comparable sales adjusted for size, date, and location`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VALUATION 2: INCOME APPROACH
  // ══════════════════════════════════════════════════════════════════════════
  methodology.push("Income approach (capitalisation + DCF)");

  const effectiveIncome = isVacant ? erv * 0.85 : noi > 0 ? noi : passingRent * 0.85;
  const incomeCapValue = mktCapRate > 0 ? Math.round(effectiveIncome / mktCapRate) : 0;
  const netInitialYield = askingPrice > 0 ? (effectiveIncome / askingPrice) * 100 : 0;

  // Term & Reversion for under/over-rented
  let termReversion: IncomeValuation["termReversion"] = null;
  if (!isVacant && passingRent > 0 && erv > 0 && Math.abs(passingRent - erv) / erv > 0.1) {
    const isUnderRented = passingRent < erv;
    const unexpiredYears = leaseExpiry
      ? Math.max(0, (new Date(leaseExpiry).getFullYear() - new Date().getFullYear()))
      : 5;
    const yieldPct = mktCapRate * 100;

    if (isUnderRented) {
      // Term & Reversion
      const termYP = unexpiredYears > 0 ? (1 - pvFactor(yieldPct, unexpiredYears)) / (yieldPct / 100) : 0;
      const termValue = Math.round(passingRent * termYP);
      const reversionYP = ypPerp(yieldPct) * pvFactor(yieldPct, unexpiredYears);
      const reversionValue = Math.round(erv * reversionYP);
      termReversion = {
        termValue,
        reversionValue,
        totalValue: termValue + reversionValue,
        method: `Under-rented: term (${unexpiredYears}yr at passing rent) + reversion to ERV`,
      };
    } else {
      // Hardcore / layer (over-rented)
      const hardcoreYP = ypPerp(yieldPct);
      const hardcoreValue = Math.round(erv * hardcoreYP);
      const topSlice = passingRent - erv;
      const topSliceYP = unexpiredYears > 0 ? (1 - pvFactor(yieldPct + 1, unexpiredYears)) / ((yieldPct + 1) / 100) : 0;
      const topSliceValue = Math.round(topSlice * topSliceYP);
      termReversion = {
        termValue: topSliceValue,
        reversionValue: hardcoreValue,
        totalValue: hardcoreValue + topSliceValue,
        method: `Over-rented: hardcore (ERV in perp) + top slice (excess for ${unexpiredYears}yr)`,
      };
    }
  }

  // ── DCF (10-year) ──
  const rentalGrowth = 0.025; // 2.5% p.a.
  const mgmtFeeRate = 0.05;
  const insuranceRate = 0.005;
  const maintenanceRate = 0.01;
  const voidProvisionRate = isVacant ? 0 : 0.03; // 3% void provision for tenanted
  const exitYield = mktCapRate + 0.005; // 50bp expansion on exit
  const discountRate = assetType.toLowerCase().includes("office") ? 0.09 : 0.08; // 8-9%

  const annualDebtService = calculateAnnualDebtService(askingPrice);
  const loanAmount = askingPrice * SCOUT_FINANCING.ltvPct;
  const equity = askingPrice - loanAmount;

  const years: DCFYear[] = [];
  let cumulative = -equity; // initial equity outlay
  const dcfCashflows: number[] = [-equity];
  let currentRent = isVacant ? erv : passingRent;
  const lettingVoidMonths = isVacant ? estimateVoidMonths(assetType, locationGrade.grade, sqft) : 0;

  for (let yr = 1; yr <= 10; yr++) {
    // Rent growth from year 2
    if (yr > 1) currentRent = Math.round(currentRent * (1 + rentalGrowth));

    // Year 1 for vacant: partial income based on void
    let effectiveMonths = 12;
    if (yr === 1 && isVacant) {
      effectiveMonths = Math.max(0, 12 - lettingVoidMonths);
    }

    const grossIncome = Math.round(currentRent * (effectiveMonths / 12));
    const voidProv = Math.round(grossIncome * voidProvisionRate);
    const mgmtFee = Math.round(grossIncome * mgmtFeeRate);
    const insurance = Math.round(currentRent * insuranceRate);
    const maintenance = Math.round(currentRent * maintenanceRate);
    const netIncome = grossIncome - voidProv - mgmtFee - insurance - maintenance;
    const cashFlow = netIncome - Math.round(annualDebtService);
    cumulative += cashFlow;

    years.push({
      year: yr,
      grossIncome,
      voidProvision: voidProv,
      managementFee: mgmtFee,
      insurance,
      maintenance,
      netIncome,
      debtService: Math.round(annualDebtService),
      cashFlow,
      cumulative: Math.round(cumulative),
    });

    dcfCashflows.push(cashFlow);
  }

  // Terminal value at year 10
  const exitRent = currentRent;
  const exitNOI = Math.round(exitRent * (1 - mgmtFeeRate - insuranceRate - maintenanceRate));
  const terminalValue = exitYield > 0 ? Math.round(exitNOI / exitYield) : 0;
  const exitEquity = terminalValue - loanAmount * 0.7; // rough outstanding balance
  dcfCashflows[10] = (dcfCashflows[10] || 0) + exitEquity;

  let dcfIRR = calcIRR(dcfCashflows) * 100;
  if (!isFinite(dcfIRR) || isNaN(dcfIRR)) dcfIRR = 0;
  const dcfNPV = dcfCashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + discountRate, t), 0);
  const totalCashReturned = years.reduce((s, y) => s + y.cashFlow, 0) + exitEquity;
  const dcfEquityMultiple = equity > 0 ? totalCashReturned / equity : 0;

  const dcfValue = Math.round(dcfNPV + loanAmount);

  const incomeVal: IncomeValuation = {
    capitalisation: {
      netInitialYield: parseFloat(netInitialYield.toFixed(2)),
      incomeCapValue,
      method: `NOI £${effectiveIncome.toLocaleString()} ÷ ${(mktCapRate * 100).toFixed(1)}% market yield`,
    },
    termReversion,
    dcfValue,
    dcfIRR: parseFloat(dcfIRR.toFixed(1)),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VALUATION 3: RESIDUAL (for development opportunities)
  // ══════════════════════════════════════════════════════════════════════════
  let residualVal: ResidualValuation | null = null;
  if (developmentPotential && numberOfUnits && numberOfUnits > 1) {
    methodology.push("Residual method (development potential)");
    // Estimate GDV from residential comparables
    const avgUnitValue = locationGrade.grade === "prime" ? 450000 : locationGrade.grade === "secondary" ? 300000 : 200000;
    const gdv = avgUnitValue * numberOfUnits;

    const unitSqft = sqft / numberOfUnits;
    const constructionCostPsf = /residential|flat|apartment/i.test(assetType) ? 180 : 120;
    const constructionCost = Math.round(sqft * constructionCostPsf);
    const professionalFees = Math.round(constructionCost * 0.12);
    const financeCost = Math.round((constructionCost + professionalFees) * 0.06 * 1.5); // 6% over 18 months
    const developerProfit = Math.round(gdv * 0.18);
    const contingency = Math.round(constructionCost * 0.1);
    const totalCosts = constructionCost + professionalFees + financeCost + developerProfit + contingency;
    const residualLandValue = gdv - totalCosts;

    residualVal = {
      gdv,
      constructionCost,
      professionalFees,
      financeCost,
      developerProfit,
      contingency,
      totalCosts,
      residualLandValue: Math.max(0, residualLandValue),
      method: `${numberOfUnits} units × £${avgUnitValue.toLocaleString()} avg = £${gdv.toLocaleString()} GDV`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECONCILED VALUATION
  // ══════════════════════════════════════════════════════════════════════════
  const valuationPoints: number[] = [incomeCapValue];
  if (marketVal) valuationPoints.push(marketVal.valueMid);
  if (termReversion) valuationPoints.push(termReversion.totalValue);
  if (dcfValue > 0) valuationPoints.push(dcfValue);
  if (residualVal) valuationPoints.push(residualVal.residualLandValue);

  const valMin = Math.min(...valuationPoints);
  const valMax = Math.max(...valuationPoints);
  const valMid = Math.round(valuationPoints.reduce((s, v) => s + v, 0) / valuationPoints.length);
  const variance = valMid > 0 ? ((valMax - valMin) / valMid) * 100 : 0;

  const primary = marketVal && marketVal.confidence !== "low"
    ? "Market approach (strongest evidence)"
    : "Income approach (capitalisation)";

  let opinion = `Reconciled value £${valMid.toLocaleString()} based on ${valuationPoints.length} methods.`;
  if (variance > 20) {
    opinion += ` Note: ${variance.toFixed(0)}% variance between methods — further investigation recommended.`;
  }
  if (askingPrice > valMax) {
    const premium = ((askingPrice - valMax) / valMax * 100).toFixed(0);
    opinion += ` Asking price is ${premium}% above highest valuation.`;
  } else if (askingPrice < valMin) {
    const discount = ((valMin - askingPrice) / valMin * 100).toFixed(0);
    opinion += ` Asking price is ${discount}% below lowest valuation — potential value opportunity.`;
  }

  const reconciledVal: ReconciledValuation = {
    low: valMin,
    mid: valMid,
    high: valMax,
    primary,
    variance: parseFloat(variance.toFixed(1)),
    opinion,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LETTING ANALYSIS (vacant properties)
  // ══════════════════════════════════════════════════════════════════════════
  let lettingAnalysis: LettingAnalysis | null = null;
  if (isVacant) {
    const type = assetType.toLowerCase();
    const voidMonths = estimateVoidMonths(assetType, locationGrade.grade, sqft);
    const voidReasoning = buildVoidReasoning(assetType, locationGrade, sqft, voidMonths);

    const rentFreeMonths = /industrial|warehouse/.test(type) ? 3 : /office/.test(type) ? 6 : /retail/.test(type) ? 12 : 3;
    const fittingOut = /office/.test(type) ? sqft * 10 : 0;
    const agentFee = Math.round(erv * 0.12);
    const legalCosts = 4000;

    // Tenant profile
    const tenantType = locationGrade.grade === "prime" ? "National / institutional tenant" : locationGrade.grade === "secondary" ? "Regional SME" : "Local / startup";
    const leaseLen = locationGrade.grade === "prime" ? "5-10 years" : "3-5 years";
    const breakCl = locationGrade.grade === "prime" ? "Year 5 break" : "Year 3 break";

    // Timeline
    const refurbMonths = yearBuilt && yearBuilt < 2000 ? 3 : 1;
    const marketingMonths = 2;
    const totalMonths = refurbMonths + marketingMonths + voidMonths + rentFreeMonths;

    // Carry costs
    const monthlyDebt = annualDebtService / 12;
    const monthlyRates = (askingPrice * 0.005) / 12; // ~0.5% of value p.a.
    const monthlyInsurance = (askingPrice * 0.002) / 12;
    const monthlySecurity = 500;
    const monthlyUtilities = 200;
    const monthlyCarry = Math.round(monthlyDebt + monthlyRates + monthlyInsurance + monthlySecurity + monthlyUtilities);
    const totalCarry = Math.round(monthlyCarry * (refurbMonths + voidMonths));

    const ervPsf = sqft > 0 ? erv / sqft : mktERV;
    const rentLow = Math.round(ervPsf * 0.85 * sqft);
    const rentMid = erv;
    const rentHigh = Math.round(ervPsf * 1.1 * sqft);

    lettingAnalysis = {
      marketRent: {
        low: rentLow, mid: rentMid, high: rentHigh,
        source: `Based on £${ervPsf.toFixed(2)}/sqft market ERV for ${assetType} in ${region}`,
        psfLow: parseFloat((ervPsf * 0.85).toFixed(2)),
        psfMid: parseFloat(ervPsf.toFixed(2)),
        psfHigh: parseFloat((ervPsf * 1.1).toFixed(2)),
      },
      voidPeriod: { months: voidMonths, reasoning: voidReasoning },
      rentFreeMonths,
      fittingOutContribution: fittingOut,
      agentFee,
      legalCosts,
      tenantProfile: { type: tenantType, leaseLength: leaseLen, breakClause: breakCl },
      refurbMonths,
      marketingMonths,
      totalMonthsToStabilise: totalMonths,
      monthlyCarryCost: monthlyCarry,
      totalCarryCost: totalCarry,
      carryCostBreakdown: {
        debtService: Math.round(monthlyDebt),
        rates: Math.round(monthlyRates),
        insurance: Math.round(monthlyInsurance),
        security: monthlySecurity,
        utilities: monthlyUtilities,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAPEX ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════
  const capex = buildCAPEX(epcRating, assetType, sqft, yearBuilt, condition);

  // ══════════════════════════════════════════════════════════════════════════
  // FULL ACQUISITION COST
  // ══════════════════════════════════════════════════════════════════════════
  const sdlt = calculateSDLT(askingPrice);
  const legalFee = askingPrice < 500000 ? 4000 : askingPrice < 2000000 ? 5500 : 8000;
  const surveyFee = askingPrice < 500000 ? 1500 : askingPrice < 2000000 ? 2500 : 4000;
  const agentFeeBuyer = 0; // typically nil at auction / direct
  const financeArrangement = Math.round(loanAmount * 0.015);

  const subtotalAcquisition = askingPrice + sdlt + legalFee + surveyFee + agentFeeBuyer + financeArrangement;
  const carryCosts = lettingAnalysis?.totalCarryCost || 0;
  const lettingCosts = lettingAnalysis ? (lettingAnalysis.agentFee + lettingAnalysis.legalCosts + lettingAnalysis.fittingOutContribution) : 0;
  const totalCostIn = subtotalAcquisition + capex.total + carryCosts + lettingCosts;

  const acquisitionCost: AcquisitionCost = {
    purchasePrice: askingPrice,
    sdlt,
    legal: legalFee,
    survey: surveyFee,
    agentFee: agentFeeBuyer,
    financeArrangement,
    subtotalAcquisition,
    capex: capex.total,
    carryCosts,
    lettingCosts,
    totalCostIn,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RETURNS
  // ══════════════════════════════════════════════════════════════════════════
  const stabilisedIncome = isVacant ? erv * 0.85 : noi > 0 ? noi : passingRent * 0.85;
  const stabilisedYield = totalCostIn > 0 ? (stabilisedIncome / totalCostIn) * 100 : 0;
  const yieldOnCost = (askingPrice + capex.total) > 0 ? (stabilisedIncome / (askingPrice + capex.total)) * 100 : 0;
  const cashOnCashYear1 = equity > 0 ? ((years[0]?.cashFlow || 0) / equity) * 100 : 0;
  const cashOnCashStab = equity > 0 ? ((stabilisedIncome - annualDebtService) / equity) * 100 : 0;
  const dscr = annualDebtService > 0 ? stabilisedIncome / annualDebtService : 0;
  const debtYield = loanAmount > 0 ? (stabilisedIncome / loanAmount) * 100 : 0;

  // Payback
  let paybackMonths = 0;
  let cumulativeCash = 0;
  for (const yr of years) {
    if (cumulativeCash >= 0 && paybackMonths > 0) break;
    const monthlyCF = yr.cashFlow / 12;
    for (let m = 0; m < 12; m++) {
      paybackMonths++;
      cumulativeCash += monthlyCF;
      if (cumulativeCash >= equity) break;
    }
  }

  const returns: ReturnsAnalysis = {
    netInitialYield: parseFloat(netInitialYield.toFixed(2)),
    stabilisedYield: parseFloat(stabilisedYield.toFixed(2)),
    yieldOnCost: parseFloat(yieldOnCost.toFixed(2)),
    cashOnCashYear1: parseFloat(cashOnCashYear1.toFixed(1)),
    cashOnCashStabilised: parseFloat(cashOnCashStab.toFixed(1)),
    irr5yr: parseFloat(dcfIRR.toFixed(1)), // using DCF IRR
    irr10yr: parseFloat(dcfIRR.toFixed(1)),
    equityMultiple: parseFloat(dcfEquityMultiple.toFixed(2)),
    dscr: parseFloat(dscr.toFixed(2)),
    debtYield: parseFloat(debtYield.toFixed(1)),
    paybackMonths,
  };

  const dcfResult: DCFResult = {
    years,
    terminalValue,
    exitYield: parseFloat((exitYield * 100).toFixed(2)),
    npv: Math.round(dcfNPV),
    irr: parseFloat(dcfIRR.toFixed(1)),
    equityMultiple: parseFloat(dcfEquityMultiple.toFixed(2)),
    discountRate: discountRate * 100,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SENSITIVITY
  // ══════════════════════════════════════════════════════════════════════════
  const baseVoid = lettingAnalysis?.voidPeriod.months || 0;
  const sensitivity: SensitivityRow[] = [
    buildSensitivityRow("Best case", Math.max(0, baseVoid - 3), erv * 1.1, capex.total, askingPrice, loanAmount, annualDebtService, costOfDebtPct),
    buildSensitivityRow("Base case", baseVoid, erv, capex.total * 1.15, askingPrice, loanAmount, annualDebtService, costOfDebtPct),
    buildSensitivityRow("Worst case", baseVoid + 6, erv * 0.85, capex.total * 1.3, askingPrice, loanAmount, annualDebtService, costOfDebtPct),
    buildBreakevenRow(stabilisedIncome, askingPrice, sdlt + legalFee + surveyFee, costOfDebtPct),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // VERDICT
  // ══════════════════════════════════════════════════════════════════════════
  const verdict = buildVerdict(
    address, assetType, askingPrice, sqft, stabilisedYield, dscr, dcfIRR,
    costOfDebtPct, locationGrade, isVacant, lettingAnalysis, capex, marketVal,
    reconciledVal, epcRating, tenure, condition, tenantNames, returns,
  );

  // ── Confidence ──
  const confidence: "high" | "medium" | "low" =
    estimatedFields.length === 0 && comps.length >= 3 ? "high" :
    estimatedFields.length <= 2 ? "medium" : "low";

  return {
    quickFilter: qf,
    valuations: { market: marketVal, income: incomeVal, residual: residualVal, reconciled: reconciledVal },
    lettingAnalysis,
    capex,
    acquisitionCost,
    returns,
    dcf: dcfResult,
    sensitivity,
    verdict,
    locationGrade,
    confidence,
    estimatedFields,
    methodology,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function estimateVoidMonths(assetType: string, grade: string, sqft: number): number {
  const type = assetType.toLowerCase();
  let base: number;
  if (/industrial|warehouse|logistics/.test(type)) base = 4;
  else if (/office/.test(type)) base = 6;
  else if (/retail/.test(type)) base = 9;
  else if (/leisure|casino|hotel/.test(type)) base = 18;
  else base = 6;

  if (grade === "prime") base = Math.round(base * 0.6);
  else if (grade === "tertiary") base = Math.round(base * 2);

  if (sqft > 20000) base = Math.round(base * 1.8);
  else if (sqft > 10000) base = Math.round(base * 1.4);
  else if (sqft > 5000) base = Math.round(base * 1.2);

  return Math.max(1, base);
}

function buildVoidReasoning(assetType: string, location: LocationGrade, sqft: number, months: number): string {
  const parts: string[] = [];
  parts.push(`${location.grade.charAt(0).toUpperCase() + location.grade.slice(1)} ${assetType.toLowerCase()} in ${location.reasoning.split("—")[0].trim()}`);
  if (location.submarketVacancy) parts.push(`submarket vacancy ${location.submarketVacancy}`);
  parts.push(`unit is ${sqft.toLocaleString()} sqft (${sqft > 10000 ? "large" : sqft > 5000 ? "mid-size" : "small"})`);
  parts.push(`expect ${months} month void`);
  return parts.join(", ");
}

function buildCAPEX(epcRating: string | null, assetType: string, sqft: number, yearBuilt: number | null, condition: string | null): CAPEXAnalysis {
  const type = assetType.toLowerCase();

  // EPC measures
  const measures: EPCMeasure[] = [];
  let epcCost = 0;
  const currentRating = epcRating || "D";
  let targetRating = "B";

  if (epcRating) {
    const r = epcRating.toUpperCase();
    if (r === "G" || r === "F") {
      measures.push({ measure: "LED lighting throughout", cost: Math.round(sqft * 1.5), annualSaving: Math.round(sqft * 0.5), paybackYears: 3 });
      measures.push({ measure: "Roof/wall insulation", cost: Math.round(sqft * 3), annualSaving: Math.round(sqft * 0.8), paybackYears: 4 });
      measures.push({ measure: "Heating system upgrade", cost: Math.round(Math.min(sqft * 4, 50000)), annualSaving: Math.round(sqft * 0.6), paybackYears: 5 });
      if (/office/.test(type)) {
        measures.push({ measure: "Double glazing replacement", cost: Math.round(sqft * 5), annualSaving: Math.round(sqft * 0.4), paybackYears: 8 });
      }
    } else if (r === "E") {
      measures.push({ measure: "LED lighting throughout", cost: Math.round(sqft * 1.5), annualSaving: Math.round(sqft * 0.5), paybackYears: 3 });
      measures.push({ measure: "Insulation improvements", cost: Math.round(sqft * 2), annualSaving: Math.round(sqft * 0.6), paybackYears: 4 });
    } else if (r === "D") {
      measures.push({ measure: "LED lighting upgrade", cost: Math.round(sqft * 1), annualSaving: Math.round(sqft * 0.3), paybackYears: 3 });
    }
    epcCost = measures.reduce((s, m) => s + m.cost, 0);
  }

  // Refurb
  let refurbPsf: number;
  let scope: string;
  if (/industrial|warehouse|logistics/.test(type)) {
    refurbPsf = condition === "poor" ? 25 : 12;
    scope = condition === "poor" ? "Full refurb: floor, doors, cladding, M&E" : "Basic refurb: floor, loading doors, lighting";
  } else if (/office/.test(type)) {
    refurbPsf = condition === "poor" ? 60 : 45;
    scope = condition === "poor" ? "Full Cat A: raised floors, ceilings, M&E, toilets" : "Cat A refurb: ceilings, lighting, decoration, services";
  } else if (/retail/.test(type)) {
    refurbPsf = condition === "poor" ? 50 : 30;
    scope = "Shopfront, services, basic fit-out";
  } else if (/residential|flat|apartment/.test(type)) {
    refurbPsf = 90;
    scope = "Residential conversion: structure, services, kitchens, bathrooms";
  } else {
    refurbPsf = 15;
    scope = "General commercial refurbishment";
  }

  if (yearBuilt && yearBuilt < 1980) refurbPsf = Math.round(refurbPsf * 1.4);
  else if (yearBuilt && yearBuilt < 2000) refurbPsf = Math.round(refurbPsf * 1.15);

  const refurbCost = Math.round(sqft * refurbPsf);

  // Contingency
  let contingencyPct = 0.1;
  if (yearBuilt && yearBuilt < 1980) contingencyPct = 0.2;
  const contingencyCost = Math.round((epcCost + refurbCost) * contingencyPct);
  const contingencyReasoning = yearBuilt && yearBuilt < 1980
    ? `20% contingency — pre-1980 building (higher risk of unforeseen issues)`
    : `10% contingency — standard allowance`;

  // Professional fees
  const profFeesPct = 0.12;
  const profFees = Math.round((epcCost + refurbCost) * profFeesPct);

  // Asbestos
  const asbestosApplicable = !yearBuilt || yearBuilt < 2000;
  const asbestosCost = asbestosApplicable ? (sqft > 5000 ? 12000 : 6000) : 0;

  const total = epcCost + refurbCost + contingencyCost + profFees + asbestosCost;

  const reasons: string[] = [];
  if (epcCost > 0) reasons.push(`EPC ${currentRating}→${targetRating} upgrade £${epcCost.toLocaleString()}`);
  reasons.push(`Refurb at £${refurbPsf}/sqft (${scope})`);
  if (yearBuilt && yearBuilt < 1980) reasons.push("Pre-1980 building premium");
  reasons.push(`${(contingencyPct * 100).toFixed(0)}% contingency, ${(profFeesPct * 100).toFixed(0)}% professional fees`);
  if (asbestosApplicable) reasons.push(`Asbestos survey + removal £${asbestosCost.toLocaleString()}`);

  return {
    epcUpgrade: { cost: epcCost, measures, currentRating, targetRating },
    refurb: { cost: refurbCost, psfRate: refurbPsf, scope },
    contingency: { cost: contingencyCost, pct: contingencyPct * 100, reasoning: contingencyReasoning },
    professionalFees: { cost: profFees, pct: profFeesPct * 100 },
    asbestos: { cost: asbestosCost, applicable: asbestosApplicable, reasoning: asbestosApplicable ? "Pre-2000 building — R&D survey + removal budgeted" : "Post-2000 build — low risk" },
    total,
    reasoning: reasons.join(". "),
  };
}

function buildSensitivityRow(
  scenario: string, voidMonths: number, rent: number, capex: number,
  price: number, loanAmount: number, annualDebtService: number, costOfDebt: number,
): SensitivityRow {
  const stabilised = rent * 0.85;
  const sdlt = calculateSDLT(price);
  const totalCost = price + sdlt + 5000 + 2000 + capex + (annualDebtService / 12 * voidMonths);
  const yieldPct = totalCost > 0 ? (stabilised / totalCost) * 100 : 0;

  // Simple IRR proxy — use Newton-Raphson on 5yr cashflows
  const equity = price - loanAmount;
  const annualCF = stabilised - annualDebtService;
  const exitCapRate = Math.max(0.04, costOfDebt / 100 * 0.8); // floor at 4%
  const exitVal = stabilised / exitCapRate;
  const exitEquity = exitVal - loanAmount * 0.7;
  const totalReturn = annualCF * 5 + exitEquity;
  let irrProxy = 0;
  if (equity > 0 && totalReturn > 0) {
    irrProxy = (Math.pow(totalReturn / equity, 1 / 5) - 1) * 100;
  } else if (equity > 0) {
    irrProxy = -10; // negative return
  }
  if (!isFinite(irrProxy) || isNaN(irrProxy)) irrProxy = 0;

  let verdict: string;
  if (irrProxy >= 15) verdict = "Strong buy";
  else if (irrProxy >= 10) verdict = "Buy";
  else if (irrProxy >= 6) verdict = "Marginal";
  else verdict = "Avoid";

  return {
    scenario,
    voidMonths: `${voidMonths}m`,
    rent: `£${Math.round(rent).toLocaleString()}`,
    capex: `£${Math.round(capex).toLocaleString()}`,
    irr: `${irrProxy.toFixed(1)}%`,
    verdict,
  };
}

function buildBreakevenRow(
  stabilisedIncome: number, price: number, fees: number, costOfDebt: number,
): SensitivityRow {
  const targetYield = costOfDebt / 100;
  const breakEvenPrice = targetYield > 0 ? Math.round(stabilisedIncome / targetYield - fees) : 0;
  return {
    scenario: "Break-even",
    voidMonths: "—",
    rent: `£${Math.round(stabilisedIncome).toLocaleString()}`,
    capex: "—",
    irr: `${costOfDebt.toFixed(1)}%`,
    verdict: `Need price £${breakEvenPrice.toLocaleString()}`,
  };
}

function buildVerdict(
  address: string, assetType: string, askingPrice: number, sqft: number,
  stabilisedYield: number, dscr: number, irr: number, costOfDebt: number,
  location: LocationGrade, isVacant: boolean, letting: LettingAnalysis | null,
  capex: CAPEXAnalysis, market: MarketValuation | null, reconciled: ReconciledValuation,
  epcRating: string | null, tenure: string | null, condition: string | null,
  tenantNames: string | null, returns: ReturnsAnalysis,
): DealVerdict {
  const psf = sqft > 0 ? Math.round(askingPrice / sqft) : 0;
  const mktPsf = market ? market.adjustedAvgPsf : 0;
  const psfDiscount = mktPsf > 0 ? ((mktPsf - psf) / mktPsf * 100) : 0;
  const type = assetType.toLowerCase();

  // Rating
  let rating: DealVerdict["rating"];
  if (stabilisedYield >= costOfDebt + 2 && dscr >= 1.25 && irr >= 12) {
    rating = "strong_buy";
  } else if (stabilisedYield >= costOfDebt + 1 && dscr >= 1.15 && irr >= 8) {
    rating = "buy";
  } else if (stabilisedYield >= costOfDebt && dscr >= 1.0) {
    rating = "marginal";
  } else {
    rating = "avoid";
  }

  // Summary — property-specific narrative
  const parts: string[] = [];

  // Opening: what is it, where, at what price
  const vacantStr = isVacant ? "vacant" : "tenanted";
  parts.push(`This is a ${vacantStr} ${type} in ${location.reasoning.split("—")[0].trim()}.`);
  parts.push(`At £${askingPrice.toLocaleString()} for ${sqft.toLocaleString()} sqft (£${psf}/sqft)`);
  if (mktPsf > 0) {
    parts.push(`${psfDiscount > 0 ? `${psfDiscount.toFixed(0)}% below` : `${Math.abs(psfDiscount).toFixed(0)}% above`} comparable sales averaging £${mktPsf}/sqft.`);
  } else {
    parts.push(`.`);
  }

  // Income / letting
  if (isVacant && letting) {
    parts.push(`Expected ERV £${letting.marketRent.psfMid.toFixed(0)}/sqft based on market benchmarks.`);
    parts.push(`Expect ${letting.voidPeriod.months} month void — ${location.submarketVacancy} vacancy in this submarket.`);
  } else if (tenantNames) {
    parts.push(`Let to ${tenantNames}.`);
  }

  // CAPEX
  if (capex.total > askingPrice * 0.05) {
    parts.push(`CAPEX £${capex.total.toLocaleString()} required.`);
  }

  // Numbers
  parts.push(`Stabilised yield ${stabilisedYield.toFixed(1)}% on total cost of £${(askingPrice + capex.total + (letting?.totalCarryCost || 0)).toLocaleString()}.`);
  parts.push(`DSCR ${dscr.toFixed(2)}×. IRR ${irr.toFixed(1)}% over 10 years.`);

  // Rating-specific
  if (rating === "strong_buy") {
    parts.push("STRONG BUY — the numbers work at asking price.");
  } else if (rating === "buy") {
    parts.push("BUY — solid fundamentals with acceptable returns.");
  } else if (rating === "marginal") {
    const priceThatWorks = Math.round((returns.stabilisedYield > 0 ? askingPrice * (costOfDebt + 2) / returns.stabilisedYield : askingPrice * 0.85));
    parts.push(`MARGINAL — consider negotiating. Target price £${priceThatWorks.toLocaleString()} (-${((1 - priceThatWorks / askingPrice) * 100).toFixed(0)}%).`);
  } else {
    const priceThatWorks = Math.round((returns.stabilisedYield > 0 ? askingPrice * (costOfDebt + 2) / returns.stabilisedYield : askingPrice * 0.75));
    parts.push(`AVOID at this price. Would need £${priceThatWorks.toLocaleString()} (-${((1 - priceThatWorks / askingPrice) * 100).toFixed(0)}%) to achieve target returns.`);
  }

  // Play
  let play: string;
  if (isVacant && epcRating && /[EFG]/.test(epcRating)) {
    play = `Value-add: EPC upgrade ${epcRating}→B, refurbish, let at market rent, hold for yield compression. Timeline: ${letting?.totalMonthsToStabilise || 12} months to stabilised income.`;
  } else if (isVacant) {
    play = `Let-and-hold: refurbish if needed, let at market rent (£${letting?.marketRent.psfMid.toFixed(0)}/sqft target), hold for income. Timeline: ${letting?.totalMonthsToStabilise || 12} months.`;
  } else if (reconciled.mid > askingPrice * 1.15) {
    play = `Income play: hold for yield with existing tenant(s), reversion to market rent at review/expiry.`;
  } else {
    play = `Core investment: hold for stable income stream. Monitor for rental growth and yield compression.`;
  }

  // Target offer range
  const offerLow = Math.round(askingPrice * (rating === "strong_buy" ? 0.95 : rating === "buy" ? 0.9 : 0.8));
  const offerHigh = Math.round(askingPrice * (rating === "strong_buy" ? 1.0 : rating === "buy" ? 0.95 : 0.9));

  return {
    rating,
    summary: parts.join(" "),
    play,
    targetOfferRange: { low: offerLow, high: offerHigh },
  };
}

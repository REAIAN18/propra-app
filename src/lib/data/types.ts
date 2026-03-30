export interface Asset {
  id: string;
  name: string;
  type: "office" | "retail" | "industrial" | "mixed" | "warehouse" | "flex";
  location: string;
  sqft: number;
  valuationGBP?: number;
  valuationUSD?: number;
  grossIncome: number;
  netIncome: number;
  occupancy: number; // 0-100
  passingRent: number; // per sqft per year for demo portfolios; annual total for real user portfolios
  marketERV: number; // estimated rental value — per sqft for demo; annual total for real user portfolios
  planningImpactSignal?: "positive" | "neutral" | "negative" | null; // Wave 2 — planning intelligence
  insurancePremium: number; // annual
  marketInsurance: number; // what it should be
  energyCost: number; // annual
  marketEnergyCost: number; // benchmark
  // meterType: 'hh' = half-hourly metered (MPAN profile class 00, >100MWh/yr).
  // HH assets cannot use SME tariff switching APIs — require bespoke broker tender.
  // 'sme' = standard SME-metered. Omitted = unknown / not yet extracted from bill.
  meterType?: "hh" | "sme";
  epcRating?: string; // A–G
  leases: Lease[];
  additionalIncomeOpportunities: AdditionalIncomeOpp[];
  compliance: ComplianceItem[];
  currency: "USD" | "GBP";
}

export interface Lease {
  id: string;
  tenant: string;
  sqft: number;
  rentPerSqft: number;
  startDate: string;
  expiryDate: string;
  breakDate?: string;
  reviewDate?: string;
  daysToExpiry: number;
  status: "current" | "expiring_soon" | "expired" | "under_review";
}

export interface AdditionalIncomeOpp {
  id: string;
  type: "5g_mast" | "ev_charging" | "solar" | "parking" | "billboard";
  label: string;
  annualIncome: number;
  status: "identified" | "in_progress" | "live";
  probability: number; // 0-100
}

export interface ComplianceItem {
  id: string;
  type: string;
  certificate: string;
  expiryDate: string;
  daysToExpiry: number;
  status: "valid" | "expiring_soon" | "expired";
  fineExposure: number;
}

export interface Portfolio {
  id: string;
  name: string;
  shortName: string;
  currency: "USD" | "GBP";
  assets: Asset[];
  benchmarkG2N: number; // % net/gross benchmark
  annualMaintenanceBudget?: number; // Optional annual maintenance/capex budget
}

export interface HoldSellScenario {
  assetId: string;
  holdIRR: number;
  sellPrice: number;
  sellIRR: number;
  recommendation: "hold" | "sell" | "review";
  rationale: string;
}

export interface PlanningApplication {
  id: string;
  assetId: string;
  refNumber: string;
  description: string;
  applicant: string;
  type: "New Development" | "Change of Use" | "Extensions" | "Demolition";
  status: "In Application" | "Approved" | "Appeal" | "Refused";
  distanceFt: number;
  impact: "threat" | "opportunity" | "neutral";
  impactScore: number; // 0–10
  submittedDate: string;
  decisionDate?: string;
  notes: string;
}

export interface AcquisitionDeal {
  id: string;
  name: string;
  location: string;
  type: Asset["type"];
  sqft: number;
  askingPrice: number;
  estimatedYield: number;
  marketYield: number;
  score: number; // 0-100
  status: "screening" | "loi" | "due_diligence" | "exchange" | "passed";
  rationale: string;
  currency: "USD" | "GBP";
  noi?: number; // net operating income, annual
}

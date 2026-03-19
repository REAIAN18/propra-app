// Asset financing data — per-asset loan positions
// daysToMaturity calculated from 2026-03-19

export interface AssetLoan {
  assetId: string;
  assetName: string;
  lender: string;
  outstandingBalance: number;
  originalBalance: number;
  interestRate: number; // annual %, e.g. 6.2
  rateType: "fixed" | "variable";
  rateReference?: string; // e.g. "SOFR + 1.5%", "SONIA + 1.8%"
  maturityDate: string;
  daysToMaturity: number;
  ltv: number; // % of current valuation at origination
  currentLTV: number; // % recalculated at current valuation
  icr: number; // interest coverage ratio = NOI / annual debt service
  icrCovenant: number; // minimum ICR covenant
  ltvCovenant: number; // maximum LTV covenant
  annualDebtService: number;
  marketRate: number; // current market rate for equivalent debt
  currency: "USD" | "GBP";
}

export interface PortfolioFinancing {
  portfolioId: string;
  loans: AssetLoan[];
}

// Today: 2026-03-19
// daysToMaturity targets:
//   2026-04-30 = 42 days
//   2026-06-30 = 103 days
//   2026-09-30 = 195 days
//   2026-12-31 = 287 days
//   2027-03-31 = 377 days
//   2027-09-30 = 560 days
//   2028-06-30 = 834 days
//   2029-12-31 = 1382 days

const flMixedLoans: AssetLoan[] = [
  {
    assetId: "fl-001",
    assetName: "Coral Gables Office Park",
    lender: "Wells Fargo",
    outstandingBalance: 9230000,
    originalBalance: 9940000,
    interestRate: 5.8,
    rateType: "fixed",
    maturityDate: "2026-09-30",
    daysToMaturity: 195,
    ltv: 70,
    currentLTV: 65,
    icr: 1.38,
    icrCovenant: 1.25,
    ltvCovenant: 75,
    annualDebtService: 535340,
    marketRate: 5.1,
    currency: "USD",
  },
  {
    assetId: "fl-002",
    assetName: "Brickell Retail Center",
    lender: "Chase",
    outstandingBalance: 4420000,
    originalBalance: 4760000,
    interestRate: 6.4,
    rateType: "fixed",
    maturityDate: "2026-06-30",
    daysToMaturity: 103,
    ltv: 70,
    currentLTV: 65,
    icr: 1.34,
    icrCovenant: 1.25,
    ltvCovenant: 75,
    annualDebtService: 282880,
    marketRate: 5.0,
    currency: "USD",
  },
  {
    assetId: "fl-003",
    assetName: "Tampa Industrial Park",
    lender: "Ameris Bank",
    outstandingBalance: 3360000,
    originalBalance: 3640000,
    interestRate: 5.2,
    rateType: "variable",
    rateReference: "SOFR + 1.5%",
    maturityDate: "2028-06-30",
    daysToMaturity: 834,
    ltv: 65,
    currentLTV: 60,
    icr: 1.66,
    icrCovenant: 1.20,
    ltvCovenant: 70,
    annualDebtService: 174720,
    marketRate: 5.0,
    currency: "USD",
  },
  {
    assetId: "fl-004",
    assetName: "Orlando Business Center",
    lender: "First Horizon",
    outstandingBalance: 6720000,
    originalBalance: 7200000,
    interestRate: 7.1,
    rateType: "fixed",
    maturityDate: "2026-04-30",
    daysToMaturity: 42,
    ltv: 75,
    currentLTV: 70,
    icr: 1.04,
    icrCovenant: 1.25,
    ltvCovenant: 75,
    annualDebtService: 477120,
    marketRate: 5.2,
    currency: "USD",
  },
  {
    assetId: "fl-005",
    assetName: "Fort Lauderdale Flex",
    lender: "Truist",
    outstandingBalance: 2700000,
    originalBalance: 2925000,
    interestRate: 5.9,
    rateType: "fixed",
    maturityDate: "2027-09-30",
    daysToMaturity: 560,
    ltv: 65,
    currentLTV: 60,
    icr: 1.74,
    icrCovenant: 1.20,
    ltvCovenant: 70,
    annualDebtService: 159300,
    marketRate: 5.1,
    currency: "USD",
  },
];

const seLogisticsLoans: AssetLoan[] = [
  {
    assetId: "se-001",
    assetName: "Dartford Logistics Hub",
    lender: "Barclays",
    outstandingBalance: 14625000,
    originalBalance: 15750000,
    interestRate: 5.4,
    rateType: "variable",
    rateReference: "SONIA + 1.8%",
    maturityDate: "2027-09-30",
    daysToMaturity: 560,
    ltv: 70,
    currentLTV: 65,
    icr: 1.14,
    icrCovenant: 1.25,
    ltvCovenant: 75,
    annualDebtService: 789750,
    marketRate: 4.9,
    currency: "GBP",
  },
  {
    assetId: "se-002",
    assetName: "Thurrock Distribution Centre",
    lender: "Lloyds",
    outstandingBalance: 20400000,
    originalBalance: 23800000,
    interestRate: 6.2,
    rateType: "fixed",
    maturityDate: "2026-04-30",
    daysToMaturity: 42,
    ltv: 70,
    currentLTV: 60,
    icr: 1.04,
    icrCovenant: 1.25,
    ltvCovenant: 75,
    annualDebtService: 1264800,
    marketRate: 4.9,
    currency: "GBP",
  },
  {
    assetId: "se-003",
    assetName: "Basildon Industrial Estate",
    lender: "NatWest",
    outstandingBalance: 5880000,
    originalBalance: 6370000,
    interestRate: 5.8,
    rateType: "fixed",
    maturityDate: "2026-09-30",
    daysToMaturity: 195,
    ltv: 65,
    currentLTV: 60,
    icr: 1.59,
    icrCovenant: 1.25,
    ltvCovenant: 70,
    annualDebtService: 341040,
    marketRate: 4.9,
    currency: "GBP",
  },
  {
    assetId: "se-004",
    assetName: "Medway Trade Park",
    lender: "HSBC",
    outstandingBalance: 4320000,
    originalBalance: 4680000,
    interestRate: 4.8,
    rateType: "fixed",
    maturityDate: "2028-06-30",
    daysToMaturity: 834,
    ltv: 65,
    currentLTV: 60,
    icr: 2.15,
    icrCovenant: 1.25,
    ltvCovenant: 70,
    annualDebtService: 207360,
    marketRate: 4.8,
    currency: "GBP",
  },
  {
    assetId: "se-005",
    assetName: "Gravesend Logistics Centre",
    lender: "Santander",
    outstandingBalance: 10680000,
    originalBalance: 11560000,
    interestRate: 5.6,
    rateType: "fixed",
    maturityDate: "2026-12-31",
    daysToMaturity: 287,
    ltv: 65,
    currentLTV: 60,
    icr: 1.78,
    icrCovenant: 1.25,
    ltvCovenant: 70,
    annualDebtService: 598080,
    marketRate: 4.9,
    currency: "GBP",
  },
];

export const portfolioFinancing: Record<string, AssetLoan[]> = {
  "fl-mixed": flMixedLoans,
  "se-logistics": seLogisticsLoans,
};

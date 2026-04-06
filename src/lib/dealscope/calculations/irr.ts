import { Property } from '@/types/dealscope';

export interface CashFlow {
  year: number;
  amount: number;
  description: string;
}

export interface IRRResult {
  irr: number;
  cashFlows: CashFlow[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown: {
    totalCostIn: number;
    voidCosts: number;
    lettingCosts: number;
    annualNOI: number;
    exitProceeds: number;
  };
}

export function calculateIRR(property: Property): IRRResult {
  const purchasePrice = property.askingPrice || 0;
  const sdlt = calculateSDLT(purchasePrice);
  const legalFees = 15000;
  const surveyFees = 8000;
  const totalCostIn = purchasePrice + sdlt + legalFees + surveyFees;

  const voidMonths = property.expectedVoid || 14;
  const businessRatesMonthly = (property.businessRates || 0) / 12;

  const voidCosts = {
    emptyRates: businessRatesMonthly * voidMonths,
    security: 2000 * voidMonths,
    insurance: 800 * voidMonths,
    maintenance: 1500 * voidMonths,
    serviceCharges: ((property.serviceCharge || 0) / 12) * voidMonths,
  };

  const totalVoidCost = Object.values(voidCosts).reduce((sum, val) => sum + val, 0);

  // Fallback ERV: use £20/sqft for secondary commercial (conservative market default)
  const erv = property.erv || property.passingRent || (property.size || 0) * 20;
  const monthlyRent = erv / 12;

  const lettingCosts = {
    agentFees: erv * 0.15,
    legalFees: 5000,
    rentFreeValue: monthlyRent * 12,
    tenantImprovements: (property.size || 0) * 5,
  };

  const totalLettingCost = Object.values(lettingCosts).reduce((sum, val) => sum + val, 0);

  const cashFlows: CashFlow[] = [];

  cashFlows.push({
    year: 0,
    amount: -totalCostIn,
    description: 'Acquisition costs',
  });

  cashFlows.push({
    year: 1,
    amount: -(totalVoidCost + totalLettingCost),
    description: `Void costs (${voidMonths}mo) + letting costs`,
  });

  const opex = erv * 0.15;
  const annualNOI = erv - opex;

  for (let year = 2; year <= 10; year++) {
    cashFlows.push({
      year,
      amount: annualNOI,
      description: `Year ${year} NOI`,
    });
  }

  const exitYield = 0.08;
  const exitValue = annualNOI / exitYield;
  const saleAgentFees = exitValue * 0.015;
  const saleLegalFees = 10000;
  const exitProceeds = exitValue - saleAgentFees - saleLegalFees;

  cashFlows[cashFlows.length - 1].amount += exitProceeds;

  const cashFlowValues = cashFlows.map(cf => cf.amount);
  const irr = solveIRR(cashFlowValues);

  const confidence = property.passingRent && property.passingRent > 0
    ? 'HIGH'
    : property.erv && property.erv > 0 ? 'MEDIUM' : 'LOW';

  return {
    irr,
    cashFlows,
    confidence,
    breakdown: {
      totalCostIn,
      voidCosts: totalVoidCost,
      lettingCosts: totalLettingCost,
      annualNOI,
      exitProceeds,
    },
  };
}

function solveIRR(cashFlows: number[]): number {
  let rate = 0.1;
  const maxIterations = 1000;
  const tolerance = 0.00001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / factor;
      dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(npv) < tolerance) return rate;
    if (dnpv === 0) return rate;

    const newRate = rate - npv / dnpv;

    if (newRate < -0.99) rate = -0.99;
    else if (newRate > 10) rate = 10;
    else rate = newRate;

    if (Math.abs(newRate - rate) < tolerance) return rate;
  }

  return rate;
}

function calculateSDLT(price: number): number {
  if (price <= 150000) return 0;
  if (price <= 250000) return (price - 150000) * 0.02;
  return 2000 + (price - 250000) * 0.05;
}

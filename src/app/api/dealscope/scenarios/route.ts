/**
 * POST /api/dealscope/scenarios
 *
 * Generate 3 intelligent underwriting scenarios for a property deal.
 *
 * Request body:
 * {
 *   dealId: string (ScoutDeal ID)
 *   purchasePrice?: number (override property asking price)
 *   exitYears?: number (default 5 years)
 * }
 *
 * Response: 3 scenarios with assumptions and projected outcomes
 * - Conservative: Lower exit price, higher capex, realistic exit timeline
 * - Market: Current market assumptions
 * - Aggressive: Higher exit price, optimized capex, accelerated timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface ScenarioRequest {
  dealId: string;
  purchasePrice?: number;
  exitYears?: number;
}

interface ScenarioAssumptions {
  name: 'Conservative' | 'Market' | 'Aggressive';
  description: string;
  purchasePrice: number;
  exitPrice: number;
  exitYears: number;
  annualRent?: number;
  occupancy: number; // 0-100%
  capexPerYear: number;
  loanAmount: number;
  interestRate: number; // annual %
  loanTermYears: number;
}

interface ScenarioResult extends ScenarioAssumptions {
  totalInvest: number;
  totalNetIncome: number;
  totalProfit: number;
  irr: number;
  equity: number;
  dscr: number;
  capRate: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ScenarioRequest = await req.json();
    const { dealId, purchasePrice, exitYears = 5 } = body;

    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId is required' },
        { status: 400 }
      );
    }

    // Fetch the deal
    const deal = await prisma.scoutDeal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        address: true,
        askingPrice: true,
        currentRentPsf: true,
        marketRentPsf: true,
        buildingSizeSqft: true,
        occupancyPct: true,
        yearBuilt: true,
        epcRating: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Use provided purchase price or asking price
    const basePrice = purchasePrice || deal.askingPrice || 500000;

    // Calculate scenarios
    const scenarios = generateScenarios(deal, basePrice, exitYears);

    return NextResponse.json({
      success: true,
      dealId,
      dealAddress: deal.address,
      scenarios: scenarios.map(scenario => calculateMetrics(scenario)),
    });
  } catch (error) {
    console.error('Error generating scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenarios' },
      { status: 500 }
    );
  }
}

/**
 * Generate 3 scenarios with different assumptions
 */
function generateScenarios(
  deal: any,
  purchasePrice: number,
  exitYears: number
): ScenarioAssumptions[] {
  const baseOccupancy = (deal.occupancyPct || 0.8) * 100; // Convert 0-1 to 0-100
  const baseAnnualRent = deal.currentRentPsf && deal.buildingSizeSqft
    ? deal.currentRentPsf * deal.buildingSizeSqft * 12
    : purchasePrice * 0.06; // Default 6% yield

  return [
    {
      name: 'Conservative',
      description: 'Lower exit price, higher capex, 20% vacancy',
      purchasePrice,
      exitPrice: purchasePrice * 0.92, // -8% appreciation
      exitYears,
      annualRent: baseAnnualRent * 0.8, // 20% discount for vacancy
      occupancy: Math.max(60, baseOccupancy - 20), // Lower occupancy
      capexPerYear: purchasePrice * 0.02, // 2% annually
      loanAmount: purchasePrice * 0.65, // 65% LTV
      interestRate: 6.5,
      loanTermYears: 25,
    },
    {
      name: 'Market',
      description: 'Current market conditions',
      purchasePrice,
      exitPrice: purchasePrice * 1.04, // +4% appreciation
      exitYears,
      annualRent: baseAnnualRent,
      occupancy: baseOccupancy,
      capexPerYear: purchasePrice * 0.012, // 1.2% annually
      loanAmount: purchasePrice * 0.70, // 70% LTV
      interestRate: 5.5,
      loanTermYears: 25,
    },
    {
      name: 'Aggressive',
      description: 'Higher exit price, optimized capex, 95%+ occupancy',
      purchasePrice,
      exitPrice: purchasePrice * 1.10, // +10% appreciation
      exitYears,
      annualRent: baseAnnualRent * 1.15, // 15% premium for optimization
      occupancy: Math.min(100, baseOccupancy + 15), // Higher occupancy
      capexPerYear: purchasePrice * 0.008, // 0.8% annually (minimal)
      loanAmount: purchasePrice * 0.75, // 75% LTV
      interestRate: 5.0,
      loanTermYears: 25,
    },
  ];
}

/**
 * Calculate financial metrics for a scenario
 */
function calculateMetrics(scenario: ScenarioAssumptions): ScenarioResult {
  const {
    purchasePrice,
    exitPrice,
    exitYears,
    annualRent = 0,
    occupancy,
    capexPerYear,
    loanAmount,
    interestRate,
    loanTermYears,
  } = scenario;

  // Investment amount (down payment)
  const equity = purchasePrice - loanAmount;

  // Annual debt service (simplified: equal payments)
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;

  let annualDebtService = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    const discountFactor = Math.pow(1 + monthlyRate, numPayments);
    const monthlyPayment =
      (loanAmount * (monthlyRate * discountFactor)) /
      (discountFactor - 1);
    annualDebtService = monthlyPayment * 12;
  } else if (loanAmount > 0) {
    // If no interest, just divide evenly
    annualDebtService = loanAmount / loanTermYears;
  }

  // Operating income
  const occupancyMultiplier = occupancy / 100;
  const annualOperatingIncome = annualRent * occupancyMultiplier;
  const annualCapex = capexPerYear;

  // Net income
  const annualNetIncome = annualOperatingIncome - annualCapex - annualDebtService;

  // Total income and profit over holding period
  const totalNetIncome = annualNetIncome * exitYears;
  const principalPaid = annualDebtService * exitYears - (loanAmount * (interestRate / 100) * exitYears);
  const remainingLoan = loanAmount - Math.max(0, principalPaid);

  // Profit at exit
  const proceedsAtExit = exitPrice - remainingLoan;
  const totalProfit = proceedsAtExit + totalNetIncome - purchasePrice;

  // IRR (simplified approximation)
  const cashFlows = [];
  cashFlows.push(-equity); // Initial investment
  for (let i = 0; i < exitYears - 1; i++) {
    cashFlows.push(annualNetIncome);
  }
  cashFlows.push(annualNetIncome + proceedsAtExit); // Final year + exit
  const irr = calculateIRR(cashFlows);

  // DSCR
  const dscr = annualOperatingIncome > 0
    ? annualOperatingIncome / annualDebtService
    : 0;

  // Cap rate at entry
  const capRate = annualOperatingIncome > 0
    ? (annualOperatingIncome / purchasePrice) * 100
    : 0;

  return {
    ...scenario,
    totalInvest: equity,
    totalNetIncome: Math.round(totalNetIncome),
    totalProfit: Math.round(totalProfit),
    irr: parseFloat(irr.toFixed(2)),
    equity: Math.round(equity),
    dscr: parseFloat(dscr.toFixed(2)),
    capRate: parseFloat(capRate.toFixed(2)),
  };
}

/**
 * Simplified IRR calculation using Newton-Raphson method
 * Returns rate as decimal (e.g., 0.15 for 15%)
 */
function calculateIRR(cashFlows: number[]): number {
  let rate = 0.1; // Initial guess
  const tolerance = 0.0001;
  const maxIterations = 100;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let npvDerivative = 0;

    for (let i = 0; i < cashFlows.length; i++) {
      const discountFactor = Math.pow(1 + rate, i);
      npv += cashFlows[i] / discountFactor;
      if (i > 0) {
        npvDerivative -= (i * cashFlows[i]) / Math.pow(1 + rate, i + 1);
      }
    }

    // Check convergence
    if (Math.abs(npv) < tolerance) return rate;

    // Guard against division by zero or near-zero
    if (Math.abs(npvDerivative) < 1e-10) {
      // Use secant method approximation for next iteration
      rate = rate + (npv / Math.abs(npv)) * 0.001;
    } else {
      rate = rate - npv / npvDerivative;
    }

    // Clamp rate to reasonable range (-0.99 to 2.0)
    rate = Math.max(-0.99, Math.min(2.0, rate));
  }

  // Return last computed rate if convergence not achieved
  return rate;
}

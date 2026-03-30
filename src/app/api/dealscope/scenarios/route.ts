import { NextRequest, NextResponse } from 'next/server';
import { calculateHoldScenario, calculateSellScenario, type HoldInputs, type SellInputs } from '@/lib/hold-sell-model';
import { dealscopeCache } from '@/lib/dealscope-cache';

export interface ScenariosInput {
  // Property data
  passingRent?: number | null;
  marketERV?: number | null;
  currentValue?: number | null;
  assetType?: string | null;
  region?: string | null;
  epcRating?: string | null;
  floodRisk?: string | null;
  occupancy?: number | null;
  // Valuation data
  estExitValue?: number | null;
  // Scenario type: condition-driven or market-driven
  conditionDriven?: boolean;
}

export interface ScenarioOutput {
  name: string;
  description: string;
  irr: number;
  capRate: number;
  dscr: number;
  profit: number;
}

export interface ScenariosResult {
  scenarios: ScenarioOutput[];
  logic: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ScenariosInput;

    // Check cache
    const cacheKey = dealscopeCache.generateKey('scenarios', body as Record<string, unknown>);
    const cached = dealscopeCache.get<ScenariosResult>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const passingRent = body.passingRent ?? body.marketERV ?? 0;
    const marketERV = body.marketERV ?? passingRent;
    const currentValue = body.currentValue ?? 1000000; // Default if not provided
    const estExitValue = body.estExitValue ?? currentValue * 1.15; // Assume 15% appreciation

    // Default opex ratio
    const opexRatio = body.assetType?.toLowerCase().includes('nnn') ||
                      body.assetType?.toLowerCase().includes('fri') ||
                      body.assetType?.toLowerCase().includes('industrial')
      ? 0.12
      : 0.30;

    const discountRate = 0.08; // 8% required return
    const holdPeriodYears = 5;

    // Common hold scenario inputs
    const holdInputsBase: HoldInputs = {
      currentValue,
      passingRent,
      marketERV,
      vacancyAllowance: (body.occupancy ? 1 - body.occupancy : 0.05),
      opexPct: opexRatio,
      rentGrowthPct: 0.025, // 2.5% p.a.
      capexAnnual: currentValue * 0.005, // 0.5% annually
      exitYield: marketERV / currentValue, // Exit yield based on market ERV
      holdPeriodYears,
      discountRate,
    };

    const scenarios: ScenarioOutput[] = [];
    let logic = '';

    if (body.conditionDriven) {
      // Condition-driven scenarios: focus on property improvements
      logic = 'Condition-driven: scenarios assume progressive improvement through retrofit, maintenance, and repositioning.';

      // Scenario 1: Conservative (minimal upgrade)
      try {
        const conservativeInputs: HoldInputs = {
          ...holdInputsBase,
          passingRent: passingRent * 1.02, // Minimal uplift
          marketERV: marketERV * 1.02,
          rentGrowthPct: 0.015, // Lower growth
          capexAnnual: currentValue * 0.01, // 1% capex for basic maintenance
        };
        const conservativeResult = calculateHoldScenario(conservativeInputs);
        scenarios.push({
          name: 'Conservative (Retrofit)',
          description: 'Light-touch improvements. Capex 1%, minimal rent uplift.',
          irr: conservativeResult.irr * 100,
          capRate: marketERV / currentValue * 100,
          dscr: 1.2, // Placeholder
          profit: conservativeResult.cashFlows.reduce((a, b) => a + b, 0),
        });
      } catch (e) {
        console.error('Conservative scenario error:', e);
      }

      // Scenario 2: Retrofit (moderate upgrade)
      try {
        const retrofitInputs: HoldInputs = {
          ...holdInputsBase,
          passingRent: passingRent * 1.08, // 8% uplift via EPC improvement
          marketERV: marketERV * 1.08,
          rentGrowthPct: 0.025,
          capexAnnual: currentValue * 0.015, // 1.5% capex
        };
        const retrofitResult = calculateHoldScenario(retrofitInputs);
        scenarios.push({
          name: 'Retrofit (EPC Improvement)',
          description: 'EPC upgrade (e.g. D→B). Capex 1.5%, 8% rent uplift.',
          irr: retrofitResult.irr * 100,
          capRate: marketERV / currentValue * 100,
          dscr: 1.35, // Placeholder
          profit: retrofitResult.cashFlows.reduce((a, b) => a + b, 0),
        });
      } catch (e) {
        console.error('Retrofit scenario error:', e);
      }

      // Scenario 3: Premium (full repositioning)
      try {
        const premiumInputs: HoldInputs = {
          ...holdInputsBase,
          passingRent: passingRent * 1.15, // 15% uplift via full reposition
          marketERV: marketERV * 1.15,
          rentGrowthPct: 0.035,
          capexAnnual: currentValue * 0.025, // 2.5% capex
        };
        const premiumResult = calculateHoldScenario(premiumInputs);
        scenarios.push({
          name: 'Premium (Full Reposition)',
          description: 'Full refurb + repositioning. Capex 2.5%, 15% rent uplift.',
          irr: premiumResult.irr * 100,
          capRate: marketERV / currentValue * 100,
          dscr: 1.5, // Placeholder
          profit: premiumResult.cashFlows.reduce((a, b) => a + b, 0),
        });
      } catch (e) {
        console.error('Premium scenario error:', e);
      }

    } else {
      // Market-driven scenarios: focus on holding vs selling strategy
      logic = 'Market-driven: scenarios focus on asset allocation strategy (hold, reposition, or exit).';

      // Scenario 1: Owner-occ (stabilise current position)
      try {
        const ownerOccInputs: HoldInputs = {
          ...holdInputsBase,
          passingRent: marketERV * 0.95,
          rentGrowthPct: 0.02,
          capexAnnual: currentValue * 0.005,
        };
        const ownerOccResult = calculateHoldScenario(ownerOccInputs);
        scenarios.push({
          name: 'Owner-occ (Hold)',
          description: 'Stabilise tenant, hold 5 years. Conservative growth.',
          irr: ownerOccResult.irr * 100,
          capRate: marketERV / currentValue * 100,
          dscr: 1.3,
          profit: ownerOccResult.cashFlows.reduce((a, b) => a + b, 0),
        });
      } catch (e) {
        console.error('Owner-occ scenario error:', e);
      }

      // Scenario 2: Hold as-is (minimal intervention)
      try {
        const holdInputs: HoldInputs = {
          ...holdInputsBase,
          rentGrowthPct: 0.015, // Modest growth
          capexAnnual: currentValue * 0.003, // Minimal capex
        };
        const holdResult = calculateHoldScenario(holdInputs);
        scenarios.push({
          name: 'Hold as-is',
          description: 'Minimal capex, hold for income. Low capex risk.',
          irr: holdResult.irr * 100,
          capRate: marketERV / currentValue * 100,
          dscr: 1.15,
          profit: holdResult.cashFlows.reduce((a, b) => a + b, 0),
        });
      } catch (e) {
        console.error('Hold as-is scenario error:', e);
      }

      // Scenario 3: Alternative (refinance or exit)
      try {
        // Sell scenario for comparison
        const sellInputs: SellInputs = {
          currentValue,
          estimatedSalePrice: estExitValue,
          sellingCostsPct: 0.02,
          redeploymentYield: 0.06,
          redeploymentGrowthPct: 0.025,
          holdPeriodYears,
          discountRate,
        };
        const sellResult = calculateSellScenario(sellInputs);
        scenarios.push({
          name: 'Alternative (Exit)',
          description: 'Sell and redeploy. Recover capital for new opportunity.',
          irr: sellResult.irr * 100,
          capRate: 6.0, // Redeployment yield
          dscr: 1.0, // N/A for sale
          profit: sellResult.redeployedNPV,
        });
      } catch (e) {
        console.error('Alternative scenario error:', e);
      }
    }

    const result: ScenariosResult = {
      scenarios,
      logic,
    };

    // Cache result (1 hour TTL)
    dealscopeCache.set(cacheKey, result, 3600);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scenarios API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenarios' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { dealscopeCache } from '@/lib/dealscope-cache';

export interface RentGapInput {
  passingRent?: number | null;
  marketERV?: number | null;
  marketRentSqft?: number | null;
  sqft?: number | null;
  occupancy?: number | null;
  floodRisk?: string | null;
  epcRating?: string | null;
}

export interface RentGapResult {
  gap: number;
  percentageGap: number;
  guess: 'positive' | 'neutral' | 'negative';
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RentGapInput;

    // Check cache
    const cacheKey = dealscopeCache.generateKey('rent-gap', body as Record<string, unknown>);
    const cached = dealscopeCache.get<RentGapResult>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Determine market rent
    let marketRent: number | null = null;

    if (body.marketERV) {
      marketRent = body.marketERV;
    } else if (body.marketRentSqft && body.sqft) {
      marketRent = body.marketRentSqft * body.sqft;
    }

    // Default to passing rent if market rent not available
    if (!marketRent && body.passingRent) {
      marketRent = body.passingRent;
    }

    // Calculate gap
    const currentRent = body.passingRent ?? 0;
    const gap = (marketRent ?? currentRent) - currentRent;
    const percentageGap = marketRent && marketRent > 0 ? (gap / marketRent) * 100 : 0;

    // Determine if opportunity is condition-driven or market-driven
    let guess: 'positive' | 'neutral' | 'negative' = 'neutral';
    let reasoning = '';

    if (gap > currentRent * 0.1) {
      // >10% gap suggests opportunity
      guess = 'positive';

      // Classify as condition-driven vs market-driven
      const conditionIssues = [];

      // EPC penalty (poor energy = low rent)
      if (body.epcRating && ['E', 'F', 'G'].includes(body.epcRating)) {
        conditionIssues.push('poor EPC rating');
      }

      // Flood risk (risk penalty)
      if (body.floodRisk && body.floodRisk !== 'low' && body.floodRisk !== 'none') {
        conditionIssues.push('elevated flood risk');
      }

      // Occupancy (if low)
      if (body.occupancy && body.occupancy < 0.75) {
        conditionIssues.push('below-market occupancy');
      }

      if (conditionIssues.length > 0) {
        reasoning = `Condition-driven gap: rent uplift possible via ${conditionIssues.join(', ')}. Current rent £${currentRent.toLocaleString()} vs market £${(marketRent ?? 0).toLocaleString()}.`;
      } else {
        reasoning = `Market-driven gap: property underrented. Current rent £${currentRent.toLocaleString()} vs market £${(marketRent ?? 0).toLocaleString()}.`;
      }
    } else if (gap < -currentRent * 0.05) {
      // >5% gap downward suggests risk
      guess = 'negative';
      reasoning = `Property overrented relative to market. Current rent £${currentRent.toLocaleString()} vs market £${(marketRent ?? 0).toLocaleString()}.`;
    } else {
      guess = 'neutral';
      reasoning = `Rent aligned with market. Current rent £${currentRent.toLocaleString()} vs market £${(marketRent ?? 0).toLocaleString()}.`;
    }

    const result: RentGapResult = {
      gap: Math.round(gap),
      percentageGap: Math.round(percentageGap * 100) / 100,
      guess,
      reasoning,
    };

    // Cache result (1 hour TTL)
    dealscopeCache.set(cacheKey, result, 3600);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Rent gap API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate rent gap' },
      { status: 400 }
    );
  }
}

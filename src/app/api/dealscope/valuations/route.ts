import { NextRequest, NextResponse } from 'next/server';
import { calculateIncomeCap, calculatePsfValue, blendValuation, getFallbackCapRate, type IncomeCapInputs } from '@/lib/avm';
import { dealscopeCache } from '@/lib/dealscope-cache';

export interface ValuationInput {
  netIncome?: number | null;
  grossIncome?: number | null;
  passingRent?: number | null;
  marketCapRate?: number | null;
  sqft?: number | null;
  epcRating?: string | null;
  wault?: number | null;
  assetType?: string | null;
  region?: string | null;
  // PSF comparables data
  pricePerSqft?: number | null;
  p25PricePsf?: number | null;
  p75PricePsf?: number | null;
  comparablesCount?: number;
}

export interface ValuationResult {
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  method: string;
  confidence: number;
  breakdown: {
    incomeCapValue?: number;
    psfValue?: number;
    capRateUsed?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ValuationInput;

    // Check cache
    const cacheKey = dealscopeCache.generateKey('valuations', body as Record<string, unknown>);
    const cached = dealscopeCache.get<ValuationResult>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fallback cap rate based on asset type and region
    const fallbackCapRate = getFallbackCapRate(body.region ?? null, body.assetType ?? null);

    // Derive opex ratio from asset type
    const opexRatio = body.assetType?.toLowerCase().includes('nnn') ||
                      body.assetType?.toLowerCase().includes('fri') ||
                      body.assetType?.toLowerCase().includes('industrial') ||
                      body.assetType?.toLowerCase().includes('logistics')
      ? 0.12
      : 0.30;

    // Method 1: Income Capitalisation
    const incomeCapInputs: IncomeCapInputs = {
      netIncome: body.netIncome ?? null,
      grossIncome: body.grossIncome ?? null,
      passingRent: body.passingRent ?? null,
      opexRatio,
      marketCapRate: body.marketCapRate ?? null,
      fallbackCapRate,
      sqft: body.sqft ?? null,
      epcRating: body.epcRating ?? null,
      wault: body.wault ?? null,
    };

    const incomeCapResult = calculateIncomeCap(incomeCapInputs);

    // Method 2: Price per sqft
    const psfResult = body.sqft && body.pricePerSqft
      ? calculatePsfValue({
          sqft: body.sqft,
          pricePerSqft: body.pricePerSqft,
          p25PricePsf: body.p25PricePsf !== undefined ? body.p25PricePsf : null,
          p75PricePsf: body.p75PricePsf !== undefined ? body.p75PricePsf : null,
        })
      : null;

    // Blend the valuations
    const comparablesCount = body.comparablesCount ?? 0;
    const blendResult = blendValuation(incomeCapResult, psfResult, comparablesCount);

    // Build result
    const result: ValuationResult = {
      valueLow: blendResult.avmLow ?? 0,
      valueMid: blendResult.avmValue ?? 0,
      valueHigh: blendResult.avmHigh ?? 0,
      method: blendResult.method,
      confidence: blendResult.confidenceScore,
      breakdown: {
        incomeCapValue: incomeCapResult?.value,
        psfValue: psfResult?.mid,
        capRateUsed: incomeCapResult?.capRateUsed,
      },
    };

    // Cache result (1 hour TTL)
    dealscopeCache.set(cacheKey, result, 3600);

    // Return result
    return NextResponse.json(result);

  } catch (error) {
    console.error('Valuations API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuations' },
      { status: 400 }
    );
  }
}

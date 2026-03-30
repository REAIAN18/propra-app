import { NextRequest, NextResponse } from 'next/server';
import { findComps, scoreCompsConfidence } from '@/lib/dealscope-comps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postcode, propertyType, sqft, monthsBack = 24 } = body;

    if (!postcode) {
      return NextResponse.json(
        { error: 'postcode required' },
        { status: 400 }
      );
    }

    const comps = await findComps(postcode, propertyType || 'unknown', sqft, monthsBack);

    if (comps.length === 0) {
      return NextResponse.json({
        comps: [],
        message: 'No comparable transactions found. Land Registry bulk data import pending.',
        valueRange: {},
        confidence: 0,
      });
    }

    const valueScore = scoreCompsConfidence(comps, sqft);

    return NextResponse.json({
      comps,
      valueRange: valueScore.valueRange,
      confidence: valueScore.confidence,
      count: comps.length,
    });
  } catch (error) {
    console.error('[dealscope/comps]', error);
    return NextResponse.json(
      { error: 'Failed to find comparables' },
      { status: 500 }
    );
  }
}

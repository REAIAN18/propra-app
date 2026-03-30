import { NextRequest, NextResponse } from 'next/server';
import { lookupEPCByPostcode, lookupEPCByAddress, scoreEPCRisk } from '@/lib/dealscope-epc';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const address = searchParams.get('address');
  const postcode = searchParams.get('postcode');

  if (!address && !postcode) {
    return NextResponse.json(
      { error: 'address or postcode required' },
      { status: 400 }
    );
  }

  try {
    let results = [];

    if (address) {
      const epc = await lookupEPCByAddress(address);
      if (epc) {
        const riskScore = scoreEPCRisk(epc);
        results = [
          {
            ...epc,
            riskScore: riskScore.score,
            riskSignals: riskScore.signals,
          },
        ];
      }
    } else if (postcode) {
      const epcs = await lookupEPCByPostcode(postcode);
      results = epcs.map((epc) => {
        const riskScore = scoreEPCRisk(epc);
        return {
          ...epc,
          riskScore: riskScore.score,
          riskSignals: riskScore.signals,
        };
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[dealscope/epc]', error);
    return NextResponse.json(
      { error: 'Failed to lookup EPC data' },
      { status: 500 }
    );
  }
}

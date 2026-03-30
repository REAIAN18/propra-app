import { NextRequest, NextResponse } from 'next/server';
import { searchGazetteByCompanyName, scoreGazetteDistress } from '@/lib/dealscope-gazette';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const companyName = searchParams.get('companyName');

  if (!companyName) {
    return NextResponse.json(
      { error: 'companyName required' },
      { status: 400 }
    );
  }

  try {
    const notices = await searchGazetteByCompanyName(companyName);
    const { score, signals } = scoreGazetteDistress(notices);

    return NextResponse.json({
      companyName,
      notices,
      distressScore: score,
      distressSignals: signals,
      foundNotices: notices.length > 0,
    });
  } catch (error) {
    console.error('[dealscope/gazette]', error);
    return NextResponse.json(
      { error: 'Failed to search gazette' },
      { status: 500 }
    );
  }
}

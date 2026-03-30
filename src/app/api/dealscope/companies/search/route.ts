import { NextRequest, NextResponse } from 'next/server';
import {
  searchCompany,
  getCompanyCharges,
  getCompanyInsolvency,
  getCompanyOfficers,
  scoreCompanyDistress,
} from '@/lib/dealscope-companies-house';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q');
  const companyNumber = searchParams.get('companyNumber');

  if (!query && !companyNumber) {
    return NextResponse.json({ error: 'q or companyNumber required' }, { status: 400 });
  }

  try {
    let company = null;

    if (companyNumber) {
      // Direct lookup by company number
      const { getCompanyProfile } = await import('@/lib/dealscope-companies-house');
      company = await getCompanyProfile(companyNumber);
    } else if (query) {
      // Search by name
      company = await searchCompany(query);
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get additional data
    const [charges, insolvency, officers] = await Promise.all([
      getCompanyCharges(company.companyNumber),
      getCompanyInsolvency(company.companyNumber),
      getCompanyOfficers(company.companyNumber),
    ]);

    // Score for distress
    const { score: distressScore, signals } = scoreCompanyDistress(company, charges, insolvency);

    return NextResponse.json({
      company,
      charges,
      insolvency,
      officers: officers || [],
      distressScore,
      distressSignals: signals,
    });
  } catch (error) {
    console.error('[dealscope/companies/search]', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}

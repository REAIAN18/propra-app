// GET /api/dealscope/companies/[companyNumber]
// Real Companies House passthrough for the dossier Ownership tab.
// Returns profile + officers + charges + insolvency in one shot.
// Falls back to nulls when COMPANIES_HOUSE_API_KEY is unset so the UI
// can render "—" without throwing (Rule 3).

import { NextResponse } from "next/server";
import {
  getCompanyProfile,
  getCompanyOfficers,
  getCompanyCharges,
  getCompanyInsolvency,
} from "@/lib/dealscope-companies-house";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ companyNumber: string }> }
) {
  const { companyNumber } = await ctx.params;
  if (!companyNumber) {
    return NextResponse.json({ error: "Missing company number" }, { status: 400 });
  }

  const [profile, officers, charges, insolvency] = await Promise.all([
    getCompanyProfile(companyNumber),
    getCompanyOfficers(companyNumber),
    getCompanyCharges(companyNumber),
    getCompanyInsolvency(companyNumber),
  ]);

  if (!profile && !officers && !charges && !insolvency) {
    // No API key, or company not found
    return NextResponse.json(
      {
        companyNumber,
        companyName: null,
        companyStatus: null,
        dateOfCreation: null,
        sicCodes: null,
        officers: null,
        charges: null,
        insolvency: null,
        source: "unavailable",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    companyNumber,
    companyName: profile?.companyName ?? null,
    companyStatus: profile?.status ?? null,
    dateOfCreation: profile?.incorporationDate ?? null,
    sicCodes: profile?.sic ?? null,
    registeredAddress: profile?.registeredAddress ?? null,
    officers: officers ?? null,
    charges: charges?.charges ?? null,
    chargesTotal: charges?.totalCount ?? null,
    insolvency: insolvency?.cases ?? null,
    source: "companies-house",
  });
}

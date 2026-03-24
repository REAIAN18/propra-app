/**
 * POST /api/user/lettings/:lettingId/enquiries
 * Records a prospective tenant enquiry and runs a Companies House covenant check.
 *
 * Body: { companyName, contactName?, email?, phone?, useCase?, companiesHouseNumber? }
 * Response: { enquiry }
 *
 * Covenant check uses COMPANIES_HOUSE_API_KEY if set — graceful fallback if absent.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LettingRow {
  id: string; userId: string; assetId: string; status: string;
  askingRent: number;
}

interface EnquiryRow {
  id: string; lettingId: string; companyName: string;
  contactName: string | null; email: string | null; phone: string | null;
  useCase: string | null; covenantGrade: string | null;
  covenantCheckedAt: Date | null; createdAt: Date;
}

type PrismaWithLettings = {
  letting: {
    findFirst: (q: object) => Promise<LettingRow | null>;
    update:    (q: object) => Promise<LettingRow>;
  };
  enquiry: {
    create: (q: object) => Promise<EnquiryRow>;
  };
};

// ---------------------------------------------------------------------------
// Covenant check (Companies House)
// ---------------------------------------------------------------------------

async function checkCovenant(
  companyName: string,
  chNumber?: string
): Promise<{ grade: string | null; checkedAt: Date | null }> {
  if (!process.env.COMPANIES_HOUSE_API_KEY) {
    return { grade: null, checkedAt: null };
  }

  try {
    let companyNumber = chNumber;
    if (!companyNumber) {
      const authHeader = `Basic ${Buffer.from(`${process.env.COMPANIES_HOUSE_API_KEY}:`).toString("base64")}`;
      const searchRes = await fetch(
        `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=1`,
        { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(8000) }
      );
      if (!searchRes.ok) return { grade: null, checkedAt: null };
      const sd = await searchRes.json() as { items?: Array<{ company_number?: string }> };
      companyNumber = sd.items?.[0]?.company_number;
    }
    if (!companyNumber) return { grade: null, checkedAt: null };

    const authHeader = `Basic ${Buffer.from(`${process.env.COMPANIES_HOUSE_API_KEY}:`).toString("base64")}`;
    const profileRes = await fetch(
      `https://api.company-information.service.gov.uk/company/${companyNumber}`,
      { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(8000) }
    );
    if (!profileRes.ok) return { grade: null, checkedAt: null };

    const profile = await profileRes.json() as {
      company_status?: string;
      date_of_creation?: string;
      accounts?: { overdue?: boolean };
    };

    let grade = "B";
    if (profile.company_status !== "active") {
      grade = "D";
    } else {
      const ageYears = profile.date_of_creation
        ? (Date.now() - new Date(profile.date_of_creation).getTime()) / (365.25 * 24 * 3600 * 1000)
        : 0;
      if (profile.accounts?.overdue === true) grade = "C";
      else if (ageYears > 5) grade = "A";
    }
    return { grade, checkedAt: new Date() };
  } catch {
    return { grade: null, checkedAt: null };
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lettingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lettingId } = await params;
  const db = prisma as unknown as PrismaWithLettings;

  const letting = await db.letting.findFirst({
    where: { id: lettingId, userId: session.user.id },
  } as object).catch(() => null);

  if (!letting) {
    return NextResponse.json({ error: "Letting not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    useCase?: string;
    companiesHouseNumber?: string;
  };

  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "companyName is required" }, { status: 422 });
  }

  const { grade, checkedAt } = await checkCovenant(
    body.companyName.trim(),
    body.companiesHouseNumber
  );

  const enquiry = await db.enquiry.create({
    data: {
      lettingId,
      companyName:       body.companyName.trim(),
      contactName:       body.contactName ?? null,
      email:             body.email ?? null,
      phone:             body.phone ?? null,
      useCase:           body.useCase ?? null,
      covenantGrade:     grade,
      covenantCheckedAt: checkedAt,
    },
  } as object);

  // Auto-advance to under_offer if still active
  if (letting.status === "active") {
    await db.letting.update({
      where: { id: lettingId },
      data:  { status: "under_offer" },
    } as object).catch(() => null);
  }

  return NextResponse.json({ enquiry }, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/documents
 * Returns the authenticated user's uploaded documents, grouped by type.
 * Used by insurance, energy, rent-clock pages to overlay real extracted data on demo data.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({
      insurance: null,
      energy: null,
      lease: null,
      compliance: null,
      documents: [],
    });
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id, status: "done" },
    orderBy: { createdAt: "desc" },
  });

  // Return all docs plus the most recent of each type
  const byType = (type: string) =>
    documents.find((d) => d.documentType === type) ?? null;

  return NextResponse.json({
    insurance: byType("insurance_policy"),
    energy: byType("energy_bill"),
    lease: byType("lease_agreement") ?? byType("rent_roll"),
    compliance: byType("compliance_cert"),
    documents,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dealscope/companies/[companyNumber]/properties
 * Returns all CCOD properties owned by a company.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyNumber: string }> }
) {
  const { companyNumber } = await params;

  if (!companyNumber) {
    return NextResponse.json({ properties: [] }, { status: 400 });
  }

  try {
    const rows = await prisma.landRegistryCCOD.findMany({
      where: {
        companyNumber: { equals: companyNumber, mode: "insensitive" },
      },
      select: {
        id: true,
        titleNumber: true,
        companyName: true,
        address: true,
        postcode: true,
        postcodeSector: true,
        county: true,
      },
      orderBy: { address: "asc" },
      take: 200,
    });

    return NextResponse.json({ properties: rows });
  } catch (err) {
    console.error("[companies/properties] error", err);
    return NextResponse.json({ properties: [] });
  }
}

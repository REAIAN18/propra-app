import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dealscope/companies?q=<name>
 * Search LandRegistryCCOD by company name.
 * Returns grouped results: one entry per unique companyNumber.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ companies: [] });
  }

  try {
    // Fetch matching records, ordered by company name
    const rows = await prisma.landRegistryCCOD.findMany({
      where: {
        companyName: { contains: q, mode: "insensitive" },
      },
      select: {
        companyNumber: true,
        companyName: true,
        address: true,
        postcode: true,
        postcodeSector: true,
        county: true,
      },
      orderBy: { companyName: "asc" },
      take: 100,
    });

    // Group by companyNumber
    const map = new Map<string, {
      companyNumber: string;
      companyName: string;
      propertyCount: number;
      sampleAddresses: string[];
      postcodes: string[];
      county: string | null;
    }>();

    for (const row of rows) {
      const key = row.companyNumber;
      if (!map.has(key)) {
        map.set(key, {
          companyNumber: row.companyNumber,
          companyName: row.companyName,
          propertyCount: 0,
          sampleAddresses: [],
          postcodes: [],
          county: row.county ?? null,
        });
      }
      const entry = map.get(key)!;
      entry.propertyCount++;
      if (entry.sampleAddresses.length < 3) {
        entry.sampleAddresses.push(row.address);
      }
      if (!entry.postcodes.includes(row.postcode)) {
        entry.postcodes.push(row.postcode);
      }
    }

    const companies = Array.from(map.values())
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, 10);

    return NextResponse.json({ companies });
  } catch (err) {
    console.error("[companies] search error", err);
    return NextResponse.json({ companies: [] });
  }
}

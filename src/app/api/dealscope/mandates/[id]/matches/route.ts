import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dealscope/mandates/[id]/matches — Query ScoutDeal matching mandate criteria
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mandate = await prisma.savedSearch.findUnique({ where: { id } });
    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    const criteria = mandate.criteria as any;
    const where: any = { status: { not: "removed" } };

    if (criteria?.assetClasses?.length) {
      where.assetType = { in: criteria.assetClasses };
    }
    if (criteria?.priceMin || criteria?.priceMax) {
      where.OR = [
        { askingPrice: { gte: criteria.priceMin || 0, lte: criteria.priceMax || 999999999 } },
        { guidePrice: { gte: criteria.priceMin || 0, lte: criteria.priceMax || 999999999 } },
      ];
    }
    if (criteria?.epcFilter?.length) {
      where.epcRating = { in: criteria.epcFilter };
    }
    if (criteria?.minScore) {
      where.signalCount = { gte: criteria.minScore };
    }
    if (criteria?.locations?.length) {
      where.address = { contains: criteria.locations[0], mode: "insensitive" };
    }
    if (criteria?.sources?.length) {
      where.sourceTag = { in: criteria.sources };
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);

    const [deals, total] = await Promise.all([
      prisma.scoutDeal.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          address: true,
          assetType: true,
          askingPrice: true,
          guidePrice: true,
          epcRating: true,
          sourceTag: true,
          signalCount: true,
          satelliteImageUrl: true,
          createdAt: true,
        },
      }),
      prisma.scoutDeal.count({ where }),
    ]);

    return NextResponse.json({ matches: deals, total, mandateName: mandate.name });
  } catch (error) {
    console.error("[mandate matches]", error);
    return NextResponse.json({ matches: [], total: 0 });
  }
}

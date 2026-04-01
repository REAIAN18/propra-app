import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

/**
 * GET /api/dealscope/mandates — List all mandates (saved searches)
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;

    const mandates = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    // For each mandate, count matching deals
    const results = await Promise.all(
      mandates.map(async (m: any) => {
        const criteria = m.criteria as any;
        const matchCount = await countMatches(criteria);
        return {
          id: m.id,
          name: m.name,
          clientName: m.clientName,
          criteria,
          alertEmail: m.alertEmail,
          alertDigest: m.alertDigest,
          paused: m.paused,
          matches: matchCount,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("[mandates GET]", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/dealscope/mandates — Create a new mandate
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;
    const body = (await req.json()) as Record<string, any>;

    const { name, clientName, criteria, alertEmail, alertDigest } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const mandate = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        clientName: clientName || null,
        criteria: criteria || {},
        alertEmail: alertEmail ?? true,
        alertDigest: alertDigest || "daily",
      },
    });

    return NextResponse.json(mandate, { status: 201 });
  } catch (error) {
    console.error("[mandates POST]", error);
    return NextResponse.json({ error: "Failed to create mandate" }, { status: 500 });
  }
}

// ── Helper: count ScoutDeal matches for criteria ──
async function countMatches(criteria: any): Promise<number> {
  try {
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
      where.address = {
        contains: criteria.locations[0],
        mode: "insensitive",
      };
    }

    return await prisma.scoutDeal.count({ where });
  } catch {
    return 0;
  }
}

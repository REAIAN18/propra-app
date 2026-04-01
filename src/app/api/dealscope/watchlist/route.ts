import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

/**
 * GET /api/dealscope/watchlist — List watched properties
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;

    const watchlist = await prisma.propertyWatchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
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
        },
      },
    });

    return NextResponse.json(
      watchlist.map((w: any) => ({
        id: w.id,
        propertyId: w.propertyId,
        reasons: w.reasons,
        note: w.note,
        createdAt: w.createdAt,
        property: w.property,
      }))
    );
  } catch (error) {
    console.error("[watchlist GET]", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/dealscope/watchlist — Add property to watchlist
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;
    const body = (await req.json()) as Record<string, any>;

    const { propertyId, reasons, note } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Check property exists
    const deal = await prisma.scoutDeal.findUnique({ where: { id: propertyId } });
    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Upsert to handle re-watching
    const entry = await prisma.propertyWatchlist.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      update: {
        reasons: reasons || [],
        note: note || null,
      },
      create: {
        userId,
        propertyId,
        reasons: reasons || [],
        note: note || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[watchlist POST]", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

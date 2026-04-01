import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const signal = searchParams.get("signal");
    const source = searchParams.get("source");
    const assetType = searchParams.get("assetType");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Build query filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "active",
    };

    // Add search filter
    if (q) {
      where.OR = [
        { address: { contains: q, mode: "insensitive" } },
        { sourceTag: { contains: q, mode: "insensitive" } },
      ];
    }

    // Add signal filter - match signalType array
    if (signal) {
      where.signalType = {
        has: signal,
      };
    }

    // Add source filter
    if (source) {
      where.sourceTag = source;
    }

    // Add asset type filter
    if (assetType) {
      where.assetType = assetType;
    }

    // Add price filters
    if (priceMin) {
      where.askingPrice = { gte: parseFloat(priceMin) };
    }
    if (priceMax) {
      if (where.askingPrice) {
        where.askingPrice.lte = parseFloat(priceMax);
      } else {
        where.askingPrice = { lte: parseFloat(priceMax) };
      }
    }

    // Query properties
    const [results, total] = await Promise.all([
      prisma.scoutDeal.findMany({
        where,
        skip: offset,
        take: limit,
        select: {
          id: true,
          address: true,
          assetType: true,
          sqft: true,
          askingPrice: true,
          capRate: true,
          sourceTag: true,
          signalCount: true,
          currency: true,
        },
      }),
      prisma.scoutDeal.count({ where }),
    ]);

    return NextResponse.json({
      results,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

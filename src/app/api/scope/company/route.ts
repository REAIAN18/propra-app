import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json(
        { error: "q required" },
        { status: 400 }
      );
    }

    // Search for properties by company name or number
    // In a real implementation, this would search Companies House and return company details
    // plus all properties owned by that company

    const results = await prisma.scoutDeal.findMany({
      where: {
        sourceTag: { contains: q, mode: "insensitive" },
        status: "active",
      },
      select: {
        id: true,
        address: true,
        assetType: true,
        sqft: true,
        askingPrice: true,
        currency: true,
        signalCount: true,
      },
      take: 10,
    });

    return NextResponse.json({
      company: { name: q },
      properties: results,
    });
  } catch (error) {
    console.error("Company search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

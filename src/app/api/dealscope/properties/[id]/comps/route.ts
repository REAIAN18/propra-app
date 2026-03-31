import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get comparables for this deal
    const comparables = await prisma.scoutComparable.findMany({
      where: { dealId: id },
      orderBy: { saleDate: "desc" },
    });

    return NextResponse.json(comparables);
  } catch (error) {
    console.error("Error fetching comparables:", error);
    return NextResponse.json({ error: "Failed to fetch comparables" }, { status: 500 });
  }
}

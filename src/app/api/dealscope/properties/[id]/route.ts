import { prisma } from "@/lib/prisma";
import { scoreDeal } from "@/lib/dealscope-score";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
      include: {
        comparables: true,
        reactions: true,
        underwriting: true,
        financeModel: true,
        approachLetters: true,
        vendorApproaches: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const { score, temperature, signals } = scoreDeal(deal);

    return NextResponse.json({
      ...deal,
      dealScore: score,
      temperature,
      signals,
    });
  } catch (error) {
    console.error("Error fetching property details:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Simple query — no includes that can crash
    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Calculate score inline — no imports that can fail
    let score = 50;
    const signals: string[] = [];
    if (deal.hasInsolvency) { score += 20; signals.push("insolvency"); }
    if (deal.hasPlanningApplication) { score += 15; signals.push("planning"); }
    if (deal.sourceTag === "Auction") { score += 12; signals.push("auction"); }
    if (deal.sourceTag === "Distressed") { score += 15; signals.push("distressed"); }
    if (deal.epcRating === "F" || deal.epcRating === "G") { score += 10; signals.push("mees_risk"); }
    score = Math.min(100, score);
    const temperature = score >= 80 ? "hot" : score >= 60 ? "warm" : score >= 40 ? "watch" : "cold";

    return NextResponse.json({
      ...deal,
      dealScore: score,
      temperature,
      signals,
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property", detail: String(error) },
      { status: 500 }
    );
  }
}

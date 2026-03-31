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

    // Build signals timeline
    const signals = [
      ...(deal.hasPlanningApplication
        ? [
            {
              type: "planning_application",
              title: "Planning Application",
              description: "New planning application detected",
              date: deal.enrichedAt || deal.createdAt,
              severity: "high",
            },
          ]
        : []),
      ...(deal.hasLisPendens
        ? [
            {
              type: "lis_pendens",
              title: "Lis Pendens Filed",
              description: "Legal action initiated",
              date: deal.updatedAt,
              severity: "critical",
            },
          ]
        : []),
      ...(deal.hasInsolvency
        ? [
            {
              type: "insolvency",
              title: "Insolvency Signal",
              description: "Insolvency proceedings detected",
              date: deal.updatedAt,
              severity: "critical",
            },
          ]
        : []),
      ...(deal.daysOnMarket && deal.daysOnMarket < 30
        ? [
            {
              type: "fresh_listing",
              title: "Fresh Listing",
              description: `Listed ${deal.daysOnMarket} days ago`,
              date: deal.createdAt,
              severity: "info",
            },
          ]
        : []),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Error fetching property signals:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}

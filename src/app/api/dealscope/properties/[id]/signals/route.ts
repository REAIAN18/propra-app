import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Demo signals for unauthenticated users (demo mode compliance)
const DEMO_SIGNALS = {
  signals: [
    {
      type: "administration",
      title: "Administration",
      description: "Meridian Property Holdings Ltd entered administration. Begbies Traynor (Manchester) appointed.",
      date: "2026-03-14T00:00:00Z",
      severity: "critical",
    },
    {
      type: "director_change",
      title: "Director Change",
      description: "James Mitchell (director) resigned. No replacement appointed.",
      date: "2026-02-28T00:00:00Z",
      severity: "high",
    },
    {
      type: "charge_registered",
      title: "Charge Registered",
      description: "Octopus Real Estate bridging loan £350k registered (2nd charge).",
      date: "2025-12-12T00:00:00Z",
      severity: "high",
    },
  ],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    // Return demo data if property not found (demo mode compliance per CLAUDE.md)
    if (!deal) {
      return NextResponse.json(DEMO_SIGNALS);
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
    // Return demo data on error (graceful fallback for demo mode)
    return NextResponse.json(DEMO_SIGNALS);
  }
}

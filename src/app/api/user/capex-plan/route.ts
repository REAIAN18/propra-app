import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const assetId = req.nextUrl.searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    // Unauthenticated: return demo data
    if (!session?.user?.id) {
      return NextResponse.json({
        plans: [
          {
            id: "c1",
            description: "HVAC replacement — Units 2B + 3A",
            subtitle: "2 units end of life · Quoted $15k · Improves EPC + tenant comfort",
            cost: 15000,
            date: "JUN 2026",
            valueImpact: 22000,
            status: "warn",
          },
          {
            id: "c2",
            description: "Lobby renovation",
            subtitle: "Modernise entrance · Improve tenant retention + letting appeal",
            cost: 35000,
            date: "Q4 2026",
            valueImpact: 60000,
            status: "muted",
          },
          {
            id: "c3",
            description: "Roof reseal",
            subtitle: "Preventive maintenance · Extends roof life 10 years",
            cost: 28000,
            date: "2027",
            valueImpact: null,
            status: "muted",
          },
        ],
      });
    }

    // Authenticated: fetch from database
    const capexPlans = await prisma.capexPlan.findMany({
      where: { assetId },
      orderBy: { scheduledDate: "asc" },
    });

    const plans = capexPlans.map((plan) => {
      const dateLabel = plan.scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Determine status tag color
      let status = "muted";
      const today = new Date();
      const daysUntil = Math.floor((plan.scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 90) {
        status = "warn";
      } else if (daysUntil > 365) {
        status = "future";
      }

      return {
        id: plan.id,
        description: plan.description,
        cost: plan.estimatedCost,
        date: dateLabel.toUpperCase(),
        valueImpact: plan.valueImpact,
        status,
      };
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error in GET /api/user/capex-plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email) {
    // Demo data for capex plans
    return NextResponse.json({
      plans: [
        {
          id: "c1",
          description: "HVAC replacement — Units 2B + 3A",
          detail: "2 units end of life · Quoted $15k · Improves EPC + tenant comfort",
          estimatedCost: 15000,
          scheduledDate: "2026-06-30",
          status: "planned",
          valueImpact: 22000,
        },
        {
          id: "c2",
          description: "Lobby renovation",
          detail: "Modernise entrance · Improve tenant retention + letting appeal",
          estimatedCost: 35000,
          scheduledDate: "2026-12-31",
          status: "planned",
          valueImpact: 60000,
        },
        {
          id: "c3",
          description: "Roof reseal",
          detail: "Preventive maintenance · Extends roof life 10 years",
          estimatedCost: 28000,
          scheduledDate: "2027-06-30",
          status: "planned",
          valueImpact: 0, // maintenance, not value-add
        },
      ],
    });
  }

  // TODO: Fetch real data from CapexPlan after migration
  // For now return demo data
  return NextResponse.json({
    plans: [
      {
        id: "c1",
        description: "HVAC replacement — Units 2B + 3A",
        detail: "2 units end of life · Quoted $15k · Improves EPC + tenant comfort",
        estimatedCost: 15000,
        scheduledDate: "2026-06-30",
        status: "planned",
        valueImpact: 22000,
      },
      {
        id: "c2",
        description: "Lobby renovation",
        detail: "Modernise entrance · Improve tenant retention + letting appeal",
        estimatedCost: 35000,
        scheduledDate: "2026-12-31",
        status: "planned",
        valueImpact: 60000,
      },
      {
        id: "c3",
        description: "Roof reseal",
        detail: "Preventive maintenance · Extends roof life 10 years",
        estimatedCost: 28000,
        scheduledDate: "2027-06-30",
        status: "planned",
        valueImpact: 0,
      },
    ],
  });
}

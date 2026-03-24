/**
 * GET /api/scout/pipeline
 * Returns all Scout deals the user has moved into the acquisition pipeline
 * (pipelineStage is not null), grouped by stage for the Pipeline tab Kanban view.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAGE_ORDER = [
  "interested",
  "due_diligence",
  "offer_made",
  "under_offer",
  "completed",
  "withdrawn",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ pipeline: [] });
  }

  // Get all deals the user has reacted to and moved into pipeline
  const reactions = await prisma.scoutReaction.findMany({
    where: { userId: session.user.id },
    select: { dealId: true },
  });

  const dealIds = reactions.map(r => r.dealId);
  if (dealIds.length === 0) return NextResponse.json({ pipeline: [] });

  const deals = await prisma.scoutDeal.findMany({
    where: {
      id: { in: dealIds },
      pipelineStage: { not: null },
    },
    include: {
      underwriting: { select: { capRate: true, dscr: true, irr5yr: true } },
      lois: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { offerPrice: true },
      },
    },
    orderBy: { pipelineUpdatedAt: "desc" },
  });

  // Group by stage
  const byStage = new Map<string, typeof deals>();
  for (const deal of deals) {
    const stage = deal.pipelineStage!;
    const existing = byStage.get(stage) ?? [];
    existing.push(deal);
    byStage.set(stage, existing);
  }

  const pipeline = STAGE_ORDER
    .filter(stage => byStage.has(stage))
    .map(stage => ({
      stage,
      deals: (byStage.get(stage) ?? []).map(d => ({
        id:                d.id,
        address:           d.address,
        assetType:         d.assetType,
        sqft:              d.sqft,
        askingPrice:       d.askingPrice ?? d.guidePrice,
        offerPrice:        d.lois[0]?.offerPrice ?? null,
        capRate:           d.underwriting?.capRate ?? null,
        dscr:              d.underwriting?.dscr ?? null,
        irr5yr:            d.underwriting?.irr5yr ?? null,
        currency:          d.currency ?? "GBP",
        region:            d.region ?? null,
        pipelineStage:     d.pipelineStage,
        pipelineUpdatedAt: d.pipelineUpdatedAt?.toISOString() ?? null,
      })),
    }));

  return NextResponse.json({ pipeline });
}

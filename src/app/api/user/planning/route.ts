import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface PlanningEntry {
  id: string;
  refNumber: string;
  description: string;
  applicant?: string;
  type: string;
  status: string;
  distanceFt?: number;
  impact: "threat" | "opportunity" | "neutral";
  impactScore: number;
  submittedDate: string;
  decisionDate?: string;
  notes: string;
  holdSellLink?: "sell" | "hold" | "monitor";
}

export interface AssetPlanningData {
  assetId: string;
  assetName: string;
  location: string;
  planningHistory: PlanningEntry[];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ assets: [] });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, location: true, address: true, planningHistory: true },
    orderBy: { createdAt: "asc" },
  });

  const assets: AssetPlanningData[] = userAssets.map((a) => ({
    assetId: a.id,
    assetName: a.name,
    location: a.location ?? a.address ?? "",
    planningHistory: Array.isArray(a.planningHistory) ? (a.planningHistory as PlanningEntry[]) : [],
  }));

  return NextResponse.json({ assets });
}

/**
 * GET /api/user/contractors
 * Returns RealHQ managed contractors filtered by user portfolio region.
 *
 * Region mapping: country US → fl_us, default → se_uk.
 * Optional query params:
 *   ?region=se_uk  — override region filter
 *   ?trade=HVAC    — filter by trade (trades array contains value)
 *
 * Response: { contractors: ContractorSummary[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const regionParam = searchParams.get("region") ?? undefined;
  const tradeParam  = searchParams.get("trade")  ?? undefined;

  // Infer region from portfolio if not provided
  let region = regionParam;
  if (!region) {
    const asset = await prisma.userAsset.findFirst({
      where: { userId: session.user.id },
      select: { country: true },
    });
    region = (asset?.country ?? "").toUpperCase() === "US" ? "fl_us" : "se_uk";
  }

  const where: Record<string, unknown> = { region };
  if (tradeParam) where.trades = { has: tradeParam };

  const contractors = await prisma.contractor.findMany({
    where,
    orderBy: [
      { rating: "desc" },
      { jobCount: "desc" },
    ],
    select: {
      id:       true,
      name:     true,
      region:   true,
      trades:   true,
      rating:   true,
      jobCount: true,
      verified: true,
    },
  });

  return NextResponse.json({ contractors });
}

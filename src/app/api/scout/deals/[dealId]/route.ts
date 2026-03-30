import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Deal = {
  id: string;
  address: string;
  assetType: string;
  askingPrice: number | null;
  guidePrice: number | null;
  currency: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return NextResponse.json({ deal: null });
  }

  const response: Deal = {
    id: deal.id,
    address: deal.address,
    assetType: deal.assetType,
    askingPrice: deal.askingPrice,
    guidePrice: deal.guidePrice,
    currency: deal.currency,
  };

  return NextResponse.json({ deal: response });
}

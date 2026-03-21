import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Returns cached ATTOM comparable sales for a given asset.
// Empty array when ATTOM_API_KEY is not set or no comps have been fetched yet.
// The dashboard Market Benchmarking panel uses this to show real comp data.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!assetId) {
    return NextResponse.json({ error: "assetId required" }, { status: 400 });
  }

  // Verify asset belongs to user
  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
    select: { id: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const comparables = await prisma.propertyComparable.findMany({
    where: { assetId },
    orderBy: { saleDate: "desc" },
    take: 8,
    select: {
      id: true,
      address: true,
      sqft: true,
      yearBuilt: true,
      saleAmount: true,
      saleDate: true,
      pricePerSqft: true,
      source: true,
    },
  });

  return NextResponse.json({
    assetId,
    comparables,
    available: comparables.length > 0,
    attomEnabled: !!process.env.ATTOM_API_KEY,
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface AcquisitionItem {
  id: string;
  name: string;
  location: string;
  assetType: string;
  sqft: number | null;
  askingPrice: number;
  estimatedYield: number;
  marketYield: number | null;
  score: number | null;
  status: string;
  rationale: string | null;
  noi: number | null;
  currency: "USD" | "GBP";
  notes: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ acquisitions: [] });
  }

  const rows = await prisma.acquisition.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const acquisitions: AcquisitionItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location,
    assetType: r.assetType,
    sqft: r.sqft,
    askingPrice: r.askingPrice,
    estimatedYield: r.estimatedYield,
    marketYield: r.marketYield,
    score: r.score,
    status: r.status,
    rationale: r.rationale,
    noi: r.noi,
    currency: r.currency === "GBP" ? "GBP" : "USD",
    notes: r.notes,
  }));

  return NextResponse.json({ acquisitions });
}

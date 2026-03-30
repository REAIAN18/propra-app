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
    // Demo data for unauthenticated users
    return NextResponse.json({
      acquisitions: [
        {
          id: "demo-acq-1",
          name: "Brickell Office Complex",
          location: "Miami, FL",
          assetType: "Office",
          sqft: 185000,
          askingPrice: 42500000,
          estimatedYield: 6.2,
          marketYield: 6.8,
          score: 78,
          status: "watching",
          rationale: "Premium location, institutional quality, below market yield suggests upside potential",
          noi: 2635000,
          currency: "USD",
          notes: "Listed 3 months ago; likely to see price adjustment",
        },
        {
          id: "demo-acq-2",
          name: "Tampa Industrial Logistics Park",
          location: "Tampa, FL",
          assetType: "Industrial",
          sqft: 450000,
          askingPrice: 58000000,
          estimatedYield: 7.1,
          marketYield: 7.4,
          score: 82,
          status: "in_discussion",
          rationale: "Strong tenant roster (Amazon, DHL), long leases, resilient logistics demand",
          noi: 4118000,
          currency: "USD",
          notes: "Broker working on NDA; site visit scheduled for April",
        },
        {
          id: "demo-acq-3",
          name: "London Mixed-Use Development",
          location: "London, UK",
          assetType: "Mixed-Use",
          sqft: 145000,
          askingPrice: 55000000,
          estimatedYield: 5.8,
          marketYield: 6.2,
          score: 71,
          status: "prospect",
          rationale: "UK growth hedge; mixed-use provides income stability; near transport hub",
          noi: 3190000,
          currency: "GBP",
          notes: "Under offer; anticipated close Q3 2026",
        },
      ],
    });
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

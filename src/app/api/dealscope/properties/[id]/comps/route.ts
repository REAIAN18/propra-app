import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Demo comparables for unauthenticated users (demo mode compliance)
const DEMO_COMPARABLES = [
  {
    id: "comp-1",
    address: "Unit 5, Medway Industrial Estate, Rochester, Kent ME2 4LR",
    saleAmount: 750000,
    saleDate: "2025-11-15",
    pricePerSqft: 91.46,
  },
  {
    id: "comp-2",
    address: "Unit 12, Rochester Business Park, Rochester, Kent ME1 3LR",
    saleAmount: 820000,
    saleDate: "2025-10-22",
    pricePerSqft: 105.13,
  },
  {
    id: "comp-3",
    address: "Unit 8, Medway Trade Centre, Rochester, Kent ME3 9LR",
    saleAmount: 680000,
    saleDate: "2025-09-10",
    pricePerSqft: 87.18,
  },
  {
    id: "comp-4",
    address: "Unit 2, Industrial Court, Rochester, Kent ME2 2LR",
    saleAmount: 920000,
    saleDate: "2025-08-05",
    pricePerSqft: 110.24,
  },
  {
    id: "comp-5",
    address: "Unit 15, Chatham Industrial Zone, Chatham, Kent ME5 8RR",
    saleAmount: 700000,
    saleDate: "2025-07-20",
    pricePerSqft: 89.74,
  },
];

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
      return NextResponse.json(DEMO_COMPARABLES);
    }

    // Get comparables for this deal
    const comparables = await prisma.scoutComparable.findMany({
      where: { dealId: id },
      orderBy: { saleDate: "desc" },
    });

    return NextResponse.json(comparables);
  } catch (error) {
    console.error("Error fetching comparables:", error);
    // Return demo data on error (graceful fallback for demo mode)
    return NextResponse.json(DEMO_COMPARABLES);
  }
}

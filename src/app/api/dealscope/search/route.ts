import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Demo search results for unauthenticated users (UK industrial demo data)
const DEMO_SEARCH_RESULTS = [
  { id: "demo-meri-1", address: "Meridian Business Park, Unit 7", location: "Rochester, Kent", type: "Industrial", sqft: 8200, price: 520000, epc: "D", signals: ["admin", "mees"], score: 7.2, source: "admin", daysLabel: "2h ago" },
  { id: "demo-maid-2", address: "Maidstone Enterprise Zone, Plot B3", location: "Maidstone, Kent", type: "Industrial", sqft: 9400, price: 580000, epc: "E", signals: ["auction"], score: 7.4, source: "auction", daysLabel: "5h ago" },
  { id: "demo-red-3", address: "Redfield Manor", location: "Reigate, Surrey", type: "Industrial", sqft: 6200, price: 722000, epc: "C", signals: ["price_drop"], score: 6.8, source: "price_drop", daysLabel: "1d ago" },
  { id: "demo-ash-4", address: "Ashworth Close, Unit 2", location: "Crawley, West Sussex", type: "Industrial", sqft: 4800, price: 480000, epc: "E", signals: ["auction"], score: 6.9, source: "auction", daysLabel: "2d ago" },
  { id: "demo-king-5", address: "Kingfield Industrial Estate", location: "Woking, Surrey", type: "Industrial", sqft: 12400, price: 920000, epc: "D", signals: ["admin", "mees"], score: 7.1, source: "admin", daysLabel: "3d ago" },
  { id: "demo-grav-6", address: "Gravesend Industrial Estate, Block C", location: "Gravesend, Kent", type: "Warehouse", sqft: 7600, price: 440000, epc: "F", signals: ["mees", "absent"], score: 5.6, source: "mees", daysLabel: "4d ago" },
  { id: "demo-beck-7", address: "Beckenham Flex Space", location: "London BR3", type: "Flex", sqft: 3800, price: 680000, epc: "C", signals: ["auction"], score: 5.1, source: "auction", daysLabel: "5d ago" },
  { id: "demo-vale-8", address: "Vale Trading Estate", location: "Billericay, Essex", type: "Industrial", sqft: 5600, price: 340000, epc: "F", signals: ["mees"], score: 5.4, source: "mees", daysLabel: "6d ago" },
];

/**
 * GET /api/dealscope/search
 * Returns deal search results. Returns demo data for unauthenticated users.
 * Query params: source, assetClass, location
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      // Return demo results for unauthenticated users
      return NextResponse.json({ results: DEMO_SEARCH_RESULTS, isDemo: true });
    }

    // For authenticated users, query LandRegistryPricePaid as a signal source
    const { searchParams } = new URL(req.url);
    const assetClass = searchParams.get("assetClass");
    const location = searchParams.get("location");

    const where: Record<string, unknown> = {};
    if (assetClass) where.propertyType = { contains: assetClass, mode: "insensitive" };
    if (location) where.postcodeSector = { contains: location, mode: "insensitive" };

    const deals = await prisma.landRegistryPricePaid.findMany({
      where,
      orderBy: { transferDate: "desc" },
      take: 20,
      select: {
        id: true,
        address: true,
        postcode: true,
        propertyType: true,
        price: true,
        transferDate: true,
      },
    });

    if (deals.length === 0) {
      return NextResponse.json({ results: DEMO_SEARCH_RESULTS, isDemo: true });
    }

    const results = deals.map((d) => ({
      id: d.id,
      address: d.address,
      location: d.postcode ?? "UK",
      type: d.propertyType ?? "Commercial",
      sqft: null,
      price: d.price,
      epc: null,
      signals: [],
      score: null,
      source: "land_registry",
      daysLabel: d.transferDate ? new Date(d.transferDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—",
    }));

    return NextResponse.json({ results, isDemo: false });
  } catch (error) {
    console.error("Dealscope search error:", error);
    return NextResponse.json({ results: DEMO_SEARCH_RESULTS, isDemo: true });
  }
}

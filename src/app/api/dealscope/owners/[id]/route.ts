import { prisma } from "@/lib/prisma";
import { scoreDeal } from "@/lib/dealscope-score";
import { NextRequest, NextResponse } from "next/server";

interface OwnerProperty {
  id: string;
  address: string;
  temperature: string;
  score: number;
  value: number | null;
}

interface OwnerProfile {
  id: string;
  name: string;
  properties: OwnerProperty[];
  portfolio: {
    totalValue: number;
    count: number;
  };
  outreach: {
    lastContact: null | string;
    status: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the property to find the owner
    const deal = await prisma.scoutDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Build owner profile from deal data
    const ownerProfile: OwnerProfile = {
      id: deal.ownerCompanyId || `owner-${deal.id}`,
      name: deal.ownerName || "Unknown Owner",
      properties: [],
      portfolio: {
        totalValue: 0,
        count: 0,
      },
      outreach: {
        lastContact: null,
        status: "not_contacted",
      },
    };

    // Find other properties by this owner
    if (deal.ownerCompanyId || deal.ownerName) {
      const otherProperties = await prisma.scoutDeal.findMany({
        where: {
          OR: [
            { ownerCompanyId: deal.ownerCompanyId || undefined },
            { ownerName: deal.ownerName || undefined },
          ],
        },
        take: 10,
      });

      ownerProfile.properties = otherProperties.map((p) => {
        const { score, temperature } = scoreDeal(p);
        return {
          id: p.id,
          address: p.address,
          temperature,
          score,
          value: p.askingPrice || p.guidePrice,
        };
      });

      ownerProfile.portfolio = {
        count: otherProperties.length,
        totalValue: otherProperties.reduce((sum, p) => sum + (p.askingPrice || p.guidePrice || 0), 0),
      };
    }

    return NextResponse.json(ownerProfile);
  } catch (error) {
    console.error("Error fetching owner profile:", error);
    return NextResponse.json({ error: "Failed to fetch owner profile" }, { status: 500 });
  }
}

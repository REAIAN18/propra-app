import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const property = await prisma.scoutDeal.findUnique({
      where: { id },
      include: {
        reactions: true,
        underwriting: true,
        comparables: true,
        vendorApproaches: true,
        approachLetters: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error("Property fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

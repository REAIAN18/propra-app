import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { address, assetType, askingPrice, sourceTag, sourceUrl } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Create new property
    const property = await prisma.scoutDeal.create({
      data: {
        address: address as string,
        assetType: (assetType as string) || "Industrial",
        askingPrice: (askingPrice as number) || undefined,
        sourceTag: (sourceTag as string) || "Manual Entry",
        status: "active",
        signalCount: 0,
        sourceUrl: (sourceUrl as string) || undefined,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("Property creation error:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}

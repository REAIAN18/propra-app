import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // In demo mode, return sample data
    // In production, this would fetch from the current user's session

    const pipelines = await prisma.userPipeline.findMany({
      select: {
        id: true,
        propertyId: true,
        stage: true,
        followUpDate: true,
        property: {
          select: {
            id: true,
            address: true,
            assetType: true,
            askingPrice: true,
            currency: true,
          },
        },
      },
      take: 50,
    });

    const deals = pipelines.map((p) => ({
      id: p.id,
      propertyId: p.propertyId,
      stage: p.stage,
      followUpDate: p.followUpDate,
      address: p.property.address,
      assetType: p.property.assetType,
      askingPrice: p.property.askingPrice,
      currency: p.property.currency,
    }));

    return NextResponse.json({ deals });
  } catch (error) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json({ deals: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, propertyId, stage } = body;

    if (!userId || !propertyId) {
      return NextResponse.json(
        { error: "userId and propertyId required" },
        { status: 400 }
      );
    }

    const pipeline = await prisma.userPipeline.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      update: { stage: stage || "identified" },
      create: {
        userId,
        propertyId,
        stage: stage || "identified",
      },
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Pipeline create error:", error);
    return NextResponse.json({ error: "Failed to create pipeline entry" }, { status: 500 });
  }
}

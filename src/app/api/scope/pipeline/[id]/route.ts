import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { stage, followUpDate } = body;

    const pipeline = await prisma.userPipeline.update({
      where: { id },
      data: {
        ...(stage && { stage: stage as string }),
        ...(followUpDate && { followUpDate: new Date(followUpDate as string) }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Pipeline update error:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pipeline = await prisma.userPipeline.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
        responses: {
          orderBy: { createdAt: "desc" },
        },
        property: {
          select: {
            id: true,
            address: true,
            assetType: true,
            askingPrice: true,
            signalCount: true,
            sourceTag: true,
          },
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stage } = await req.json();

    if (!stage) {
      return NextResponse.json({ error: "Stage is required" }, { status: 400 });
    }

    const updated = await prisma.scoutDeal.update({
      where: { id },
      data: {
        pipelineStage: stage,
        pipelineUpdatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pipeline:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}

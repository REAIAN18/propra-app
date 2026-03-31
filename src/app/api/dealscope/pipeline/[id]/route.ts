import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { stage } = await req.json();

    if (!stage) {
      return NextResponse.json({ error: "Stage is required" }, { status: 400 });
    }

    // Get user to verify ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update pipeline entry
    const updated = await prisma.userPipeline.update({
      where: { id },
      data: {
        stage,
        updatedAt: new Date(),
      },
    });

    // Verify the pipeline entry belongs to the user
    if (updated.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pipeline:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}

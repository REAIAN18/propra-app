import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/dealscope/watchlist/[id] — Remove from watchlist
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.propertyWatchlist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[watchlist DELETE]", error);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/dealscope/mandates/[id] — Update mandate
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, any>;

    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.clientName !== undefined ? { clientName: body.clientName } : {}),
        ...(body.criteria !== undefined ? { criteria: body.criteria } : {}),
        ...(body.alertEmail !== undefined ? { alertEmail: body.alertEmail } : {}),
        ...(body.alertDigest !== undefined ? { alertDigest: body.alertDigest } : {}),
        ...(body.paused !== undefined ? { paused: body.paused } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[mandates PATCH]", error);
    return NextResponse.json({ error: "Failed to update mandate" }, { status: 500 });
  }
}

/**
 * DELETE /api/dealscope/mandates/[id] — Delete mandate
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.savedSearch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[mandates DELETE]", error);
    return NextResponse.json({ error: "Failed to delete mandate" }, { status: 500 });
  }
}

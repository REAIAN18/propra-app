import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const asset = await prisma.userAsset.findUnique({ where: { id }, select: { id: true } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const updated = await prisma.userAsset.update({
    where: { id },
    data: { planningHistory: body.planningHistory ?? [] },
    select: { id: true, name: true, planningHistory: true },
  });

  return NextResponse.json(updated);
}

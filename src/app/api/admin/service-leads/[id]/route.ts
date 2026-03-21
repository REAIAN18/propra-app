import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["pending", "in_progress", "quotes_ready", "done", "not_proceeding"];

// PATCH /api/admin/service-leads/[id] — update status and/or adminNotes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { status?: string; adminNotes?: string };
  const { status, adminNotes } = body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.serviceLead.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    },
  });

  return NextResponse.json({
    ...updated,
    currentPremium: updated.currentPremium ?? null,
    unitRate: updated.unitRate ?? null,
    annualSpend: updated.annualSpend ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

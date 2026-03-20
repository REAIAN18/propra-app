import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/service-leads — list all service leads (admin only)
export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leads = await prisma.serviceLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

// PATCH /api/admin/service-leads — update status and/or adminNotes for a lead
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status, adminNotes } = await req.json().catch(() => ({}));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const VALID_STATUSES = ["pending", "in_progress", "quotes_ready", "done", "not_proceeding"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.serviceLead.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    },
  });

  return NextResponse.json(updated);
}

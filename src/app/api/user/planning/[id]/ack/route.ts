/**
 * PATCH /api/user/planning/:id/ack
 * Marks a planning application alert as acknowledged by the user.
 *
 * Sets PlanningApplication.alertAcked = true.
 * Used by the Planning tab "Dismiss" / "Mark as reviewed" button.
 *
 * Only the asset owner can acknowledge their own alerts.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before acknowledging
  const app = await (prisma as unknown as {
    planningApplication: {
      findUnique: (q: object) => Promise<{ id: string; userId: string } | null>;
      update: (q: object) => Promise<{ id: string; alertAcked: boolean }>;
    }
  }).planningApplication.findUnique({
    where: { id },
    select: { id: true, userId: true },
  }).catch(() => null);

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (app.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await (prisma as unknown as {
    planningApplication: {
      update: (q: object) => Promise<{ id: string; alertAcked: boolean }>;
    }
  }).planningApplication.update({
    where: { id },
    data: { alertAcked: true },
    select: { id: true, alertAcked: true },
  });

  return NextResponse.json({ application: updated });
}

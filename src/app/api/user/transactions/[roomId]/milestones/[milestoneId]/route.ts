/**
 * PATCH /api/user/transactions/:roomId/milestones/:milestoneId
 * Mark a milestone complete or in-progress.
 *
 * Body: { status: "in_progress" | "complete"; notes?: string; completedAt?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ roomId: string; milestoneId: string }> };

interface MilestoneRow {
  id: string; roomId: string; stage: string; status: string;
  completedAt: Date | null; notes: string | null;
}

type PrismaWithTx = {
  transactionRoom:     { findFirst: (q: object) => Promise<{ id: string } | null> };
  transactionMilestone: {
    findFirst: (q: object) => Promise<MilestoneRow | null>;
    update:    (q: object) => Promise<MilestoneRow>;
  };
};

function db() { return prisma as unknown as PrismaWithTx; }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, milestoneId } = await params;

  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = await db().transactionMilestone.findFirst({ where: { id: milestoneId, roomId } } as object);
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    notes?: string;
    completedAt?: string;
  };

  const VALID_STATUSES = ["pending", "in_progress", "complete"];
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.status === "complete") {
    data.completedAt = body.completedAt ? new Date(body.completedAt) : new Date();
  } else if (body.status === "pending" || body.status === "in_progress") {
    data.completedAt = null;
  }

  const updated = await db().transactionMilestone.update({
    where: { id: milestoneId } as object,
    data,
  } as object);

  return NextResponse.json({ milestone: updated });
}

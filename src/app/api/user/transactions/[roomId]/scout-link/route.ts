/**
 * POST /api/user/transactions/:roomId/scout-link
 * Links an existing Scout deal to a transaction room.
 *
 * Body: { dealId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ roomId: string }> };

type PrismaWithTx = {
  transactionRoom: {
    findFirst: (q: object) => Promise<{ id: string; dealId: string | null } | null>;
    update:    (q: object) => Promise<{ id: string; dealId: string | null }>;
  };
};

function db() { return prisma as unknown as PrismaWithTx; }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { dealId?: string };
  if (!body.dealId) return NextResponse.json({ error: "dealId is required" }, { status: 400 });

  // Verify deal exists
  type DealRow = { id: string };
  const deal = await (prisma as unknown as { scoutDeal: { findFirst: (q: object) => Promise<DealRow | null> } })
    .scoutDeal.findFirst({ where: { id: body.dealId } } as object).catch(() => null);
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const updated = await db().transactionRoom.update({
    where: { id: roomId } as object,
    data:  { dealId: body.dealId, updatedAt: new Date() },
  } as object);

  return NextResponse.json({ room: updated });
}

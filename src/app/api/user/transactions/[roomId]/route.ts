/**
 * GET   /api/user/transactions/:roomId — full room detail
 * PATCH /api/user/transactions/:roomId — update room status, agreedPrice, solicitorRef
 *
 * PATCH body (all optional):
 * { status?, agreedPrice?, solicitorRef?, buyer?, seller? }
 *
 * When status === "completed" and agreedPrice is set: creates Commission (0.25%)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ roomId: string }> };

interface RoomRow {
  id: string; userId: string; dealId: string | null; assetId: string | null;
  type: string; status: string;
  askingPrice: number | null; agreedPrice: number | null;
  buyer: string | null; seller: string | null; solicitorRef: string | null;
  createdAt: Date; updatedAt: Date;
}

interface MilestoneRow {
  id: string; roomId: string; stage: string; status: string;
  completedAt: Date | null; notes: string | null;
}

interface DocRow {
  id: string; roomId: string; documentId: string | null;
  name: string; category: string; uploadedBy: string;
  fileUrl: string | null; confidential: boolean; uploadedAt: Date;
}

interface NDARow {
  id: string; roomId: string; signerName: string; signerEmail: string;
  signedAt: Date | null; docusignId: string | null; status: string;
}

type PrismaWithTx = {
  transactionRoom: {
    findFirst:  (q: object) => Promise<RoomRow | null>;
    update:     (q: object) => Promise<RoomRow>;
  };
  transactionMilestone: { findMany: (q: object) => Promise<MilestoneRow[]> };
  transactionDocument:  { findMany: (q: object) => Promise<DocRow[]> };
  ndaSignature:         { findFirst: (q: object) => Promise<NDARow | null> };
};

function db() { return prisma as unknown as PrismaWithTx; }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [milestones, documents, ndaSignature] = await Promise.all([
    db().transactionMilestone.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } } as object).catch(() => []),
    db().transactionDocument.findMany({ where: { roomId }, orderBy: { uploadedAt: "desc" } } as object).catch(() => []),
    db().ndaSignature.findFirst({ where: { roomId } } as object).catch(() => null),
  ]);

  // Load related names
  let assetName: string | null = null;
  let dealAddress: string | null = null;
  if (room.assetId) {
    const a = await prisma.userAsset.findFirst({ where: { id: room.assetId }, select: { name: true } });
    assetName = a?.name ?? null;
  }
  if (room.dealId) {
    type DealRow = { address: string };
    const d = await (prisma as unknown as { scoutDeal: { findFirst: (q: object) => Promise<DealRow | null> } })
      .scoutDeal.findFirst({ where: { id: room.dealId }, select: { address: true } } as object).catch(() => null);
    dealAddress = d?.address ?? null;
  }

  return NextResponse.json({ room: { ...room, assetName, dealAddress, milestones, documents, ndaSignature } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await db().transactionRoom.findFirst({ where: { id: roomId, userId: session.user.id } } as object);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    agreedPrice?: number;
    solicitorRef?: string;
    buyer?: string;
    seller?: string;
  };

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status)      data.status      = body.status;
  if (body.agreedPrice) data.agreedPrice = body.agreedPrice;
  if (body.solicitorRef !== undefined) data.solicitorRef = body.solicitorRef;
  if (body.buyer  !== undefined) data.buyer  = body.buyer;
  if (body.seller !== undefined) data.seller = body.seller;

  const updated = await db().transactionRoom.update({ where: { id: roomId } as object, data } as object);

  // Commission on completion
  if (body.status === "completed" && body.agreedPrice) {
    const assetName = room.assetId
      ? (await prisma.userAsset.findFirst({ where: { id: room.assetId }, select: { name: true, country: true } }))
      : null;
    const currency = (assetName as { country?: string } | null)?.country === "UK" ? "GBP" : "USD";
    const sym = currency === "GBP" ? "£" : "$";
    const fmtPrice = body.agreedPrice >= 1_000_000
      ? `${sym}${(body.agreedPrice / 1_000_000).toFixed(2)}M`
      : `${sym}${(body.agreedPrice / 1_000).toFixed(0)}k`;

    void currency; void fmtPrice; // used in description logged separately
    await prisma.commission.create({
      data: {
        userId:          session.user.id,
        assetId:         room.assetId ?? undefined,
        category:        "transaction",
        annualSaving:    0,
        commissionRate:  0.0025,
        commissionValue: Math.round(body.agreedPrice * 0.0025),
        status:          "confirmed",
        placedAt:        new Date(),
      },
    }).catch(() => null);
  }

  return NextResponse.json({ room: updated });
}

/**
 * GET  /api/user/transactions — list all transaction rooms
 * POST /api/user/transactions — create a new transaction room
 *
 * POST body:
 * {
 *   type: "acquisition" | "disposal";
 *   dealId?: string;       // link to ScoutDeal
 *   assetId?: string;      // link to UserAsset
 *   askingPrice?: number;
 *   counterparty?: string; // buyer or seller name
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STANDARD_MILESTONES = [
  "nda_signed",
  "heads_agreed",
  "instructed_solicitor",
  "searches_ordered",
  "survey_instructed",
  "contracts_exchanged",
  "completion",
] as const;

type PrismaWithTx = {
  transactionRoom: {
    findMany: (q: object) => Promise<TransactionRoomRow[]>;
    create:   (q: object) => Promise<TransactionRoomRow>;
    findFirst:(q: object) => Promise<TransactionRoomRow | null>;
  };
  transactionMilestone: {
    createMany: (q: object) => Promise<{ count: number }>;
    findMany:   (q: object) => Promise<MilestoneRow[]>;
  };
};

interface MilestoneRow {
  id: string; roomId: string; stage: string; status: string;
  completedAt: Date | null; notes: string | null; createdAt: Date;
}

interface TransactionRoomRow {
  id: string; userId: string; dealId: string | null; assetId: string | null;
  type: string; status: string;
  askingPrice: number | null; agreedPrice: number | null;
  buyer: string | null; seller: string | null; solicitorRef: string | null;
  createdAt: Date; updatedAt: Date;
}

interface ReqBody {
  type: "acquisition" | "disposal";
  dealId?: string;
  assetId?: string;
  askingPrice?: number;
  counterparty?: string;
}

function db() {
  return prisma as unknown as PrismaWithTx;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = await db().transactionRoom.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  } as object).catch(() => [] as TransactionRoomRow[]);

  // Load milestone counts per room
  const roomIds = rooms.map((r) => r.id);
  const milestones = roomIds.length > 0
    ? await db().transactionMilestone.findMany({
        where: { roomId: { in: roomIds } },
      } as object).catch(() => [] as MilestoneRow[])
    : [];

  const milestoneMap = new Map<string, MilestoneRow[]>();
  for (const m of milestones) {
    const arr = milestoneMap.get(m.roomId) ?? [];
    arr.push(m);
    milestoneMap.set(m.roomId, arr);
  }

  // Load asset names
  const assetIds = rooms.map((r) => r.assetId).filter(Boolean) as string[];
  const assets = assetIds.length > 0
    ? await prisma.userAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, name: true } })
    : [];
  const assetMap = new Map(assets.map((a) => [a.id, a.name]));

  // Load deal addresses
  const dealIds = rooms.map((r) => r.dealId).filter(Boolean) as string[];
  type DealRow = { id: string; address: string };
  const deals = dealIds.length > 0
    ? await (prisma as unknown as { scoutDeal: { findMany: (q: object) => Promise<DealRow[]> } }).scoutDeal.findMany({
        where: { id: { in: dealIds } },
        select: { id: true, address: true },
      } as object).catch(() => [] as DealRow[])
    : [];
  const dealMap = new Map(deals.map((d) => [d.id, d.address]));

  const result = rooms.map((r) => {
    const ms = milestoneMap.get(r.id) ?? [];
    const completedCount = ms.filter((m) => m.status === "complete").length;
    const name = r.assetId ? assetMap.get(r.assetId) : r.dealId ? dealMap.get(r.dealId) : null;
    return {
      ...r,
      name: name ?? "Unnamed deal",
      milestoneProgress: { completed: completedCount, total: ms.length },
    };
  });

  return NextResponse.json({ rooms: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  if (!body.type || !["acquisition", "disposal"].includes(body.type)) {
    return NextResponse.json({ error: "type must be 'acquisition' or 'disposal'" }, { status: 400 });
  }

  // Validate asset ownership if assetId provided
  if (body.assetId) {
    const asset = await prisma.userAsset.findFirst({ where: { id: body.assetId, userId: session.user.id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check if room already exists for this deal
  if (body.dealId) {
    const existing = await db().transactionRoom.findFirst({ where: { dealId: body.dealId } } as object).catch(() => null);
    if (existing) return NextResponse.json({ room: existing });
  }

  const buyer  = body.type === "acquisition" ? session.user.id  : body.counterparty ?? null;
  const seller = body.type === "disposal"    ? session.user.id  : body.counterparty ?? null;

  const room = await db().transactionRoom.create({
    data: {
      userId:      session.user.id,
      dealId:      body.dealId  ?? null,
      assetId:     body.assetId ?? null,
      type:        body.type,
      askingPrice: body.askingPrice ?? null,
      buyer:       buyer as string | null,
      seller:      seller as string | null,
      updatedAt:   new Date(),
    },
  } as object);

  // Auto-create 7 standard milestones
  await db().transactionMilestone.createMany({
    data: STANDARD_MILESTONES.map((stage) => ({
      roomId: room.id,
      stage,
      status: "pending",
    })),
  } as object).catch(() => null);

  const milestones = await db().transactionMilestone.findMany({ where: { roomId: room.id } } as object).catch(() => []);

  return NextResponse.json({ room: { ...room, milestones } }, { status: 201 });
}

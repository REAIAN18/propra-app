/**
 * GET  /api/user/lettings — list all active lettings with enquiry count
 * POST /api/user/lettings — create a letting for a vacant asset/unit
 *
 * POST body: { assetId, unitRef?, askingRent, leaseTermYears?, useClass?, notes? }
 * POST response: { letting }
 *
 * GET response: { lettings: Letting[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LettingRow {
  id: string; userId: string; assetId: string; unitRef: string | null;
  status: string; askingRent: number; leaseTermYears: number | null;
  useClass: string | null; notes: string | null;
  agreedRent: number | null; agreedTermYears: number | null;
  createdAt: Date; updatedAt: Date;
}

type LettingWithCount = LettingRow & { enquiries: { id: string }[] };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lettings = await (prisma as unknown as {
    letting: {
      findMany: (q: object) => Promise<LettingWithCount[]>;
    };
  }).letting.findMany({

    where: { userId: session.user.id, status: { not: "withdrawn" } },
    include: { enquiries: true },
    orderBy: { createdAt: "desc" },
  } as object).catch(() => [] as LettingWithCount[]);

  const result = lettings.map((l) => ({
    ...l,
    enquiryCount: l.enquiries.length,
  }));

  return NextResponse.json({ lettings: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    assetId?: string;
    unitRef?: string;
    askingRent?: number;
    leaseTermYears?: number;
    useClass?: string;
    notes?: string;
  };

  if (!body.assetId || !body.askingRent || body.askingRent <= 0) {
    return NextResponse.json(
      { error: "assetId and askingRent are required" },
      { status: 422 }
    );
  }

  // Verify asset ownership
  const asset = await prisma.userAsset.findFirst({
    where: { id: body.assetId, userId: session.user.id },
    select: { id: true, name: true, location: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const letting = await (prisma as unknown as {
    letting: {
      create: (q: object) => Promise<LettingRow>;
    };
  }).letting.create({
    data: {
      userId:         session.user.id,
      assetId:        body.assetId,
      unitRef:        body.unitRef ?? null,
      askingRent:     body.askingRent,
      leaseTermYears: body.leaseTermYears ?? null,
      useClass:       body.useClass ?? null,
      notes:          body.notes ?? null,
      status:         "active",
    },
  } as object);

  return NextResponse.json({ letting }, { status: 201 });
}

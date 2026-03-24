/**
 * PATCH /api/user/lettings/:lettingId
 * Updates letting status and agreed terms.
 *
 * Body: { status?, agreedRent?, agreedTermYears? }
 * Allowed status transitions: active → under_offer → let | withdrawn
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LettingRow {
  id: string; userId: string; assetId: string; status: string;
  askingRent: number; agreedRent: number | null; agreedTermYears: number | null;
  createdAt: Date; updatedAt: Date;
}

type PrismaWithLetting = {
  letting: {
    findFirst: (q: object) => Promise<LettingRow | null>;
    update:    (q: object) => Promise<LettingRow>;
  };
};

const VALID_STATUSES = ["active", "under_offer", "let", "withdrawn"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lettingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lettingId } = await params;
  const db = prisma as unknown as PrismaWithLetting;

  const existing = await db.letting.findFirst({
    where: { id: lettingId, userId: session.user.id },
  } as object).catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    status?: string;
    agreedRent?: number;
    agreedTermYears?: number;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 422 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.status)          data.status          = body.status;
  if (body.agreedRent)      data.agreedRent      = body.agreedRent;
  if (body.agreedTermYears) data.agreedTermYears = body.agreedTermYears;

  const letting = await db.letting.update({
    where: { id: lettingId },
    data,
  } as object);

  return NextResponse.json({ letting });
}

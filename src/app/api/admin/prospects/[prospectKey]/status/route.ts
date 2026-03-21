import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = [
  "to_contact",
  "contacted",
  "replied",
  "interested",
  "call_booked",
  "demo_done",
  "not_interested",
  "won",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ prospectKey: string }> },
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { prospectKey } = await params;
  const body = await req.json();
  const { status, note } = body as { status: string; note?: string };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const row = await prisma.prospectStatus.upsert({
    where: { prospectKey },
    create: {
      prospectKey,
      status: "to_contact",
      manualStatus: status,
      manualNote: note ?? null,
      manualUpdatedAt: new Date(),
    },
    update: {
      manualStatus: status,
      manualNote: note ?? null,
      manualUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({
    manualStatus: row.manualStatus,
    manualNote: row.manualNote,
    manualUpdatedAt: row.manualUpdatedAt,
  });
}

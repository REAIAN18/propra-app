/**
 * POST /api/user/work-orders/:orderId/milestone
 * Adds a progress update milestone while a work order is "in_progress".
 *
 * Accepts multipart/form-data with:
 *   note:   string (required)
 *   type:   "update" | "issue"  (default: "update")
 *
 * Photo uploads are Wave 3 (requires S3 configuration).
 * Wave 2: text notes only; photoUrls stored as empty array.
 *
 * Response: { milestone: WorkOrderMilestone }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["update", "issue"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (order.status !== "in_progress") {
    return NextResponse.json(
      { error: `Milestones can only be added to in_progress orders (current: ${order.status})` },
      { status: 400 }
    );
  }

  // Parse body — accepts both JSON and multipart (Wave 2: JSON only; Wave 3 adds photos)
  let note: string | undefined;
  let type: string = "update";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData().catch(() => null);
    note = formData?.get("note")?.toString();
    type = formData?.get("type")?.toString() ?? "update";
  } else {
    const body = await req.json().catch(() => ({})) as { note?: string; type?: string };
    note = body.note;
    type = body.type ?? "update";
  }

  if (!note?.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 422 });
  }

  const milestoneType = VALID_TYPES.includes(type as typeof VALID_TYPES[number])
    ? type
    : "update";

  const milestone = await (prisma as unknown as {
    workOrderMilestone: {
      create: (q: object) => Promise<{
        id: string; type: string; note: string; photoUrls: string[]; reportedAt: Date;
      }>;
    }
  }).workOrderMilestone.create({
    data: {
      workOrderId: orderId,
      userId:      session.user.id,
      type:        milestoneType,
      note:        note.trim(),
      photoUrls:   [], // Photo upload: Wave 3
    },
  });

  return NextResponse.json({
    milestone: {
      ...milestone,
      reportedAt: milestone.reportedAt.toISOString(),
    },
  });
}

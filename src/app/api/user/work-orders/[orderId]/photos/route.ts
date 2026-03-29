/**
 * POST /api/user/work-orders/:orderId/photos
 * Uploads photos and updates WorkOrder beforePhotos, afterPhotos, or milestone progressPhotos.
 *
 * Body: { type: "before" | "after" | "progress"; milestoneId?: string; url: string; caption: string }
 * Response: { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, beforePhotos: true, afterPhotos: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    type?: "before" | "after" | "progress";
    milestoneId?: string;
    url?: string;
    caption?: string;
  };

  if (!body.type || !body.url) {
    return NextResponse.json({ error: "type and url are required" }, { status: 422 });
  }

  const photoEntry = {
    url: body.url,
    caption: body.caption || "",
    takenAt: new Date().toISOString(),
  };

  if (body.type === "progress" && body.milestoneId) {
    // Add to milestone progressPhotos
    const milestone = await prisma.workOrderMilestone.findFirst({
      where: { id: body.milestoneId, workOrderId: orderId },
      select: { id: true, progressPhotos: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const existingPhotos = (milestone.progressPhotos as Array<{ url: string; caption: string }>) || [];
    await prisma.workOrderMilestone.update({
      where: { id: milestone.id },
      data: { progressPhotos: [...existingPhotos, photoEntry] as unknown as object },
    });
  } else if (body.type === "before") {
    const existingPhotos = (order.beforePhotos as Array<{ url: string; caption: string; takenAt: string }>) || [];
    await prisma.workOrder.update({
      where: { id: orderId },
      data: { beforePhotos: [...existingPhotos, photoEntry] as unknown as object },
    });
  } else if (body.type === "after") {
    const existingPhotos = (order.afterPhotos as Array<{ url: string; caption: string; takenAt: string }>) || [];
    await prisma.workOrder.update({
      where: { id: orderId },
      data: { afterPhotos: [...existingPhotos, photoEntry] as unknown as object },
    });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

/**
 * PATCH /api/dealscope/alerts/[id] — Mark read, dismiss, or snooze an alert
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;
    const body = (await req.json()) as Record<string, any>;

    // Verify ownership
    const existing = await prisma.alertEvent.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const update: any = {};
    if (body.read !== undefined) update.read = Boolean(body.read);
    if (body.dismissed !== undefined) update.dismissed = Boolean(body.dismissed);
    if (body.snoozedUntil !== undefined) {
      update.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null;
    }

    const alert = await prisma.alertEvent.update({ where: { id }, data: update });
    return NextResponse.json(alert);
  } catch (error) {
    console.error("[alerts PATCH]", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

/**
 * GET /api/dealscope/alerts — List alerts for the current user
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || DEMO_USER_ID;
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // "signal_match" | "price_change" | "deadline" | "followup" | "portfolio" | "completion"
    const unreadOnly = searchParams.get("unread") === "true";

    const where: any = { userId, dismissed: false };
    if (filter && filter !== "All") {
      where.type = filter;
    }
    if (unreadOnly) {
      where.read = false;
    }
    // Exclude snoozed
    where.OR = [
      { snoozedUntil: null },
      { snoozedUntil: { lt: new Date() } },
    ];

    const alerts = await prisma.alertEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        mandate: { select: { id: true, name: true } },
        property: { select: { id: true, address: true, assetType: true } },
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("[alerts GET]", error);
    return NextResponse.json([]);
  }
}

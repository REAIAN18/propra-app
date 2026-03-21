import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Build a map: YYYY-MM-DD -> count
  const byDay: Record<string, number> = {};

  // Pre-fill all days in range with 0
  for (let d = 0; d < days; d++) {
    const day = new Date(since.getTime() + d * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    byDay[key] = 0;
  }

  for (const u of users) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (key in byDay) byDay[key] = (byDay[key] ?? 0) + 1;
  }

  const data = Object.entries(byDay).map(([day, count]) => ({ day, count }));

  return NextResponse.json({ days, data });
}

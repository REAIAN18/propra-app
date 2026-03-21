import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns the most recently stored SOFR rate.
export async function GET() {
  const rate = await prisma.macroRate.findFirst({
    where: { series: "SOFR" },
    orderBy: { date: "desc" },
    select: { value: true, date: true, fetchedAt: true },
  });

  if (!rate) {
    return NextResponse.json({ sofr: null });
  }

  return NextResponse.json({ sofr: rate });
}

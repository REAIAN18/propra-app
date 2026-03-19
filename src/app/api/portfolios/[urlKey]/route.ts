import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ urlKey: string }> }
) {
  const { urlKey } = await params;

  const portfolio = await prisma.clientPortfolio.findUnique({
    where: { urlKey },
    select: { data: true, name: true, urlKey: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  return NextResponse.json(portfolio.data);
}

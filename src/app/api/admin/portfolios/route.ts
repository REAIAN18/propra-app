import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  // @ts-expect-error — custom session field
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolios = await prisma.clientPortfolio.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, urlKey: true, createdBy: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(portfolios);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, urlKey, data } = body;

  if (!name || !urlKey || !data) {
    return NextResponse.json({ error: "name, urlKey, and data are required" }, { status: 400 });
  }

  // Validate urlKey format
  if (!/^[a-z0-9-]+$/.test(urlKey)) {
    return NextResponse.json({ error: "urlKey must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdBy = (session.user as any)?.email ?? null;

  const portfolio = await prisma.clientPortfolio.upsert({
    where: { urlKey },
    update: { name, data, createdBy },
    create: { name, urlKey, data, createdBy },
  });

  return NextResponse.json(portfolio);
}

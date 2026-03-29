import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/investor-contacts - List all investor contacts for the user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const contacts = await prisma.investorContact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      outreach: {
        orderBy: { sentAt: "desc" },
        take: 5,
      },
    },
  });

  return NextResponse.json(contacts);
}

// POST /api/user/investor-contacts - Create a new investor contact
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, email, company, type, status, notes } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const contact = await prisma.investorContact.create({
    data: {
      userId: user.id,
      name,
      email,
      company,
      type: type || "LP",
      status: status || "prospect",
      notes,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Only allow cancelling unsent emails
  const email = await prisma.scheduledEmail.findUnique({ where: { id } });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (email.sentAt) {
    return NextResponse.json({ error: "Already sent — cannot cancel" }, { status: 409 });
  }

  await prisma.scheduledEmail.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

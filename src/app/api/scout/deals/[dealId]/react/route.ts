import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { dealId } = await params;
  const body = await req.json();
  const reaction = body.reaction as string;

  if (reaction !== "interested" && reaction !== "passed") {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  await prisma.scoutReaction.upsert({
    where: { userId_dealId: { userId: session.user.id, dealId } },
    create: { userId: session.user.id, dealId, reaction },
    update: { reaction },
  });

  return NextResponse.json({ ok: true });
}

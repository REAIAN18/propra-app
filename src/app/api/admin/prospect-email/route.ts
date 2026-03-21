import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/prospect-email — upsert emailOverride for a prospect
// Body: { prospectKey: string; email: string }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prospectKey, email } = body as { prospectKey?: string; email?: string };

  if (!prospectKey) {
    return NextResponse.json({ error: "prospectKey required" }, { status: 400 });
  }

  const updatedBy = session.user?.email ?? null;
  const emailOverride = typeof email === "string" ? email.trim() || null : null;

  const row = await prisma.prospectStatus.upsert({
    where: { prospectKey },
    create: {
      prospectKey,
      status: "to_contact",
      emailOverride,
      updatedBy,
    },
    update: {
      emailOverride,
      updatedBy,
    },
  });

  return NextResponse.json({ ok: true, prospectKey, emailOverride: row.emailOverride });
}

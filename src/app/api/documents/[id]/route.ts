import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    // @ts-expect-error — custom session field
    const isAdmin = session.user.isAdmin === true;
    if (!isAdmin && document.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ document });
  } catch (err) {
    console.error("[documents/id]", err);
    return NextResponse.json({ error: "Failed to fetch document." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Must be authenticated to list documents
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const where: { userId?: string; documentType?: string } = {
      userId: session.user.id,
    };
    if (type) {
      where.documentType = type;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[documents]", err);
    return NextResponse.json({ error: "Failed to fetch documents." }, { status: 500 });
  }
}

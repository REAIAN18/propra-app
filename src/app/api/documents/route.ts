import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[documents]", err);
    return NextResponse.json({ error: "Failed to fetch documents." }, { status: 500 });
  }
}

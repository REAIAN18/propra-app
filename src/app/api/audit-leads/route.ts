import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, portfolioInput, estimate } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    await prisma.auditLead.create({
      data: {
        email: email.trim().toLowerCase(),
        portfolioInput: portfolioInput ?? "",
        assetType: estimate?.assetType ?? null,
        assetCount: estimate?.assetCount ?? null,
        estimateTotal: estimate?.total ?? null,
        estimateJson: estimate ? JSON.stringify(estimate) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[audit-leads]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

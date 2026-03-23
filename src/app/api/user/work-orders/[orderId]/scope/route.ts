/**
 * POST /api/user/work-orders/:orderId/scope
 * Generates a structured scope of works from a plain description using Claude Sonnet.
 *
 * Saves the result to workOrder.scopeOfWorks if the order is in "draft" status.
 * If orderId is "preview" — generates without saving (used on new order form).
 *
 * Body: { description: string; jobType: string; assetType?: string; sqft?: number }
 * Response: { scopeOfWorks: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Scope generation not available" }, { status: 501 });
  }

  const { orderId } = await params;
  const body = await req.json().catch(() => ({})) as {
    description?: string;
    jobType?: string;
    assetType?: string;
    sqft?: number;
  };

  if (!body.description || !body.jobType) {
    return NextResponse.json(
      { error: "description and jobType are required" },
      { status: 422 }
    );
  }

  // Verify order ownership (skip if orderId is "preview" for unsaved orders)
  let order: { id: string; status: string; assetId: string | null } | null = null;
  if (orderId !== "preview") {
    order = await prisma.workOrder.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, status: true, assetId: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Optionally fetch asset country for UK/US register
  let isUK = true;
  if (order?.assetId) {
    const asset = await prisma.userAsset.findFirst({
      where: { id: order.assetId },
      select: { country: true },
    });
    isUK = (asset?.country ?? "").toUpperCase() !== "US";
  }

  const sqftLine = body.sqft ? `Floor area: ${body.sqft.toLocaleString()} sqft` : "";
  const standard = isUK ? "relevant UK standards (BS, CIBSE, etc.)" : "relevant US codes (NFPA, ASHRAE, local AHJ)";

  const prompt = `You are a commercial property works manager. Generate a formal scope of works for the following job.

Job type: ${body.jobType}
Description: ${body.description}
Asset type: ${body.assetType ?? "commercial property"}
${sqftLine}

Write a structured scope of works suitable for tendering to contractors. Include:
1. Works description (what is to be done)
2. Standards and specifications (${standard})
3. Access requirements
4. Health & safety considerations
5. Completion criteria (how the client will judge completion)
6. Warranty expectation (minimum)

Professional tone. Maximum 400 words. No prices or timelines — those come from contractors.`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      messages:   [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!aiRes?.ok) {
    return NextResponse.json({ error: "Scope generation failed" }, { status: 500 });
  }

  const data = await aiRes.json() as { content?: Array<{ type: string; text?: string }> };
  const scopeOfWorks = data?.content?.[0]?.text?.trim() ?? "";

  if (!scopeOfWorks) {
    return NextResponse.json({ error: "Scope generation returned empty response" }, { status: 500 });
  }

  // Save to the work order if in draft and we have a real orderId
  if (order && order.status === "draft") {
    await prisma.workOrder.update({
      where: { id: order.id },
      data: { scopeOfWorks },
    }).catch(() => null);
  }

  return NextResponse.json({ scopeOfWorks });
}

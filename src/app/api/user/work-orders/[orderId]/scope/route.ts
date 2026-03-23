/**
 * POST /api/user/work-orders/:orderId/scope
 * Generates a structured scope of works using Claude Haiku.
 *
 * Returns JSON with scopeSummary, lineItems, totalEstimate, tradeRequired, urgency.
 * Stores the result in WorkOrder.aiScopeJson if the order is in "draft" status.
 *
 * Body: { description: string; jobType: string; assetType?: string; sqft?: number }
 * Response: { scope: AiScope }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LineItem {
  description: string;
  estimatedCost: number;
}

interface AiScope {
  scopeSummary: string;
  lineItems: LineItem[];
  totalEstimate: number;
  tradeRequired: string;
  urgency: "low" | "medium" | "high" | "critical";
}

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

  // Verify order ownership (skip for "preview" — unsaved order form)
  let order: { id: string; status: string } | null = null;
  if (orderId !== "preview") {
    order = await prisma.workOrder.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const sqftLine = body.sqft ? `\nFloor area: ${body.sqft.toLocaleString()} sqft` : "";

  const prompt = `You are a commercial property works manager. Generate a structured scope of works for the following job and return ONLY valid JSON — no markdown, no explanation.

Job type: ${body.jobType}
Description: ${body.description}
Asset type: ${body.assetType ?? "commercial property"}${sqftLine}

Return this exact JSON structure:
{
  "scopeSummary": "one sentence describing the works",
  "lineItems": [
    { "description": "line item description", "estimatedCost": 1500 },
    { "description": "another item", "estimatedCost": 800 }
  ],
  "totalEstimate": 2300,
  "tradeRequired": "HVAC",
  "urgency": "high"
}

Rules:
- lineItems: 3–6 items covering materials, labour, disposal, and any compliance checks
- estimatedCost values in GBP (or USD if the job type implies US location)
- totalEstimate must equal sum of lineItems estimatedCost values
- tradeRequired: one of HVAC, ELECTRICAL, PLUMBING, ROOFING, STRUCTURAL, FIRE_SAFETY, PAINTING, GROUNDWORKS, GENERAL
- urgency: one of low, medium, high, critical`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!aiRes?.ok) {
    return NextResponse.json({ error: "Scope generation failed" }, { status: 500 });
  }

  const data = await aiRes.json() as { content?: Array<{ type: string; text?: string }> };
  const raw = data?.content?.[0]?.text?.trim() ?? "";

  let scope: AiScope;
  try {
    scope = JSON.parse(raw) as AiScope;
  } catch {
    return NextResponse.json({ error: "Scope generation returned invalid JSON" }, { status: 500 });
  }

  // Persist to WorkOrder.aiScopeJson if this is a real draft order
  if (order && order.status === "draft") {
    await prisma.workOrder.update({
      where: { id: order.id },
      data: { aiScopeJson: scope as object },
    }).catch(() => null);
  }

  return NextResponse.json({ scope });
}

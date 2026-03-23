/**
 * POST /api/scout/deals/:dealId/loi
 * Generates a 7-clause Letter of Intent via Claude Sonnet and stores as ScoutLOI.
 *
 * offerPrice: taken from body if provided, otherwise derived from underwriting
 * recommendation (strong_buy → asking × 0.94, buy → asking × 0.90).
 *
 * GET /api/scout/deals/:dealId/loi
 * Returns the most recent LOI draft for this deal + user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ dealId: string }> };

// ── GET — return most recent LOI ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await params;

  const loi = await prisma.scoutLOI.findFirst({
    where: { dealId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ loi: loi ?? null });
}

// ── POST — generate LOI ──────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "LOI generation not available" }, { status: 501 });
  }

  const { dealId } = await params;

  // ── Fetch deal + underwriting ────────────────────────────────────────────
  const deal = await prisma.scoutDeal.findUnique({
    where: { id: dealId },
    include: { underwriting: true },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // ── Verify interested reaction ───────────────────────────────────────────
  const reaction = await prisma.scoutReaction.findFirst({
    where: { dealId, userId: session.user.id, reaction: "interested" },
  });

  if (!reaction) {
    return NextResponse.json(
      { error: "Mark the deal as interested before generating an LOI" },
      { status: 403 }
    );
  }

  // ── Parse body + derive offer price ─────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    offerPrice?:        number;
    specialConditions?: string;
  };

  const askingPrice = deal.askingPrice ?? deal.guidePrice;

  // Derive offer price from underwriting recommendation if not provided
  let offerPrice = body.offerPrice ?? 0;
  if (!offerPrice || offerPrice <= 0) {
    const u = deal.underwriting;
    // Derive recommendation inline if underwriting exists
    let recommendation: string | null = null;
    if (u) {
      if (u.dscr !== null && u.dscr < 1.0) {
        recommendation = "pass";
      } else if (u.dscr !== null && u.dscr > 1.3 && u.irr5yr !== null && u.irr5yr > 0.15) {
        recommendation = "strong_buy";
      } else if (u.dscr !== null && u.dscr > 1.15 && u.irr5yr !== null && u.irr5yr > 0.10) {
        recommendation = "buy";
      } else {
        recommendation = "needs_review";
      }
    }
    if (askingPrice && recommendation === "strong_buy") {
      offerPrice = askingPrice * 0.94;
    } else if (askingPrice && recommendation === "buy") {
      offerPrice = askingPrice * 0.90;
    } else if (askingPrice) {
      offerPrice = askingPrice * 0.92; // default: ~8% below asking
    }
  }

  if (!offerPrice || offerPrice <= 0) {
    return NextResponse.json(
      { error: "Cannot derive offer price — deal has no asking price. Provide offerPrice in body." },
      { status: 422 }
    );
  }

  const depositAmount = Math.round(offerPrice * 0.02);
  const isUK = (deal.currency ?? "GBP") !== "USD";
  const sym  = isUK ? "£" : "$";
  const u    = deal.underwriting;

  const underwritingContext = u
    ? `Underwriting summary: Cap rate ${u.capRate ? (u.capRate * 100).toFixed(2) + "%" : "n/a"}, Gross yield ${u.grossYield ? (u.grossYield * 100).toFixed(2) + "%" : "n/a"}, DSCR ${u.dscr ? u.dscr.toFixed(2) + "x" : "n/a"}, Estimated NOI ${u.noinet ? sym + Math.round(u.noinet).toLocaleString() + "/yr" : "n/a"}`
    : "";

  const prompt = `Draft a commercial property Letter of Intent (LOI) from buyer to vendor. Include exactly 7 numbered clauses.

PROPERTY: ${deal.address ?? "address on file"}
ASSET TYPE: ${deal.assetType ?? "commercial property"}${deal.sqft ? `\nFLOOR AREA: ${deal.sqft.toLocaleString()} sqft` : ""}
OFFER PRICE: ${sym}${Math.round(offerPrice).toLocaleString()}
DEPOSIT: ${sym}${depositAmount.toLocaleString()} (2% of offer price, held in escrow)
${underwritingContext}
${body.specialConditions ? `SPECIAL CONDITIONS: ${body.specialConditions}` : ""}

Write the LOI with exactly these 7 clauses (numbered):
1. Offer Price — ${sym}${Math.round(offerPrice).toLocaleString()}, subject to the conditions below
2. Deposit — ${sym}${depositAmount.toLocaleString()} (2% of offer price) held in escrow on acceptance
3. Due Diligence Period — 45 days from acceptance for full property inspection, title review, and financial audit
4. Financing Contingency — subject to buyer obtaining 65% LTV financing at prevailing market rates within 60 days of acceptance
5. Exclusivity Period — vendor to grant 30 days exclusivity from date of acceptance
6. Conditions Precedent — satisfactory title search, Phase 1 environmental site assessment, and tenant estoppel certificates
7. Closing Timeline — target closing 90 days from acceptance of this letter

${isUK ? "Use UK legal register and UK English (e.g. 'exchange of contracts', 'completion')." : "Use US legal register and US English (e.g. 'closing', 'escrow')."}
Buyer entity: [BUYER NAME] and/or assigns.
Do not mention any agents, advisers, brokers, or RealHQ. Write as if directly from the buyer.
End with a signature block: [BUYER NAME], [DATE].
Professional tone. Keep under 500 words total.`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 900,
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const aiData = await aiRes.json() as { content?: Array<{ type: string; text?: string }> };
    const bodyText = aiData?.content?.[0]?.text ?? "";

    const loi = await prisma.scoutLOI.create({
      data: {
        userId:            session.user.id,
        dealId,
        offerPrice:        Math.round(offerPrice),
        depositPct:        0.02,
        conditionalDays:   45,
        completionDays:    90,
        specialConditions: body.specialConditions ?? null,
        body:              bodyText,
        status:            "draft",
      },
    });

    return NextResponse.json({ loi });
  } catch (err) {
    console.error("[loi] Claude generation failed:", err);
    return NextResponse.json({ error: "LOI generation failed" }, { status: 500 });
  }
}

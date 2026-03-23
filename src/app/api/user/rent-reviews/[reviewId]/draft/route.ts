/**
 * POST /api/user/rent-reviews/:reviewId/draft
 * Generates a renewal letter draft via Claude sonnet-4-6.
 * Stores as RenewalCorrespondence and marks draftGeneratedAt on the event.
 *
 * Body: { type: "renewal_letter" | "section_25" | "hot" }
 * Response: { body: string; correspondenceId: string; reviewId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import type { RentReviewEvent, RenewalCorrespondence } from "@/generated/prisma";

type PrismaWithRentReview = {
  rentReviewEvent: {
    findFirst(q: object): Promise<RentReviewEvent | null>;
    update(q: object): Promise<RentReviewEvent>;
  };
  renewalCorrespondence: {
    create(q: object): Promise<RenewalCorrespondence>;
  };
};

const CURRENCY_SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

function buildPrompt(
  type: string,
  review: RentReviewEvent,
  sym: string
): string {
  const ervAnnual = review.ervLive ?? null;
  const gap = review.gap ?? null;
  const gapPct = (ervAnnual !== null && review.passingRent > 0)
    ? (((ervAnnual - review.passingRent) / review.passingRent) * 100).toFixed(1)
    : null;
  const expiryFormatted = new Date(review.expiryDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (type === "renewal_letter") {
    return `Generate a formal commercial lease renewal letter from a landlord to their tenant.

Details:
- Tenant: ${review.tenantName}
- Property: ${review.propertyAddress ?? "the demised premises"}
- Current passing rent: ${sym}${review.passingRent.toLocaleString("en-GB")}/yr
${ervAnnual !== null ? `- Market ERV (comparable evidence): ${sym}${ervAnnual.toLocaleString("en-GB")}/yr` : ""}
${gap !== null ? `- Reversionary gap: ${sym}${gap.toLocaleString("en-GB")}/yr (${gapPct}% below market)` : ""}
- Lease expiry: ${expiryFormatted}
${review.breakDate ? `- Break clause: ${new Date(review.breakDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}
${review.leverageScore ? `- Landlord leverage: ${review.leverageScore}/10 — ${review.leverageExplanation ?? ""}` : ""}

Write a professional UK commercial landlord renewal letter. Propose renewal at market ERV. Reference comparable evidence. State landlord's intention clearly. UK English, formal register. Response deadline: 28 days. Do not mention RealHQ, fees, or commissions. Write as if directly from the landlord.`;
  }

  if (type === "section_25") {
    return `Draft a Section 25 Notice under the Landlord and Tenant Act 1954 for a commercial lease renewal.

Details:
- Tenant: ${review.tenantName}
- Property: ${review.propertyAddress ?? "the demised premises"}
- Lease expiry: ${expiryFormatted}
- Landlord is NOT opposing the grant of a new tenancy
- Proposed terms: renewal at market rent ${ervAnnual ? `(${sym}${ervAnnual.toLocaleString("en-GB")}/yr based on market evidence)` : ""}

Write a formal Section 25 Notice. Include: notice date, termination date (not less than 6 months' notice, not before lease expiry), whether landlord opposes renewal (it does not), proposed terms of new tenancy. UK English, formal legal register.`;
  }

  if (type === "hot") {
    return `Draft commercial property Heads of Terms for a lease renewal negotiation.

Details:
- Tenant: ${review.tenantName}
- Property: ${review.propertyAddress ?? "the demised premises"}
- Current rent: ${sym}${review.passingRent.toLocaleString("en-GB")}/yr
${ervAnnual !== null ? `- Proposed new rent: ${sym}${ervAnnual.toLocaleString("en-GB")}/yr` : ""}
- Lease expiry: ${expiryFormatted}

Draft concise Heads of Terms covering: parties, property description, proposed new lease term, new rent, rent review clause, break clauses (if any), incentives (if any), access rights, service charge, insurance, repair obligations, and governing law. Mark as "Subject to Contract and Lease".`;
  }

  return `Draft a professional letter regarding the commercial lease at ${review.propertyAddress ?? "the demised premises"} occupied by ${review.tenantName}.`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { reviewId } = await params;
  const body = await req.json() as { type?: string };
  const type = body.type ?? "renewal_letter";

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  // Derive currency symbol (default GBP for UK)
  const sym = CURRENCY_SYMBOL["GBP"];
  const prompt = buildPrompt(type, review, sym);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text();
    console.error("[rent-review/draft] Claude error:", text);
    return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
  }

  const aiData = await aiRes.json() as { content: Array<{ text: string }> };
  const letterBody = aiData.content?.[0]?.text ?? "";

  const now = new Date();

  // Store correspondence record
  const correspondence = await db.renewalCorrespondence.create({
    data: {
      id:        `rc_${Math.random().toString(36).slice(2, 12)}`,
      reviewId:  review.id,
      type,
      direction: "outbound",
      body:      letterBody,
    },
  } as object);

  // Update event
  await db.rentReviewEvent.update({
    where: { id: review.id },
    data: {
      draftGeneratedAt: now,
      status: review.status === "pending" ? "draft_sent" : review.status,
    },
  } as object);

  return NextResponse.json({
    body:             letterBody,
    correspondenceId: correspondence.id,
    reviewId:         review.id,
  });
}

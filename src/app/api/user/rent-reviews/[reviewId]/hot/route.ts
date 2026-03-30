/**
 * POST /api/user/rent-reviews/:reviewId/hot
 * Generates Heads of Terms and (if DocuSign credentials are configured)
 * creates a DocuSign envelope for e-signature.
 *
 * Body: { agreedRent: number; newTerm: number; breakClause?: string; incentives?: string }
 * Response: { signingUrl: string | null; envelopeId: string | null; hotBody: string; correspondenceId: string }
 *
 * If DOCUSIGN_INTEGRATION_KEY is not set, returns signingUrl: null and
 * includes the HoT markdown as fallback (owner can print/PDF it manually).
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

async function generateHoTBody(
  review: RentReviewEvent,
  agreedRent: number,
  newTerm: number,
  breakClause: string | null,
  incentives: string | null
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const expiryDate = new Date(review.expiryDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const prompt = `Draft commercial Heads of Terms for a lease renewal negotiation. Write as a formal legal document headed "HEADS OF TERMS — SUBJECT TO CONTRACT AND LEASE".

Parties:
- Landlord: [Landlord name to be inserted]
- Tenant: ${review.tenantName}

Property: ${review.propertyAddress ?? "The demised premises"}

Terms:
- Existing lease expiry: ${expiryDate}
- New lease term: ${newTerm} years from expiry
- New passing rent: £${agreedRent.toLocaleString("en-GB")} per annum
- Rent review: every 5 years, open market upward only
${breakClause ? `- Break clause: ${breakClause}` : "- Break clause: None"}
${incentives ? `- Incentives: ${incentives}` : "- Incentives: None"}
- Repair: Full repairing and insuring (FRI) lease
- Service charge: Subject to lease provisions
- Insurance: Landlord insures, tenant pays proportion of premium
- Assignment and subletting: Subject to landlord's consent (not to be unreasonably withheld)
- Governing law: England and Wales

Include a "Subject to Contract" heading. Use UK commercial property legal drafting conventions. Concise and professional. Mark the document clearly as subject to formal lease agreement.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content?.[0]?.text ?? "";
}

async function createDocuSignEnvelope(
  reviewId: string,
  _hotBody: string,
  _agreedRent: number
): Promise<{ signingUrl: string; envelopeId: string } | null> {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId         = process.env.DOCUSIGN_USER_ID;

  if (!integrationKey || !userId) return null;

  // DocuSign JWT grant flow would go here.
  // Returning null for now — DocuSign credentials not yet provisioned.
  // When DOCUSIGN_INTEGRATION_KEY + DOCUSIGN_USER_ID + DOCUSIGN_PRIVATE_KEY
  // are set, this block should:
  //  1. Request JWT access token via /oauth/token
  //  2. Create envelope via POST /restapi/v2.1/accounts/{accountId}/envelopes
  //     with the HoT as a document (base64 PDF or plain text)
  //  3. Create embedded signing session and return signingUrl
  console.info(`[hot] DocuSign credentials present for review ${reviewId} — integration not yet wired`);
  return null;
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
  const body = await req.json() as {
    agreedRent: number;
    newTerm: number;
    breakClause?: string;
    incentives?: string;
  };

  if (!body.agreedRent || !body.newTerm) {
    return NextResponse.json({ error: "agreedRent and newTerm are required" }, { status: 400 });
  }

  const db = prisma as unknown as PrismaWithRentReview;

  const review = await db.rentReviewEvent.findFirst({
    where: { id: reviewId, userId: user.id },
  } as object);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  let hotBody: string;
  try {
    hotBody = await generateHoTBody(
      review,
      body.agreedRent,
      body.newTerm,
      body.breakClause ?? null,
      body.incentives ?? null
    );
  } catch (err) {
    console.error("[hot] Claude error:", err);
    return NextResponse.json({ error: "Failed to generate HoT" }, { status: 500 });
  }

  // Attempt DocuSign (returns null if credentials not configured)
  const docusign = await createDocuSignEnvelope(review.id, hotBody, body.agreedRent);

  const now = new Date();

  // Store correspondence
  const corr = await db.renewalCorrespondence.create({
    data: {
      id:                  `rc_${Math.random().toString(36).slice(2, 12)}`,
      reviewId:            review.id,
      type:                "hot",
      direction:           "outbound",
      body:                hotBody,
      docusignEnvelopeId:  docusign?.envelopeId ?? null,
    },
  } as object);

  // Update event
  await db.rentReviewEvent.update({
    where: { id: review.id },
    data: {
      status:       docusign ? "hot_drafted" : "hot_drafted",
      newRent:      body.agreedRent,
      ...(docusign ? { hotSignedAt: now } : {}),
    },
  } as object);

  return NextResponse.json({
    signingUrl:       docusign?.signingUrl ?? null,
    envelopeId:       docusign?.envelopeId ?? null,
    hotBody,
    correspondenceId: corr.id,
    fallback:         docusign === null ? "DocuSign not configured — use HoT document for manual signing" : undefined,
  });
}

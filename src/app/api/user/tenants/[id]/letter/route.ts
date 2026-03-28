/**
 * POST /api/user/tenants/:leaseId/letter
 * Generates and optionally sends a tenant engagement letter via Claude Sonnet.
 *
 * Letter types:
 *   "rent_review"     — formal rent review trigger letter (Section 25 / open market)
 *   "renewal"         — renewal discussion opener
 *   "re_gear"         — lease re-gear proposal
 *   "break_notice"    — notice to exercise break clause
 *
 * Flow:
 *   1. Verify user owns the lease via asset ownership
 *   2. Generate letter body via Claude Sonnet 4.6
 *   3. Store as TenantLetter record (status: "draft")
 *   4. If send: true, email to tenantEmail (stored on Tenant record or body override)
 *      and update status to "sent"
 *
 * Returns: { letter: { id, body, status, type } }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["rent_review", "renewal", "re_gear", "break_notice"] as const;
type LetterType = typeof VALID_TYPES[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Letter generation not available" }, { status: 501 });
  }

  const { leaseId } = await params;

  // Fetch lease + tenant + asset context (pre-migration: uses cast)
  const lease = await (prisma as unknown as {
    lease: {
      findFirst: (q: object) => Promise<{
        id: string;
        passingRentPa: number | null;
        expiryDate: Date | null;
        breakDate: Date | null;
        rentReviewDate: Date | null;
        tenant: {
          id: string;
          name: string;
          email: string | null;
          userId: string;
          asset: { id: string; name: string; address: string; country: string | null } | null;
        };
      } | null>;
    }
  }).lease.findFirst({
    where: { id: leaseId },
    select: {
      id:             true,
      passingRentPa:  true,
      expiryDate:     true,
      breakDate:      true,
      rentReviewDate: true,
      tenant: {
        select: {
          id:     true,
          name:   true,
          email:  true,
          userId: true,
          asset: {
            select: { id: true, name: true, address: true, country: true },
          },
        },
      },
    },
  }).catch(() => null);

  if (!lease) {
    return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  }

  if (lease.tenant.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    type?: string;
    send?: boolean;
    tenantEmail?: string;
    marketRentPa?: number;
    specialInstructions?: string;
  };

  const letterType: LetterType = VALID_TYPES.includes(body.type as LetterType)
    ? (body.type as LetterType)
    : "renewal";

  const isUK = (lease.tenant.asset?.country ?? "").toUpperCase() !== "US";
  const currency = isUK ? "£" : "$";
  const register = isUK ? "UK English, formal solicitor register" : "US English, formal legal register";

  const rentLine = lease.passingRentPa
    ? `Current passing rent: ${currency}${lease.passingRentPa.toLocaleString()} per annum`
    : "";

  const marketRentLine = body.marketRentPa
    ? `Market rent estimate: ${currency}${body.marketRentPa.toLocaleString()} per annum`
    : "";

  const expiryLine = lease.expiryDate
    ? `Lease expiry: ${lease.expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    : "";

  const rentReviewLine = lease.rentReviewDate
    ? `Next rent review date: ${lease.rentReviewDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    : "";

  const purposeMap: Record<LetterType, string> = {
    rent_review:   "a formal rent review trigger letter initiating the open-market rent review process",
    renewal:       "a lease renewal discussion opener inviting the tenant to begin renewal negotiations",
    re_gear:       "a lease re-gear proposal offering improved terms in exchange for a lease extension",
    break_notice:  "a formal break notice exercising the landlord's contractual break option",
  };

  const prompt = `Draft ${purposeMap[letterType]} from landlord to tenant.

PROPERTY: ${lease.tenant.asset?.name ?? "the property"}, ${lease.tenant.asset?.address ?? "address on file"}
TENANT: ${lease.tenant.name}
${rentLine}
${marketRentLine}
${expiryLine}
${rentReviewLine}
${body.specialInstructions ? `SPECIAL INSTRUCTIONS: ${body.specialInstructions}` : ""}

Write in ${register}. The landlord is an owner-operator managing a commercial property portfolio directly (no agents involved).
State clearly: the purpose of the letter, the relevant lease dates, and the next step required from the tenant.
Close with a signature block with placeholders [LANDLORD NAME], [DATE].
Keep under 400 words. Formal paragraphs only — no headers or bullet points.`;

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
    return NextResponse.json({ error: "Letter generation failed" }, { status: 500 });
  }

  const aiData = await aiRes.json() as { content?: Array<{ type: string; text?: string }> };
  const letterBody = aiData?.content?.[0]?.text ?? "";

  if (!letterBody) {
    return NextResponse.json({ error: "Letter generation returned empty response" }, { status: 500 });
  }

  // Store the letter (pre-migration: TenantLetter model may not exist — return generated body)
  const sendEmail = body.send === true;
  const recipientEmail = body.tenantEmail ?? lease.tenant.email;

  const letter = await (prisma as unknown as {
    tenantLetter: {
      create: (q: object) => Promise<{
        id: string; type: string; body: string; status: string; createdAt: Date;
      }>;
    }
  }).tenantLetter.create({
    data: {
      leaseId:    lease.id,
      tenantId:   lease.tenant.id,
      userId:     session.user.id,
      assetId:    lease.tenant.asset?.id ?? null,
      type:       letterType,
      body:       letterBody,
      status:     "draft",
    },
  }).catch(() => ({
    id:        "unsaved",
    type:      letterType,
    body:      letterBody,
    status:    "draft",
    createdAt: new Date(),
  }));

  // Send if requested
  if (sendEmail && recipientEmail) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL ?? ""}/api/internal/send-plain-email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to:      recipientEmail,
          subject: `${lease.tenant.asset?.name ?? "Property"} — ${letterType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
          text:    letterBody,
        }),
      }).catch(() => null);

      if (letter.id !== "unsaved") {
        await (prisma as unknown as {
          tenantLetter: { update: (q: object) => Promise<unknown> }
        }).tenantLetter.update({
          where: { id: letter.id },
          data: { status: "sent", sentAt: new Date(), sentToEmail: recipientEmail },
        }).catch(() => null);
      }
    } catch {
      // Email failure is non-fatal — return the letter body regardless
    }
  }

  return NextResponse.json({
    letter: {
      id:        letter.id,
      type:      letter.type,
      body:      letter.body,
      status:    sendEmail && recipientEmail ? "sent" : "draft",
      createdAt: letter.createdAt.toISOString(),
    },
  });
}

/**
 * POST /api/user/lettings/:lettingId/hot
 * Generates a new-letting Heads of Terms via Claude and creates a Commission record.
 *
 * Body: { enquiryId, agreedRent, agreedTermYears, breakClause?, rentFreeMonths? }
 * Response: { hot: { id, body, lettingId, agreedRent }, commission: { amount, currency, category } }
 *
 * Commission: 10% of first year's contracted rent, category = "lettings"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LettingRow {
  id: string; userId: string; assetId: string; status: string;
  askingRent: number; useClass: string | null;
  asset: { id: string; name: string; location: string; country: string; assetType: string } | null;
}

interface EnquiryRow {
  id: string; lettingId: string; companyName: string;
  covenantGrade: string | null;
}

type PrismaWithLettings = {
  letting: {
    findFirst: (q: object) => Promise<LettingRow | null>;
    update:    (q: object) => Promise<LettingRow>;
  };
  enquiry: {
    findUnique: (q: object) => Promise<EnquiryRow | null>;
  };
};

const COMMISSION_RATE = 0.10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lettingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not available" }, { status: 501 });
  }

  const { lettingId } = await params;
  const db = prisma as unknown as PrismaWithLettings;

  const letting = await db.letting.findFirst({
    where: { id: lettingId, userId: session.user.id },
    include: { asset: { select: { id: true, name: true, location: true, country: true, assetType: true } } },
  } as object).catch(() => null);

  if (!letting) {
    return NextResponse.json({ error: "Letting not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    enquiryId?: string;
    agreedRent?: number;
    agreedTermYears?: number;
    breakClause?: string;
    rentFreeMonths?: number;
  };

  if (!body.enquiryId || !body.agreedRent || !body.agreedTermYears) {
    return NextResponse.json(
      { error: "enquiryId, agreedRent, and agreedTermYears are required" },
      { status: 422 }
    );
  }

  const enquiry = await db.enquiry.findUnique({
    where: { id: body.enquiryId },
  } as object).catch(() => null);

  if (!enquiry || enquiry.lettingId !== lettingId) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  const isUK           = (letting.asset?.country ?? "UK").toUpperCase() !== "US";
  const sym            = isUK ? "£" : "$";
  const currency       = isUK ? "GBP" : "USD";
  const agreedRent     = Number(body.agreedRent);
  const agreedTermYrs  = Number(body.agreedTermYears);
  const commission     = Math.round(agreedRent * COMMISSION_RATE);

  const prompt = `You are a commercial property lawyer drafting Heads of Terms for a new commercial lease.

Asset: ${letting.asset?.name ?? "Commercial property"}, ${letting.asset?.assetType ?? "commercial"}, ${letting.asset?.location ?? "UK"}
Tenant: ${enquiry.companyName}${enquiry.covenantGrade ? ` (Covenant grade: ${enquiry.covenantGrade})` : ""}
Agreed rent: ${sym}${agreedRent.toLocaleString()}/yr
Lease term: ${agreedTermYrs} years
Break clause: ${body.breakClause ?? "None"}
Rent-free period: ${body.rentFreeMonths ? `${body.rentFreeMonths} months` : "None"}
Use class: ${letting.useClass ?? "To be confirmed"}

Draft a complete Heads of Terms in standard ${isUK ? "UK" : "US"} commercial property format with these clauses:
1. Parties (Landlord / Tenant / Guarantor if applicable)
2. Premises (address, use class)
3. Term and commencement
4. Rent and review schedule
5. Rent-free period (if applicable)
6. Permitted use and subletting
7. Service charge and outgoings
8. Break options
9. Security of tenure${isUK ? " (LTA 1954 — contracted out or not)" : ""}
10. Conditions (Board / planning consent if required)
11. Costs (each party bears own costs unless otherwise agreed)
12. Subject to contract

Format as a numbered list. Flag any unusual terms in [REVIEW] tags. Keep concise and professional.`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!claudeRes?.ok) {
    return NextResponse.json({ error: "HoT generation failed" }, { status: 500 });
  }

  const claudeData = await claudeRes.json() as { content?: Array<{ type: string; text?: string }> };
  const hotBody = claudeData?.content?.[0]?.text?.trim() ?? "";
  if (!hotBody) {
    return NextResponse.json({ error: "HoT generation returned empty response" }, { status: 500 });
  }

  // Create Commission record
  const commissionRecord = await prisma.commission.create({
    data: {
      userId:          session.user.id,
      assetId:         letting.assetId ?? null,
      category:        "lettings",
      sourceId:        lettingId,
      annualSaving:    0,
      commissionRate:  COMMISSION_RATE,
      commissionValue: commission,
      status:          "confirmed",
      placedAt:        new Date(),
    },
    select: { id: true, commissionValue: true, commissionRate: true },
  });

  // Mark letting as let
  await db.letting.update({
    where: { id: lettingId },
    data:  { status: "let", agreedRent, agreedTermYears: agreedTermYrs },
  } as object).catch(() => null);

  return NextResponse.json({
    hot: {
      id:             `hot_${lettingId}_${Date.now()}`,
      body:           hotBody,
      lettingId,
      agreedRent,
      agreedTermYears: agreedTermYrs,
      tenantName:     enquiry.companyName,
      assetName:      letting.asset?.name ?? null,
    },
    commission: {
      id:        commissionRecord.id,
      amount:    commission,
      currency,
      category:  "lettings" as const,
      formatted: `${sym}${commission.toLocaleString()}`,
    },
  }, { status: 201 });
}

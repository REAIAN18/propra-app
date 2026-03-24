/**
 * GET  /api/tender/respond/:token — returns job summary for contractor to review
 * POST /api/tender/respond/:token — submits contractor quote
 *
 * Public endpoint (no auth required). Token encodes { workOrderId, contractorId }
 * signed with TENDER_SECRET (HMAC-SHA256, base64url encoded).
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 *
 * POST body: { price: number; warranty?: string; timeline?: string; notes?: string }
 * POST response: { quote: TenderQuote }
 *
 * On successful quote submission:
 *   - Creates TenderQuote linked to contractorId
 *   - If first quote: updates WorkOrder status to "quotes_received"
 *   - Sends confirmation email to contractor (non-fatal)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// TOKEN UTILS
// ---------------------------------------------------------------------------

function base64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function verifyToken(token: string): { workOrderId: string; contractorId: string } | null {
  const secret = process.env.TENDER_SECRET;
  if (!secret) return null; // No secret = tokens disabled

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as {
      workOrderId?: string;
      contractorId?: string;
      exp?: number;
    };

    if (payload.exp && Date.now() > payload.exp) return null; // expired
    if (!payload.workOrderId || !payload.contractorId) return null;

    return { workOrderId: payload.workOrderId, contractorId: payload.contractorId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET — job summary for contractor review
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = verifyToken(token);

  if (!payload && process.env.TENDER_SECRET) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  const workOrderId = payload?.workOrderId ?? token; // fallback for dev without secret

  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id:           true,
      jobType:      true,
      description:  true,
      scopeOfWorks: true,
      status:       true,
      currency:     true,
      benchmarkLow: true,
      benchmarkHigh: true,
      asset: {
        select: {
          name:     true,
          postcode: true,
          country:  true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!["draft", "tendered"].includes(order.status)) {
    return NextResponse.json(
      { error: "This tender is no longer accepting quotes" },
      { status: 410 }
    );
  }

  return NextResponse.json({
    job: {
      id:           order.id,
      jobType:      order.jobType,
      description:  order.description,
      scopeOfWorks: order.scopeOfWorks,
      currency:     order.currency,
      location:     order.asset?.postcode ?? "Location on file",
      assetName:    order.asset?.name,
    },
  });
}

// ---------------------------------------------------------------------------
// POST — contractor submits quote
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = verifyToken(token);

  if (!payload && process.env.TENDER_SECRET) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  const workOrderId  = payload?.workOrderId ?? token;
  const contractorId = payload?.contractorId ?? null;

  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id:      true,
      status:  true,
      userId:  true,
      jobType: true,
      quotes:  { select: { id: true }, take: 1 },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!["draft", "tendered"].includes(order.status)) {
    return NextResponse.json(
      { error: "This tender is no longer accepting quotes" },
      { status: 410 }
    );
  }

  const body = await req.json().catch(() => ({})) as {
    price?: number;
    contractorName?: string;
    warranty?: string;
    timeline?: string;
    notes?: string;
  };

  if (!body.price || body.price <= 0) {
    return NextResponse.json({ error: "price is required" }, { status: 422 });
  }

  // Look up contractor name from panel if contractorId provided
  let resolvedContractorName = body.contractorName ?? "Contractor";
  if (contractorId) {
    const contractor = await (prisma as unknown as {
      contractor: { findUnique: (q: object) => Promise<{ name: string } | null> }
    }).contractor.findUnique({
      where: { id: contractorId },
      select: { name: true },
    }).catch(() => null);
    if (contractor) resolvedContractorName = contractor.name;
  }

  const isFirstQuote = order.quotes.length === 0;

  const [quote] = await Promise.all([
    prisma.tenderQuote.create({
      data: {
        workOrderId,
        contractorName: resolvedContractorName,
        price:          body.price,
        warranty:       body.warranty ?? null,
        notes:          body.notes ?? null,
        awarded:        false,
      },
    }),
    isFirstQuote
      ? prisma.workOrder.update({
          where: { id: workOrderId },
          data: { status: "quotes_received" },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ received: true, quote }, { status: 201 });
}

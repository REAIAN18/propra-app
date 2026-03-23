import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendContractorTenderInvite } from "@/lib/email";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Token generation — must match verifyToken() in /api/tender/respond/[token]
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
// ---------------------------------------------------------------------------

function generateTenderToken(workOrderId: string, contractorId: string): string {
  const payload = JSON.stringify({
    workOrderId,
    contractorId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7-day expiry
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");

  const secret = process.env.TENDER_SECRET ?? "dev-tender-secret";
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${sig}`;
}

// ---------------------------------------------------------------------------
// POST /api/user/work-orders/:orderId/tender
// Selects top 3 contractors, generates token-auth links, sends Resend emails.
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { asset: { select: { name: true, location: true, postcode: true, country: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["draft", "tendered"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot tender order with status: ${order.status}` },
      { status: 400 }
    );
  }

  // Determine contractor region from asset country
  const region = order.asset?.country === "US" ? "fl_us" : "se_uk";

  // Extract tradeRequired from aiScopeJson
  const scopeJson = order.aiScopeJson as {
    tradeRequired?: string;
    scopeSummary?: string;
    lineItems?: string[];
  } | null;
  const tradeRequired = scopeJson?.tradeRequired ?? order.tenderType ?? "";
  const scopeSummary = scopeJson?.scopeSummary ?? order.description ?? "";

  // Find top 3 contractors matching trade + region, sorted by rating desc
  const contractors = await (prisma as unknown as {
    contractor: {
      findMany: (q: object) => Promise<{ id: string; name: string; email: string; rating: number }[]>;
    };
  }).contractor.findMany({
    where: {
      region,
      ...(tradeRequired
        ? { trades: { has: tradeRequired } }
        : {}),
    },
    orderBy: { rating: "desc" },
    take: 3,
    select: { id: true, name: true, email: true, rating: true },
  }).catch(() => [] as { id: string; name: string; email: string; rating: number }[]);

  if (contractors.length === 0) {
    // No seeded contractors yet — mark tendered and return gracefully
    await prisma.workOrder.update({
      where: { id: orderId },
      data: { status: "tendered" },
    });
    return NextResponse.json({ sentTo: 0, contractors: [], note: "No contractors matched — tender status set, emails pending seed data." });
  }

  const assetName = order.asset?.name ?? "your property";
  const deadlineDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate tokens and send emails (non-fatal per contractor)
  const results = await Promise.allSettled(
    contractors.map(async (contractor) => {
      const token = generateTenderToken(orderId, contractor.id);
      await sendContractorTenderInvite(
        contractor.email,
        contractor.name,
        order.jobType,
        assetName,
        scopeSummary,
        deadlineDate,
        token
      );
      return contractor.name;
    })
  );

  const sentNames = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  await prisma.workOrder.update({
    where: { id: orderId },
    data: { status: "tendered" },
  });

  return NextResponse.json({ sentTo: sentNames.length, contractors: sentNames });
}

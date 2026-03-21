import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEnergyQuotes } from "@/lib/energy-quotes";
import { enqueueEnergyQuote, processEnergyQuoteJob } from "@/lib/jobs/energy-quote";

/**
 * GET /api/energy/quotes?propertyId=xxx
 *
 * Returns persisted energy quotes for a property. If no quotes exist yet
 * (or all have expired), triggers a fresh fetch synchronously and returns them.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const propertyId = req.nextUrl.searchParams.get("propertyId");
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }

  // Verify asset belongs to user
  const asset = await prisma.userAsset.findFirst({
    where: { id: propertyId, userId: session.user.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Return any non-expired quotes from DB
  const existing = await prisma.energyQuote.findMany({
    where: {
      assetId: propertyId,
      userId: session.user.id,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { annualSaving: "desc" },
  });

  if (existing.length > 0) {
    return NextResponse.json({ quotes: existing, fresh: false });
  }

  // No valid quotes — generate on-demand from asset data
  const loc = (asset.location ?? "").toLowerCase();
  const market: "seuk" | "fl" =
    loc.includes("fl") || loc.includes("florida") || loc.includes("tampa") ||
    loc.includes("miami") || loc.includes("orlando")
      ? "fl" : "seuk";

  const postcodeMatch = asset.location?.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
  const postcode = postcodeMatch?.[1];

  // Read energy cost from asset
  const annualKwh = 50_000; // default; overridden from extract if available
  const currentAnnualCost = asset.energyCost ?? 0;

  if (!currentAnnualCost) {
    return NextResponse.json({
      quotes: [],
      message: "Upload an energy bill to see live switching savings",
    });
  }

  const freshQuotes = await getEnergyQuotes({ annualKwh, currentAnnualCost, market, postcode });

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const created = await Promise.all(
    freshQuotes.map((q) =>
      prisma.energyQuote.create({
        data: {
          userId: session.user!.id!,
          assetId: propertyId,
          supplier: q.supplier,
          currentSupplier: null,
          currentRate: null,
          quotedRate: q.unitRatePence,
          annualUsage: annualKwh,
          currentCost: currentAnnualCost,
          quotedCost: q.annualCostGbp,
          annualSaving: q.annualSaving,
          dataSource: q.dataSource,
          status: "pending",
          expiresAt,
        },
      })
    )
  );

  return NextResponse.json({ quotes: created, fresh: true });
}

/**
 * POST /api/energy/quotes
 *
 * Trigger a fresh energy quote fetch for a property (e.g. after bill upload).
 * Enqueues via BullMQ if Redis is available, else processes synchronously.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    propertyId?: string;
    documentId?: string;
  };

  const { propertyId, documentId } = body;
  if (!propertyId && !documentId) {
    return NextResponse.json({ error: "propertyId or documentId required" }, { status: 400 });
  }

  const jobData = {
    documentId: documentId ?? "",
    userId: session.user.id,
    assetId: propertyId ?? null,
  };

  const enqueued = documentId ? await enqueueEnergyQuote(jobData) : false;

  if (enqueued) {
    return NextResponse.json({ queued: true });
  }

  // Sync fallback
  if (documentId) {
    await processEnergyQuoteJob(jobData);
  }

  return NextResponse.json({ queued: false, processed: true });
}

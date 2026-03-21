/**
 * BullMQ job: energy-quote
 *
 * Triggered after document-ingest extracts an energy bill.
 * Fetches live supplier quotes and persists them to EnergyQuote.
 */

import { prisma } from "@/lib/prisma";
import { getEnergyQuotes } from "@/lib/energy-quotes";

export interface EnergyQuoteJobData {
  documentId: string;
  userId: string;
  assetId?: string | null;
}

/**
 * Process an energy-quote job synchronously.
 * Called by both the BullMQ worker and the inline fallback path.
 */
export async function processEnergyQuoteJob(data: EnergyQuoteJobData): Promise<void> {
  const { documentId, userId, assetId } = data;

  // Load the document extract to get energy bill data
  const extract = await prisma.documentExtract.findFirst({
    where: { documentId, type: "energy" },
  });

  if (!extract?.structuredJson) {
    console.warn(`[energy-quote] no energy extract for document ${documentId}`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = extract.structuredJson as Record<string, any>;
  const annualKwh: number = json.annualUsageKwh ?? json.annualUsage ?? 50_000;
  const currentAnnualCost: number = json.annualCostGbp ?? json.annualCost ?? json.currentCost ?? 0;
  const currentSupplier: string | null = json.supplier ?? json.currentSupplier ?? null;
  const currentRate: number | null = json.unitRatePence ?? json.unitRate ?? null;

  if (!currentAnnualCost) {
    console.warn(`[energy-quote] no currentAnnualCost in extract for document ${documentId}`);
    return;
  }

  // Determine market from asset location or default to seuk
  let market: "seuk" | "fl" = "seuk";
  let postcode: string | undefined;

  if (assetId) {
    const asset = await prisma.userAsset.findUnique({ where: { id: assetId } });
    if (asset) {
      const loc = (asset.location ?? "").toLowerCase();
      if (loc.includes("fl") || loc.includes("florida") || loc.includes("tampa") ||
          loc.includes("miami") || loc.includes("orlando")) {
        market = "fl";
      } else {
        // Extract postcode from address
        const postcodeMatch = asset.location?.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
        postcode = postcodeMatch?.[1];
      }
    }
  }

  const quotes = await getEnergyQuotes({ annualKwh, currentAnnualCost, market, postcode });

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  // Delete stale quotes for this asset/user before inserting fresh ones
  if (assetId) {
    await prisma.energyQuote.deleteMany({
      where: { assetId, userId, status: "pending" },
    });
  }

  await Promise.all(
    quotes.map((q) =>
      prisma.energyQuote.create({
        data: {
          userId,
          assetId: assetId ?? null,
          supplier: q.supplier,
          currentSupplier: currentSupplier,
          currentRate: currentRate,
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

  console.log(`[energy-quote] stored ${quotes.length} quotes for document ${documentId}`);
}

/**
 * Enqueue an energy-quote job via BullMQ.
 * Returns true if enqueued, false if REDIS_URL is not configured
 * (caller should fall back to processEnergyQuoteJob directly).
 */
export async function enqueueEnergyQuote(data: EnergyQuoteJobData): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue<EnergyQuoteJobData>("energy-quote", {
      connection: { url: redisUrl },
    });
    await queue.add("quote", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
    });
    await queue.close();
    return true;
  } catch (err) {
    console.error("[energy-quote] enqueue failed:", err);
    return false;
  }
}

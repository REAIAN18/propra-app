/**
 * BullMQ job for property onboarding enrichment.
 *
 * When REDIS_URL is set, the job is enqueued and a worker process
 * (src/workers/property-onboard.ts) must be running to process it.
 *
 * When REDIS_URL is not set, callers should call enrichAsset() synchronously.
 */

export interface PropertyOnboardJobData {
  assetId: string;
  address: string;
  country?: string;
}

/**
 * Enqueue a property for background enrichment via BullMQ.
 * Returns true if enqueued, false if REDIS_URL is not configured
 * (caller should fall back to synchronous enrichAsset() call).
 */
export async function enqueuePropertyOnboard(
  assetId: string,
  address: string,
  country?: string | null
): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue<PropertyOnboardJobData>("property-onboard", {
      connection: { url: redisUrl },
    });
    await queue.add(
      "onboard",
      { assetId, address, country: country ?? undefined },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );
    await queue.close();
    return true;
  } catch (err) {
    console.error("[property-onboard] enqueue failed:", err);
    return false;
  }
}

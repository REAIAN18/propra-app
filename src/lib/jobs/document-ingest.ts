/**
 * BullMQ job definitions for the document ingestion pipeline.
 *
 * When REDIS_URL is set, jobs are enqueued and a separate worker process
 * (src/workers/document-ingest.ts) must be running to process them.
 *
 * When REDIS_URL is not set, callers should process documents synchronously.
 */

export interface DocumentIngestJobData {
  documentId: string;
  type: string;
}

/**
 * Enqueue a document for async ingestion via BullMQ.
 * Returns true if enqueued, false if REDIS_URL is not configured
 * (caller should fall back to synchronous processing).
 */
export async function enqueueDocumentIngest(
  documentId: string,
  type: string
): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue<DocumentIngestJobData>("document-ingest", {
      connection: { url: redisUrl },
    });
    await queue.add(
      "ingest",
      { documentId, type },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );
    await queue.close();
    return true;
  } catch (err) {
    console.error("[document-ingest] enqueue failed:", err);
    return false;
  }
}

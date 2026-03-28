/**
 * POST /api/cron/payment-trend-update
 * Daily batch update of payment trends for all active tenants.
 *
 * Triggered by Vercel Cron: daily at 2:00 AM UTC
 * Requires CRON_SECRET header for authentication.
 *
 * Phase 3: Automated payment trend analysis.
 */

import { NextResponse } from "next/server";
import { batchUpdatePaymentTrends } from "@/lib/payment-trend-analysis";

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/payment-trend-update] Starting batch update");
    const updatedCount = await batchUpdatePaymentTrends();

    return NextResponse.json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/payment-trend-update] Error:", error);
    return NextResponse.json(
      { error: "Batch update failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

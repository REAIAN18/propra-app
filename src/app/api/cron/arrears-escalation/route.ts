/**
 * POST /api/cron/arrears-escalation
 * Daily automated arrears escalation check.
 *
 * Triggered by Vercel Cron: daily at 9:00 AM UTC
 * Requires CRON_SECRET header for authentication.
 *
 * Phase 3: Automated arrears escalation workflow.
 */

import { NextResponse } from "next/server";
import { checkArrearsEscalation } from "@/lib/arrears-escalation";

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/arrears-escalation] Starting escalation check");
    const results = await checkArrearsEscalation();

    const escalatedCount = results.length;
    const sentCount = results.filter((r) => r.sent).length;

    return NextResponse.json({
      success: true,
      escalatedCount,
      sentCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/arrears-escalation] Error:", error);
    return NextResponse.json(
      { error: "Escalation check failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

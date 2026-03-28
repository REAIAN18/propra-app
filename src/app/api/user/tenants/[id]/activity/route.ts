/**
 * GET /api/user/tenants/[tenantId]/activity
 * Returns aggregated activity timeline for a tenant.
 *
 * Phase 3: Activity aggregation across all systems (emails, payments, work orders, etc.)
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchTenantActivityTimeline, fetchTenantActivitySummary } from "@/lib/activity-aggregation";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tenantId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const startDateParam = searchParams.get("startDate");
  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const includeSummary = searchParams.get("includeSummary") === "true";

  try {
    const [timeline, summary] = await Promise.all([
      fetchTenantActivityTimeline(tenantId, limit, startDate),
      includeSummary ? fetchTenantActivitySummary(tenantId) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      activities: timeline,
      summary,
      count: timeline.length,
    });
  } catch (error) {
    console.error("[api/tenants/activity] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity timeline" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/tenants/[tenantId]/payment-trend
 * Analyzes payment history and returns trend data.
 *
 * POST /api/user/tenants/[tenantId]/payment-trend
 * Updates the Tenant record with latest payment trend.
 *
 * Phase 3: Payment trend analysis for arrears management.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzePaymentTrend, updateTenantPaymentTrend } from "@/lib/payment-trend-analysis";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tenantId } = await params;

  try {
    // Verify tenant belongs to user
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userId: true },
    });

    if (!tenant || tenant.userId !== session.user.id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const trendData = await analyzePaymentTrend(tenantId);

    return NextResponse.json({
      tenantId,
      ...trendData,
    });
  } catch (error) {
    console.error("[api/tenants/payment-trend] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze payment trend" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tenantId } = await params;

  try {
    // Verify tenant belongs to user
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userId: true },
    });

    if (!tenant || tenant.userId !== session.user.id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const trendData = await analyzePaymentTrend(tenantId);
    await updateTenantPaymentTrend(tenantId, trendData);

    return NextResponse.json({
      success: true,
      tenantId,
      ...trendData,
    });
  } catch (error) {
    console.error("[api/tenants/payment-trend] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment trend" },
      { status: 500 }
    );
  }
}

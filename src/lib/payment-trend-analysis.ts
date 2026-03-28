/**
 * src/lib/payment-trend-analysis.ts
 * Analyzes tenant payment history to identify trends and calculate arrears.
 *
 * Updates Tenant model fields:
 * - arrearsBalance: current outstanding amount
 * - lastPaymentDate: most recent successful payment
 * - paymentTrend: "improving" | "stable" | "deteriorating"
 *
 * Called by:
 * - Cron job (daily payment status check)
 * - POST /api/user/tenants/[id]/record-payment (manual payment entry)
 * - Tenant detail page load (on-demand refresh)
 */

import { prisma } from "./prisma";
import type { TenantPayment } from "../generated/prisma";

export interface PaymentTrendResult {
  arrearsBalance: number;
  lastPaymentDate: Date | null;
  paymentTrend: "improving" | "stable" | "deteriorating" | null;
  recentPayments: {
    onTime: number;
    late: number;
    missed: number;
  };
}

/**
 * Analyzes payment history for a tenant and returns trend data.
 * Looks at the last 6 months of payments to determine trend.
 *
 * @param tenantId - Tenant ID to analyze
 * @param prisma - Optional Prisma client instance
 */
export async function analyzePaymentTrend(
  tenantId: string,
  useSharedPrisma?: boolean
): Promise<PaymentTrendResult> {
  const db = prisma;

  try {
    // Fetch last 12 months of payments
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const payments = await db.tenantPayment.findMany({
      where: {
        tenantId,
        dueDate: { gte: twelveMonthsAgo },
      },
      orderBy: { dueDate: "desc" },
    });

    if (payments.length === 0) {
      return {
        arrearsBalance: 0,
        lastPaymentDate: null,
        paymentTrend: null,
        recentPayments: { onTime: 0, late: 0, missed: 0 },
      };
    }

    // Calculate arrears balance (sum of unpaid/late payments)
    const arrearsBalance = payments
      .filter((p) => p.status === "pending" || p.status === "late" || p.status === "missed")
      .reduce((sum, p) => sum + p.amount, 0);

    // Find most recent successful payment
    const lastPaidPayment = payments.find((p) => p.status === "paid");
    const lastPaymentDate = lastPaidPayment?.paidDate ?? null;

    // Analyze recent 6 months for trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentPayments = payments.filter((p) => p.dueDate >= sixMonthsAgo);
    const recentStats = {
      onTime: recentPayments.filter((p) => p.status === "paid" && isOnTime(p)).length,
      late: recentPayments.filter((p) => p.status === "late" || (p.status === "paid" && !isOnTime(p))).length,
      missed: recentPayments.filter((p) => p.status === "missed").length,
    };

    // Determine trend: compare last 3 months vs previous 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const last3Months = recentPayments.filter((p) => p.dueDate >= threeMonthsAgo);
    const prev3Months = recentPayments.filter(
      (p) => p.dueDate < threeMonthsAgo && p.dueDate >= sixMonthsAgo
    );

    const last3Score = calculatePaymentScore(last3Months);
    const prev3Score = calculatePaymentScore(prev3Months);

    let paymentTrend: "improving" | "stable" | "deteriorating" | null = null;

    if (last3Months.length >= 2 && prev3Months.length >= 2) {
      const scoreDiff = last3Score - prev3Score;
      if (scoreDiff > 10) {
        paymentTrend = "improving";
      } else if (scoreDiff < -10) {
        paymentTrend = "deteriorating";
      } else {
        paymentTrend = "stable";
      }
    }

    return {
      arrearsBalance,
      lastPaymentDate,
      paymentTrend,
      recentPayments: recentStats,
    };
  } catch (error) {
    console.error("[payment-trend] Error analyzing:", error);
    throw error;
  }
}

/**
 * Checks if a payment was made on time.
 * On time = paid within 5 days of due date.
 */
function isOnTime(payment: TenantPayment): boolean {
  if (!payment.paidDate) return false;

  const daysDiff = Math.floor(
    (payment.paidDate.getTime() - payment.dueDate.getTime()) / (24 * 3600 * 1000)
  );

  return daysDiff <= 5;
}

/**
 * Calculates a payment reliability score (0-100) for a set of payments.
 * 100 = all paid on time
 * 50 = all late but paid
 * 0 = all missed
 */
function calculatePaymentScore(payments: TenantPayment[]): number {
  if (payments.length === 0) return 50; // neutral

  const scores = payments.map((p) => {
    if (p.status === "missed") return 0;
    if (p.status === "late") return 40;
    if (p.status === "paid" && !isOnTime(p)) return 60;
    if (p.status === "paid" && isOnTime(p)) return 100;
    return 50; // pending
  });

  const sum = scores.reduce((acc: number, s: number) => acc + s, 0);
  return sum / scores.length;
}

/**
 * Updates the Tenant record with latest payment trend data.
 * Should be called after analyzing payment trend.
 */
export async function updateTenantPaymentTrend(
  tenantId: string,
  trendData: PaymentTrendResult
): Promise<void> {
  const db = prisma;

  try {
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        arrearsBalance: trendData.arrearsBalance,
        lastPaymentDate: trendData.lastPaymentDate,
        paymentTrend: trendData.paymentTrend,
      },
    });

    console.log(`[payment-trend] Updated tenant ${tenantId}: arrears=${trendData.arrearsBalance}, trend=${trendData.paymentTrend}`);
  } catch (error) {
    console.error(`[payment-trend] Failed to update tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Batch update payment trends for all active tenants.
 * Called by cron job: /api/cron/payment-trend-update
 */
export async function batchUpdatePaymentTrends(userId?: string): Promise<number> {
  let updatedCount = 0;

  try {
    // Get all active tenants (with at least one active lease)
    const tenants = await prisma.tenant.findMany({
      where: userId ? { userId } : {},
      include: {
        leases: {
          where: { status: "active" },
          take: 1,
        },
      },
    });

    const activeTenants = tenants.filter((t) => t.leases.length > 0);

    console.log(`[payment-trend] Batch updating ${activeTenants.length} active tenants`);

    for (const tenant of activeTenants) {
      try {
        const trendData = await analyzePaymentTrend(tenant.id);
        await updateTenantPaymentTrend(tenant.id, trendData);
        updatedCount++;
      } catch (error) {
        console.error(`[payment-trend] Failed to process tenant ${tenant.id}:`, error);
      }
    }

    console.log(`[payment-trend] Batch update complete: ${updatedCount}/${activeTenants.length} tenants updated`);
    return updatedCount;
  } catch (error) {
    console.error("[payment-trend] Batch error:", error);
    throw error;
  }
}

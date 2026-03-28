/**
 * src/lib/activity-aggregation.ts
 * Unified activity timeline aggregation across all systems.
 *
 * Aggregates activities from:
 * - Resend (emails sent/received)
 * - TenantPayment (payments made/missed)
 * - WorkOrder (work orders created/completed)
 * - TenantEngagement (surveys, calls, letters)
 * - RentReviewEvent (rent reviews)
 * - TenantLetter (correspondence)
 *
 * Returns chronological timeline for tenant detail pages.
 */

import { prisma } from "./prisma";

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: "payment" | "email" | "work_order" | "engagement" | "rent_review" | "letter" | "document";
  category: "financial" | "communication" | "maintenance" | "legal" | "admin";
  title: string;
  description?: string;
  status?: "success" | "pending" | "failed" | "overdue";
  metadata?: Record<string, any>;
  source: string; // Table name for drill-down
}

/**
 * Fetches aggregated activity timeline for a tenant.
 * Combines data from multiple tables and sorts chronologically.
 *
 * @param tenantId - Tenant ID
 * @param limit - Maximum number of activities to return (default: 50)
 * @param startDate - Optional start date filter
 */
export async function fetchTenantActivityTimeline(
  tenantId: string,
  limit: number = 50,
  startDate?: Date
): Promise<ActivityEvent[]> {
  const activities: ActivityEvent[] = [];

  try {
    const dateFilter = startDate ? { gte: startDate } : undefined;

    // Fetch payments
    const payments = await prisma.tenantPayment.findMany({
      where: {
        tenantId,
        ...(dateFilter && { dueDate: dateFilter }),
      },
      orderBy: { dueDate: "desc" },
      take: limit,
    });

    activities.push(
      ...payments.map((p) => ({
        id: p.id,
        timestamp: p.paidDate ?? p.dueDate,
        type: "payment" as const,
        category: "financial" as const,
        title: `Payment ${p.status === "paid" ? "received" : p.status}`,
        description: `£${p.amount.toFixed(2)} for period ${p.periodStart.toISOString().split("T")[0]}`,
        status: p.status === "paid" ? "success" as const : p.status === "missed" ? "failed" as const : "pending" as const,
        metadata: { amount: p.amount, dueDate: p.dueDate, paidDate: p.paidDate },
        source: "TenantPayment",
      }))
    );

    // Fetch tenant engagement activities
    const engagements = await prisma.tenantEngagement.findMany({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    activities.push(
      ...engagements.map((e) => ({
        id: e.id,
        timestamp: e.emailSentAt ?? e.createdAt,
        type: "engagement" as const,
        category: "communication" as const,
        title: formatEngagementType(e.actionType),
        description: e.status === "sent" ? "Email sent" : "Draft created",
        status: e.status === "sent" ? "success" as const : "pending" as const,
        metadata: { actionType: e.actionType, status: e.status },
        source: "TenantEngagement",
      }))
    );

    // Fetch letters
    const letters = await prisma.tenantLetter.findMany({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    activities.push(
      ...letters.map((l) => ({
        id: l.id,
        timestamp: l.sentAt ?? l.createdAt,
        type: "letter" as const,
        category: l.type.includes("arrears") ? "legal" as const : "communication" as const,
        title: formatLetterType(l.type),
        description: l.status === "sent" ? `Sent to ${l.sentToEmail}` : "Draft",
        status: l.status === "sent" ? "success" as const : "pending" as const,
        metadata: { type: l.type, sentAt: l.sentAt },
        source: "TenantLetter",
      }))
    );

    // Fetch rent reviews
    const rentReviews = await prisma.rentReviewEvent.findMany({
      where: {
        lease: {
          tenantId,
        },
        ...(dateFilter && { reviewDate: dateFilter }),
      },
      orderBy: { reviewDate: "desc" },
      take: limit,
    });

    activities.push(
      ...rentReviews.map((r) => ({
        id: r.id,
        timestamp: r.reviewDate,
        type: "rent_review" as const,
        category: "financial" as const,
        title: "Rent review",
        description: r.reviewOutcome
          ? `${r.reviewType}: ${r.reviewOutcome}`
          : `${r.reviewType} review due`,
        status: r.reviewOutcome ? "success" as const : "pending" as const,
        metadata: { reviewType: r.reviewType, currentRent: r.currentRent, proposedRent: r.proposedRent },
        source: "RentReviewEvent",
      }))
    );

    // Fetch work orders (if tenant-related via assetId)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { assetId: true },
    });

    if (tenant?.assetId) {
      const workOrders = await prisma.workOrder.findMany({
        where: {
          assetId: tenant.assetId,
          ...(dateFilter && { createdAt: dateFilter }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      activities.push(
        ...workOrders.map((w) => ({
          id: w.id,
          timestamp: w.completedAt ?? w.createdAt,
          type: "work_order" as const,
          category: "maintenance" as const,
          title: w.title,
          description: w.description?.substring(0, 100),
          status: w.status === "completed" ? "success" as const : w.status === "overdue" ? "overdue" as const : "pending" as const,
          metadata: { status: w.status, priority: w.priority },
          source: "WorkOrder",
        }))
      );
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return limited number
    return activities.slice(0, limit);
  } catch (error) {
    console.error("[activity-aggregation] Error:", error);
    throw error;
  }
}

/**
 * Fetches aggregated activity timeline for an asset (property).
 * Shows all activities across all tenants for that property.
 */
export async function fetchAssetActivityTimeline(
  assetId: string,
  limit: number = 100,
  startDate?: Date
): Promise<ActivityEvent[]> {
  try {
    // Get all tenant IDs for this asset
    const tenants = await prisma.tenant.findMany({
      where: { assetId },
      select: { id: true },
    });

    const tenantIds = tenants.map((t) => t.id);

    // Fetch aggregated activities for all tenants
    const allActivities = await Promise.all(
      tenantIds.map((tid) => fetchTenantActivityTimeline(tid, limit, startDate))
    );

    // Flatten and sort
    const activities = allActivities.flat();
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error("[activity-aggregation] Asset error:", error);
    throw error;
  }
}

/**
 * Formats engagement action types for display.
 */
function formatEngagementType(actionType: string): string {
  const typeMap: Record<string, string> = {
    engage_renewal: "Renewal discussion",
    serve_review: "Rent review notice",
    send_letter: "Letter sent",
    satisfaction_survey: "Satisfaction survey",
    retention_check: "Retention check-in",
  };
  return typeMap[actionType] ?? actionType;
}

/**
 * Formats letter types for display.
 */
function formatLetterType(type: string): string {
  const typeMap: Record<string, string> = {
    rent_review: "Rent review letter",
    renewal: "Lease renewal offer",
    re_gear: "Lease re-gear proposal",
    break_notice: "Break clause notice",
    arrears_reminder: "Payment reminder",
    arrears_formal_demand: "Formal demand letter",
    arrears_solicitor_instruction: "Solicitor instruction",
  };
  return typeMap[type] ?? type;
}

/**
 * Fetches activity summary stats for a tenant.
 * Used for tenant detail page header metrics.
 */
export async function fetchTenantActivitySummary(tenantId: string): Promise<{
  totalPayments: number;
  missedPayments: number;
  emailsSent: number;
  lettersIssued: number;
  lastActivity: Date | null;
}> {
  try {
    const [payments, engagements, letters] = await Promise.all([
      prisma.tenantPayment.count({ where: { tenantId } }),
      prisma.tenantEngagement.count({ where: { tenantId, status: "sent" } }),
      prisma.tenantLetter.count({ where: { tenantId, status: "sent" } }),
    ]);

    const missedPayments = await prisma.tenantPayment.count({
      where: { tenantId, status: "missed" },
    });

    // Get last activity timestamp
    const recentPayment = await prisma.tenantPayment.findFirst({
      where: { tenantId },
      orderBy: { dueDate: "desc" },
      select: { dueDate: true },
    });

    const recentEngagement = await prisma.tenantEngagement.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const lastActivity =
      recentPayment && recentEngagement
        ? new Date(
            Math.max(recentPayment.dueDate.getTime(), recentEngagement.createdAt.getTime())
          )
        : recentPayment?.dueDate ?? recentEngagement?.createdAt ?? null;

    return {
      totalPayments: payments,
      missedPayments,
      emailsSent: engagements,
      lettersIssued: letters,
      lastActivity,
    };
  } catch (error) {
    console.error("[activity-aggregation] Summary error:", error);
    throw error;
  }
}

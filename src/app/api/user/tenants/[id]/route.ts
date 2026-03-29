/**
 * GET /api/user/tenants/[id]
 * Returns full tenant details for the tenant detail page.
 *
 * Includes:
 * - Tenant and lease information
 * - Covenant strength assessment
 * - Payment history (last 12 months)
 * - Engagement timeline
 *
 * PATCH /api/user/tenants/[id]
 * Updates tenant details (email, sector, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateHealthScore, deriveLeaseStatus } from "@/lib/tenant-health";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = params.id;

  // Fetch tenant with all related data
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      leases: {
        where: { userId: session.user.id },
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              location: true,
              marketRentSqft: true,
              country: true,
            },
          },
          payments: {
            orderBy: { periodStart: "desc" },
            take: 12,
          },
        },
        orderBy: { expiryDate: "desc" },
        take: 1, // Get the most recent lease
      },
      engagements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!tenant || tenant.leases.length === 0) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const lease = tenant.leases[0];

  // Fetch letters separately (no direct relation)
  const letters = await prisma.tenantLetter.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const today = new Date();

  // Calculate days to expiry and break
  const daysToExpiry = lease.expiryDate
    ? Math.floor((lease.expiryDate.getTime() - today.getTime()) / 86_400_000)
    : null;

  const daysToBreak = lease.breakDate
    ? Math.floor((lease.breakDate.getTime() - today.getTime()) / 86_400_000)
    : null;

  const daysToReview = lease.reviewDate
    ? Math.floor((lease.reviewDate.getTime() - today.getTime()) / 86_400_000)
    : null;

  // Calculate covenant strength and health score
  const leaseStatus = deriveLeaseStatus(lease.expiryDate);
  const covenantGrade = (tenant.covenantGrade ?? "unknown") as "strong" | "satisfactory" | "weak" | "unknown";

  const healthScore = calculateHealthScore({
    daysToExpiry,
    leaseStatus,
    payments: lease.payments.map((p) => ({ status: p.status })),
    covenantGrade,
    sector: tenant.sector ?? null,
  });

  // Derive covenant label from score
  const covenantLabel =
    (tenant.covenantScore ?? 0) >= 8 ? "Strong" :
    (tenant.covenantScore ?? 0) >= 6 ? "Satisfactory" :
    (tenant.covenantScore ?? 0) >= 4 ? "Weak" : "Unknown";

  // Calculate market ERV
  const marketERV =
    lease.asset.marketRentSqft && lease.sqft > 0
      ? lease.asset.marketRentSqft * lease.sqft
      : null;

  // Payment statistics
  const paidOnTime = lease.payments.filter(p => p.status === "paid_on_time").length;
  const totalPayments = lease.payments.length;
  const paymentPercentage = totalPayments > 0 ? Math.round((paidOnTime / totalPayments) * 100) : 0;

  // Merge engagement timeline (engagements + letters + payments)
  const timeline: Array<{
    id: string;
    type: "engagement" | "letter" | "payment" | "covenant_check";
    title: string;
    description: string;
    status: string;
    date: Date;
  }> = [];

  // Add engagements
  tenant.engagements.forEach((e) => {
    timeline.push({
      id: e.id,
      type: "engagement",
      title: `${e.actionType.replace(/_/g, " ")} — ${e.status}`,
      description: e.letterDraft || "", // Using letterDraft as notes field
      status: e.status,
      date: e.createdAt,
    });
  });

  // Add letters
  letters.forEach((l) => {
    timeline.push({
      id: l.id,
      type: "letter",
      title: `Letter: ${l.type.replace(/_/g, " ")}`,
      description: l.sentToEmail ? `Sent to ${l.sentToEmail}` : "Draft",
      status: l.status,
      date: l.createdAt,
    });
  });

  // Add recent payments
  lease.payments.slice(0, 4).forEach(p => {
    if (p.status === "paid_on_time" || p.status === "paid_late") {
      timeline.push({
        id: p.id,
        type: "payment",
        title: `Rent received — ${p.periodStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
        description: `${lease.currency || "$"}${p.amount.toLocaleString()} — ${p.status === "paid_on_time" ? "paid on due date" : "paid late"}`,
        status: p.status,
        date: p.paidDate || p.dueDate,
      });
    }
  });

  // Add covenant check (if available)
  if (tenant.covenantCheckedAt) {
    timeline.push({
      id: `covenant_${tenantId}`,
      type: "covenant_check",
      title: "Covenant check refreshed",
      description: `Credit check — score ${tenant.covenantScore ?? "unknown"}`,
      status: "auto",
      date: tenant.covenantCheckedAt,
    });
  }

  // Sort timeline by date descending
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const currency = lease.currency || "GBP";
  const sym = currency === "GBP" ? "£" : "$";

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      sector: tenant.sector,
      covenantGrade: tenant.covenantGrade ?? "unknown",
      covenantScore: tenant.covenantScore,
    },
    lease: {
      id: lease.id,
      leaseRef: lease.leaseRef,
      assetId: lease.assetId,
      assetName: lease.asset.name,
      assetLocation: lease.asset.location,
      sqft: lease.sqft,
      rentPerSqft: lease.rentPerSqft,
      passingRent: lease.passingRent,
      currency,
      sym,
      startDate: lease.startDate?.toISOString().split("T")[0],
      expiryDate: lease.expiryDate?.toISOString().split("T")[0],
      breakDate: lease.breakDate?.toISOString().split("T")[0],
      reviewDate: lease.reviewDate?.toISOString().split("T")[0],
      daysToExpiry,
      daysToBreak,
      daysToReview,
      // Additional fields would come from lease.abstractData JSON
    },
    kpis: {
      covenantScore: tenant.covenantScore ?? 0,
      covenantLabel,
      passingRent: lease.passingRent,
      rentPerSqft: lease.rentPerSqft,
      marketERV,
      marketRentPerSqft: lease.asset.marketRentSqft,
      daysToExpiry,
      daysToBreak,
      leaseStatus,
    },
    covenant: {
      overallScore: tenant.covenantScore ?? 0,
      label: covenantLabel,
      companyStatus: "Unknown", // Field doesn't exist in schema yet
      yearsTrading: null, // Field doesn't exist in schema yet
      sector: tenant.sector,
      paymentHistory: `${paymentPercentage}% on time (${Math.floor(totalPayments / 12)} yrs)`,
      leaseRisk: daysToBreak && daysToBreak < 120 ? "Break clause active" : "Low risk",
      lastChecked: tenant.covenantCheckedAt?.toISOString().split("T")[0] ?? "Never",
    },
    payments: {
      history: lease.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        dueDate: p.dueDate.toISOString().split("T")[0],
        paidDate: p.paidDate?.toISOString().split("T")[0],
        status: p.status,
        period: p.periodStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      })),
      totalCollected: lease.payments
        .filter(p => p.status === "paid_on_time" || p.status === "paid_late")
        .reduce((sum, p) => sum + p.amount, 0),
      onTimePercentage: paymentPercentage,
    },
    timeline,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = params.id;
  const body = await req.json() as { email?: string; sector?: string };

  if (!body.email && !body.sector) {
    return NextResponse.json(
      { error: "At least one field (email, sector) required" },
      { status: 400 }
    );
  }

  // Verify tenant exists and user has access
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      leases: {
        some: { userId: session.user.id },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Update tenant
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(body.email && { email: body.email }),
      ...(body.sector && { sector: body.sector }),
    },
  });

  return NextResponse.json({
    success: true,
    tenant: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      sector: updated.sector,
    },
  });
}

/**
 * GET /api/user/assets/[id]/financials
 * Returns comprehensive financial data for a property-level financials tab
 *
 * Used by: /properties/[id] Financials tab
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET — property financials
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;
  const userId = session.user.id;

  const asset = await prisma.userAsset.findFirst({
    where: { id: assetId, userId },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const currency = asset.country === "UK" ? "GBP" : "USD";

  // Fetch leases for this asset with tenant and payment data
  const leases = await prisma.lease.findMany({
    where: { assetId, userId },
    include: {
      tenant: true,
      payments: {
        orderBy: { dueDate: "desc" },
        take: 12,
      },
    },
  });

  // Calculate gross revenue from leases
  const grossRevenue = asset.grossIncome ?? leases.reduce((sum, l) => sum + (l.passingRent ?? 0), 0) * 12;

  // Calculate OpEx from asset data
  const insuranceCost = asset.insurancePremium ?? 0;
  const energyCost = asset.energyCost ?? 0;
  const maintenanceCost = grossRevenue * 0.02; // Assume 2% maintenance
  const managementCost = grossRevenue * 0.05; // Assume 5% management fee
  const totalOpEx = insuranceCost + energyCost + maintenanceCost + managementCost;

  // NOI
  const noi = asset.netIncome ?? (grossRevenue - totalOpEx);

  // Collection rate (from TenantPayment records)
  const currentMonth = new Date();
  const currentMonthPayments = leases.flatMap(l =>
    l.payments.filter(p => {
      const paymentMonth = new Date(p.dueDate);
      return paymentMonth.getMonth() === currentMonth.getMonth() &&
             paymentMonth.getFullYear() === currentMonth.getFullYear();
    })
  );

  const expectedRent = currentMonthPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const collectedRent = currentMonthPayments
    .filter(p => p.status === "paid" || p.status === "PAID")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 100;

  // Outstanding rent
  const outstandingRent = expectedRent - collectedRent;

  // Count late payments (>7 days overdue)
  const now = new Date();
  const latePayments = currentMonthPayments.filter(p => {
    if (p.status === "paid" || p.status === "PAID") return false;
    const dueDate = new Date(p.dueDate);
    const daysSince = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 7;
  });

  // LTV and DSCR (basic calculations)
  const estimatedValue = asset.marketERV ?? 0;
  const debtBalance = 0; // No debt fields in current schema
  const ltv = estimatedValue > 0 ? (debtBalance / estimatedValue) * 100 : 0;

  const annualDebtService = 0; // No debt fields in current schema
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  // KPIs
  const kpis = {
    grossRevenue,
    opex: totalOpEx,
    noi,
    collectionRate: Math.round(collectionRate),
    ltv: Math.round(ltv),
    dscr: dscr,
  };

  // NOI waterfall segments
  const noiWaterfall = {
    grossRevenue,
    insurance: insuranceCost,
    energy: energyCost,
    maintenance: maintenanceCost,
    management: managementCost,
    noi,
  };

  // Group leases by tenant for rent collection status
  const tenantLeaseMap = new Map<string, typeof leases>();
  leases.forEach(lease => {
    const tid = lease.tenantId;
    if (!tenantLeaseMap.has(tid)) {
      tenantLeaseMap.set(tid, []);
    }
    tenantLeaseMap.get(tid)!.push(lease);
  });

  // Rent collection status by tenant
  const rentCollection = Array.from(tenantLeaseMap.entries()).map(([, tenantLeases]) => {
    const tenant = tenantLeases[0].tenant;
    const activeLeases = tenantLeases.filter(l => l.status === "active");

    const currentPayments = tenantLeases.flatMap(l =>
      l.payments.filter(p => {
        const paymentMonth = new Date(p.dueDate);
        return paymentMonth.getMonth() === currentMonth.getMonth() &&
               paymentMonth.getFullYear() === currentMonth.getFullYear();
      })
    );

    const firstPayment = currentPayments[0];
    const rentAmount = activeLeases.reduce((sum, l) => sum + (l.passingRent ?? 0), 0);
    const unitRef = activeLeases.map(l => l.leaseRef).filter(Boolean).join(", ") || "N/A";

    const isPaid = currentPayments.some(p => p.status === "paid" || p.status === "PAID");
    const daysLate = firstPayment && !isPaid
      ? Math.floor((now.getTime() - new Date(firstPayment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitRef,
      rentAmount,
      status: isPaid ? "PAID" : "PENDING",
      paidDate: firstPayment?.paidDate ?? null,
      dueDate: firstPayment?.dueDate ?? currentMonth,
      daysLate: Math.max(0, daysLate),
    };
  });

  // Cash flow forecast (simplified 12-month projection)
  const cashFlowForecast = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(currentMonth);
    month.setMonth(month.getMonth() + i);

    const monthlyRevenue = grossRevenue / 12;
    const monthlyOpEx = totalOpEx / 12;
    const monthlyNOI = noi / 12;
    const monthlyDebt = annualDebtService / 12;
    const monthlyCapex = 0; // No capex data available
    const netCash = monthlyNOI - monthlyDebt - monthlyCapex;

    return {
      month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue: Math.round(monthlyRevenue),
      opex: Math.round(monthlyOpEx),
      noi: Math.round(monthlyNOI),
      debt: Math.round(monthlyDebt),
      capex: monthlyCapex,
      netCash: Math.round(netCash),
    };
  });

  // Capex plan from work orders
  const workOrders = await prisma.workOrder.findMany({
    where: {
      userId,
      assetId,
      tenderType: "CAPITAL_WORKS",
      status: { in: ["PLANNING", "APPROVED", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const capexPlan = workOrders.map(wo => ({
    id: wo.id,
    description: wo.description ?? "Capital works",
    estimatedCost: wo.budgetEstimate ?? wo.costEstimate ?? 0,
    scheduledDate: wo.targetStart ?? "Q3/Q4 2026",
    status: wo.status,
    valueImpact: wo.capRateValueAdd ?? ((wo.budgetEstimate ?? 0) * 1.5),
  }));

  return NextResponse.json({
    asset: {
      id: asset.id,
      name: asset.name ?? "Property",
      address: asset.address ?? asset.location,
      currency,
    },
    kpis,
    noiWaterfall,
    rentCollection,
    collectionSummary: {
      collectedAmount: collectedRent,
      outstandingAmount: outstandingRent,
      latePaymentsCount: latePayments.length,
    },
    cashFlowForecast,
    capexPlan,
  });
}

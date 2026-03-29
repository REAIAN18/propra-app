/**
 * GET /api/user/assets/[id]/tenants
 * Returns comprehensive tenant data for property-level tenants tab
 *
 * Used by: /properties/[id] Tenants tab
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET — property tenants
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

  // Fetch all leases for this asset with tenant and payment data
  const leases = await prisma.lease.findMany({
    where: { assetId, userId },
    include: {
      tenant: true,
      payments: {
        orderBy: { dueDate: "desc" },
        take: 12, // Last 12 months for payment history
      },
    },
    orderBy: { passingRent: "desc" }, // Highest rent first
  });

  // Calculate overview KPIs
  const totalRent = leases.reduce((sum, l) => sum + (l.passingRent ?? 0), 0) * 12; // Annual
  const activeLeases = leases.filter(l => l.status === "active");
  const vacantLeases = leases.filter(l => l.status === "vacant");

  // Collection status
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthPayments = leases.flatMap(l =>
    l.payments.filter(p => {
      const pDate = new Date(p.dueDate);
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    })
  );

  const paidCount = currentMonthPayments.filter(p => p.status === "paid" || p.status === "PAID").length;
  const lateCount = currentMonthPayments.filter(p => {
    if (p.status === "paid" || p.status === "PAID") return false;
    const daysSince = Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 7 && daysSince <= 30;
  }).length;

  const overdueCount = currentMonthPayments.filter(p => {
    if (p.status === "paid" || p.status === "PAID") return false;
    const daysSince = Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 30;
  }).length;

  // WAULT (Weighted Average Unexpired Lease Term)
  const totalWeightedTerm = activeLeases.reduce((sum, l) => {
    if (!l.expiryDate) return sum;
    const monthsRemaining = Math.max(0,
      Math.floor((new Date(l.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const yearsRemaining = monthsRemaining / 12;
    return sum + (yearsRemaining * (l.passingRent ?? 0));
  }, 0);

  const wault = totalRent > 0 ? totalWeightedTerm / totalRent : 0;

  // Tenant concentration (top tenant % of total rent)
  const topTenantRent = Math.max(...activeLeases.map(l => l.passingRent ?? 0)) * 12;
  const tenantConcentration = totalRent > 0 ? (topTenantRent / totalRent) * 100 : 0;

  // Upcoming events (next 12 months)
  const twelveMonthsFromNow = new Date(now);
  twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);

  const upcomingEvents = activeLeases
    .flatMap(l => {
      const events = [];

      if (l.reviewDate && new Date(l.reviewDate) <= twelveMonthsFromNow && new Date(l.reviewDate) >= now) {
        events.push({
          type: "review",
          date: l.reviewDate,
          tenantName: l.tenant.name,
          description: "Rent review due",
        });
      }

      if (l.breakDate && new Date(l.breakDate) <= twelveMonthsFromNow && new Date(l.breakDate) >= now) {
        events.push({
          type: "break",
          date: l.breakDate,
          tenantName: l.tenant.name,
          description: "Break clause",
        });
      }

      if (l.expiryDate && new Date(l.expiryDate) <= twelveMonthsFromNow && new Date(l.expiryDate) >= now) {
        events.push({
          type: "expiry",
          date: l.expiryDate,
          tenantName: l.tenant.name,
          description: "Lease expires",
        });
      }

      return events;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Top 5 upcoming

  // Group leases by tenant for detailed tenant info
  const tenantsData = Array.from(
    leases.reduce((map, lease) => {
      const tenantId = lease.tenant.id;
      if (!map.has(tenantId)) {
        map.set(tenantId, []);
      }
      map.get(tenantId)!.push(lease);
      return map;
    }, new Map<string, typeof leases>())
  ).map(([, tenantLeases]) => {
    const tenant = tenantLeases[0].tenant;
    const activeTenantLeases = tenantLeases.filter(l => l.status === "active");

    // Payment history (last 12 months)
    const paymentHistory = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now);
      month.setMonth(month.getMonth() - (11 - i));

      const monthPayments = tenantLeases.flatMap(l =>
        l.payments.filter(p => {
          const pDate = new Date(p.dueDate);
          return pDate.getMonth() === month.getMonth() && pDate.getFullYear() === month.getFullYear();
        })
      );

      const paid = monthPayments.some(p => p.status === "paid" || p.status === "PAID");
      const anyPayment = monthPayments.length > 0;

      if (!anyPayment) return { month: month.toLocaleDateString("en-US", { month: "short" }), status: "none" };
      if (paid) return { month: month.toLocaleDateString("en-US", { month: "short" }), status: "on-time" };

      const latestPayment = monthPayments[0];
      const daysSince = Math.floor((now.getTime() - new Date(latestPayment.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince > 30) return { month: month.toLocaleDateString("en-US", { month: "short" }), status: "missed" };
      return { month: month.toLocaleDateString("en-US", { month: "short" }), status: "late" };
    });

    // Lease abstract
    const primaryLease = activeTenantLeases[0] || tenantLeases[0];
    const abstractData = primaryLease?.abstractData as Record<string, unknown> | null;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: tenant.email,
      sector: tenant.sector,
      covenantGrade: tenant.covenantGrade || "unknown",
      covenantScore: tenant.covenantScore,
      units: activeTenantLeases.map(l => l.leaseRef).filter(Boolean).join(", ") || "N/A",
      annualRent: activeTenantLeases.reduce((sum, l) => sum + (l.passingRent ?? 0), 0) * 12,
      leaseExpiry: primaryLease?.expiryDate,
      nextReview: primaryLease?.reviewDate,
      breakClause: primaryLease?.breakDate,
      arrearsBalance: tenant.arrearsBalance ?? 0,
      arrearsEscalation: tenant.arrearsEscalation ?? "none",
      paymentTrend: tenant.paymentTrend ?? "stable",
      paymentHistory,
      leaseAbstract: abstractData ? {
        source: primaryLease?.abstractSource ?? "manual",
        completeness: primaryLease?.abstractCompleteness ?? 0,
        data: abstractData,
      } : null,
    };
  });

  return NextResponse.json({
    asset: {
      id: asset.id,
      name: asset.name ?? "Property",
      address: asset.address ?? asset.location,
      currency,
    },
    overview: {
      totalAnnualRent: totalRent,
      activeTenantsCount: activeLeases.length,
      vacantUnitsCount: vacantLeases.length,
      collectionStatus: {
        paid: paidCount,
        late: lateCount,
        overdue: overdueCount,
        vacant: vacantLeases.length,
      },
      wault: Math.round(wault * 10) / 10,
      tenantConcentration: Math.round(tenantConcentration),
      upcomingEvents,
    },
    tenants: tenantsData,
  });
}

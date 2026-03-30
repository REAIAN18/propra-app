import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email || !assetId) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      collectionRate: 96,
      totalDue: 38500,
      totalPaid: 37000,
      totalOutstanding: 10500,
      tenants: [
        {
          id: "t1",
          name: "Meridian Law Partners",
          suite: "Suite 4A",
          monthlyRent: 15750,
          status: "PAID",
          daysLate: 0,
          dueDate: "2026-03-01",
          paidDate: "2026-03-01",
          amount: 15750,
        },
        {
          id: "t2",
          name: "Gables Dental Practice",
          suite: "Suite 1A",
          monthlyRent: 8000,
          status: "PAID",
          daysLate: 0,
          dueDate: "2026-03-01",
          paidDate: "2026-03-01",
          amount: 8000,
        },
        {
          id: "t3",
          name: "Dr Chen DDS",
          suite: "Suite 2B",
          monthlyRent: 10500,
          status: "LATE",
          daysLate: 14,
          dueDate: "2026-03-01",
          paidDate: null,
          amount: 10500,
        },
        {
          id: "t4",
          name: "CG Financial Advisors",
          suite: "Suite 5B",
          monthlyRent: 4250,
          status: "PAID",
          daysLate: 0,
          dueDate: "2026-03-01",
          paidDate: "2026-03-03",
          amount: 4250,
        },
        {
          id: "t5",
          name: "— Vacant —",
          suite: "Suite 3A",
          monthlyRent: 0,
          status: "VACANT",
          daysLate: 0,
          dueDate: null,
          paidDate: null,
          amount: 0,
        },
      ],
    });
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  try {
    // Fetch all leases for this asset
    const leases = await prisma.lease.findMany({
      where: { assetId },
      include: { tenant: true },
    });

    // Fetch payments for current month (using periodStart date range)
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);

    const payments = await prisma.tenantPayment.findMany({
      where: {
        periodStart: {
          gte: monthStart,
          lt: monthEnd,
        },
        lease: { assetId },
      },
      include: { lease: true },
    });

    let totalDue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const tenantRows = leases.map((lease) => {
      const monthlyRent = lease.passingRent || 0;
      const payment = payments.find((p) => p.leaseId === lease.id);
      const isVacant = !lease.tenantId;

      if (isVacant) {
        return {
          id: lease.id,
          name: "— Vacant —",
          suite: "Vacant",
          monthlyRent: 0,
          status: "VACANT",
          daysLate: 0,
          dueDate: null,
          paidDate: null,
          amount: 0,
        };
      }

      totalDue += monthlyRent;

      if (!payment || payment.status !== "paid") {
        // Not paid or late
        const daysLate = Math.floor((currentDate.getTime() - payment!.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const status = payment?.status === "late" ? "LATE" : payment?.status === "missed" ? "OVERDUE" : "PENDING";

        totalOutstanding += monthlyRent;

        return {
          id: lease.id,
          name: lease.tenant?.name || "Unknown",
          suite: lease.leaseRef || "",
          monthlyRent,
          status,
          daysLate: Math.max(0, daysLate),
          dueDate: payment?.dueDate.toISOString().split("T")[0] || null,
          paidDate: null,
          amount: monthlyRent,
        };
      }

      totalPaid += payment.amount;

      return {
        id: lease.id,
        name: lease.tenant?.name || "Unknown",
        suite: `Unit ${lease.id.slice(0, 2)}`,
        monthlyRent,
        status: "PAID",
        daysLate: 0,
        dueDate: payment.paidDate ? payment.paidDate.toISOString().split("T")[0] : null,
        paidDate: payment.paidDate ? payment.paidDate.toISOString().split("T")[0] : null,
        amount: payment.amount || 0,
      };
    });

    const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

    return NextResponse.json({
      collectionRate,
      totalDue,
      totalPaid,
      totalOutstanding,
      tenants: tenantRows,
    });
  } catch (error) {
    console.error("Error fetching rent collection:", error);
    return NextResponse.json({ collectionRate: 0, totalDue: 0, totalPaid: 0, totalOutstanding: 0, tenants: [] }, { status: 500 });
  }
}

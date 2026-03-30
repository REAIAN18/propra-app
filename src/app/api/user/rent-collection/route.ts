import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const assetId = req.nextUrl.searchParams.get("assetId");
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    // Unauthenticated: return demo data
    if (!session?.user?.id) {
      return NextResponse.json({
        collectionRate: 96,
        totalDue: 38500,
        totalPaid: 37000,
        totalOutstanding: 1500,
        tenants: [
          {
            id: "t1",
            name: "Meridian Law Partners",
            suite: "Suite 4A",
            rentMonthly: 15750,
            status: "PAID",
            statusLabel: "PAID",
            daysLate: 0,
            datePaid: "1 Mar",
            amount: 15750,
            dotColor: "#34d399",
          },
          {
            id: "t2",
            name: "Gables Dental Practice",
            suite: "Suite 1A",
            rentMonthly: 8000,
            status: "PAID",
            statusLabel: "PAID",
            daysLate: 0,
            datePaid: "1 Mar",
            amount: 8000,
            dotColor: "#34d399",
          },
          {
            id: "t3",
            name: "Dr Chen DDS",
            suite: "Suite 2B",
            rentMonthly: 10500,
            status: "LATE",
            statusLabel: "14 DAYS LATE",
            daysLate: 14,
            dueDate: "1 Mar",
            amount: 10500,
            dotColor: "#fbbf24",
          },
          {
            id: "t4",
            name: "CG Financial Advisors",
            suite: "Suite 5B",
            rentMonthly: 4250,
            status: "PAID",
            statusLabel: "PAID",
            daysLate: 0,
            datePaid: "3 Mar",
            amount: 4250,
            dotColor: "#34d399",
          },
          {
            id: "t5",
            name: "— Vacant —",
            suite: "Suite 3A",
            rentMonthly: 0,
            status: "VACANT",
            statusLabel: "VACANT",
            daysLate: null,
            datePaid: "—",
            amount: 0,
            dotColor: "#555568",
          },
        ],
      });
    }

    // Authenticated: fetch from database
    const tenants = await prisma.tenant.findMany({
      where: { assetId },
      include: {
        leases: { orderBy: { startDate: "desc" }, take: 1 },
      },
    });

    let totalDue = 0;
    let totalPaid = 0;

    const tenantData = await Promise.all(
      tenants.map(async (tenant) => {
        const lease = tenant.leases[0];
        const monthlyRent = lease?.monthlyRent || 0;

        // Get payment status for current month
        const payment = await prisma.tenantPayment.findFirst({
          where: {
            tenantId: tenant.id,
            paymentMonth: currentMonth,
            paymentYear: currentYear,
          },
        });

        const paidAmount = payment?.amountPaid || 0;
        const dueDate = new Date(currentYear, currentMonth - 1, 1);
        const daysSinceDue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        totalDue += monthlyRent;
        totalPaid += paidAmount;

        let status = "VACANT";
        let statusLabel = "VACANT";
        let dotColor = "#555568";

        if (monthlyRent > 0) {
          if (paidAmount >= monthlyRent) {
            status = "PAID";
            statusLabel = "PAID";
            dotColor = "#34d399";
          } else if (daysSinceDue > 0) {
            status = "LATE";
            statusLabel = `${daysSinceDue} DAYS LATE`;
            dotColor = "#fbbf24";
          }
        }

        return {
          id: tenant.id,
          name: tenant.name,
          suite: lease?.suite || "N/A",
          rentMonthly: monthlyRent,
          status,
          statusLabel,
          daysLate: daysSinceDue > 0 ? daysSinceDue : 0,
          datePaid: payment?.paymentDate ? payment.paymentDate.toISOString().split("T")[0] : "—",
          amount: paidAmount || monthlyRent,
          dotColor,
        };
      })
    );

    const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

    return NextResponse.json({
      collectionRate,
      totalDue,
      totalPaid,
      totalOutstanding: totalDue - totalPaid,
      tenants: tenantData,
    });
  } catch (error) {
    console.error("Error in GET /api/user/rent-collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

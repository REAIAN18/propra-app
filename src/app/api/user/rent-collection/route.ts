import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");

  if (!session?.user?.email) {
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

  // TODO: Fetch real data from TenantPayment + Lease
  return NextResponse.json({ collectionRate: 0, totalDue: 0, totalPaid: 0, totalOutstanding: 0, tenants: [] });
}

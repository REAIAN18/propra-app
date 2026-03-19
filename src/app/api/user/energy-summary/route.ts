import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// FL benchmark: FPL commercial rate ~$0.10/kWh
const FL_BENCHMARK_RATE = 0.10;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ hasBills: false, totalAnnualSpend: 0, bills: [] });
  }

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id, documentType: "energy_bill", status: "done" },
    orderBy: { createdAt: "desc" },
  });

  if (!docs.length) {
    return NextResponse.json({ hasBills: false, totalAnnualSpend: 0, bills: [] });
  }

  const bills = docs.map((d) => {
    const data = (d.extractedData as Record<string, unknown>) ?? {};
    return {
      id: d.id,
      supplier: (data.supplier as string) ?? "Unknown",
      accountNumber: (data.accountNumber as string) ?? null,
      billingPeriod: (data.billingPeriod as string) ?? null,
      totalCost: Number(data.totalCost) || 0,
      unitRate: Number(data.unitRate) || 0,
      consumption: Number(data.consumption) || 0,
      filename: d.filename,
    };
  });

  const totalAnnualSpend = bills.reduce((s, b) => s + b.totalCost, 0);
  const avgUnitRate =
    bills.filter((b) => b.unitRate > 0).reduce((s, b) => s + b.unitRate, 0) /
      (bills.filter((b) => b.unitRate > 0).length || 1);

  return NextResponse.json({
    hasBills: true,
    totalAnnualSpend,
    avgUnitRate,
    benchmarkRate: FL_BENCHMARK_RATE,
    bills,
  });
}

/**
 * GET /api/user/income-opportunities/[id]/actuals
 * Returns monthly actuals data for a live income activation.
 *
 * Used by Income v2 Phase 3 to display monthly performance charts
 * and calculate vs-estimate metrics.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activationId = (await params).id;

  const activation = await prisma.incomeActivation.findUnique({
    where: { id: activationId },
  });

  if (!activation || activation.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Income activation not found" },
      { status: 404 }
    );
  }

  // Parse monthly actuals from JSON field
  const monthlyActuals = (activation.monthlyActuals as Array<{
    month: string;
    amount: number;
  }>) ?? [];

  // Calculate metrics
  const totalActual = monthlyActuals.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const monthCount = monthlyActuals.length;
  const avgMonthly = monthCount > 0 ? totalActual / monthCount : 0;
  const annualizedActual = avgMonthly * 12;

  // vs Estimate: compare annualized actual to original estimate
  const vsEstimate =
    activation.annualIncome && activation.annualIncome > 0
      ? ((annualizedActual - activation.annualIncome) /
          activation.annualIncome) *
        100
      : null;

  // Calculate days to contract end (for renewal alert)
  const daysToContractEnd = activation.contractEnd
    ? Math.floor(
        (activation.contractEnd.getTime() - new Date().getTime()) / 86_400_000
      )
    : null;

  return NextResponse.json({
    id: activation.id,
    opportunityType: activation.opportunityType,
    opportunityLabel: activation.opportunityLabel,
    status: activation.status,
    annualIncome: activation.annualIncome,
    contractStart: activation.contractStart?.toISOString().split("T")[0] ?? null,
    contractEnd: activation.contractEnd?.toISOString().split("T")[0] ?? null,
    escalationPct: activation.escalationPct,
    monthlyActuals,
    vsEstimate: vsEstimate !== null ? Math.round(vsEstimate * 10) / 10 : null,
    daysToContractEnd,
    renewalAlertSent: activation.renewalAlertSent,
  });
}

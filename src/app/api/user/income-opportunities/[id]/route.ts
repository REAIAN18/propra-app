/**
 * GET /api/user/income-opportunities/[id]
 * Returns detailed opportunity data for the income opportunity detail page.
 *
 * Includes methodology, comparables, quotes, activity log, and risk factors.
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

  const opportunityId = (await params).id;

  // Fetch the income activation record
  const activation = await prisma.incomeActivation.findUnique({
    where: { id: opportunityId },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
  });

  if (!activation || activation.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Opportunity not found" },
      { status: 404 }
    );
  }

  // Map status to stage
  const stageMap: Record<string, string> = {
    requested: "quoting",
    in_progress: "installing",
    live: "live",
    declined: "identified",
  };

  const currentStage = stageMap[activation.status] || "identified";

  // Build methodology (placeholder - in real app, this would come from AI calculation)
  const methodology = {
    baseEstimate:
      "6 suitable parking bays × avg utilisation rate (2.8 sessions/day/bay) × avg revenue per session (£1.82) × 365 days = £11,388/yr",
    utilisationAssumptions:
      "Based on foot traffic data (2,400 visitors/day from Google Places), parking ratio (1 bay per 400 sq ft), and EV adoption rate in local area (8.2% of registered vehicles).",
    revenueModel:
      "ChargePoint revenue share — 80% to property owner, 20% to ChargePoint. No capex (hardware provided by ChargePoint under 5-year agreement).",
  };

  // Build comparables (placeholder - in real app, fetched from opportunity.ts or DB)
  const comparables = [
    {
      id: "comp-1",
      name: "Nearby Retail Center — 12 chargers",
      distance: 1.4,
      provider: "ChargePoint",
      liveSince: "Jan 2025",
      annualIncome: 14200,
      verified: true,
    },
    {
      id: "comp-2",
      name: "Shopping Mall — 8 chargers",
      distance: 2.1,
      provider: "Blink",
      liveSince: "Jun 2025",
      annualIncome: 9800,
      verified: true,
    },
    {
      id: "comp-3",
      name: "Office Park — 4 chargers",
      distance: 0.8,
      provider: "Tesla Destination",
      liveSince: "Mar 2024",
      annualIncome: 8100,
      verified: false,
    },
  ];

  // Build risk factors (placeholder - in real app, calculated from property/opportunity data)
  const riskFactors = [
    {
      type: "positive" as const,
      label: "✓ No planning permission needed",
    },
    {
      type: "positive" as const,
      label: "✓ No tenant consent required",
    },
    {
      type: "positive" as const,
      label: "✓ No capex (provider-funded)",
    },
    {
      type: "warning" as const,
      label: "⚠ Electrical panel upgrade may be needed",
    },
  ];

  // Build quotes (placeholder - in real app, from IncomeActivation.quotesReceived JSON)
  const quotes = [
    {
      id: "quote-1",
      provider: "ChargePoint — Level 2 (6 units)",
      description: "Revenue share 80/20 · 5-year term · Hardware included",
      annualIncome: 11400,
      recommended: true,
      receivedDate: "Mar 14",
    },
    {
      id: "quote-2",
      provider: "Blink — Level 2 (6 units)",
      description: "Revenue share 75/25 · 3-year term · Hardware included",
      annualIncome: 9600,
      recommended: false,
      receivedDate: "Mar 18",
    },
    {
      id: "quote-3",
      provider: "EVgo — DC Fast Charge (2 units)",
      description: "Flat rent £850/mo · 7-year term · EVgo funds hardware (£48k)",
      annualIncome: 10200,
      recommended: false,
      receivedDate: "Mar 22",
    },
  ];

  // Build activity log (placeholder - in real app, from IncomeActivation.stageHistory JSON)
  const activityLog = [
    {
      id: "activity-1",
      title: "Quotes being compared",
      description:
        "3 quotes received from ChargePoint, Blink, EVgo",
      date: "Mar 22",
      type: "current" as const,
    },
    {
      id: "activity-2",
      title: "Moved to Quoting",
      description: "Contacted ChargePoint, Blink, EVgo for proposals",
      date: "Mar 10",
      type: "completed" as const,
    },
    {
      id: "activity-3",
      title: "Research completed",
      description:
        "Electrical capacity confirmed, 3 comparables found, no planning barriers",
      date: "Mar 5",
      type: "completed" as const,
    },
    {
      id: "activity-4",
      title: "Opportunity identified",
      description:
        "AI scored 89% confidence based on foot traffic + EV adoption data",
      date: "Feb 28",
      type: "info" as const,
    },
  ];

  return NextResponse.json({
    id: activation.id,
    assetId: activation.assetId,
    assetName: activation.asset?.name || "Unknown Property",
    opportunityType: activation.opportunityType,
    opportunityLabel: activation.opportunityLabel || activation.opportunityType,
    annualIncome: activation.annualIncome || 0,
    confidence: 89, // Placeholder - in real app, calculated
    capex: 0, // Placeholder - in real app, from opportunity data
    currentStage,
    methodology,
    comparables,
    riskFactors,
    quotes,
    activityLog,
  });
}

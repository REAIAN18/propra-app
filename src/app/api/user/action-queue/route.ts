import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RentReviewEvent, HoldSellScenario, WorkOrder } from "@/generated/prisma";

// GET /api/user/action-queue
// Aggregates actionable items from DB-backed Wave 2 sources in parallel.
// Static portfolio items (compliance, leases from demo data) are built
// client-side in TopBar. This route returns DB-backed items only.
//
// Response shape matches ActionQueueItem in ActionQueueDrawer.tsx.

interface ActionQueueItem {
  id: string;
  type: string;
  category: "cost_saving" | "income_uplift" | "urgent" | "refinance" | "value_add";
  title: string;
  assetName: string | null;
  annualValue: number | null;
  currencySym: string;
  urgency: "urgent" | "this_week" | "this_month" | "no_deadline";
  actionLabel: string;
  actionHref: string;
  rank: number;
}

function rankItem(urgency: string, value: number): number {
  const m: Record<string, number> = { urgent: 4, this_week: 2, this_month: 1.5, no_deadline: 1 };
  return value * (m[urgency] ?? 1);
}

type PrismaWithWave2 = {
  rentReviewEvent: {
    findMany(q: object): Promise<RentReviewEvent[]>;
  };
  holdSellScenario: {
    findMany(q: object): Promise<Array<HoldSellScenario & { asset?: { id: string; name: string } | null }>>;
  };
  workOrder: {
    findMany(q: object): Promise<Array<WorkOrder & { asset?: { id: string; name: string } | null }>>;
  };
  lease: {
    findMany(q: object): Promise<Array<{
      id: string;
      expiryDate: Date | null;
      passingRent: number;
      tenant: { name: string } | null;
      asset: { id: string; name: string } | null;
      rentReviews: Array<{ id: string; status: string }>;
    }>>;
  };
  scoutDeal: {
    findMany(q: object): Promise<Array<{
      id: string;
      address: string | null;
      askingPrice: number | null;
      userReaction: string | null;
      underwriting: null | { id: string };
    }>>;
  };
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const db = prisma as unknown as PrismaWithWave2;

  // ── Parallel DB fetches ────────────────────────────────────────────────────
  const [
    assets,
    incomeActivations,
    rentReviews,
    holdSellScenarios,
    workOrders,
    expiringLeases,
    likedDeals,
  ] = await Promise.all([
    prisma.userAsset.findMany({
      where: { userId },
      select: {
        id: true, name: true, location: true, assetType: true, country: true,
        insurancePremium: true, marketInsurance: true,
        energyCost: true, marketEnergyCost: true,
      },
    }),
    prisma.incomeActivation.findMany({
      where: { userId, status: { not: "active" } },
      select: { id: true, assetId: true, opportunityType: true, annualIncome: true },
    }),
    db.rentReviewEvent.findMany({
      where: {
        userId,
        status: { notIn: ["dismissed", "lease_renewed", "no_action"] },
      },
      orderBy: { expiryDate: "asc" },
    } as object).catch(() => [] as RentReviewEvent[]),
    db.holdSellScenario.findMany({
      where: { userId, recommendation: "sell", confidenceScore: { gt: 0.6 } },
      include: { asset: { select: { id: true, name: true } } },
    } as object).catch(() => []),
    db.workOrder.findMany({
      where: { userId, status: "pending_approval" },
      select: {
        id: true, assetId: true, description: true, budgetEstimate: true,
        asset: { select: { id: true, name: true } },
      },
    } as object).catch(() => []),
    db.lease.findMany({
      where: {
        userId,
        status: { in: ["active", "expiring_soon"] },
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true, expiryDate: true, passingRent: true,
        tenant: { select: { name: true } },
        asset: { select: { id: true, name: true } },
        rentReviews: {
          where: { status: { notIn: ["dismissed", "lease_renewed"] } },
          select: { id: true, status: true },
        },
      },
    } as object).catch(() => []),
    db.scoutDeal.findMany({
      where: { userId: userId, userReaction: "liked" },
      select: {
        id: true, address: true, askingPrice: true, userReaction: true,
        underwriting: { select: { id: true } },
      },
    } as object).catch(() => []),
  ]);

  const sym = assets.some((a) => a.country !== "US") ? "£" : "$";
  const items: ActionQueueItem[] = [];
  const now = new Date();

  // ── Insurance overpay ─────────────────────────────────────────────────────
  const insuranceSaving = assets.reduce((s, a) => s + (a.insurancePremium ?? 0), 0)
                        - assets.reduce((s, a) => s + (a.marketInsurance  ?? 0), 0);
  if (insuranceSaving > 500) {
    items.push({
      id: "insurance:overpay", type: "insurance", category: "cost_saving",
      title: `Insurance retender — ${sym}${Math.round(insuranceSaving / 1000)}k/yr overpay identified`,
      assetName: null, annualValue: insuranceSaving, currencySym: sym,
      urgency: "this_month", actionLabel: "Get quotes", actionHref: "/insurance",
      rank: rankItem("this_month", insuranceSaving),
    });
  }

  // ── Energy overpay ────────────────────────────────────────────────────────
  const energySaving = assets.reduce((s, a) => s + (a.energyCost ?? 0), 0)
                     - assets.reduce((s, a) => s + (a.marketEnergyCost ?? 0), 0);
  if (energySaving > 500) {
    items.push({
      id: "energy:overpay", type: "energy_switch", category: "cost_saving",
      title: `Energy ${sym === "$" ? "optimisation" : "tariff switch"} — ${sym}${Math.round(energySaving / 1000)}k/yr saving`,
      assetName: null, annualValue: energySaving, currencySym: sym,
      urgency: "this_month", actionLabel: sym === "$" ? "Optimise" : "Switch", actionHref: "/energy",
      rank: rankItem("this_month", energySaving),
    });
  }

  // ── Income activations not yet live ──────────────────────────────────────
  for (const act of incomeActivations) {
    items.push({
      id: `income:${act.id}`, type: "income", category: "income_uplift",
      title: `${act.opportunityType} income opportunity — not yet activated`,
      assetName: assets.find((a) => a.id === act.assetId)?.name ?? null,
      annualValue: act.annualIncome ?? null, currencySym: sym,
      urgency: "no_deadline", actionLabel: "Activate", actionHref: "/income",
      rank: rankItem("no_deadline", act.annualIncome ?? 0),
    });
  }

  // ── Rent review events ────────────────────────────────────────────────────
  for (const rr of rentReviews) {
    const days = Math.floor((new Date(rr.expiryDate).getTime() - now.getTime()) / 86400000);
    const urgency: ActionQueueItem["urgency"] = days < 90 ? "urgent" : days < 180 ? "this_week" : "this_month";
    const annualValue = rr.gap ?? (rr.passingRent * 0.1);
    items.push({
      id: `rent_review:${rr.id}`, type: "rent_review",
      category: urgency === "urgent" ? "urgent" : "income_uplift",
      title: `Rent review due — ${rr.tenantName}${rr.propertyAddress ? ` · ${rr.propertyAddress}` : ""}`,
      assetName: rr.propertyAddress ?? null, annualValue, currencySym: sym,
      urgency, actionLabel: "Draft letter", actionHref: "/tenants",
      rank: rankItem(urgency, annualValue),
    });
  }

  // ── Work orders pending approval ──────────────────────────────────────────
  for (const wo of workOrders) {
    const val = wo.budgetEstimate ?? 0;
    items.push({
      id: `work_order:${wo.id}`, type: "work_order", category: "urgent",
      title: `Work order pending approval — ${wo.description?.slice(0, 50) ?? "contractor bid received"}`,
      assetName: wo.asset?.name ?? null, annualValue: null, currencySym: sym,
      urgency: "this_week", actionLabel: `Approve ${sym}${Math.round(val).toLocaleString()}`,
      actionHref: "/work-orders", rank: rankItem("this_week", val),
    });
  }

  // ── Hold vs Sell — sell signals ───────────────────────────────────────────
  for (const hs of holdSellScenarios) {
    const net = hs.sellNetProceeds ?? 0;
    items.push({
      id: `hold_sell:${hs.id}`, type: "hold_sell", category: "value_add",
      title: `Hold vs Sell recommends selling — ${Math.round((hs.confidenceScore ?? 0) * 100)}% confidence`,
      assetName: hs.asset?.name ?? null,
      annualValue: net > 0 ? net * 0.05 : null, currencySym: sym,
      urgency: "no_deadline", actionLabel: "View analysis", actionHref: "/hold-sell",
      rank: rankItem("no_deadline", net * 0.05),
    });
  }

  // ── Tenant: expiring leases with no open rent review ─────────────────────
  for (const lease of expiringLeases) {
    if (!lease.expiryDate || lease.rentReviews.length > 0) continue;
    const days = Math.floor((lease.expiryDate.getTime() - now.getTime()) / 86400000);
    const urgency: ActionQueueItem["urgency"] = days < 90 ? "urgent" : days < 180 ? "this_week" : "this_month";
    items.push({
      id: `tenant:${lease.id}`, type: "tenant",
      category: urgency === "urgent" ? "urgent" : "income_uplift",
      title: `${lease.tenant?.name ?? "Tenant"} lease expires in ${days} days — no renewal started`,
      assetName: lease.asset?.name ?? null, annualValue: lease.passingRent, currencySym: sym,
      urgency, actionLabel: "Start renewal", actionHref: "/tenants",
      rank: rankItem(urgency, lease.passingRent),
    });
  }

  // ── Scout: liked deals without underwriting ───────────────────────────────
  for (const deal of likedDeals) {
    if (deal.underwriting) continue;
    items.push({
      id: `scout:${deal.id}`, type: "scout", category: "value_add",
      title: `Deal liked — underwriting not yet run${deal.address ? ` · ${deal.address}` : ""}`,
      assetName: deal.address ?? null,
      annualValue: deal.askingPrice ? deal.askingPrice * 0.06 : null, currencySym: sym,
      urgency: "this_week", actionLabel: "Run underwriting", actionHref: "/scout",
      rank: rankItem("this_week", deal.askingPrice ? deal.askingPrice * 0.06 : 0),
    });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const ranked = items.sort((a, b) => {
    const aU = a.urgency === "urgent" || a.category === "urgent" ? 1 : 0;
    const bU = b.urgency === "urgent" || b.category === "urgent" ? 1 : 0;
    if (aU !== bU) return bU - aU;
    return b.rank - a.rank;
  });

  return NextResponse.json({
    totalCount:    ranked.length,
    totalValueGbp: ranked.reduce((s, i) => s + (i.annualValue ?? 0), 0),
    hasUrgent:     ranked.some((i) => i.urgency === "urgent" || i.category === "urgent"),
    criticalCount: ranked.filter((i) => i.urgency === "urgent").length,
    items:         ranked,
  });
}

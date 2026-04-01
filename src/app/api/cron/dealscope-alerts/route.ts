/**
 * POST /api/cron/dealscope-alerts
 * Runs every 15 minutes via Vercel Cron.
 * Generates alert events for:
 *   1. Mandate matches — new ScoutDeals matching SavedSearch criteria
 *   2. Watched property changes — price/status changes on watched properties
 *   3. Pipeline follow-ups — overdue follow-up reminders
 *
 * Secured by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let created = 0;

  try {
    // ── 1. Mandate match alerts ──
    const mandates = await prisma.savedSearch.findMany({
      where: { paused: false },
    });

    for (const mandate of mandates) {
      const criteria = mandate.criteria as any;
      if (!criteria) continue;

      const where = buildMandateWhere(criteria);
      // Only deals created in the last 15 minutes
      where.createdAt = { gte: new Date(Date.now() - 15 * 60 * 1000) };

      const newDeals = await prisma.scoutDeal.findMany({
        where,
        select: { id: true, address: true, assetType: true, askingPrice: true },
        take: 10,
      });

      for (const deal of newDeals) {
        // Deduplicate: don't create if alert already exists for this mandate+property
        const exists = await prisma.alertEvent.findFirst({
          where: { mandateId: mandate.id, propertyId: deal.id, type: "signal_match" },
        });
        if (exists) continue;

        await prisma.alertEvent.create({
          data: {
            userId: mandate.userId,
            mandateId: mandate.id,
            propertyId: deal.id,
            type: "signal_match",
            title: `New match: ${deal.address}`,
            description: `${deal.assetType || "Property"} matching your "${mandate.name}" mandate${deal.askingPrice ? ` — £${deal.askingPrice.toLocaleString()}` : ""}`,
            metadata: { mandateName: mandate.name, askingPrice: deal.askingPrice },
          },
        });
        created++;
      }
    }

    // ── 2. Watched property change alerts ──
    const watchEntries = await prisma.propertyWatchlist.findMany({
      include: {
        property: {
          select: {
            id: true,
            address: true,
            askingPrice: true,
            guidePrice: true,
            status: true,
            updatedAt: true,
            dataSources: true,
          },
        },
      },
    });

    for (const entry of watchEntries) {
      const prop = entry.property;
      if (!prop) continue;

      // Only trigger if property updated in last 15 minutes
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (prop.updatedAt < fifteenMinAgo) continue;

      // Check for price change alerts (deduplicated)
      const existingPriceAlert = await prisma.alertEvent.findFirst({
        where: {
          userId: entry.userId,
          propertyId: prop.id,
          type: "price_change",
          createdAt: { gte: fifteenMinAgo },
        },
      });
      if (existingPriceAlert) continue;

      const ds = prop.dataSources as any;
      const priceHistory = ds?.priceHistory;
      if (priceHistory && Array.isArray(priceHistory) && priceHistory.length >= 2) {
        const current = priceHistory[priceHistory.length - 1];
        const previous = priceHistory[priceHistory.length - 2];
        if (current.price !== previous.price) {
          const pctChange = ((current.price - previous.price) / previous.price * 100).toFixed(0);
          await prisma.alertEvent.create({
            data: {
              userId: entry.userId,
              propertyId: prop.id,
              type: "price_change",
              title: `${prop.address} — price ${Number(pctChange) < 0 ? "reduced" : "increased"} ${Math.abs(Number(pctChange))}%`,
              description: `£${previous.price.toLocaleString()} → £${current.price.toLocaleString()}. On your watchlist.`,
              metadata: { oldPrice: previous.price, newPrice: current.price, pctChange },
            },
          });
          created++;
        }
      }

      // Check for status change
      if (prop.status === "removed" || prop.status === "sold") {
        const existingStatusAlert = await prisma.alertEvent.findFirst({
          where: {
            userId: entry.userId,
            propertyId: prop.id,
            type: "status_change",
          },
        });
        if (!existingStatusAlert) {
          await prisma.alertEvent.create({
            data: {
              userId: entry.userId,
              propertyId: prop.id,
              type: "status_change",
              title: `${prop.address} — ${prop.status}`,
              description: `This watched property has been marked as ${prop.status}.`,
              metadata: { status: prop.status },
            },
          });
          created++;
        }
      }
    }

    // ── 3. Pipeline follow-up alerts ──
    const pipelineDeals = await prisma.scoutDeal.findMany({
      where: {
        status: { in: ["approached", "in_negotiation"] },
        updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // No update in 7 days
      },
      select: { id: true, address: true, status: true, userId: true },
      take: 50,
    });

    for (const deal of pipelineDeals) {
      if (!deal.userId) continue;
      const existingFollowup = await prisma.alertEvent.findFirst({
        where: {
          userId: deal.userId,
          propertyId: deal.id,
          type: "followup",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Max 1 per day
        },
      });
      if (existingFollowup) continue;

      await prisma.alertEvent.create({
        data: {
          userId: deal.userId,
          propertyId: deal.id,
          type: "followup",
          title: `${deal.address} — follow-up overdue`,
          description: `No activity for 7+ days. Status: ${deal.status}. Consider following up.`,
          metadata: { status: deal.status },
        },
      });
      created++;
    }

    return NextResponse.json({ ok: true, alertsCreated: created });
  } catch (error) {
    console.error("[dealscope-alerts cron]", error);
    return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}

function buildMandateWhere(criteria: any): any {
  const where: any = { status: { not: "removed" } };

  if (criteria?.assetClasses?.length) {
    where.assetType = { in: criteria.assetClasses };
  }
  if (criteria?.priceMin || criteria?.priceMax) {
    where.OR = [
      { askingPrice: { gte: criteria.priceMin || 0, lte: criteria.priceMax || 999999999 } },
      { guidePrice: { gte: criteria.priceMin || 0, lte: criteria.priceMax || 999999999 } },
    ];
  }
  if (criteria?.epcFilter?.length) {
    where.epcRating = { in: criteria.epcFilter };
  }
  if (criteria?.minScore) {
    where.signalCount = { gte: criteria.minScore };
  }
  if (criteria?.locations?.length) {
    where.address = {
      contains: criteria.locations[0],
      mode: "insensitive",
    };
  }

  return where;
}

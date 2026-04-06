import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get source counts grouped by sourceTag
    const sourceCounts = await prisma.scoutDeal.groupBy({
      by: ["sourceTag"],
      where: { status: "active" },
      _count: {
        id: true,
      },
    });

    // Map to frontend format
    const sources = sourceCounts.map((sc) => ({
      key: sc.sourceTag.toLowerCase().replace(/\s+/g, "_"),
      label: sc.sourceTag,
      count: sc._count.id,
      live: true, // All live for now
    }));

    // Get latest alerts from recent deals
    const recentDeals = await prisma.scoutDeal.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        address: true,
        assetType: true,
        sourceTag: true,
        askingPrice: true,
        signalCount: true,
        createdAt: true,
      },
    });

    const alerts = recentDeals.slice(0, 3).map((deal, idx) => ({
      id: `a${idx + 1}`,
      type: idx === 0 ? "admin" : idx === 1 ? "price" : "deadline",
      title: `${deal.address} — ${deal.sourceTag}`,
      desc: `${deal.assetType} · £${deal.askingPrice?.toLocaleString()}. ${deal.signalCount || 0} signals detected.`,
      score: deal.signalCount ? (deal.signalCount / 5) * 10 : undefined,
      time: getTimeAgo(deal.createdAt),
      unread: idx < 2,
    }));

    return NextResponse.json({
      sources,
      alerts,
    });
  } catch (error) {
    console.error("Home endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch home data" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

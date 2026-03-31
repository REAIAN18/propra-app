import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  try {
    const deals = await prisma.scoutDeal.findMany({ select: { signalType: true } });
    const counts: Record<string, number> = {};
    deals.forEach((deal) => {
      if (Array.isArray(deal.signalType)) {
        deal.signalType.forEach((signal) => {
          counts[signal] = (counts[signal] || 0) + 1;
        });
      }
    });

    const signalMap: Record<string, { name: string; icon: string }> = {
      admin: { name: "Administration", icon: "📋" },
      auction: { name: "Auction", icon: "🔨" },
      mees: { name: "MEES", icon: "⚠️" },
    };

    const sources = Object.entries(counts).map(([signal, count]) => ({
      source: signalMap[signal]?.name || signal,
      count,
      icon: signalMap[signal]?.icon || "📍",
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json([]);
  }
}

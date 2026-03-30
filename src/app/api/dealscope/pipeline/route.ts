import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ deals: [], analytics: {} });
    }

    const userId = session.user.id;

    // Fetch all deals for this user
    const deals = await prisma.scoutDeal.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        approachLetters: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group deals by pipeline stage
    type DealCard = {
      id: string;
      address: string;
      postcode: string;
      assetType: string;
      askingPrice?: number | null;
      guidePrice?: number | null;
      signalCount: number;
      pipelineStage: string;
      pipelineUpdatedAt?: Date | null;
      latestApproachLetter: typeof deals[0]['approachLetters'][0] | null;
    };

    const grouped: Record<string, DealCard[]> = {
      identified: [],
      quick_review: [],
      full_analysis: [],
      approached: [],
      in_negotiation: [],
    };

    deals.forEach((deal) => {
      const stage = deal.pipelineStage || 'identified';
      if (grouped[stage]) {
        grouped[stage].push({
          id: deal.id,
          address: deal.address,
          postcode: extractPostcode(deal.address),
          assetType: deal.assetType,
          askingPrice: deal.askingPrice,
          guidePrice: deal.guidePrice,
          signalCount: deal.signalCount,
          pipelineStage: stage,
          pipelineUpdatedAt: deal.pipelineUpdatedAt,
          latestApproachLetter: deal.approachLetters[0] || null,
        });
      }
    });

    // Calculate analytics
    const totalValue = deals.reduce((sum, d) => sum + (d.askingPrice || d.guidePrice || 0), 0);
    const approachedDeals = deals.filter((d) =>
      ['approached', 'in_negotiation'].includes(d.pipelineStage || '')
    );
    const positiveResponses = approachedDeals.filter(
      (d) =>
        d.approachLetters[0]?.responseStatus === 'interested' ||
        d.approachLetters[0]?.responseStatus === 'maybe'
    );
    const successRate =
      approachedDeals.length > 0 ? (positiveResponses.length / approachedDeals.length) * 100 : 0;

    // Calculate avg time to negotiation
    const negotiatingDeals = deals.filter((d) => d.pipelineStage === 'in_negotiation');
    const avgTimeToNegotiation = calculateAvgTimeToNegotiation(negotiatingDeals);

    const analytics = {
      pipelineValue: totalValue,
      successRate: Math.round(successRate),
      avgTimeToNegotiation,
      totalDeals: deals.length,
    };

    return NextResponse.json({ deals: grouped, analytics });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json({ deals: {}, analytics: {} });
  }
}

function extractPostcode(address: string): string {
  // UK postcode pattern
  const ukMatch = address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i);
  if (ukMatch) return ukMatch[0];

  // US zip code pattern
  const usMatch = address.match(/\d{5}(-\d{4})?/);
  if (usMatch) return usMatch[0];

  return '';
}

function calculateAvgTimeToNegotiation(deals: { pipelineUpdatedAt?: Date | null; createdAt: Date }[]): number {
  if (deals.length === 0) return 0;

  const times = deals
    .filter((d) => d.pipelineUpdatedAt && d.createdAt)
    .map((d) => {
      const diffMs = new Date(d.pipelineUpdatedAt).getTime() - new Date(d.createdAt).getTime();
      return diffMs / (1000 * 60 * 60 * 24); // days
    });

  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
}

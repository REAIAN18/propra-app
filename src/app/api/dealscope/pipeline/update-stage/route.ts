import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const VALID_STAGES = ['identified', 'quick_review', 'full_analysis', 'approached', 'in_negotiation'];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { dealId, stage } = body;

    if (!dealId || !stage) {
      return NextResponse.json({ error: 'Missing dealId or stage' }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Verify the deal belongs to this user
    const deal = await prisma.scoutDeal.findFirst({
      where: {
        id: dealId,
        userId: session.user.id,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Update the pipeline stage
    const updated = await prisma.scoutDeal.update({
      where: { id: dealId },
      data: {
        pipelineStage: stage,
        pipelineUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, deal: updated });
  } catch (error) {
    console.error('Error updating pipeline stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

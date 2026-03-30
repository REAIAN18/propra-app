import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const VALID_RESPONSE_STATUS = ['interested', 'not_interested', 'maybe', 'no_response'];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { dealId, responseStatus, followUpDate, notes } = body;

    if (!dealId) {
      return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
    }

    if (responseStatus && !VALID_RESPONSE_STATUS.includes(responseStatus)) {
      return NextResponse.json({ error: 'Invalid responseStatus' }, { status: 400 });
    }

    const deal = await prisma.scoutDeal.findFirst({
      where: {
        id: dealId,
        userId: session.user.id,
      },
      include: {
        approachLetters: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const latestLetter = deal.approachLetters[0];

    if (!latestLetter) {
      return NextResponse.json({ error: 'No approach letter found for this deal' }, { status: 404 });
    }

    const updated = await prisma.approachLetter.update({
      where: { id: latestLetter.id },
      data: {
        responseStatus: responseStatus || latestLetter.responseStatus,
        followUpDate: followUpDate ? new Date(followUpDate) : latestLetter.followUpDate,
        notes: notes !== undefined ? notes : latestLetter.notes,
      },
    });

    return NextResponse.json({ success: true, letter: updated });
  } catch (error) {
    console.error('Error tracking response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

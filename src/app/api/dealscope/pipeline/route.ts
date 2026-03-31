import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/dealscope/pipeline
// Returns user's pipeline entries or demo data for unauthenticated users
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      // Return demo data for unauthenticated users
      return NextResponse.json({
        entries: [],
        isDemo: true,
      });
    }

    // Get user's pipeline from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userPipelines: {
          select: {
            id: true,
            propertyId: true,
            userId: true,
            stage: true,
            addedAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ entries: [] });
    }

    return NextResponse.json({
      entries: user.userPipelines,
      isDemo: false,
    });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}

// POST /api/dealscope/pipeline
// Create a new pipeline entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId, stage } = body;

    if (!propertyId || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, stage' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Upsert: update if exists, create if not
    const pipeline = await prisma.userPipeline.upsert({
      where: {
        userId_propertyId: {
          userId: user.id,
          propertyId,
        },
      },
      update: {
        stage,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        propertyId,
        stage,
      },
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error) {
    console.error('Error creating pipeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline entry' },
      { status: 500 }
    );
  }
}

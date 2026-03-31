import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface ResponsePayload {
  propertyId: string;
  status: 'interested' | 'not_interested' | 'maybe' | 'no_response';
  followUpDate?: string;
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ResponsePayload;
    const { propertyId, status, followUpDate, notes } = body;

    if (!propertyId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, status' },
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

    // Update pipeline entry with response status
    const pipelineEntry = await prisma.userPipeline.upsert({
      where: {
        userId_propertyId: {
          userId: user.id,
          propertyId,
        },
      },
      update: {
        // Store status and notes in the stage field or create a separate tracking
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        propertyId,
        stage: status,
      },
    });

    const response = {
      id: pipelineEntry.id,
      propertyId,
      status,
      followUpDate,
      notes,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}

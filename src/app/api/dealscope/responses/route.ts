import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface ResponsePayload {
  propertyId: string;
  status: 'interested' | 'not_interested' | 'maybe' | 'no_response';
  followUpDate?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = (await request.json()) as ResponsePayload;
    const { propertyId, status, followUpDate, notes } = body;

    if (!propertyId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, status' },
        { status: 400 }
      );
    }

    // Demo mode: return success if no session
    if (!session?.user?.email) {
      return NextResponse.json({
        id: `response-${Date.now()}`,
        propertyId,
        status,
        note: notes || null,
        followUpDate: followUpDate || null,
        createdAt: new Date().toISOString(),
      }, { status: 201 });
    }

    // Authenticated: find or create pipeline and save response
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find or create pipeline for this property
    let pipeline = await prisma.userPipeline.findFirst({
      where: { userId: user.id, propertyId },
    });

    if (!pipeline) {
      pipeline = await prisma.userPipeline.create({
        data: {
          userId: user.id,
          propertyId,
          stage: 'screening',
        },
      });
    }

    // Save the response
    const response = await prisma.pipelineResponse.create({
      data: {
        pipelineId: pipeline.id,
        status,
        note: notes || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}

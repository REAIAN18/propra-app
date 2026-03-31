import { NextRequest, NextResponse } from 'next/server';

interface ResponsePayload {
  propertyId: string;
  status: 'interested' | 'not_interested' | 'maybe' | 'no_response';
  followUpDate?: string;
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResponsePayload;
    const { propertyId, status, followUpDate, notes } = body;

    if (!propertyId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, status' },
        { status: 400 }
      );
    }

    // TODO: Implement database persistence
    // For now, return success response
    const response = {
      id: `response-${Date.now()}`,
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

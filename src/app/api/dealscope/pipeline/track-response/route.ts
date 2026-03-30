import { NextRequest, NextResponse } from 'next/server';

// POST /api/dealscope/pipeline/track-response - Track response to outreach
export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ success: true, tracked: true });
}

// PATCH /api/dealscope/pipeline/track-response - Update response tracking
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ success: true });
}

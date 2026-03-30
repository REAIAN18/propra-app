import { NextRequest, NextResponse } from 'next/server';

// GET /api/dealscope/pipeline - Get pipeline deals
export async function GET(req: NextRequest) {
  return NextResponse.json({ deals: [] });
}

// POST /api/dealscope/pipeline - Create pipeline entry
export async function POST(req: NextRequest) {
  return NextResponse.json({ success: true }, { status: 201 });
}

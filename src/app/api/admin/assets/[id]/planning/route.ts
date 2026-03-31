import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // TODO: Implement asset planning API
  return NextResponse.json({ asset_id: (await params).id, planning: {} });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // TODO: Implement asset planning API
  return NextResponse.json({ success: true });
}

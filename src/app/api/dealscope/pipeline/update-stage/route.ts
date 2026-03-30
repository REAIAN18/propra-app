import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ success: true });
}

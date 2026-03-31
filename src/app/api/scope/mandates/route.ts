import { NextResponse } from "next/server";
export async function GET() {
  try {
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([]);
  }
}

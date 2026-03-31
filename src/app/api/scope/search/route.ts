import { NextResponse } from "next/server";
export async function GET() {
  try {
    return NextResponse.json({ results: [], total: 0, facets: {} });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

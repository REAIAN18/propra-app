import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
    return NextResponse.json({ id: "placeholder", address: "Extracting..." });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

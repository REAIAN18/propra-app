import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });
    return NextResponse.json({ address: "Extracted...", propertyId: null });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

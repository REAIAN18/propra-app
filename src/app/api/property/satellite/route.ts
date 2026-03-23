import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!lat || !lng || !key) {
    return new NextResponse(null, { status: 404 });
  }

  const rawZoom = req.nextUrl.searchParams.get("zoom");
  const zoom = rawZoom && /^\d+$/.test(rawZoom) ? rawZoom : "18";
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=400x180&maptype=satellite&key=${key}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return new NextResponse(null, { status: res.status });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

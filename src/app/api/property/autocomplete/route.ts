import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  if (!input || input.trim().length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  // Google Places Autocomplete (UK-biased, types: address)
  if (googleKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input.trim());
      url.searchParams.set("types", "address");
      url.searchParams.set("components", "country:gb|country:us");
      url.searchParams.set("language", "en");
      url.searchParams.set("key", googleKey);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" || data.status === "ZERO_RESULTS") {
          return NextResponse.json({
            predictions: (data.predictions ?? []).slice(0, 5).map((p: { description: string; place_id: string }) => ({
              description: p.description,
              placeId: p.place_id,
            })),
          });
        }
      }
    } catch {
      // fall through to Nominatim
    }
  }

  // Fallback: Nominatim search (free, no key)
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", input.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "RealHQ/1.0 (realhq.com)" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        predictions: data.slice(0, 5).map((r: { display_name: string; place_id: string }) => ({
          description: r.display_name,
          placeId: String(r.place_id),
        })),
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ predictions: [] });
}

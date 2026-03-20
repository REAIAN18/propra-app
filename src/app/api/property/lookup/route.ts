import { NextRequest, NextResponse } from "next/server";

const UK_POSTCODE_RE = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: "Address too short" }, { status: 400 });
  }

  const isUK =
    UK_POSTCODE_RE.test(address) ||
    /\bUK\b|\bUnited Kingdom\b|\bEngland\b|\bScotland\b|\bWales\b/i.test(address);

  // Geocode with Nominatim (free, no key needed)
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "Arca/1.0 (arcahq.ai)" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData?.[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    }
  } catch {
    // geocoding failure is non-fatal
  }

  // EPC lookup for UK addresses (requires EPC_API_KEY for authenticated requests)
  let epcRating: string | null = null;
  let floorAreaSqm: number | null = null;
  let floorAreaSqft: number | null = null;

  if (isUK) {
    const epcKey = process.env.EPC_API_KEY;
    if (epcKey) {
      try {
        const epcRes = await fetch(
          `https://epc.opendatacommunities.org/api/v1/domestic/search?address=${encodeURIComponent(address)}&size=1`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Basic ${Buffer.from(`${epcKey}:`).toString("base64")}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (epcRes.ok) {
          const epcData = await epcRes.json();
          const row = epcData?.rows?.[0];
          if (row) {
            epcRating = (row["current-energy-rating"] as string) ?? null;
            const area = row["total-floor-area"];
            if (area) {
              floorAreaSqm = parseFloat(area as string);
              floorAreaSqft = Math.round(floorAreaSqm * 10.764);
            }
          }
        }
      } catch {
        // EPC failure is non-fatal
      }
    }
  }

  const hasSatellite = !!(lat && lng && process.env.GOOGLE_MAPS_API_KEY);

  return NextResponse.json({
    lat,
    lng,
    isUK,
    epcRating,
    floorAreaSqm,
    floorAreaSqft,
    hasSatellite,
  });
}

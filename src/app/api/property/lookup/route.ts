import { NextRequest, NextResponse } from "next/server";

const UK_POSTCODE_RE = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i;

interface AttomProperty {
  propertyType: string | null;
  buildingClass: string | null;
  buildingSqft: number | null;
  landSqft: number | null;
  yearBuilt: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  assessedValueLand: number | null;
  assessedValueImprovement: number | null;
  assessedValueTotal: number | null;
  ownerName: string | null;
  numUnits: number | null;
  numBuildings: number | null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: "Address too short" }, { status: 400 });
  }

  const isUK =
    UK_POSTCODE_RE.test(address) ||
    /\bUK\b|\bUnited Kingdom\b|\bEngland\b|\bScotland\b|\bWales\b/i.test(address);

  // ── Geocode + boundary polygon via Nominatim ──────────────────────────────
  let lat: number | null = null;
  let lng: number | null = null;
  let boundaryPolygon: [number, number][] | null = null;

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&polygon_geojson=1`,
      {
        headers: { "User-Agent": "RealHQ/1.0 (realhq.com)" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData?.[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
        // Extract boundary polygon if present
        const geojson = geoData[0].geojson;
        if (geojson?.type === "Polygon" && Array.isArray(geojson.coordinates?.[0])) {
          boundaryPolygon = geojson.coordinates[0] as [number, number][];
        } else if (geojson?.type === "MultiPolygon" && Array.isArray(geojson.coordinates?.[0]?.[0])) {
          boundaryPolygon = geojson.coordinates[0][0] as [number, number][];
        }
      }
    }
  } catch {
    // geocoding failure is non-fatal
  }

  // ── EPC lookup for UK addresses ───────────────────────────────────────────
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

  // ── ATTOM county assessor data for US addresses ───────────────────────────
  let assessorData: AttomProperty | null = null;

  if (!isUK) {
    const attomKey = process.env.ATTOM_API_KEY;
    if (attomKey && lat && lng) {
      try {
        // ATTOM property detail by lat/lng
        const attomRes = await fetch(
          `https://api.attomdata.com/propertyapi/v1.0.0/property/detail?latitude=${lat}&longitude=${lng}`,
          {
            headers: {
              Accept: "application/json",
              apikey: attomKey,
            },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (attomRes.ok) {
          const attomData = await attomRes.json();
          const prop = attomData?.property?.[0];
          if (prop) {
            const building = prop.building;
            const sale = prop.sale;
            const assessment = prop.assessment;
            const summary = prop.summary;
            assessorData = {
              propertyType: summary?.proptype ?? null,
              buildingClass: building?.bldgclass ?? null,
              buildingSqft: building?.size?.bldgsize ?? null,
              landSqft: summary?.lotsize1 ?? null,
              yearBuilt: summary?.yearbuilt ?? null,
              lastSalePrice: sale?.amount?.saleamt ?? null,
              lastSaleDate: sale?.salesearchdate ?? null,
              assessedValueLand: assessment?.assessed?.assdlandvalue ?? null,
              assessedValueImprovement: assessment?.assessed?.assdimprvalue ?? null,
              assessedValueTotal: assessment?.assessed?.assdttlvalue ?? null,
              ownerName: prop.owner?.owner1?.lastname ?? null,
              numUnits: building?.rooms?.unitscount ?? null,
              numBuildings: building?.count?.bldgcount ?? null,
            };
          }
        }
      } catch {
        // ATTOM failure is non-fatal
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
    boundaryPolygon,
    assessorData,
  });
}

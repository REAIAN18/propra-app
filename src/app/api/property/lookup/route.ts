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

  // ── Geocode via Nominatim ────────────────────────────────────────────────
  let lat: number | null = null;
  let lng: number | null = null;

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
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
      }
    }
  } catch {
    // geocoding failure is non-fatal
  }

  // ── Boundary (Overpass) + assessorData (ATTOM) + EPC — run in parallel ───
  const fetchBoundary = async (): Promise<{ lat: number; lng: number }[] | null> => {
    if (!lat || !lng) return null;
    const inner = async () => {
      for (const radius of [50, 100]) {
        try {
          const overpassQuery = `[out:json];way["building"](around:${radius},${lat},${lng});out geom;`;
          const overpassRes = await fetch(
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (overpassRes.ok) {
            const overpassData = await overpassRes.json();
            const geometry = overpassData?.elements?.[0]?.geometry;
            if (Array.isArray(geometry) && geometry.length > 0) {
              return geometry.map((p: { lat: number; lon: number }) => ({ lat: p.lat, lng: p.lon }));
            }
          }
        } catch {
          // try next radius
        }
      }
      return null;
    };
    return Promise.race([
      inner(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
  };

  const fetchAttom = async (): Promise<AttomProperty | null> => {
    if (isUK) return null;
    const attomKey = process.env.ATTOM_API_KEY;
    if (!attomKey) return null;
    try {
      const commaIdx = address.indexOf(",");
      const address1 = commaIdx > 0 ? address.slice(0, commaIdx).trim() : address.trim();
      const address2 = commaIdx > 0 ? address.slice(commaIdx + 1).trim() : "";
      const attomRes = await fetch(
        `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`,
        {
          headers: { Accept: "application/json", apikey: attomKey },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!attomRes.ok) return null;
      const attomData = await attomRes.json();
      const prop = attomData?.property?.[0];
      if (!prop) return null;
      const building = prop.building;
      const sale = prop.sale;
      const assessment = prop.assessment;
      const summary = prop.summary;
      const buildingSqft: number | null = building?.size?.universalsize ?? building?.size?.bldgsize ?? null;
      const landSqft: number | null = prop.lot?.lotsize2 ?? summary?.lotsize1 ?? null;
      return {
        propertyType: summary?.proptype ?? null,
        buildingClass: building?.summary?.bldgclass ?? building?.bldgclass ?? null,
        buildingSqft,
        landSqft,
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
    } catch {
      return null;
    }
  };

  const fetchEpc = async (): Promise<{ epcRating: string | null; floorAreaSqm: number | null; floorAreaSqft: number | null }> => {
    if (!isUK) return { epcRating: null, floorAreaSqm: null, floorAreaSqft: null };
    const epcKey = process.env.EPC_API_KEY;
    if (!epcKey) return { epcRating: null, floorAreaSqm: null, floorAreaSqft: null };
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
      if (!epcRes.ok) return { epcRating: null, floorAreaSqm: null, floorAreaSqft: null };
      const epcData = await epcRes.json();
      const row = epcData?.rows?.[0];
      if (!row) return { epcRating: null, floorAreaSqm: null, floorAreaSqft: null };
      const epcRating = (row["current-energy-rating"] as string) ?? null;
      const area = row["total-floor-area"];
      const floorAreaSqm = area ? parseFloat(area as string) : null;
      const floorAreaSqft = floorAreaSqm ? Math.round(floorAreaSqm * 10.764) : null;
      return { epcRating, floorAreaSqm, floorAreaSqft };
    } catch {
      return { epcRating: null, floorAreaSqm: null, floorAreaSqft: null };
    }
  };

  // ── Miami-Dade County PA (free, no key) — spatial query by lat/lng ─────────
  const fetchMiamiDade = async (): Promise<Partial<AttomProperty> | null> => {
    if (isUK || !lat || !lng) return null;
    // Only attempt for Miami-Dade bounding box (rough check to avoid spurious calls)
    if (lat < 25.1 || lat > 26.0 || lng < -80.9 || lng > -80.0) return null;
    try {
      const url =
        `https://maps.miamidade.gov/arcgis/rest/services/MD_PropertySearch/MapServer/0/query` +
        `?where=1%3D1&geometry=${encodeURIComponent(`${lng},${lat}`)}` +
        `&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects` +
        `&outFields=SALE_AMOUNT,SALE_DATE,JUST_VALUE,ASSESSED_VAL,OWNER1,BLDG_CLASS,NO_OF_UNIT` +
        `&returnGeometry=false&f=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const data = await res.json();
      const attrs = data?.features?.[0]?.attributes;
      if (!attrs) return null;
      const saleAmt = attrs.SALE_AMOUNT ? Number(attrs.SALE_AMOUNT) : null;
      const assessedVal = attrs.ASSESSED_VAL
        ? Number(attrs.ASSESSED_VAL)
        : attrs.JUST_VALUE
        ? Number(attrs.JUST_VALUE)
        : null;
      return {
        lastSalePrice: saleAmt && saleAmt > 0 ? saleAmt : null,
        lastSaleDate: attrs.SALE_DATE ? String(attrs.SALE_DATE) : null,
        assessedValueTotal: assessedVal && assessedVal > 0 ? assessedVal : null,
        ownerName: attrs.OWNER1 ? String(attrs.OWNER1).trim() : null,
        buildingClass: attrs.BLDG_CLASS ? String(attrs.BLDG_CLASS).trim() : null,
        numUnits: attrs.NO_OF_UNIT ? Number(attrs.NO_OF_UNIT) : null,
      };
    } catch {
      return null;
    }
  };

  const [boundaryPolygon, attomData, epcResult, mdcData] = await Promise.all([
    fetchBoundary(),
    fetchAttom(),
    fetchEpc(),
    fetchMiamiDade(),
  ]);

  // Merge: ATTOM fields take priority; MDC fills any nulls
  const assessorData: AttomProperty | null = attomData
    ? {
        ...attomData,
        lastSalePrice: attomData.lastSalePrice ?? mdcData?.lastSalePrice ?? null,
        lastSaleDate: attomData.lastSaleDate ?? mdcData?.lastSaleDate ?? null,
        assessedValueTotal: attomData.assessedValueTotal ?? mdcData?.assessedValueTotal ?? null,
        ownerName: attomData.ownerName ?? mdcData?.ownerName ?? null,
        buildingClass: attomData.buildingClass ?? mdcData?.buildingClass ?? null,
        numUnits: attomData.numUnits ?? mdcData?.numUnits ?? null,
      }
    : mdcData
    ? {
        propertyType: null,
        buildingClass: mdcData.buildingClass ?? null,
        buildingSqft: null,
        landSqft: null,
        yearBuilt: null,
        lastSalePrice: mdcData.lastSalePrice ?? null,
        lastSaleDate: mdcData.lastSaleDate ?? null,
        assessedValueLand: null,
        assessedValueImprovement: null,
        assessedValueTotal: mdcData.assessedValueTotal ?? null,
        ownerName: mdcData.ownerName ?? null,
        numUnits: mdcData.numUnits ?? null,
        numBuildings: null,
      }
    : null;

  const { epcRating, floorAreaSqm, floorAreaSqft } = epcResult;

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

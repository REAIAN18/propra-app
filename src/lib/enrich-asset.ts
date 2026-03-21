import { prisma } from "@/lib/prisma";

const UK_RE = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}|\bUK\b|\bUnited Kingdom\b|\bEngland\b|\bScotland\b|\bWales\b/i;
const UK_POSTCODE_RE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i;

/**
 * Fire-and-forget background enrichment after asset creation.
 * - Geocodes via Google Maps API (primary) or Nominatim (fallback)
 * - Fetches EPC rating + expiry for UK properties (non-domestic endpoint for commercial)
 * Never throws — logs errors to console only.
 */
export async function enrichAsset(
  assetId: string,
  address: string,
  country?: string | null
): Promise<void> {
  try {
    const existing = await prisma.userAsset.findUnique({
      where: { id: assetId },
      select: { latitude: true, longitude: true, epcRating: true, epcFetched: true, country: true, postcode: true },
    });
    if (!existing) return;

    const isUK = (existing.country ?? country) === "UK" || UK_RE.test(address);
    const updates: Record<string, unknown> = {};

    // Geocode if lat/lng missing
    if (!existing.latitude || !existing.longitude) {
      const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
      let geocoded = false;

      // Primary: Google Maps Geocoding API
      if (mapsKey) {
        try {
          const gRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (gRes.ok) {
            const gData = await gRes.json();
            const result = gData?.results?.[0];
            if (result) {
              updates.latitude = result.geometry.location.lat;
              updates.longitude = result.geometry.location.lng;
              updates.formattedAddress = result.formatted_address ?? undefined;
              // Extract postcode from address_components
              const pcComp = result.address_components?.find((c: { types: string[] }) =>
                c.types.includes("postal_code")
              );
              if (pcComp && !existing.postcode) updates.postcode = pcComp.long_name;
              geocoded = true;
            }
          }
        } catch {
          console.error("[enrichAsset] Google Maps geocoding failed for", assetId);
        }
      }

      // Fallback: Nominatim
      if (!geocoded) {
        try {
          const nRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
            {
              headers: { "User-Agent": "Arca/1.0 (arca.ai)" },
              signal: AbortSignal.timeout(4000),
            }
          );
          if (nRes.ok) {
            const nData = await nRes.json();
            if (nData?.[0]) {
              updates.latitude = parseFloat(nData[0].lat);
              updates.longitude = parseFloat(nData[0].lon);
              updates.formattedAddress = nData[0].display_name ?? undefined;
              const pc = nData[0].address?.postcode;
              if (pc && !existing.postcode) updates.postcode = pc;
            }
          }
        } catch {
          console.error("[enrichAsset] Nominatim geocoding failed for", assetId);
        }
      }
    }

    // EPC lookup for UK assets not yet fetched
    if (isUK && !existing.epcFetched) {
      const epcKey = process.env.EPC_API_KEY;
      if (epcKey) {
        // Extract postcode for EPC query — more accurate than full address
        const postcodeMatch = existing.postcode ?? UK_POSTCODE_RE.exec(address)?.[1];
        const epcQuery = postcodeMatch
          ? `postcode=${encodeURIComponent(postcodeMatch)}&size=5`
          : `address=${encodeURIComponent(address)}&size=1`;
        const authHeader = `Basic ${Buffer.from(`${epcKey}:`).toString("base64")}`;

        // Try non-domestic (commercial) first, fall back to domestic
        for (const segment of ["non-domestic", "domestic"] as const) {
          try {
            const epcRes = await fetch(
              `https://epc.opendatacommunities.org/api/v1/${segment}/search?${epcQuery}`,
              {
                headers: { Accept: "application/json", Authorization: authHeader },
                signal: AbortSignal.timeout(5000),
              }
            );
            if (!epcRes.ok) continue;
            const epcData = await epcRes.json();
            const row = epcData?.rows?.[0];
            if (!row) continue;

            if (segment === "non-domestic") {
              // Non-domestic fields: asset-rating-band, or-assessment-end-date
              if (row["asset-rating-band"]) {
                updates.epcRating = (row["asset-rating-band"] as string).toUpperCase();
              }
              if (row["or-assessment-end-date"]) {
                const expiry = new Date(row["or-assessment-end-date"] as string);
                if (!isNaN(expiry.getTime())) updates.epcExpiry = expiry;
              }
            } else {
              // Domestic fields: current-energy-rating, lodgement-datetime
              if (row["current-energy-rating"]) {
                updates.epcRating = row["current-energy-rating"] as string;
              }
              // Domestic certs are valid 10 years from lodgement
              if (row["lodgement-datetime"] && !updates.epcExpiry) {
                const lodged = new Date(row["lodgement-datetime"] as string);
                if (!isNaN(lodged.getTime())) {
                  lodged.setFullYear(lodged.getFullYear() + 10);
                  updates.epcExpiry = lodged;
                }
              }
            }
            if (updates.epcRating) break; // got a result — no need to try other segment
          } catch {
            console.error(`[enrichAsset] EPC ${segment} fetch failed for`, assetId);
          }
        }
      }
      // Mark as fetched regardless — prevents hammering the API on retry
      updates.epcFetched = true;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.userAsset.update({ where: { id: assetId }, data: updates });
    }
  } catch {
    console.error("[enrichAsset] unexpected error for", assetId);
  }
}

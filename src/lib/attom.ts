import { prisma } from "@/lib/prisma";

// ATTOM Data API client — comparable sales for US (FL) properties.
// Free trial: https://api.developer.attomdata.com
// Requires ATTOM_API_KEY env var. No-ops when key is absent.
//
// Stores results in PropertyComparable table (cache). Re-fetches are skipped
// if comparables already exist for the asset (enrichment runs once on asset create).

const ATTOM_BASE = "https://api.developer.attomdata.com";

interface AttomSaleComp {
  identifier?: { attomId?: string };
  address?: { line1?: string; line2?: string; postal1?: string };
  building?: { size?: { universalsize?: number }; yearBuilt?: number };
  sale?: { amount?: { saleamt?: number; salerecdate?: string } };
}

interface AttomCompsResponse {
  status?: { code?: number; msg?: string };
  property?: AttomSaleComp[];
}

export async function fetchAttomComparables(
  assetId: string,
  address: string,
): Promise<void> {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) return; // feature-flagged — silent no-op

  // Skip if already fetched for this asset
  const existing = await prisma.propertyComparable.count({ where: { assetId } });
  if (existing > 0) return;

  // ATTOM expects address1 = street, address2 = city state zip
  // Best effort: split on first comma
  const commaIdx = address.indexOf(",");
  const address1 = commaIdx > 0 ? address.slice(0, commaIdx).trim() : address;
  const address2 = commaIdx > 0 ? address.slice(commaIdx + 1).trim() : "";

  const url =
    `${ATTOM_BASE}/propertyapi/v1.0.0/salescomparable/snapshot` +
    `?address1=${encodeURIComponent(address1)}` +
    (address2 ? `&address2=${encodeURIComponent(address2)}` : "") +
    `&searchType=Radius&minComps=3&maxComps=8`;

  let data: AttomCompsResponse;
  try {
    const resp = await fetch(url, {
      headers: { apikey: apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      console.error("[attom] comparable sales fetch failed:", resp.status, await resp.text());
      return;
    }
    data = await resp.json();
  } catch (err) {
    console.error("[attom] fetch error:", err);
    return;
  }

  const properties = data?.property ?? [];
  if (!properties.length) {
    console.log("[attom] no comparables returned for", assetId);
    return;
  }

  const rows = properties.map((p) => {
    const sqft = p.building?.size?.universalsize ?? null;
    const saleAmount = p.sale?.amount?.saleamt ?? null;
    const saleDateRaw = p.sale?.amount?.salerecdate ?? null;
    const saleDate = saleDateRaw ? saleDateRaw.slice(0, 10) : null;
    const pricePerSqft = sqft && saleAmount ? Math.round(saleAmount / sqft) : null;
    const addressLine = [p.address?.line1, p.address?.line2, p.address?.postal1]
      .filter(Boolean)
      .join(", ");

    return {
      assetId,
      attomId: p.identifier?.attomId ?? null,
      address: addressLine || "Unknown",
      sqft: sqft ? Math.round(sqft) : null,
      yearBuilt: p.building?.yearBuilt ?? null,
      saleAmount,
      saleDate,
      pricePerSqft,
      source: "attom",
    };
  });

  await prisma.propertyComparable.createMany({ data: rows });
  console.log(`[attom] stored ${rows.length} comparables for asset ${assetId}`);
}

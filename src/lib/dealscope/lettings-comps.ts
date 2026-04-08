/**
 * src/lib/dealscope/lettings-comps.ts
 * Wave O — Lettings comparable evidence with widening postcode fallback.
 *
 * Honest mode: returns ONLY real Letting records linked to a UserAsset. We
 * never fabricate rent comps. Search widens the postcode filter in stages
 * until we find at least one hit:
 *
 *   1. Sector  — e.g. "SS14 3"  (same street cluster)
 *   2. Outcode — e.g. "SS14"    (same town)
 *   3. Area    — e.g. "SS"      (same regional hub, Basildon / Southend)
 *   4. National — same asset type, no postcode filter
 *
 * Every returned comp is tagged with `matchStage` so the UI can tell the
 * user "showing 3 lettings from the wider SS area — no evidence in SS14 3".
 * Callers should surface the stage alongside the result count.
 */

import { prisma } from "@/lib/prisma";

export type MatchStage = "sector" | "outcode" | "area" | "national";

export interface LettingComp {
  address: string;
  type: string;
  sqft: number | null;
  rentPa: number | null;
  rentPsf: number | null;
  lease: string | null;
  date: string | null;
  source: string;
  status: string | null;
  matchStage: MatchStage;
}

export interface LettingsCompsResult {
  comps: LettingComp[];
  matchStage: MatchStage | "none";
  searched: { sector: string; outcode: string; area: string };
  note: string;
}

/**
 * Parse a UK postcode into its sector / outcode / area components.
 * Handles mixed casing and stripped whitespace gracefully.
 */
export function parsePostcode(postcode: string): { sector: string; outcode: string; area: string } {
  const compact = postcode.replace(/\s+/g, "").toUpperCase();
  // Outcode = the portion before the incode (last 3 chars are the incode)
  const outcode = compact.length > 3 ? compact.slice(0, compact.length - 3) : compact;
  // Sector = outcode + first digit of incode, e.g. "SS14" + "3" → "SS14 3"
  const incodeFirst = compact.length > 3 ? compact[compact.length - 3] : "";
  const sector = incodeFirst ? `${outcode} ${incodeFirst}` : outcode;
  // Area = leading letters only, e.g. "SS", "EC"
  const area = outcode.match(/^[A-Z]+/)?.[0] ?? outcode;
  return { sector, outcode, area };
}

/**
 * Pull lettings evidence from internal Letting records joined to UserAsset.
 * Widens the postcode filter until it finds at least one match.
 */
export async function findLettingsComps(
  postcode: string | null | undefined,
  assetType: string | null | undefined,
  monthsBack: number = 24,
): Promise<LettingsCompsResult> {
  const parsed = postcode ? parsePostcode(postcode) : { sector: "", outcode: "", area: "" };
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const baseAssetFilter = assetType
    ? { assetType: { equals: assetType, mode: "insensitive" as const } }
    : {};

  // Runs the query with a given postcode startsWith filter (or none for national).
  async function query(filterPrefix: string | null): Promise<LettingComp[]> {
    try {
      const lettings = await prisma.letting.findMany({
        where: {
          createdAt: { gte: cutoff },
          asset: {
            ...baseAssetFilter,
            ...(filterPrefix
              ? { postcode: { startsWith: filterPrefix, mode: "insensitive" as const } }
              : {}),
          },
        },
        include: {
          asset: { select: { address: true, postcode: true, sqft: true, assetType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return lettings.map((l) => {
        const sqft = l.asset?.sqft ?? null;
        const rentPa = l.agreedRent ?? l.askingRent ?? null;
        const rentPsf = rentPa && sqft ? rentPa / sqft : null;
        return {
          address: l.asset?.address ?? l.asset?.postcode ?? "—",
          type: l.asset?.assetType ?? assetType ?? "—",
          sqft,
          rentPa,
          rentPsf,
          lease: l.agreedTermYears ? `${l.agreedTermYears}yr` : l.leaseTermYears ? `${l.leaseTermYears}yr` : null,
          date: l.createdAt.toISOString().split("T")[0],
          source: "Internal letting",
          status: l.status,
          matchStage: "sector" as MatchStage, // overwritten below
        };
      });
    } catch (err) {
      console.warn("[lettings-comps] query failed:", err);
      return [];
    }
  }

  // Stage 1 — sector (e.g. "SS14 3"). Prisma startsWith needs the no-space form.
  if (parsed.sector) {
    const sectorPrefix = parsed.sector.replace(/\s+/g, "");
    const hits = await query(sectorPrefix);
    if (hits.length > 0) {
      const tagged = hits.map(h => ({ ...h, matchStage: "sector" as MatchStage }));
      return {
        comps: tagged,
        matchStage: "sector",
        searched: parsed,
        note: `${tagged.length} lettings in ${parsed.sector} (sector match)`,
      };
    }
  }

  // Stage 2 — outcode (e.g. "SS14")
  if (parsed.outcode) {
    const hits = await query(parsed.outcode);
    if (hits.length > 0) {
      const tagged = hits.map(h => ({ ...h, matchStage: "outcode" as MatchStage }));
      return {
        comps: tagged,
        matchStage: "outcode",
        searched: parsed,
        note: `No lettings in sector ${parsed.sector} — widened to outcode ${parsed.outcode}: ${tagged.length} hits`,
      };
    }
  }

  // Stage 3 — area (e.g. "SS")
  if (parsed.area) {
    const hits = await query(parsed.area);
    if (hits.length > 0) {
      const tagged = hits.map(h => ({ ...h, matchStage: "area" as MatchStage }));
      return {
        comps: tagged,
        matchStage: "area",
        searched: parsed,
        note: `No lettings in outcode ${parsed.outcode} — widened to area ${parsed.area}: ${tagged.length} hits`,
      };
    }
  }

  // Stage 4 — national (same asset type only)
  const nationalHits = await query(null);
  if (nationalHits.length > 0) {
    const tagged = nationalHits.map(h => ({ ...h, matchStage: "national" as MatchStage }));
    return {
      comps: tagged,
      matchStage: "national",
      searched: parsed,
      note: `No lettings in area ${parsed.area} — showing ${tagged.length} national ${assetType ?? ""} lettings`,
    };
  }

  return {
    comps: [],
    matchStage: "none",
    searched: parsed,
    note: `No internal lettings evidence found at any search stage (sector → outcode → area → national)`,
  };
}

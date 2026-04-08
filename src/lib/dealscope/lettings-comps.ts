/**
 * src/lib/dealscope/lettings-comps.ts
 * Wave O — Lettings comparable evidence.
 *
 * Honest mode: returns ONLY real Letting records linked to a UserAsset that
 * matches the subject postcode sector + asset type. We never fabricate rent
 * comps. If no internal evidence exists, the caller should display the empty
 * state and fall back to regional ERV benchmarks (which are clearly labelled
 * as benchmarks elsewhere in the UI).
 */

import { prisma } from "@/lib/prisma";

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
}

/**
 * Pull lettings evidence from internal Letting records joined to UserAsset.
 *
 * @param postcode subject postcode (full or sector form acceptable)
 * @param assetType normalised asset type (office/retail/industrial/etc.)
 * @param monthsBack how far back to consider lettings as comparable
 */
export async function findLettingsComps(
  postcode: string | null | undefined,
  assetType: string | null | undefined,
  monthsBack: number = 24,
): Promise<LettingComp[]> {
  if (!postcode) return [];
  const compact = postcode.replace(/\s+/g, "").toUpperCase();
  const sectorMatch = compact.match(/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9])[A-Z]{2}$/);
  const sectorPrefix = sectorMatch ? `${sectorMatch[1]} ${sectorMatch[2]}` : compact.slice(0, 4);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  try {
    const lettings = await prisma.letting.findMany({
      where: {
        createdAt: { gte: cutoff },
        asset: {
          postcode: { startsWith: sectorPrefix.split(" ")[0], mode: "insensitive" },
          ...(assetType ? { assetType: { equals: assetType, mode: "insensitive" as const } } : {}),
        },
      },
      include: {
        asset: {
          select: {
            address: true,
            postcode: true,
            sqft: true,
            assetType: true,
          },
        },
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
      };
    });
  } catch (err) {
    console.warn("[lettings-comps] query failed:", err);
    return [];
  }
}

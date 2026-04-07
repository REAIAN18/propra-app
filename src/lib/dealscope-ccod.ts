/**
 * src/lib/dealscope-ccod.ts
 * CCOD (Companies Owning Property) lookups from Land Registry data.
 *
 * Finds companies that own a specific property or properties owned by a company.
 */

import { prisma } from '@/lib/prisma';

/**
 * Normalise a UK postcode into the canonical "AB1 2CD" form expected by
 * Land Registry CCOD rows. Accepts raw user input like "ab12cd" / "AB1  2CD".
 * Returns null if the input doesn't resemble a UK postcode.
 */
function normaliseUkPostcode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  // UK postcode: 1-2 letters + 1-2 digits (+ optional letter), then 1 digit + 2 letters
  const m = compact.match(/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

/**
 * Score how well a candidate CCOD address line matches the scraped listing
 * address. We do a simple token-overlap score (shared alphanumeric tokens /
 * total tokens of the shorter one). Any score ≥ 0.3 is considered a plausible
 * match — CCOD lines are often abbreviated ("FLAT 3, 12 HIGH STREET") so we
 * can't require exact containment.
 */
function addressOverlap(a: string, b: string): number {
  const tok = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length >= 2);
  const A = new Set(tok(a));
  const B = new Set(tok(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.min(A.size, B.size);
}

export interface OwnershipRecord {
  titleNumber: string;
  companyNumber: string;
  companyName: string;
  postcode: string;
}

/**
 * Find companies that own a property by postcode and address.
 *
 * @param address Full property address
 * @param postcode Property postcode
 * @returns Array of company ownership records for that property
 */
export async function findOwnersByAddress(
  address: string,
  postcode: string
): Promise<OwnershipRecord[]> {
  try {
    const normPc = normaliseUkPostcode(postcode);
    if (!normPc) return [];
    // Look up by postcode only — CCOD address rows are abbreviated and
    // exact containment rarely matches. We post-filter client-side using a
    // token-overlap score so near-matches ("12 HIGH ST" vs "12 High Street,
    // London W8 4PF") still resolve.
    const all = await prisma.landRegistryCCOD.findMany({
      where: {
        postcode: {
          equals: normPc,
          mode: 'insensitive',
        },
      },
      select: {
        titleNumber: true,
        companyNumber: true,
        companyName: true,
        postcode: true,
        address: true,
      },
      take: 50,
    });

    const ranked = all
      .map((r) => ({ r, score: addressOverlap(address, r.address || '') }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return ranked.map(({ r }) => ({
      titleNumber: r.titleNumber,
      companyNumber: r.companyNumber,
      companyName: r.companyName,
      postcode: r.postcode,
    }));
  } catch (error) {
    console.error('[dealscope-ccod] Error finding owners by address:', error);
    return [];
  }
}

/**
 * Find properties owned by a specific company.
 *
 * @param companyNumber Companies House company number
 * @param postcodeSector Optional postcode sector filter
 * @returns Array of properties owned by the company
 */
export async function findPropertiesByCompany(
  companyNumber: string,
  postcodeSector?: string
): Promise<OwnershipRecord[]> {
  try {
    const results = await prisma.landRegistryCCOD.findMany({
      where: {
        companyNumber: {
          equals: companyNumber,
          mode: 'insensitive',
        },
        postcodeSector: postcodeSector
          ? {
              equals: postcodeSector,
              mode: 'insensitive',
            }
          : undefined,
      },
      select: {
        titleNumber: true,
        companyNumber: true,
        companyName: true,
        postcode: true,
      },
      take: 50, // Limit to 50 properties
    });

    return results;
  } catch (error) {
    console.error('[dealscope-ccod] Error finding properties by company:', error);
    return [];
  }
}

/**
 * Get company details from first ownership record.
 * Useful for quick owner identification.
 */
export async function getCompanyOwner(
  address: string,
  postcode: string
): Promise<{ companyNumber: string; companyName: string } | null> {
  try {
    const normPc = normaliseUkPostcode(postcode);
    if (!normPc) return null;
    // Find all CCOD rows in the same postcode, then pick the best address
    // match by token overlap. If multiple rows tie at the top (common for
    // mixed-use buildings), return the first — the enrich pipeline only
    // needs one representative owner for display.
    const candidates = await prisma.landRegistryCCOD.findMany({
      where: {
        postcode: {
          equals: normPc,
          mode: 'insensitive',
        },
      },
      select: {
        companyNumber: true,
        companyName: true,
        address: true,
      },
      take: 50,
    });
    if (!candidates.length) return null;

    // If there's only one owner in this postcode, return it even without
    // address match — whole-postcode ownership (e.g. a single freehold
    // block) is a valid signal.
    if (candidates.length === 1) {
      return {
        companyNumber: candidates[0].companyNumber,
        companyName: candidates[0].companyName,
      };
    }

    const best = candidates
      .map((c) => ({ c, score: addressOverlap(address, c.address || '') }))
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.score >= 0.3) {
      return {
        companyNumber: best.c.companyNumber,
        companyName: best.c.companyName,
      };
    }
    return null;
  } catch (error) {
    console.error('[dealscope-ccod] Error getting company owner:', error);
    return null;
  }
}

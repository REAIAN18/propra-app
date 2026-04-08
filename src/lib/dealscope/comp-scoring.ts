/**
 * src/lib/dealscope/comp-scoring.ts
 * Wave Q — Score and stamp provenance on each comparable.
 *
 * Each comp gets a 0-100 quality score driven by:
 *   - Recency  (exponential decay; <6mo = full score, >24mo = 0)
 *   - Size match (linear penalty as |Δsqft| grows vs subject)
 *   - Source weight (Land Registry > scraped agent listing > generic)
 *
 * Plus an explicit `provenance` block (source name + dataset + retrieval date)
 * so the dossier never shows a comp without showing where it came from.
 */

export interface ScorableComp {
  address?: string | null;
  postcode?: string | null;
  price?: number | null;
  sqft?: number | null;
  date?: string | Date | null;
  source?: string | null;
  pricePerSqft?: number | null;
  [key: string]: unknown;
}

export interface ScoredComp extends ScorableComp {
  score: number; // 0-100
  scoreBreakdown: { recency: number; size: number; source: number };
  provenance: { source: string; dataset: string; retrievedAt: string };
}

const SOURCE_WEIGHTS: Record<string, { weight: number; dataset: string }> = {
  "land registry ppd": { weight: 30, dataset: "HM Land Registry Price Paid Data" },
  "land registry":     { weight: 30, dataset: "HM Land Registry Price Paid Data" },
  "rightmove":         { weight: 20, dataset: "Rightmove agent listing (scraped)" },
  "costar":            { weight: 28, dataset: "CoStar (subscriber)" },
  "internal letting":  { weight: 26, dataset: "Internal Letting record" },
  "default":           { weight: 18, dataset: "Unverified third-party" },
};

function recencyScore(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;
  const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
  if (months < 0) return 0;
  if (months <= 6) return 40;
  if (months <= 12) return 30;
  if (months <= 24) return 18;
  if (months <= 36) return 8;
  return 0;
}

function sizeScore(compSqft: number | null | undefined, subjectSqft: number | null | undefined): number {
  if (!compSqft || !subjectSqft || subjectSqft <= 0) return 10; // unknown — neutral
  const delta = Math.abs(compSqft - subjectSqft) / subjectSqft;
  if (delta <= 0.10) return 30;
  if (delta <= 0.20) return 22;
  if (delta <= 0.35) return 14;
  if (delta <= 0.50) return 6;
  return 0;
}

function sourceLookup(source: string | null | undefined) {
  if (!source) return SOURCE_WEIGHTS.default;
  const key = source.toLowerCase();
  for (const k of Object.keys(SOURCE_WEIGHTS)) {
    if (key.includes(k)) return SOURCE_WEIGHTS[k];
  }
  return SOURCE_WEIGHTS.default;
}

/** Score and stamp provenance on a list of comparables. */
export function scoreAndStampComps<T extends ScorableComp>(
  comps: T[],
  subjectSqft: number | null | undefined,
): (T & ScoredComp)[] {
  const retrievedAt = new Date().toISOString().split("T")[0];
  return comps.map((c) => {
    const recency = recencyScore(c.date ?? null);
    const size = sizeScore(c.sqft ?? null, subjectSqft ?? null);
    const src = sourceLookup(c.source ?? null);
    const total = Math.max(0, Math.min(100, recency + size + src.weight));
    return {
      ...c,
      score: total,
      scoreBreakdown: { recency, size, source: src.weight },
      provenance: {
        source: c.source ?? "Unverified third-party",
        dataset: src.dataset,
        retrievedAt,
      },
    } as T & ScoredComp;
  });
}

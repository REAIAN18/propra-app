/**
 * src/lib/tenant-health.ts
 * Composite tenant health score for RealHQ Wave 2.
 * Replaces the Wave 1 single-dimension score (days-to-expiry only).
 *
 * Scoring weights:
 *   40% — Days to expiry (lease term certainty)
 *   30% — Payment history (last 12 periods)
 *   20% — Covenant quality (Companies House / unknown)
 *   10% — Sector health (demand outlook for tenant's industry)
 *
 * Returns a 0–100 score. Higher = healthier tenant relationship.
 */

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface HealthScoreInputs {
  daysToExpiry: number | null;
  leaseStatus: string;
  /** Last 12 payment period statuses. "paid" | "late" | "partial" | "missed" */
  payments: { status: string }[];
  covenantGrade: "strong" | "satisfactory" | "weak" | "unknown";
  /** Tenant sector for demand weighting */
  sector: string | null;
}

// ---------------------------------------------------------------------------
// SECTOR HEALTH — demand outlook by sector
// ---------------------------------------------------------------------------

/**
 * Returns a 0–10 sector health score based on structural demand outlook.
 * SE UK logistics + FL industrial score highest (strong owner-operator market).
 * Retail scores lowest (structural headwinds from e-commerce).
 */
export function getSectorHealthScore(sector: string | null): number {
  const scores: Record<string, number> = {
    logistics:      10,
    industrial:      9,
    warehouse:       9,
    manufacturing:   8,
    flex:            8,
    office:          6,  // hybrid working pressure
    retail:          4,  // structural headwinds
    other:           6,
  };
  return scores[(sector ?? "other").toLowerCase()] ?? 6;
}

// ---------------------------------------------------------------------------
// COMPOSITE HEALTH SCORE
// ---------------------------------------------------------------------------

/**
 * Calculates a composite tenant health score (0–100).
 *
 * Returns 0 for expired leases.
 * Returns 60 (neutral) when daysToExpiry is unknown.
 */
export function calculateHealthScore(inputs: HealthScoreInputs): number {
  if (inputs.leaseStatus === "expired") return 0;
  if (inputs.daysToExpiry === null) return 60; // no expiry data — neutral

  // ── Component 1: Days to expiry (max 40 points) ─────────────────────────
  const expiryScore =
    inputs.daysToExpiry < 90   ?  5 :
    inputs.daysToExpiry < 180  ? 15 :
    inputs.daysToExpiry < 365  ? 25 :
    inputs.daysToExpiry < 730  ? 35 : 40;

  // ── Component 2: Payment history (max 30 points) ─────────────────────────
  const recent  = inputs.payments.slice(0, 12);
  const onTime  = recent.filter(p => p.status === "paid").length;
  const missed  = recent.filter(p => p.status === "missed").length;
  const total   = recent.length;
  const paymentScore = total === 0
    ? 20  // no history — neutral (20 of 30)
    : Math.min(30, Math.max(0, Math.round(30 * (onTime / total) - 5 * (missed / total))));

  // ── Component 3: Covenant quality (max 20 points) ────────────────────────
  const covenantScore: Record<HealthScoreInputs["covenantGrade"], number> = {
    strong:         20,
    satisfactory:   14,
    weak:            5,
    unknown:        10,  // unknown = neutral
  };

  // ── Component 4: Sector health (max 10 points) ───────────────────────────
  const sectorScore = getSectorHealthScore(inputs.sector);

  return Math.min(100, Math.max(0,
    expiryScore + paymentScore + covenantScore[inputs.covenantGrade] + sectorScore
  ));
}

// ---------------------------------------------------------------------------
// RENEWAL PROBABILITY
// ---------------------------------------------------------------------------

/**
 * Derives a qualitative renewal probability label and percentage from
 * health score and days-to-expiry. Used on the tenants page.
 */
export function calculateRenewalProbability(
  daysToExpiry: number | null,
  healthScore: number
): { label: "High" | "Medium" | "Low" | "Unknown"; pct: number } {
  if (daysToExpiry === null) return { label: "Unknown", pct: 50 };

  // Weight: 60% health score, 40% time pressure
  const timeScore =
    daysToExpiry < 90  ? 20 :
    daysToExpiry < 180 ? 40 :
    daysToExpiry < 365 ? 60 :
    daysToExpiry < 730 ? 80 : 90;

  const pct = Math.round(healthScore * 0.6 + timeScore * 0.4);

  const label =
    pct >= 70 ? "High" :
    pct >= 45 ? "Medium" : "Low";

  return { label, pct };
}

// ---------------------------------------------------------------------------
// LEASE STATUS DERIVATION
// ---------------------------------------------------------------------------

/**
 * Derives the Lease.status string from an expiry date.
 * Used both in materialisation and in the GET /api/user/tenants response.
 */
export function deriveLeaseStatus(
  expiryDate: Date | string | null | undefined
): "active" | "expiring_soon" | "expired" | "vacant" {
  if (!expiryDate) return "vacant";

  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const daysToExpiry = Math.floor((expiry.getTime() - Date.now()) / 86_400_000);

  if (daysToExpiry < 0)   return "expired";
  if (daysToExpiry < 365) return "expiring_soon";
  return "active";
}

// ---------------------------------------------------------------------------
// WAULT COMPUTATION
// ---------------------------------------------------------------------------

/**
 * Computes WAULT (Weighted Average Unexpired Lease Term) in years
 * from a set of leases.
 *
 * WAULT = Σ(sqft × daysToExpiry) / Σ(sqft) / 365
 * Only leases with positive daysToExpiry are included.
 */
export function computeWAULT(leases: { sqft: number; daysToExpiry: number | null }[]): number {
  const occupied = leases.filter(l => l.daysToExpiry !== null && l.daysToExpiry > 0);
  const numerator   = occupied.reduce((s, l) => s + l.sqft * (l.daysToExpiry ?? 0), 0);
  const denominator = occupied.reduce((s, l) => s + l.sqft, 0);
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator / 365) * 10) / 10; // 1 decimal place
}

// ---------------------------------------------------------------------------
// SECTOR INFERENCE
// ---------------------------------------------------------------------------

/**
 * Infers a tenant sector from the tenant name string.
 * Used during lease materialisation when no sector is provided.
 * Returns "other" if no signal is found.
 */
export function inferSector(tenantName: string): string {
  const lower = tenantName.toLowerCase();
  if (/logistic|freight|courier|deliver|transport|haulage/.test(lower)) return "logistics";
  if (/manufactur|engineer|fabricat|assembly/.test(lower))               return "manufacturing";
  if (/retail|store|shop|supermarket|superstore/.test(lower))            return "retail";
  if (/office|consulting|advisory|finance|accountant|legal|law/.test(lower)) return "office";
  if (/flex|studio|co-work|cowork/.test(lower))                          return "flex";
  if (/warehouse|storage|distrib/.test(lower))                           return "warehouse";
  if (/industri/.test(lower))                                            return "industrial";
  return "other";
}

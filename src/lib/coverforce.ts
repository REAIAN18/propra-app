/**
 * CoverForce commercial insurance API client.
 *
 * Feature-flagged: set COVERFORCE_ENABLED=true and COVERFORCE_API_KEY in Railway
 * env vars once credentials arrive from the board (PRO-322 / PRO-320).
 * Until then all calls return { available: false } and the insurance screen
 * falls back to benchmark carrier data automatically.
 */

export type CoverForceQuoteParams = {
  propertyAddress: string;
  propertyType: string; // "office" | "industrial" | "retail" | "warehouse" | "multifamily"
  buildingValue: number; // replacement cost in USD
  squareFootage?: number | null;
  floodZone?: string | null;
  yearBuilt?: number | null;
  annualRevenue?: number | null;
};

export type CoverForceCarrierQuote = {
  carrier: string;
  policyType: string;
  annualPremium: number;
  coverageLimit: number;
  deductible: number;
  amBestRating: string | null;
  effectiveDate: string | null;
  recommended: boolean;
};

export type CoverForceQuoteResult =
  | { available: true; quotes: CoverForceCarrierQuote[]; applicationId: string }
  | { available: false; reason: string };

export async function getCoverForceQuotes(
  params: CoverForceQuoteParams
): Promise<CoverForceQuoteResult> {
  const enabled = process.env.COVERFORCE_ENABLED === "true";
  const apiKey = process.env.COVERFORCE_API_KEY;

  if (!enabled || !apiKey) {
    return { available: false, reason: "CoverForce not configured" };
  }

  try {
    const res = await fetch("https://api.coverforce.com/v1/quotes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        propertyAddress: params.propertyAddress,
        propertyType: params.propertyType,
        buildingValue: params.buildingValue,
        ...(params.squareFootage != null && { squareFootage: params.squareFootage }),
        ...(params.floodZone != null && { floodZone: params.floodZone }),
        ...(params.yearBuilt != null && { yearBuilt: params.yearBuilt }),
        ...(params.annualRevenue != null && { annualRevenue: params.annualRevenue }),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[coverforce] API error:", res.status, errText);
      return { available: false, reason: `CoverForce API error: ${res.status}` };
    }

    const data = await res.json();

    // Normalise response — CoverForce returns a quotes array; field names may vary
    const rawQuotes: unknown[] = Array.isArray(data.quotes) ? data.quotes : [];

    const quotes: CoverForceCarrierQuote[] = rawQuotes.map((q: unknown, i) => {
      const r = q as Record<string, unknown>;
      const annualPremium = Number(r.annualPremium ?? r.premium ?? r.totalPremium ?? 0);
      return {
        carrier: String(r.carrierName ?? r.carrier ?? `Carrier ${i + 1}`),
        policyType: String(r.policyType ?? r.lineOfBusiness ?? "Commercial Property"),
        annualPremium,
        coverageLimit: Number(r.coverageLimit ?? r.buildingLimit ?? r.totalInsuredValue ?? 0),
        deductible: Number(r.deductible ?? r.policyDeductible ?? 0),
        amBestRating: (r.amBestRating ?? r.carrierRating ?? null) as string | null,
        effectiveDate: (r.effectiveDate ?? r.inceptionDate ?? null) as string | null,
        recommended: i === 0, // CoverForce returns quotes sorted by best match
      };
    });

    return {
      available: true,
      quotes,
      applicationId: String(data.applicationId ?? data.quoteId ?? data.id ?? ""),
    };
  } catch (err) {
    console.error("[coverforce] request failed:", err);
    return { available: false, reason: "CoverForce request failed" };
  }
}

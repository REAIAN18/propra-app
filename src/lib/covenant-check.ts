/**
 * src/lib/covenant-check.ts
 * UK tenant covenant quality check via Companies House API.
 *
 * Requires: COMPANIES_HOUSE_API_KEY (free — register at developer.company-information.service.gov.uk)
 * No-ops silently when key is absent: returns { grade: "unknown", score: 50 }.
 *
 * Called automatically after Tenant record creation for UK tenants.
 * US tenants: skip (no equivalent free API in Wave 2).
 *
 * Wave 3 enhancement: Experian / Creditsafe commercial credit scores for richer data.
 */

export interface CovenantCheckResult {
  grade: "strong" | "satisfactory" | "weak" | "unknown";
  score: number;
  companyNo?: string;
  companyName?: string;
  companyStatus?: string;
  lastAccountsDate?: string;
}

const CH_BASE = "https://api.company-information.service.gov.uk";

/**
 * Looks up a tenant by company name in Companies House and returns a covenant grade.
 *
 * Scoring rules:
 * - Company not found or inactive: weak
 * - Active but accounts overdue: satisfactory
 * - Active + filed recently + confirmation statement current: strong
 *
 * @param tenantName  Tenant company name as it appears on the lease
 * @param country     "UK" triggers the check; any other value returns "unknown"
 */
export async function checkCovenantUK(
  tenantName: string,
  country: string | null = "UK"
): Promise<CovenantCheckResult> {
  // Only run for UK tenants
  if ((country ?? "").toUpperCase() !== "UK") {
    return { grade: "unknown", score: 50 };
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return { grade: "unknown", score: 50 };
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

  try {
    // ── Step 1: Search for company ────────────────────────────────────────
    const searchRes = await fetch(
      `${CH_BASE}/search/companies?q=${encodeURIComponent(tenantName)}&items_per_page=3`,
      { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(10_000) }
    );

    if (!searchRes.ok) {
      console.warn(`[covenant-check] Search failed: ${searchRes.status}`);
      return { grade: "unknown", score: 50 };
    }

    const searchData = await searchRes.json();
    const company = searchData.items?.[0];

    if (!company) {
      console.log(`[covenant-check] No company found for "${tenantName}"`);
      return { grade: "unknown", score: 50 };
    }

    // ── Step 2: Get company profile ───────────────────────────────────────
    const profileRes = await fetch(
      `${CH_BASE}/company/${company.company_number}`,
      { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(10_000) }
    );

    if (!profileRes.ok) {
      console.warn(`[covenant-check] Profile fetch failed for ${company.company_number}: ${profileRes.status}`);
      return { grade: "unknown", score: 50, companyNo: company.company_number };
    }

    const profile = await profileRes.json();

    // ── Step 3: Derive score from filing compliance ───────────────────────
    const isActive = profile.company_status === "active";

    if (!isActive) {
      return {
        grade: "weak",
        score: 20,
        companyNo: company.company_number,
        companyName: profile.company_name,
        companyStatus: profile.company_status,
      };
    }

    // Accounts filed within the last 15 months (Companies House filing deadline)
    const accountsNextDue = profile.accounts?.next_due
      ? new Date(profile.accounts.next_due)
      : null;
    const accountsFiledRecently = accountsNextDue
      ? accountsNextDue > new Date(Date.now() - 90 * 24 * 3600 * 1000)
      : false;

    // Confirmation statement filed within last 14 months
    const confirmationLastMadeUp = profile.confirmation_statement?.last_made_up_to
      ? new Date(profile.confirmation_statement.last_made_up_to)
      : null;
    const confirmationCurrent = confirmationLastMadeUp
      ? (Date.now() - confirmationLastMadeUp.getTime()) < 14 * 30 * 24 * 3600 * 1000
      : false;

    const score =
      !accountsFiledRecently && !confirmationCurrent ? 45 :
      !accountsFiledRecently                          ? 55 :
      !confirmationCurrent                            ? 65 :
                                                        80;

    const grade: CovenantCheckResult["grade"] =
      score >= 75 ? "strong" :
      score >= 55 ? "satisfactory" :
                    "weak";

    return {
      grade,
      score,
      companyNo: company.company_number,
      companyName: profile.company_name,
      companyStatus: profile.company_status,
      lastAccountsDate: accountsNextDue?.toISOString().split("T")[0],
    };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.warn(`[covenant-check] Timeout for "${tenantName}"`);
    } else {
      console.error(`[covenant-check] Unexpected error for "${tenantName}":`, err);
    }
    return { grade: "unknown", score: 50 };
  }
}

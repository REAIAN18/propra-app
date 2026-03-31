/**
 * DealScope Companies House Intelligence
 * Get company information from Companies House API for property owners
 *
 * Requires: COMPANIES_HOUSE_API_KEY
 * Free API: api.company-information.service.gov.uk
 */

export interface CompanyIntel {
  companyNumber: string;
  companyName: string;
  companyStatus: string; // active, dissolved, liquidation, administration, etc.
  registeredAddress?: string;
  incorporationDate?: string;
  accountsOverdue: boolean;
  confirmationStatementOverdue: boolean;
  insolventCases: number;
  chargesCount: number;
  distressSignals: string[];
  score: number; // 0-100
}

const CH_BASE = "https://api.company-information.service.gov.uk";

/**
 * Get company intelligence by company number
 */
export async function getCompanyIntel(
  companyNumber: string
): Promise<CompanyIntel | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    console.log("[dealscope-company-intel] COMPANIES_HOUSE_API_KEY not set");
    return null;
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

  try {
    // Fetch company profile
    const profileRes = await fetch(
      `${CH_BASE}/company/${companyNumber}`,
      {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!profileRes.ok) {
      console.warn(
        `[dealscope-company-intel] Profile fetch failed for ${companyNumber}: ${profileRes.status}`
      );
      return null;
    }

    const profile = await profileRes.json() as Record<string, unknown>;

    // Check if accounts are overdue
    const accountsNextDue = profile.accounts
      ? new Date((profile.accounts as Record<string, unknown>).next_due as string)
      : null;
    const accountsOverdue = accountsNextDue
      ? accountsNextDue < new Date()
      : false;

    // Check if confirmation statement is overdue
    const confirmationLastMadeUp = profile.confirmation_statement
      ? new Date(
          (profile.confirmation_statement as Record<string, unknown>)
            .last_made_up_to as string
        )
      : null;
    const confirmationStatementOverdue = confirmationLastMadeUp
      ? Date.now() - confirmationLastMadeUp.getTime() > 14 * 30 * 24 * 3600 * 1000
      : false;

    // Get insolvency info
    let insolventCases = 0;
    const isInLiquidation =
      (profile.company_status as string) === "liquidation";
    const isInAdministration =
      (profile.company_status as string) === "administration";
    const isDissolved =
      (profile.company_status as string) === "dissolved";

    if (isInLiquidation || isInAdministration || isDissolved) {
      insolventCases = 1;
    }

    // Get charges count
    const chargesRes = await fetch(
      `${CH_BASE}/company/${companyNumber}/charges`,
      {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(10_000),
      }
    );

    let chargesCount = 0;
    if (chargesRes.ok) {
      const chargesData = await chargesRes.json() as Record<string, unknown>;
      chargesCount = (chargesData.total_count as number) || 0;
    }

    // Build distress signals
    const distressSignals: string[] = [];
    if (isDissolved) {
      distressSignals.push("Company dissolved");
    } else if (isInAdministration) {
      distressSignals.push("Company in administration");
    } else if (isInLiquidation) {
      distressSignals.push("Company in liquidation");
    }

    if (accountsOverdue) {
      distressSignals.push("Accounts overdue");
    }

    if (confirmationStatementOverdue) {
      distressSignals.push("Confirmation statement overdue");
    }

    if (chargesCount > 0) {
      distressSignals.push(`${chargesCount} charge(s) on assets`);
    }

    // Calculate distress score (0-100, lower = more distressed)
    let score = 100;

    if (isDissolved) {
      score = 10;
    } else if (isInAdministration || isInLiquidation) {
      score = 20;
    } else if ((profile.company_status as string) !== "active") {
      score = 40;
    }

    if (accountsOverdue) score -= 15;
    if (confirmationStatementOverdue) score -= 10;
    if (chargesCount > 2) score -= 20;
    else if (chargesCount > 0) score -= 10;

    score = Math.max(0, score);

    return {
      companyNumber,
      companyName: (profile.company_name as string) || "",
      companyStatus: (profile.company_status as string) || "unknown",
      registeredAddress: (
        profile.registered_office_address as Record<string, unknown> | undefined
      )
        ? Object.entries(
            profile.registered_office_address as Record<string, unknown>
          )
            .map(([, v]) => v)
            .filter(Boolean)
            .join(", ")
        : undefined,
      incorporationDate: profile.date_of_creation
        ? new Date(profile.date_of_creation as string)
            .toISOString()
            .split("T")[0]
        : undefined,
      accountsOverdue,
      confirmationStatementOverdue,
      insolventCases,
      chargesCount,
      distressSignals,
      score,
    };
  } catch (error) {
    console.error(
      `[dealscope-company-intel] Error fetching intel for ${companyNumber}:`,
      error
    );
    return null;
  }
}

/**
 * Search for company by name and get first result
 */
export async function searchCompanyByName(
  companyName: string
): Promise<CompanyIntel | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

  try {
    const searchRes = await fetch(
      `${CH_BASE}/search/companies?q=${encodeURIComponent(
        companyName
      )}&items_per_page=1`,
      {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!searchRes.ok) {
      console.warn(`[dealscope-company-intel] Search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json() as Record<string, unknown>;
    const company = (searchData.items as Array<Record<string, unknown>> | undefined)?.[0];

    if (!company?.company_number) {
      return null;
    }

    return getCompanyIntel(company.company_number as string);
  } catch (error) {
    console.error(
      `[dealscope-company-intel] Error searching for "${companyName}":`,
      error
    );
    return null;
  }
}

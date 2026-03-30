/**
 * DealScope Companies House Integration
 * Extends covenant-check.ts with detailed property owner intelligence.
 *
 * Requires: COMPANIES_HOUSE_API_KEY
 * Rate limit: 600 requests/min (free tier)
 */

const CH_BASE = "https://api.company-information.service.gov.uk";

export interface CompanyProfile {
  companyNumber: string;
  companyName: string;
  status: "active" | "dissolved" | "administration" | "liquidation" | string;
  registeredAddress?: string;
  incorporationDate?: string;
  type?: string;
  sic?: string[];
}

export interface CompanyCharges {
  totalCount: number;
  charges: Array<{
    chargeCode: string;
    status: "satisfied" | "outstanding" | "partially-satisfied";
    chargeNumber: number;
    description?: string;
    classOfCharge?: string;
    dateCreated?: string;
    dateOfCreation?: string;
  }>;
}

export interface CompanyInsolvency {
  cases: Array<{
    caseNumber?: string;
    status: string;
    dateOfInsolvencyEvent?: string;
    notes?: string;
  }>;
}

function getAuthHeader(): string | null {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) return null;
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

/**
 * Get company profile by company number
 */
export async function getCompanyProfile(companyNumber: string): Promise<CompanyProfile | null> {
  const authHeader = getAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(`${CH_BASE}/company/${companyNumber}`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[dealscope-ch] Profile fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json();

    return {
      companyNumber: data.company_number,
      companyName: data.company_name,
      status: data.company_status || "unknown",
      registeredAddress: data.registered_office_address?.address_line_1,
      incorporationDate: data.date_of_creation,
      type: data.type,
      sic: data.sic_codes,
    };
  } catch (error) {
    console.error(`[dealscope-ch] Error fetching company ${companyNumber}:`, error);
    return null;
  }
}

/**
 * Search for company by name
 */
export async function searchCompany(name: string): Promise<CompanyProfile | null> {
  const authHeader = getAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(
      `${CH_BASE}/search/companies?q=${encodeURIComponent(name)}&items_per_page=1`,
      {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      console.warn(`[dealscope-ch] Search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const company = data.items?.[0];

    if (!company) return null;

    return getCompanyProfile(company.company_number) || {
      companyNumber: company.company_number,
      companyName: company.company_name,
      status: company.company_status || "unknown",
    };
  } catch (error) {
    console.error(`[dealscope-ch] Error searching for "${name}":`, error);
    return null;
  }
}

/**
 * Get company charges (mortgages, security interests)
 */
export async function getCompanyCharges(companyNumber: string): Promise<CompanyCharges | null> {
  const authHeader = getAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(`${CH_BASE}/company/${companyNumber}/charges`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 404) return { totalCount: 0, charges: [] };
      console.warn(`[dealscope-ch] Charges fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;

    return {
      totalCount: (data.total_count as number) || 0,
      charges: ((data.items as Array<Record<string, unknown>>) || []).map((c: Record<string, unknown>) => ({
        chargeCode: c.charge_code,
        status: c.status,
        chargeNumber: c.charge_number,
        description: c.description,
        classOfCharge: c.class_of_charge,
        dateCreated: c.date_created,
        dateOfCreation: c.date_of_creation,
      })),
    };
  } catch (error) {
    console.error(`[dealscope-ch] Error fetching charges for ${companyNumber}:`, error);
    return null;
  }
}

/**
 * Get company insolvency information
 */
export async function getCompanyInsolvency(companyNumber: string): Promise<CompanyInsolvency | null> {
  const authHeader = getAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(`${CH_BASE}/company/${companyNumber}/insolvency`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 404) return { cases: [] };
      console.warn(`[dealscope-ch] Insolvency fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;

    return {
      cases: ((data.cases as Array<Record<string, unknown>>) || []).map((c: Record<string, unknown>) => ({
        caseNumber: c.case_number,
        status: c.status,
        dateOfInsolvencyEvent: c.date_of_insolvency_event,
        notes: c.notes,
      })),
    };
  } catch (error) {
    console.error(`[dealscope-ch] Error fetching insolvency for ${companyNumber}:`, error);
    return null;
  }
}

/**
 * Get company officers (directors)
 */
export async function getCompanyOfficers(
  companyNumber: string
): Promise<Array<{ name: string; position: string; appointedOn?: string }> | null> {
  const authHeader = getAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(`${CH_BASE}/company/${companyNumber}/officers?items_per_page=100`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      console.warn(`[dealscope-ch] Officers fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;

    return ((data.items as Array<Record<string, unknown>>) || []).map((o: Record<string, unknown>) => ({
      name: o.name,
      position: o.officer_role,
      appointedOn: o.appointed_on,
    }));
  } catch (error) {
    console.error(`[dealscope-ch] Error fetching officers for ${companyNumber}:`, error);
    return null;
  }
}

/**
 * Score a company for distress signals
 */
export function scoreCompanyDistress(profile: CompanyProfile, charges: CompanyCharges | null, insolvency: CompanyInsolvency | null): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 100; // Start at 100, deduct for risk factors

  // Status checks
  if (profile.status === "dissolved") {
    signals.push("Company dissolved");
    score -= 40;
  } else if (profile.status === "administration") {
    signals.push("Company in administration");
    score -= 35;
  } else if (profile.status === "liquidation") {
    signals.push("Company in liquidation");
    score -= 35;
  } else if (profile.status !== "active") {
    signals.push(`Company status: ${profile.status}`);
    score -= 20;
  }

  // Insolvency checks
  if (insolvency && insolvency.cases.length > 0) {
    signals.push(`${insolvency.cases.length} insolvency case(s)`);
    score -= 30;
  }

  // Charges - look for high-risk lenders
  if (charges && charges.totalCount > 0) {
    signals.push(`${charges.totalCount} charge(s) on assets`);
    score -= 10 * Math.min(charges.totalCount, 3); // Deduct up to 30 points

    // Check for non-bank lenders (bridging)
    const hasNonBankCharges = charges.charges.some((c) =>
      c.description?.toLowerCase().includes("bridging") ||
      c.description?.toLowerCase().includes("mezzanine") ||
      c.description?.toLowerCase().includes("private")
    );
    if (hasNonBankCharges) {
      signals.push("Non-bank lender charges (bridging/mezzanine)");
      score -= 20;
    }
  }

  score = Math.max(0, score);

  return { score, signals };
}

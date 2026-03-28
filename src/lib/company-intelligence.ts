/**
 * src/lib/company-intelligence.ts
 * Unified company intelligence API — Sunbiz (FL), Companies House (UK), D&B (US commercial).
 *
 * Auto-populates tenant company data from public registries and commercial databases.
 * Called when a tenant is added or when covenant check is triggered.
 *
 * Integrations:
 * - Sunbiz (FL): Free public API for Florida corporations
 * - Companies House (UK): Already implemented in covenant-check.ts
 * - D&B: Future enhancement (requires paid API key)
 */

import { checkCovenantUK } from "./covenant-check";

export interface CompanyIntelligence {
  companyNumber?: string;
  companyName?: string;
  status?: string; // "active" | "inactive" | "dissolved"
  sector?: string;
  registeredAddress?: string;
  incorporationDate?: string;
  director?: string;
  filingStatus?: "current" | "overdue" | "unknown";
  covenantGrade?: "strong" | "satisfactory" | "weak" | "unknown";
  covenantScore?: number;
  source: "companies_house" | "sunbiz" | "dun_bradstreet" | "manual";
}

/**
 * Fetches company intelligence based on tenant name and location.
 * Routes to the appropriate API based on country/state.
 *
 * @param tenantName - Company name to search
 * @param country - "UK" | "US" | null
 * @param state - US state code (e.g., "FL") for Sunbiz
 */
export async function fetchCompanyIntelligence(
  tenantName: string,
  country: string | null,
  state?: string | null
): Promise<CompanyIntelligence | null> {
  const normalizedCountry = (country ?? "").toUpperCase();

  // UK: Use Companies House via existing covenant-check
  if (normalizedCountry === "UK") {
    return fetchCompaniesHouseData(tenantName);
  }

  // US: Route to state-specific registries
  if (normalizedCountry === "US") {
    const normalizedState = (state ?? "").toUpperCase();

    if (normalizedState === "FL") {
      return fetchSunbizData(tenantName);
    }

    // Future: Add more state registries
    // NY: Department of State Corporation Search
    // CA: California Business Search
    // TX: Texas Comptroller Business Search

    // Fallback: D&B for US companies (requires API key)
    // return fetchDunBradstreetData(tenantName);
  }

  return null;
}

/**
 * Fetches Companies House data for UK companies.
 * Wraps existing covenant-check.ts logic.
 */
async function fetchCompaniesHouseData(tenantName: string): Promise<CompanyIntelligence | null> {
  const covenantResult = await checkCovenantUK(tenantName, "UK");

  if (covenantResult.grade === "unknown" && !covenantResult.companyNo) {
    return null;
  }

  return {
    companyNumber: covenantResult.companyNo,
    companyName: covenantResult.companyName,
    status: covenantResult.companyStatus,
    filingStatus: covenantResult.lastAccountsDate ? "current" : "unknown",
    covenantGrade: covenantResult.grade,
    covenantScore: covenantResult.score,
    source: "companies_house",
  };
}

/**
 * Fetches Florida corporation data from Sunbiz.org.
 * Free public API for Florida corporations and LLCs.
 *
 * API docs: https://dos.myflorida.com/sunbiz/search/
 * Note: Sunbiz doesn't have a formal REST API, but we can scrape or use their search interface.
 * For now, this is a placeholder for the integration.
 */
async function fetchSunbizData(tenantName: string): Promise<CompanyIntelligence | null> {
  // TODO: Implement Sunbiz scraping or API integration
  // Sunbiz provides:
  // - Document number (entity ID)
  // - FEI/EIN number
  // - Status (active/inactive)
  // - Principal address
  // - Registered agent
  // - Filing date

  console.log(`[company-intelligence] Sunbiz lookup for "${tenantName}" not yet implemented`);
  return null;
}

/**
 * Fetches D&B (Dun & Bradstreet) data for US companies.
 * Requires paid API key.
 *
 * D&B provides:
 * - DUNS number
 * - Credit rating
 * - Financial risk score
 * - Industry classification
 * - Company size/revenue
 */
async function fetchDunBradstreetData(tenantName: string): Promise<CompanyIntelligence | null> {
  const apiKey = process.env.DUN_BRADSTREET_API_KEY;

  if (!apiKey) {
    console.log(`[company-intelligence] D&B API key not configured`);
    return null;
  }

  // TODO: Implement D&B API integration
  // Endpoint: https://api.dnb.com/v1/match/cleanseMatch
  // Requires authentication + company search + match logic

  console.log(`[company-intelligence] D&B lookup for "${tenantName}" not yet implemented`);
  return null;
}

/**
 * Auto-populate tenant record with company intelligence.
 * Updates Tenant model with fetched data.
 */
export async function autoPopulateTenantIntelligence(
  tenantId: string,
  tenantName: string,
  country: string | null,
  state?: string | null
): Promise<void> {
  const intelligence = await fetchCompanyIntelligence(tenantName, country, state);

  if (!intelligence) {
    console.log(`[company-intelligence] No data found for tenant: ${tenantName}`);
    return;
  }

  // Update Tenant record in database
  const { prisma } = await import("./prisma");

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        companyNumber: intelligence.companyNumber,
        sector: intelligence.sector,
        covenantGrade: intelligence.covenantGrade,
        covenantScore: intelligence.covenantScore,
        covenantCheckedAt: new Date(),
      },
    });

    console.log(`[company-intelligence] Updated tenant ${tenantId} with ${intelligence.source} data`);
  } catch (error) {
    console.error(`[company-intelligence] Failed to update tenant ${tenantId}:`, error);
    throw error;
  }
}

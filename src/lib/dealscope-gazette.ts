/**
 * DealScope London Gazette Integration
 * Query insolvency notices: administrations, liquidations, receiverships, etc.
 *
 * Free API: thegazette.co.uk/api
 * No API key required.
 */

const GAZETTE_BASE = "https://www.thegazette.co.uk/api/search.json";

export interface GazetteNotice {
  title: string;
  description: string;
  noticeType: string; // Winding-up, Administration, Receivership, etc.
  publicationDate: string;
  category: string;
  url?: string;
}

/**
 * Search Gazette for insolvency notices by company name
 */
export async function searchGazetteByCompanyName(
  companyName: string
): Promise<GazetteNotice[]> {
  try {
    const params = new URLSearchParams({
      q: companyName,
      category: "Insolvencies",
      page: "1",
      page_size: "50",
      sort: "date",
      results_page_size: "50",
    });

    const res = await fetch(`${GAZETTE_BASE}?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[dealscope-gazette] Search failed: ${res.status}`);
      return [];
    }

    const data = await res.json() as Record<string, unknown>;
    const results = (data.results || []) as Array<Record<string, unknown>>;

    return results.map((notice: Record<string, unknown>) => ({
      title: notice.title || "",
      description: notice.description || "",
      noticeType: extractNoticeType(notice.title || ""),
      publicationDate: notice.publication_date || notice.date_published,
      category: notice.category || "Insolvency",
      url: notice.url || notice.gazette_url,
    }));
  } catch (error) {
    console.error(`[dealscope-gazette] Error searching for "${companyName}":`, error);
    return [];
  }
}

/**
 * Extract notice type from title
 */
function extractNoticeType(title: string): string {
  const lower = title.toLowerCase();

  if (lower.includes("winding-up")) return "Winding-up";
  if (lower.includes("administration")) return "Administration";
  if (lower.includes("receivership") || lower.includes("receiver")) return "Receivership";
  if (lower.includes("cva") || lower.includes("voluntary arrangement")) return "CVA";
  if (lower.includes("strike")) return "Strike-off";
  if (lower.includes("dissolution")) return "Dissolution";
  if (lower.includes("petition")) return "Petition";
  if (lower.includes("probate")) return "Probate";

  return "Insolvency Notice";
}

/**
 * Score Gazette findings for distress
 */
export function scoreGazetteDistress(
  notices: GazetteNotice[]
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 100;

  if (!notices.length) {
    return { score, signals };
  }

  // Group by type
  const byType = notices.reduce(
    (acc, notice) => {
      acc[notice.noticeType] = (acc[notice.noticeType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Critical notices
  if (byType["Winding-up"]) {
    signals.push(`${byType["Winding-up"]} winding-up notice(s)`);
    score -= 40;
  }
  if (byType["Administration"]) {
    signals.push(`${byType["Administration"]} administration notice(s)`);
    score -= 35;
  }
  if (byType["Receivership"]) {
    signals.push(`${byType["Receivership"]} receivership notice(s)`);
    score -= 30;
  }

  // Moderate notices
  if (byType["CVA"]) {
    signals.push(`${byType["CVA"]} CVA notice(s)`);
    score -= 15;
  }
  if (byType["Petition"]) {
    signals.push(`${byType["Petition"]} petition notice(s)`);
    score -= 20;
  }

  return { score: Math.max(0, score), signals };
}

/**
 * src/lib/macro-rates.ts
 * Wave J — fetchers for macro indicators used by MarketTab + IC memo.
 *
 * Sources are all free and key-less unless noted:
 * - SOFR via FRED (existing, requires FRED_API_KEY)
 * - BoE Bank Rate via Bank of England statistical interactive DB (no key)
 * - ONS CPIH (CPI inc. owner-occupier housing) via ONS API (no key)
 * - ONS GDP qoq via ONS API (no key)
 *
 * Each fetcher returns { value, date } or null on failure. The cron route
 * upserts into MacroRate (series, date) → value.
 */

export interface MacroObservation {
  series: string;
  value: number;
  date: string; // YYYY-MM-DD
}

/**
 * Bank of England Bank Rate (IUDBEDR series).
 * Statistical interactive DB CSV endpoint: VPD=Y returns just the latest value
 * via the IUDBEDR series id. We use the iadb-fromshowcolumns endpoint which
 * returns CSV; we parse the last row.
 */
export async function fetchBoEBaseRate(): Promise<MacroObservation | null> {
  // Bank of England's statistical DB "asset" CSV download for IUDBEDR.
  // Date range covers the last 30 days; we take the most recent observation.
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const fromDate = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const fyyyy = fromDate.getUTCFullYear();
  const fmm = String(fromDate.getUTCMonth() + 1).padStart(2, "0");
  const fdd = String(fromDate.getUTCDate()).padStart(2, "0");

  const url =
    `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?` +
    `csv.x=yes&Datefrom=${fdd}/${fmm}/${fyyyy}&Dateto=${dd}/${mm}/${yyyy}&SeriesCodes=IUDBEDR&CSVF=TT&UsingCodes=Y&VPD=Y&VFD=N`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn("[macro-rates] BoE fetch failed:", res.status);
      return null;
    }
    const csv = await res.text();
    const rows = csv.trim().split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) return null;
    const last = rows[rows.length - 1];
    const [dateRaw, valRaw] = last.split(",");
    if (!dateRaw || !valRaw) return null;
    const value = parseFloat(valRaw);
    if (Number.isNaN(value)) return null;
    // BoE format DD MMM YY → YYYY-MM-DD
    const iso = (() => {
      const m = dateRaw.match(/(\d{1,2})\s+(\w{3})\s+(\d{2,4})/);
      if (!m) return new Date().toISOString().split("T")[0];
      const months: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
      };
      const day = m[1].padStart(2, "0");
      const mon = months[m[2]] ?? "01";
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${year}-${mon}-${day}`;
    })();
    return { series: "BOE_BASE", value, date: iso };
  } catch (err) {
    console.warn("[macro-rates] BoE fetch error:", err);
    return null;
  }
}

/**
 * ONS CPIH 12-month rate (D7G7 series). Endpoint returns JSON; we read the
 * latest period from `months`.
 */
export async function fetchCPI(): Promise<MacroObservation | null> {
  const url = "https://api.ons.gov.uk/timeseries/d7g7/dataset/mm23/data";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { months?: { date: string; value: string }[] };
    const last = data.months?.[data.months.length - 1];
    if (!last) return null;
    const value = parseFloat(last.value);
    if (Number.isNaN(value)) return null;
    // ONS format "2026 FEB" → 2026-02-01
    const m = last.date.match(/(\d{4})\s+(\w{3})/);
    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const iso = m ? `${m[1]}-${months[m[2].toUpperCase()] ?? "01"}-01` : new Date().toISOString().split("T")[0];
    return { series: "CPI", value, date: iso };
  } catch (err) {
    console.warn("[macro-rates] CPI fetch error:", err);
    return null;
  }
}

/**
 * ONS UK GDP quarter-on-quarter growth rate (IHYQ series).
 */
export async function fetchGDPGrowth(): Promise<MacroObservation | null> {
  const url = "https://api.ons.gov.uk/timeseries/ihyq/dataset/qna/data";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { quarters?: { date: string; value: string }[] };
    const last = data.quarters?.[data.quarters.length - 1];
    if (!last) return null;
    const value = parseFloat(last.value);
    if (Number.isNaN(value)) return null;
    // "2026 Q1" → 2026-01-01 (use first month of quarter)
    const m = last.date.match(/(\d{4})\s+Q(\d)/);
    const iso = m
      ? `${m[1]}-${String((parseInt(m[2], 10) - 1) * 3 + 1).padStart(2, "0")}-01`
      : new Date().toISOString().split("T")[0];
    return { series: "GDP_QOQ", value, date: iso };
  } catch (err) {
    console.warn("[macro-rates] GDP fetch error:", err);
    return null;
  }
}

/** Convenience batch fetch — used by the unified macro-rates cron and MarketTab. */
export async function fetchAllMacroRates(): Promise<MacroObservation[]> {
  const results = await Promise.allSettled([
    fetchBoEBaseRate(),
    fetchCPI(),
    fetchGDPGrowth(),
  ]);
  return results
    .filter((r): r is PromiseFulfilledResult<MacroObservation> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

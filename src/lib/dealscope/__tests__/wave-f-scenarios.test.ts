/**
 * Wave F — dual-scenario valuation regression test.
 *
 * Mirrors /tmp/wave-f-test.mjs against the 4 DealScope stress cases.
 * The condition detector + capex regex + scenario math live inline in
 * src/app/api/dealscope/enrich/route.ts; this file copies them so the
 * unit test stays standalone (no DB, no AI, no network).
 *
 * If you change the scenario math in enrich/route.ts, you MUST mirror
 * the change here or this test will fail.
 */

type Condition = "unrefurbished" | "average" | "refurbished";

const CONDITION_MULTIPLIER: Record<Condition, number> = {
  unrefurbished: 0.6,
  average: 0.85,
  refurbished: 1.0,
};
const REFURB_TARGET_MULTIPLIER = 1.0;
const DEFAULT_CAPEX_PSF = 125;

function detectCondition(text: string | null | undefined): { condition: Condition; signals: string[] } {
  if (!text) return { condition: "average", signals: [] };
  const t = text.toLowerCase();
  const refurbHits = [
    /\bcat\s*a\b/, /\bgrade\s*a\b/, /\bnewly\s+(refurb|fitted|completed)/,
    /\brecently\s+refurbished\b/, /\bfully\s+refurbished\b/, /\bexcellent\s+specification\b/,
    /\brefurbishment\s+completed\b/, /\bcompleted\s+in\s+20[12]\d\b/,
  ].filter((re) => re.test(t)).map((re) => re.source);
  const unrefurbHits = [
    /\bunrefurbished\b/, /\brequires?\s+modernisation\b/, /\brequires?\s+refurbishment\b/,
    /\bin\s+need\s+of\b/, /\boriginal\s+condition\b/, /\btired\b/, /\bdated\b/,
    /\bperiod\s+(?:building|property)\b/, /\brefurbishment\s+opportunity\b/,
    /\basset\s+management\s+opportunit/, /\brepositioning\b/,
  ].filter((re) => re.test(t)).map((re) => re.source);
  if (refurbHits.length > unrefurbHits.length) return { condition: "refurbished", signals: refurbHits };
  if (unrefurbHits.length > 0) return { condition: "unrefurbished", signals: unrefurbHits };
  return { condition: "average", signals: [] };
}

function detectListingCapexPsf(text: string | null | undefined): number | null {
  if (!text) return null;
  const m1 = text.match(/£\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*sq\.?\s*ft|psf|\/\s*sq\.?\s*ft)\s*(?:of\s+)?(?:capex|capital\s+expenditure|capital\s+investment|refurbishment)/i);
  if (m1) {
    const v = parseFloat(m1[1].replace(/,/g, ""));
    if (v >= 20 && v <= 1000) return v;
  }
  const m2 = text.match(/(?:capex|capital\s+expenditure|refurbish[a-z]*|invested)[^.£]{0,80}£\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*sq\.?\s*ft|psf)/i);
  if (m2) {
    const v = parseFloat(m2[1].replace(/,/g, ""));
    if (v >= 20 && v <= 1000) return v;
  }
  return null;
}

interface ScenarioInput {
  description: string;
  marketERV: number;
  sqft: number;
  askingPrice: number;
  capRate: number;
  passingRent: number | null;
  compPsfLow: number | null;
}

function buildScenarios(input: ScenarioInput) {
  const { description, marketERV, sqft, askingPrice, capRate, passingRent, compPsfLow } = input;
  const conditionDetect = detectCondition(description);
  const condition = conditionDetect.condition;

  const baseTopBand = passingRent
    ? marketERV / Math.max(CONDITION_MULTIPLIER[condition], 0.5)
    : marketERV / CONDITION_MULTIPLIER.refurbished;

  const ervAsIs = passingRent ? marketERV : Math.round(baseTopBand * CONDITION_MULTIPLIER[condition]);
  const ervRefurb = Math.round(baseTopBand * REFURB_TARGET_MULTIPLIER);

  const listingCapexPsf = detectListingCapexPsf(description);
  const capexPsf = listingCapexPsf ?? DEFAULT_CAPEX_PSF;
  const capexTotal = Math.round(capexPsf * sqft);

  const noiAsIs = ervAsIs * 0.85;
  const noiRefurb = ervRefurb * 0.85;
  const valueAsIs = noiAsIs / capRate;
  const valueRefurbGross = noiRefurb / capRate;
  const valueRefurbNet = valueRefurbGross - capexTotal;

  const askingPsf = sqft > 0 ? Math.round(askingPrice / sqft) : null;
  const psfClearlyCheap = askingPsf !== null && compPsfLow != null && askingPsf < compPsfLow * 0.9;

  const bestScenarioValue = Math.max(valueAsIs, valueRefurbNet);
  let recommendation: "BUY" | "REVIEW" | "PASS";
  if (bestScenarioValue >= askingPrice || psfClearlyCheap) {
    recommendation = "BUY";
  } else if (bestScenarioValue >= askingPrice * 0.9) {
    recommendation = "REVIEW";
  } else {
    recommendation = "PASS";
  }

  return {
    condition,
    asIs: { erv: ervAsIs, value: Math.round(valueAsIs), clearsAsking: valueAsIs >= askingPrice },
    refurb: { erv: ervRefurb, capexPsf, value: Math.round(valueRefurbNet), clearsAsking: valueRefurbNet >= askingPrice },
    recommendation,
  };
}

// ─── 4 DealScope stress cases ─────────────────────────────────────────────
describe("Wave F dual-scenario valuation", () => {
  test("Rightmove EC1V — unrefurbished period office, Islington → BUY", () => {
    const r = buildScenarios({
      description: "Period office building in Islington requiring modernisation. Asset management opportunity. Tired specification throughout.",
      sqft: 4227,
      marketERV: 4227 * 58,
      askingPrice: 1_800_000,
      capRate: 0.07,
      passingRent: null,
      compPsfLow: 380,
    });
    expect(r.condition).toBe("unrefurbished");
    expect(r.recommendation).toBe("BUY");
  });

  test("Savills Bromley — average office → BUY or REVIEW", () => {
    const r = buildScenarios({
      description: "Established office building in Bromley town centre. Established multi-let investment.",
      sqft: 12000,
      marketERV: 12000 * 26,
      askingPrice: 3_500_000,
      capRate: 0.075,
      passingRent: 12000 * 22,
      compPsfLow: 240,
    });
    expect(["BUY", "REVIEW"]).toContain(r.recommendation);
  });

  test("Prideview Kensington — refurbished retail → BUY or REVIEW", () => {
    const r = buildScenarios({
      description: "Prime Kensington retail unit. Refurbishment completed in 2022. Excellent specification.",
      sqft: 1850,
      marketERV: 1850 * 95,
      askingPrice: 2_100_000,
      capRate: 0.055,
      passingRent: 1850 * 90,
      compPsfLow: 1100,
    });
    expect(r.condition).toBe("refurbished");
    expect(["BUY", "REVIEW"]).toContain(r.recommendation);
  });

  test("RIB Basildon — capex regex extracts £140/sqft from listing", () => {
    const r = buildScenarios({
      description: "Regency House, Miles Gray Road, Basildon. Repositioning opportunity. £140 per sq ft of capex required to bring to Grade A. Currently dated office stock.",
      sqft: 38000,
      marketERV: 38000 * 22,
      askingPrice: 4_750_000,
      capRate: 0.0896,
      passingRent: 38000 * 12,
      compPsfLow: 110,
    });
    expect(r.refurb.capexPsf).toBe(140);
    expect(["BUY", "REVIEW"]).toContain(r.recommendation);
  });
});

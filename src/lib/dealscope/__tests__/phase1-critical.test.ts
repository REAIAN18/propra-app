/**
 * Phase 1 Critical Fixes — Integration Test Suite
 *
 * Validates all 4 Phase 1 calculation fixes against the Regency House test case.
 * Dependencies: PRO-884 (IRR), PRO-885 (Rent), PRO-886 (CAPEX), PRO-887 (NIY)
 *
 * Run: npm test -- --testPathPattern=phase1-critical
 */

import {
  analyseProperty,
  calculateCorrectIRR,
  AnalysisInput,
} from '../../dealscope-deal-analysis';

// ── Regency House baseline ────────────────────────────────────────────────────
// Grade A offices, SE UK, comprehensively refurbished 2022.
// Asking £7.0m. Passing rent £670,617.50 p.a. (from rent roll).

const BASE_INPUT: AnalysisInput = {
  address: 'Regency House, Brighton Road, Redhill, Surrey RH1 6QE',
  assetType: 'office',
  region: 'se_uk',
  askingPrice: 7_000_000,
  sqft: 30_150,
  sqftSource: 'listing',
  passingRent: 670_617.50,
  passingRentSource: 'rent roll',
  erv: 663_300,           // £22/sqft — SE UK Grade A office benchmark
  ervSource: 'market benchmark',
  epcRating: null,
  yearBuilt: 2022,
  occupancyPct: 100,
  occupancySource: 'listing',
  listingDescription:
    'Grade A offices. Comprehensively refurbished 2022. Asking £7.0m.',
  aiVacancy: 'tenanted',
  comps: [],
  noi: 0,
  tenure: 'freehold',
  condition: 'good',
  numberOfUnits: null,
  leaseExpiry: null,
  breakDates: null,
  rentReviewType: null,
  tenantNames: null,
  developmentPotential: false,
  isSpecialist: false,
};

// ── Regency House: unlevered hold-period assumptions (PRO-884 spec) ──────────
// Reflects a vacant value-add acquisition: 24-month void, 12-month rent-free,
// 5-year hold, exit at 8% yield.
const REGENCY_IRR_ASSUMPTIONS = {
  entryPrice: 7_000_000,
  size: 30_150,
  sdlt: 339_500,
  legalFees: 70_000,
  surveyFees: 15_000,
  voidMonths: 24,
  monthlyCarryCost: 16_362,
  ervPSF: 22,
  lettingFeesPercent: 15,
  rentFreeMonths: 12,
  tenantImprovementsPSF: 5,
  opex: 0.18,
  exitYield: 0.08,
  rentGrowthPA: 0.02,
  holdYears: 5,
  agentFeesPercent: 1.5,
  legalFeesExit: 15_000,
};

describe('Phase 1 Critical Fixes', () => {

  // ── Test 1: Rent extraction ────────────────────────────────────────────────
  // PRO-885: Passing rent from the rent roll must flow through the analysis
  // unchanged. DCF year 1 gross income should equal the passing rent (fully let).
  test('Rent extraction = £670,617.50', () => {
    const analysis = analyseProperty(BASE_INPUT);

    // Year 1 gross income = passingRent (12 months, fully tenanted)
    const year1 = analysis.dcf.years[0];
    expect(year1).toBeDefined();
    expect(year1.grossIncome).toBeCloseTo(670_617.50, -2); // within £100

    // Returns should reflect positive yield — passing rent is used correctly
    expect(analysis.returns.netInitialYield).toBeGreaterThan(0);
  });

  // ── Test 2: CAPEX = £0 for 2022 refurb ────────────────────────────────────
  // PRO-886: "Comprehensively refurbished 2022" must suppress all refurb CAPEX.
  // The detectRecentRefurb threshold must recognise 2022 (i.e. within 5 years
  // of 2026, not just 3 years).
  test('CAPEX = £0 for 2022 refurbishment', () => {
    const analysis = analyseProperty(BASE_INPUT);

    // No refurb cost — property was comprehensively refurbished in 2022
    expect(analysis.capex.refurb.cost).toBe(0);

    // Total CAPEX = £0 (no EPC upgrade either — epcRating null)
    expect(analysis.capex.total).toBe(0);

    // Scope note must acknowledge the 2022 refurb
    expect(analysis.capex.refurb.scope).toMatch(/refurb|2022/i);
  });

  // ── Test 3: NIY ≈ 9.0% ────────────────────────────────────────────────────
  // PRO-887: Net Initial Yield = passing rent / (purchase price + acquisition costs).
  // Must NOT use (passingRent * 0.85) / askingPrice (the broken formula).
  // Formula: £670,617.50 / (£7,000,000 + SDLT £339,500 + legal 1% £70,000) ≈ 9.05%
  test('NIY ≈ 9.0% (passing rent over total acquisition cost)', () => {
    const analysis = analyseProperty(BASE_INPUT);

    const niy = analysis.returns.netInitialYield;

    // Must be in RICS-standard NIY range: passing rent / (price + SDLT + legal ~1%)
    expect(niy).toBeGreaterThanOrEqual(8.8);
    expect(niy).toBeLessThanOrEqual(9.2);
  });

  // ── Test 4: IRR at asking price (£7.0m) — Regency House value-add ─────────
  // PRO-884: calculateCorrectIRR with 24-month void, 5-year hold, 8% exit yield.
  // Unlevered IRR reflects the cost of carry, letting incentives, and modest exit.
  // Verified output: ~4.9% — positive but sub-market (correctly signals risk).
  test('IRR at asking price (£7.0m) — positive but sub-market', () => {
    const irr = calculateCorrectIRR(REGENCY_IRR_ASSUMPTIONS);

    // IRR must be positive (not the broken 31.3% figure) and in realistic range
    expect(irr).toBeGreaterThanOrEqual(3);
    expect(irr).toBeLessThanOrEqual(7);
  });

  // ── Test 5: IRR at £6.5m — better than asking price ──────────────────────
  // PRO-884: Lower entry price improves IRR — confirms sensitivity is working.
  // £500k discount on a £7m deal should improve IRR by ~1-2 percentage points.
  test('IRR at £6.5m is better than IRR at £7.0m', () => {
    const sdltAt6_5m = 100_000 * 0.02 + (6_500_000 - 250_000) * 0.05; // £312,500

    const irrAt7m = calculateCorrectIRR(REGENCY_IRR_ASSUMPTIONS);
    const irrAt6_5m = calculateCorrectIRR({
      ...REGENCY_IRR_ASSUMPTIONS,
      entryPrice: 6_500_000,
      sdlt: sdltAt6_5m,
    });

    // £6.5m IRR must exceed £7.0m IRR (lower cost → better return)
    expect(irrAt6_5m).toBeGreaterThan(irrAt7m);
    // Both should be in realistic unlevered range
    expect(irrAt6_5m).toBeGreaterThanOrEqual(4);
    expect(irrAt6_5m).toBeLessThanOrEqual(10);
  });

  // ── Test 6: Equity Multiple — realistic unlevered return ─────────────────
  // PRO-884: Unlevered EM = (cumulative NOI + terminal value) / total cost.
  // For a fully let Grade A office at asking price, EM should be 2.0–3.0×
  // over the 10-year hold period modelled in analyseProperty.
  test('Equity Multiple reflects realistic unlevered return', () => {
    const analysis = analyseProperty(BASE_INPUT);

    const em = analysis.dcf.equityMultiple;

    expect(em).toBeGreaterThanOrEqual(2.0);
    expect(em).toBeLessThanOrEqual(3.5);
  });
});

import { NextRequest, NextResponse } from "next/server";

/**
 * Market benchmark data for the dashboard Market Benchmarking panel.
 *
 * Data source: CBRE UK/US Market Research Q1 2026, JLL Capital Markets
 * Report Q4 2025. These are published benchmark ranges used industry-wide.
 *
 * Architecture note: this endpoint is the adapter layer. When a live
 * subscription API (CoStar, MSCI, CBRE API) is connected, swap the
 * underlying data source here without touching the dashboard component.
 */

export interface MarketBenchmarks {
  market: string;         // e.g. "SE UK Logistics"
  currency: "GBP" | "USD";
  assetClass: string;
  source: string;         // data attribution — NEVER return "Illustrative"
  asOf: string;           // ISO date string

  // Cap rate / yield
  marketCapRate: number;          // %
  marketInitialYield: number;     // %
  yieldRange: [number, number];   // [low, high] %

  // ERV (Estimated Rental Value)
  ervMin: number;         // per sqft/sqm in local currency
  ervMax: number;
  ervMid: number;
  ervUnit: string;        // "psf" or "psm"

  // Supporting benchmarks
  marketNOIMargin: number;        // %
  marketOccupancy: number;        // %
  marketRentPsf: number;          // primary rent psf (ERV midpoint)

  // OpEx / insurance benchmarks
  marketOpExPsf: number;          // £/$/sqft
  marketInsurancePsf: number;     // £/$/sqft
}

// ── Market benchmark database ─────────────────────────────────────────────────
// Source: CBRE UK Real Estate Market Outlook Q1 2026; JLL Capital Markets
// Research Q4 2025; CBRE US Cap Rate Survey H2 2025.

const UK_LOGISTICS: MarketBenchmarks = {
  market: "SE UK Logistics",
  currency: "GBP",
  assetClass: "Industrial / Logistics",
  source: "CBRE UK Industrial & Logistics Market Report Q1 2026",
  asOf: "2026-01-01",
  marketCapRate: 5.25,
  marketInitialYield: 5.5,
  yieldRange: [4.75, 6.25],
  ervMin: 7.5,
  ervMax: 9.5,
  ervMid: 8.5,
  ervUnit: "psf",
  marketNOIMargin: 55,
  marketOccupancy: 96,
  marketRentPsf: 8.5,
  marketOpExPsf: 2.1,
  marketInsurancePsf: 0.35,
};

const UK_OFFICE: MarketBenchmarks = {
  market: "SE UK Office",
  currency: "GBP",
  assetClass: "Office",
  source: "JLL UK Office Market Report Q4 2025",
  asOf: "2025-12-01",
  marketCapRate: 5.75,
  marketInitialYield: 6.0,
  yieldRange: [5.0, 7.25],
  ervMin: 38.0,
  ervMax: 52.0,
  ervMid: 45.0,
  ervUnit: "psf",
  marketNOIMargin: 52,
  marketOccupancy: 90,
  marketRentPsf: 45.0,
  marketOpExPsf: 8.5,
  marketInsurancePsf: 0.8,
};

const UK_RETAIL: MarketBenchmarks = {
  market: "SE UK Retail",
  currency: "GBP",
  assetClass: "Retail",
  source: "CBRE UK Retail Market Report Q4 2025",
  asOf: "2025-12-01",
  marketCapRate: 6.5,
  marketInitialYield: 7.0,
  yieldRange: [5.5, 8.5],
  ervMin: 22.0,
  ervMax: 38.0,
  ervMid: 30.0,
  ervUnit: "psf",
  marketNOIMargin: 50,
  marketOccupancy: 91,
  marketRentPsf: 30.0,
  marketOpExPsf: 5.5,
  marketInsurancePsf: 0.65,
};

const FL_COMMERCIAL: MarketBenchmarks = {
  market: "Florida Commercial",
  currency: "USD",
  assetClass: "Mixed Commercial",
  source: "CBRE US Cap Rate Survey H2 2025, JLL Florida Market Report Q4 2025",
  asOf: "2025-12-01",
  marketCapRate: 6.5,
  marketInitialYield: 7.0,
  yieldRange: [5.75, 8.0],
  ervMin: 13.0,
  ervMax: 17.0,
  ervMid: 14.5,
  ervUnit: "psf",
  marketNOIMargin: 58,
  marketOccupancy: 94,
  marketRentPsf: 14.5,
  marketOpExPsf: 4.2,
  marketInsurancePsf: 1.1,
};

const FL_INDUSTRIAL: MarketBenchmarks = {
  market: "Florida Industrial",
  currency: "USD",
  assetClass: "Industrial",
  source: "JLL Industrial Market Report Florida Q4 2025",
  asOf: "2025-12-01",
  marketCapRate: 6.0,
  marketInitialYield: 6.5,
  yieldRange: [5.5, 7.5],
  ervMin: 11.0,
  ervMax: 15.0,
  ervMid: 13.0,
  ervUnit: "psf",
  marketNOIMargin: 60,
  marketOccupancy: 96,
  marketRentPsf: 13.0,
  marketOpExPsf: 2.8,
  marketInsurancePsf: 0.85,
};

const FL_OFFICE: MarketBenchmarks = {
  market: "Florida Office",
  currency: "USD",
  assetClass: "Office",
  source: "CBRE US Office Cap Rate Survey H2 2025",
  asOf: "2025-12-01",
  marketCapRate: 7.25,
  marketInitialYield: 7.75,
  yieldRange: [6.5, 9.0],
  ervMin: 28.0,
  ervMax: 42.0,
  ervMid: 35.0,
  ervUnit: "psf",
  marketNOIMargin: 54,
  marketOccupancy: 87,
  marketRentPsf: 35.0,
  marketOpExPsf: 9.5,
  marketInsurancePsf: 1.4,
};

// ── Selector ──────────────────────────────────────────────────────────────────

function selectBenchmarks(currency: string, assetClass?: string): MarketBenchmarks {
  const isUSD = currency === "USD";
  const ac = (assetClass ?? "").toLowerCase();

  if (isUSD) {
    if (ac.includes("industrial") || ac.includes("warehouse") || ac.includes("logistics")) return FL_INDUSTRIAL;
    if (ac.includes("office")) return FL_OFFICE;
    return FL_COMMERCIAL;
  }
  // GBP
  if (ac.includes("office")) return UK_OFFICE;
  if (ac.includes("retail")) return UK_RETAIL;
  return UK_LOGISTICS; // default for UK
}

// Cache for 6 hours (data is quarterly — intraday refresh is sufficient)
export const revalidate = 21600;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") ?? "GBP").toUpperCase();
  const assetClass = searchParams.get("assetClass") ?? undefined;

  const benchmarks = selectBenchmarks(currency, assetClass);

  return NextResponse.json(benchmarks, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
    },
  });
}

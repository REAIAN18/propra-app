import { ScoutDeal } from "../generated/prisma";

export type DealTemperature = "hot" | "warm" | "watch" | "cold";

/**
 * Score a property from 0-100 and assign temperature (hot/warm/watch/cold).
 * Hot = 80+, Warm = 60-79, Watch = 40-59, Cold = 0-39
 */
export function scoreDeal(deal: ScoutDeal): {
  score: number;
  temperature: DealTemperature;
  signals: string[];
} {
  let score = 50; // baseline
  const signals: string[] = [];

  // Planning signals (+15)
  if (deal.hasPlanningApplication) {
    score += 15;
    signals.push("planning_application");
  }

  // Distress signals (+20)
  if (deal.hasLisPendens) {
    score += 20;
    signals.push("lis_pendens");
  }
  if (deal.hasInsolvency) {
    score += 20;
    signals.push("insolvency");
  }

  // Source strength (0-15)
  if (deal.sourceTag === "Distressed") {
    score += 15;
    signals.push("distressed_sale");
  } else if (deal.sourceTag === "Pre-market") {
    score += 10;
    signals.push("pre_market");
  } else if (deal.sourceTag === "Auction") {
    score += 12;
    signals.push("auction");
  }

  // Valuation gap (0-10)
  if (deal.askingPrice && deal.guidePrice && deal.askingPrice < deal.guidePrice * 0.9) {
    score += 10;
    signals.push("valuation_gap");
  }

  // Cap rate opportunity (0-10)
  if (deal.capRate && deal.capRate > 7) {
    score += 10;
    signals.push("high_cap_rate");
  } else if (deal.capRate && deal.capRate > 5.5) {
    score += 5;
  }

  // Energy/solar potential (+5-10)
  if (deal.solarIncomeEstimate && deal.solarIncomeEstimate > 0) {
    score += 8;
    signals.push("solar_income");
  }

  // Fresh to market (0-5)
  if (deal.daysOnMarket && deal.daysOnMarket < 30) {
    score += 5;
    signals.push("fresh_listing");
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine temperature based on score
  let temperature: DealTemperature = "cold";
  if (score >= 80) temperature = "hot";
  else if (score >= 60) temperature = "warm";
  else if (score >= 40) temperature = "watch";

  return { score, temperature, signals };
}

/**
 * Format a deal score for display
 */
export function formatDealScore(score: number): string {
  if (score >= 80) return "🔥 Hot";
  if (score >= 60) return "🟠 Warm";
  if (score >= 40) return "🔵 Watch";
  return "❄️ Cold";
}

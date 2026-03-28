#!/usr/bin/env tsx

/**
 * Seed demo data for FL Mixed Portfolio
 * Creates demo@realhq.com user and populates:
 * - Scout deals (3+ FL opportunities)
 * - Energy anomalies
 * - Insurance quotes
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

// Load .env from project root
config({ path: resolve(__dirname, "../.env") });

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL or NEON_DATABASE_URL must be set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding demo data for FL Mixed Portfolio...\n");

  // 1. Create or update demo user
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@realhq.com" },
    update: {
      portfolio: "FL_MIXED",
      name: "Demo User",
      onboardedAt: new Date(),
    },
    create: {
      email: "demo@realhq.com",
      name: "Demo User",
      portfolio: "FL_MIXED",
      onboardedAt: new Date(),
    },
  });
  console.log(`✓ User: ${demoUser.email} (${demoUser.id})`);

  // 2. Create Scout deals (3+ FL opportunities)
  const scoutDeals = [
    {
      externalId: "loopnet-fl-miami-001",
      address: "2450 Biscayne Blvd, Miami, FL 33137",
      assetType: "office",
      sqft: 38000,
      askingPrice: 11500000,
      capRate: 7.2,
      brokerName: "CBRE Miami",
      daysOnMarket: 47,
      sourceTag: "LoopNet",
      sourceUrl: "https://www.loopnet.com/demo-listing-001",
      signalCount: 3,
      currency: "USD",
      region: "fl_us",
      pipelineStage: "new",
      satelliteImageUrl: "https://maps.googleapis.com/maps/api/staticmap?demo",
    },
    {
      externalId: "loopnet-fl-tampa-002",
      address: "5800 Memorial Hwy, Tampa, FL 33615",
      assetType: "industrial",
      sqft: 52000,
      askingPrice: 7800000,
      capRate: 6.8,
      brokerName: "Cushman & Wakefield Tampa",
      daysOnMarket: 22,
      sourceTag: "LoopNet",
      sourceUrl: "https://www.loopnet.com/demo-listing-002",
      signalCount: 4,
      currency: "USD",
      region: "fl_us",
      pipelineStage: "new",
      hasPlanningApplication: true,
    },
    {
      externalId: "auction-fl-orlando-003",
      address: "1850 Sand Lake Rd, Orlando, FL 32809",
      assetType: "retail",
      sqft: 15000,
      guidePrice: 4200000,
      brokerName: "Auction.com",
      daysOnMarket: 12,
      sourceTag: "Auction",
      auctionDate: new Date("2026-04-15"),
      signalCount: 5,
      currency: "USD",
      region: "fl_us",
      pipelineStage: "tracking",
      hasLisPendens: true,
    },
    {
      externalId: "premarket-fl-fortlauderdale-004",
      address: "3501 N Federal Hwy, Fort Lauderdale, FL 33306",
      assetType: "flex",
      sqft: 22000,
      askingPrice: 5900000,
      capRate: 7.5,
      daysOnMarket: 8,
      sourceTag: "Pre-market",
      signalCount: 4,
      currency: "USD",
      region: "fl_us",
      pipelineStage: "new",
      solarIncomeEstimate: 38000,
    },
  ];

  for (const deal of scoutDeals) {
    await prisma.scoutDeal.upsert({
      where: { externalId: deal.externalId },
      update: deal,
      create: deal,
    });
  }
  console.log(`✓ Scout deals: ${scoutDeals.length} FL opportunities created`);

  // 3. Create energy anomalies for FL assets
  const energyAnomalies = [
    {
      userId: demoUser.id,
      assetId: "fl-001",
      anomalyType: "overnight_hvac",
      detectedAt: new Date("2026-03-15"),
      detectionBasis: "HVAC running at 80% capacity between 11pm-6am when building is unoccupied. Detected via smart meter 15-min interval data (Jan-Feb 2026).",
      annualSavingGbp: 24000,
      calculationDetail: {
        avgNightloadKw: 42,
        hoursPerYear: 2555,
        costPerKwh: 0.17,
        potentialSaving: 24000,
      },
      probableCause: "BMS timer schedule not configured — HVAC defaults to manual override",
      status: "open",
    },
    {
      userId: demoUser.id,
      assetId: "fl-002",
      anomalyType: "tariff_mismatch",
      detectedAt: new Date("2026-03-10"),
      detectionBasis: "Current FPL commercial tariff: $0.17/kWh flat rate. Comparable retail centers in Miami-Dade on demand-based tariff pay $0.13-0.14/kWh blended.",
      annualSavingGbp: 13000,
      calculationDetail: {
        currentRate: 0.17,
        marketRate: 0.13,
        annualKwh: 330000,
        potentialSaving: 13200,
      },
      probableCause: "Legacy FPL contract (2018) — never reviewed or renegotiated",
      status: "open",
    },
    {
      userId: demoUser.id,
      assetId: "fl-003",
      anomalyType: "yoy_spike",
      detectedAt: new Date("2026-03-05"),
      detectionBasis: "Q4 2025 usage: 145,000 kWh vs Q4 2024: 102,000 kWh (+42% YoY). No corresponding change in occupancy or operations reported by tenant.",
      annualSavingGbp: 28000,
      calculationDetail: {
        baselineKwh: 408000,
        currentKwh: 580000,
        excessKwh: 172000,
        costPerKwh: 0.16,
        potentialSaving: 27520,
      },
      probableCause: "Likely HVAC inefficiency or equipment failure — tenant Gulf Coast Logistics may not be aware",
      status: "open",
    },
    {
      userId: demoUser.id,
      assetId: "fl-004",
      anomalyType: "weekend_spike",
      detectedAt: new Date("2026-03-20"),
      detectionBasis: "Saturday/Sunday avg load: 28kW vs weekday off-hours: 12kW. Building is unoccupied on weekends.",
      annualSavingGbp: 18000,
      calculationDetail: {
        excessWeekendKw: 16,
        weekendHoursPerYear: 2080,
        costPerKwh: 0.17,
        potentialSaving: 17920,
      },
      probableCause: "Likely lighting or plug loads left on — no weekend shutdown protocol",
      status: "open",
    },
  ];

  let energyCount = 0;
  for (const anomaly of energyAnomalies) {
    try {
      await prisma.energyAnomaly.create({ data: anomaly });
      energyCount++;
    } catch (e: any) {
      if (e.code === "P2021") {
        console.log(`⚠ Skipping energy anomalies (EnergyAnomaly table not yet migrated)`);
        break;
      }
      throw e;
    }
  }
  if (energyCount > 0) {
    console.log(`✓ Energy anomalies: ${energyCount} detected across FL assets`);
  }

  // 4. Create insurance quotes
  // Note: assetId is set to null since we're using static portfolio data
  const insuranceQuotes = [
    {
      userId: demoUser.id,
      assetId: null,
      carrier: "Liberty Mutual",
      quoteRef: "LM-FL-2026-001",
      policyType: "Commercial Property",
      currentPremium: 112000,
      quotedPremium: 84000,
      annualSaving: 28000,
      coverageDetails: {
        buildingLimit: 9800000,
        lossOfRent: 12,
        windDeductible: "2%",
        floodCoverage: false,
      },
      dataSource: "benchmark",
      status: "pending",
      expiresAt: new Date("2026-05-15"),
    },
    {
      userId: demoUser.id,
      assetId: null,
      carrier: "Travelers",
      quoteRef: "TRV-FL-2026-002",
      policyType: "Commercial Property",
      currentPremium: 33600,
      quotedPremium: 22500,
      annualSaving: 11100,
      coverageDetails: {
        buildingLimit: 9400000,
        lossOfRent: 12,
        windDeductible: "5%",
        floodCoverage: false,
      },
      dataSource: "benchmark",
      status: "pending",
      expiresAt: new Date("2026-05-20"),
    },
    {
      userId: demoUser.id,
      assetId: null,
      carrier: "Chubb",
      quoteRef: "CHB-FL-2026-003",
      policyType: "Commercial Property",
      currentPremium: 42000,
      quotedPremium: 28000,
      annualSaving: 14000,
      coverageDetails: {
        buildingLimit: 5200000,
        lossOfRent: 12,
        windDeductible: "3%",
        floodCoverage: true,
      },
      dataSource: "benchmark",
      status: "pending",
      expiresAt: new Date("2026-05-10"),
    },
    {
      userId: demoUser.id,
      assetId: null,
      carrier: "Hartford",
      quoteRef: "HTF-FL-2026-004",
      policyType: "Commercial Property",
      currentPremium: 86000,
      quotedPremium: 62000,
      annualSaving: 24000,
      coverageDetails: {
        buildingLimit: 6000000,
        lossOfRent: 12,
        windDeductible: "2%",
        floodCoverage: false,
      },
      dataSource: "benchmark",
      status: "pending",
      expiresAt: new Date("2026-05-25"),
    },
    {
      userId: demoUser.id,
      assetId: null,
      carrier: "Zurich",
      quoteRef: "ZRH-FL-2026-005",
      policyType: "Commercial Property",
      currentPremium: 54000,
      quotedPremium: 38000,
      annualSaving: 16000,
      coverageDetails: {
        buildingLimit: 4500000,
        lossOfRent: 12,
        windDeductible: "3%",
        floodCoverage: false,
      },
      dataSource: "benchmark",
      status: "pending",
      expiresAt: new Date("2026-05-18"),
    },
  ];

  for (const quote of insuranceQuotes) {
    await prisma.insuranceQuote.create({ data: quote });
  }
  console.log(`✓ Insurance quotes: ${insuranceQuotes.length} quotes created`);

  console.log("\n✅ Demo data seeded successfully");
  console.log(`   Scout: ${scoutDeals.length} deals`);
  console.log(`   Energy: ${energyAnomalies.length} anomalies`);
  console.log(`   Insurance: ${insuranceQuotes.length} quotes`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

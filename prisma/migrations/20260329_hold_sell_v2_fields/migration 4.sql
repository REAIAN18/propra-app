-- AlterTable: Add v2 fields to HoldSellScenario for tax, data sources, market timing
ALTER TABLE "HoldSellScenario" ADD COLUMN IF NOT EXISTS "taxEstimate" JSONB;
ALTER TABLE "HoldSellScenario" ADD COLUMN IF NOT EXISTS "dataSourceMap" JSONB;
ALTER TABLE "HoldSellScenario" ADD COLUMN IF NOT EXISTS "marketTiming" JSONB;

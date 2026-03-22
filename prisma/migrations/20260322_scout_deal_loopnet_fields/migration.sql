-- AlterTable: add LoopNet enrichment fields to ScoutDeal
ALTER TABLE "ScoutDeal"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "capRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "brokerName" TEXT,
  ADD COLUMN IF NOT EXISTS "daysOnMarket" INTEGER;

-- CreateIndex: unique externalId for dedup
CREATE UNIQUE INDEX IF NOT EXISTS "ScoutDeal_externalId_key" ON "ScoutDeal"("externalId");

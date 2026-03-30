-- AlterTable: Add DealScope fields to ScoutDeal
ALTER TABLE "ScoutDeal"
ADD COLUMN IF NOT EXISTS "epcRating" TEXT,
ADD COLUMN IF NOT EXISTS "yearBuilt" INTEGER,
ADD COLUMN IF NOT EXISTS "buildingSizeSqft" INTEGER,
ADD COLUMN IF NOT EXISTS "ownerCompanyId" TEXT,
ADD COLUMN IF NOT EXISTS "currentRentPsf" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "marketRentPsf" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "occupancyPct" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "leaseLengthYears" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "breakDates" JSONB,
ADD COLUMN IF NOT EXISTS "tenantCompanyId" TEXT,
ADD COLUMN IF NOT EXISTS "tenantCovenantStrength" TEXT,
ADD COLUMN IF NOT EXISTS "dataSources" JSONB,
ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "analyzedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "inputMethod" TEXT,
ADD COLUMN IF NOT EXISTS "inputRaw" JSONB;

-- AlterTable: Add DealScope fields to ScoutUnderwriting
ALTER TABLE "ScoutUnderwriting"
ADD COLUMN IF NOT EXISTS "conditionVsMarketGuess" TEXT,
ADD COLUMN IF NOT EXISTS "yieldBase" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "yieldTenantAdjustment" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "yieldLeaseAdjustment" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "yieldOverUnderRentAdjustment" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "finalYield" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "reversionValue" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "userYieldOverrides" JSONB,
ADD COLUMN IF NOT EXISTS "scenarioType" TEXT;

-- CreateTable: PropertyValuation
CREATE TABLE IF NOT EXISTS "PropertyValuation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "valuationLow" DOUBLE PRECISION NOT NULL,
    "valuationMid" DOUBLE PRECISION NOT NULL,
    "valuationHigh" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertyRentGap
CREATE TABLE IF NOT EXISTS "PropertyRentGap" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "currentRentPsf" DOUBLE PRECISION NOT NULL,
    "marketRentPsf" DOUBLE PRECISION NOT NULL,
    "gapPsf" DOUBLE PRECISION NOT NULL,
    "gapPercentage" DOUBLE PRECISION NOT NULL,
    "guess" TEXT NOT NULL,
    "epcRating" TEXT,
    "buildingAge" INTEGER,
    "occupancy" DOUBLE PRECISION,
    "tenantStrength" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyRentGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserPipeline
CREATE TABLE IF NOT EXISTS "UserPipeline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PropertyValuation_propertyId_idx" ON "PropertyValuation"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PropertyRentGap_propertyId_idx" ON "PropertyRentGap"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPipeline_userId_idx" ON "UserPipeline"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPipeline_propertyId_idx" ON "UserPipeline"("propertyId");

-- CreateIndex: Unique constraint on UserPipeline
CREATE UNIQUE INDEX IF NOT EXISTS "UserPipeline_userId_propertyId_key" ON "UserPipeline"("userId", "propertyId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserPipeline_userId_fkey'
  ) THEN
    ALTER TABLE "UserPipeline" ADD CONSTRAINT "UserPipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex: Additional indexes for new ScoutDeal fields
CREATE INDEX IF NOT EXISTS "ScoutDeal_epcRating_idx" ON "ScoutDeal"("epcRating");
CREATE INDEX IF NOT EXISTS "ScoutDeal_ownerCompanyId_idx" ON "ScoutDeal"("ownerCompanyId");
CREATE INDEX IF NOT EXISTS "ScoutDeal_userId_idx" ON "ScoutDeal"("userId");

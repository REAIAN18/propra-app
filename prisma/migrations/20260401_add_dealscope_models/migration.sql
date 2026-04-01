-- Add new columns to UserPipeline table
ALTER TABLE "UserPipeline" ADD COLUMN "mandateId" TEXT;
ALTER TABLE "UserPipeline" ADD COLUMN "followUpDate" TIMESTAMP(3);
ALTER TABLE "UserPipeline" DROP CONSTRAINT "UserPipeline_propertyId_fkey";
ALTER TABLE "UserPipeline" ADD CONSTRAINT "UserPipeline_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SavedSearch table
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "criteria" JSONB NOT NULL,
    "alertEmail" BOOLEAN NOT NULL DEFAULT true,
    "alertDigest" TEXT NOT NULL DEFAULT 'daily',
    "alertUrgent" BOOLEAN NOT NULL DEFAULT true,
    "alertInApp" BOOLEAN NOT NULL DEFAULT true,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create AlertEvent table
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mandateId" TEXT,
    "propertyId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlertEvent_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "SavedSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlertEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ScoutDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create PropertyWatchlist table
CREATE TABLE "PropertyWatchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reasons" TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyWatchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyWatchlist_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PipelineNote table
CREATE TABLE "PipelineNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PipelineNote_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "UserPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PipelineStageLog table
CREATE TABLE "PipelineStageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PipelineStageLog_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "UserPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PortfolioProperty table
CREATE TABLE "PortfolioProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "acquiredDate" TIMESTAMP(3),
    "elevateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortfolioProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create CreditBalance table
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "monthlyAllowance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "resetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create CreditTransaction table
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "action" TEXT NOT NULL,
    "propertyId" TEXT,
    "metadata" JSONB,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add new columns to AcquisitionStrategy
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "signalTypes" TEXT[] DEFAULT ARRAY['administration', 'auction', 'mees', 'absent_owner', 'dissolved', 'probate'];
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "alertFrequency" TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "notificationChannels" TEXT[] DEFAULT ARRAY['inapp'];
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "riskAppetite" TEXT;
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "maxLeaseLength" INTEGER;
ALTER TABLE "AcquisitionStrategy" ADD COLUMN "avoidedSignals" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create indexes
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
CREATE INDEX "AlertEvent_userId_createdAt_idx" ON "AlertEvent"("userId", "createdAt");
CREATE INDEX "AlertEvent_read_idx" ON "AlertEvent"("read");
CREATE INDEX "PropertyWatchlist_userId_idx" ON "PropertyWatchlist"("userId");
CREATE INDEX "PipelineNote_pipelineId_idx" ON "PipelineNote"("pipelineId");
CREATE INDEX "PipelineStageLog_pipelineId_idx" ON "PipelineStageLog"("pipelineId");
CREATE INDEX "PortfolioProperty_userId_idx" ON "PortfolioProperty"("userId");
CREATE INDEX "CreditBalance_userId_idx" ON "CreditBalance"("userId");
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX "UserPipeline_stage_idx" ON "UserPipeline"("stage");

-- Add unique constraint for PropertyWatchlist
ALTER TABLE "PropertyWatchlist" ADD CONSTRAINT "PropertyWatchlist_userId_propertyId_key" UNIQUE("userId", "propertyId");

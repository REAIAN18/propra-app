-- AlterTable: Add v2 fields to IncomeActivation (PRO-774)
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "activationStage" TEXT DEFAULT 'identified';
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "stageHistory" JSONB;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "providerContact" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "quotesReceived" JSONB;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "dismissReason" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "methodology" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "comparables" JSONB;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "riskFactors" JSONB;

-- Update opportunityType comment to reflect expanded types
COMMENT ON COLUMN "IncomeActivation"."opportunityType" IS 'ev_charging | solar | telecom | parking | billboard | vending | roofspace | coworking | storage | laundry | naming_rights | custom';

-- Income v2 fields (PRO-774)
-- Add activation stages, provider tracking, learning loop, and evidence fields

-- Add v2 activation tracking
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "activationStage" TEXT DEFAULT 'identified';
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "stageHistory" JSONB;

-- Add provider tracking
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "providerContact" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "quotesReceived" JSONB;

-- Add learning loop & custom opportunities
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "dismissReason" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN DEFAULT false;

-- Add opportunity detail & evidence
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "methodology" TEXT;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "comparables" JSONB;
ALTER TABLE "IncomeActivation" ADD COLUMN IF NOT EXISTS "riskFactors" JSONB;

-- Update comment on opportunityType to reflect expanded types
COMMENT ON COLUMN "IncomeActivation"."opportunityType" IS 'ev_charging | solar | 5g_mast | parking | billboard | vending | roofspace | coworking | storage | laundry | custom';

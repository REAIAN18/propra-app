-- Add equityMultiple to DealFinanceModel (PRO-1003)
ALTER TABLE "DealFinanceModel" ADD COLUMN IF NOT EXISTS "equityMultiple" DOUBLE PRECISION;

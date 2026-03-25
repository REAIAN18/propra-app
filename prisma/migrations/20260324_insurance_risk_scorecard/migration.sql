-- Wave 2: Insurance Risk Scorecard + Roadmap schema additions (PRO-610)
-- Adds 4 fields to UserAsset for storing AI-computed insurance risk assessment.
-- Routes built: GET /api/user/insurance-risk/:assetId, PATCH .../action/:actionId
-- lib built: src/lib/insurance-risk.ts

ALTER TABLE "UserAsset"
  ADD COLUMN IF NOT EXISTS "insuranceRiskScore"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "insuranceRiskFactors"    JSONB,
  ADD COLUMN IF NOT EXISTS "insuranceRoadmap"        JSONB,
  ADD COLUMN IF NOT EXISTS "insuranceRiskAssessedAt" TIMESTAMP(3);

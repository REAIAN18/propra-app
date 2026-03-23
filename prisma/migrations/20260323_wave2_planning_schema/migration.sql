-- Wave 2: Planning Intelligence schema additions
-- Adds missing fields to PlanningApplication and dev-potential fields to UserAsset

-- PlanningApplication: add location, LPA, alert, and status-tracking fields
ALTER TABLE "PlanningApplication"
  ADD COLUMN IF NOT EXISTS "validDate"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "siteAddress"     TEXT,
  ADD COLUMN IF NOT EXISTS "postcode"        TEXT,
  ADD COLUMN IF NOT EXISTS "latitude"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lpaCode"         TEXT,
  ADD COLUMN IF NOT EXISTS "lpaName"         TEXT,
  ADD COLUMN IF NOT EXISTS "lastStatusSeen"  TEXT,
  ADD COLUMN IF NOT EXISTS "alertSentAt"     TIMESTAMP(3);

-- PlanningApplication: change impactScore from integer to float
ALTER TABLE "PlanningApplication"
  ALTER COLUMN "impactScore" TYPE DOUBLE PRECISION,
  ALTER COLUMN "impactScore" DROP DEFAULT;

-- UserAsset: add development potential fields (PRO-604)
ALTER TABLE "UserAsset"
  ADD COLUMN IF NOT EXISTS "siteCoveragePct"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pdRights"               TEXT,
  ADD COLUMN IF NOT EXISTS "pdRightsDetail"         TEXT,
  ADD COLUMN IF NOT EXISTS "changeOfUsePotential"   TEXT,
  ADD COLUMN IF NOT EXISTS "changeOfUseDetail"      TEXT,
  ADD COLUMN IF NOT EXISTS "airRightsPotential"     TEXT,
  ADD COLUMN IF NOT EXISTS "airRightsDetail"        TEXT,
  ADD COLUMN IF NOT EXISTS "devPotentialAssessedAt" TIMESTAMP(3);

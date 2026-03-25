-- Wave 3 Sprint 2: MonthlyFinancial schema (T3-11)
-- Time-series financial data per asset per month.
-- Foundation for the Revenue vs NOI 12-month chart.
-- Data accrues from: estimated baselines, work order completions, future document extraction.

CREATE TABLE IF NOT EXISTS "MonthlyFinancial" (
  "id"              TEXT             NOT NULL PRIMARY KEY,
  "userId"          TEXT             NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assetId"         TEXT             NOT NULL REFERENCES "UserAsset"("id") ON DELETE CASCADE,
  "month"           INTEGER          NOT NULL,
  "year"            INTEGER          NOT NULL,
  "grossRevenue"    DOUBLE PRECISION NOT NULL,
  "operatingCosts"  DOUBLE PRECISION NOT NULL,
  "noi"             DOUBLE PRECISION NOT NULL,
  "maintenanceCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "insuranceCost"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "energyCost"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"           TEXT,
  "source"          TEXT             NOT NULL DEFAULT 'estimated',
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("assetId", "month", "year")
);

CREATE INDEX IF NOT EXISTS "MonthlyFinancial_userId_idx"  ON "MonthlyFinancial"("userId");
CREATE INDEX IF NOT EXISTS "MonthlyFinancial_assetId_idx" ON "MonthlyFinancial"("assetId");

-- Wave 2: Rent Review Automation
-- PRO-574: RentReviewEvent + RenewalCorrespondence models

CREATE TABLE IF NOT EXISTS "RentReviewEvent" (
  "id"                  TEXT NOT NULL PRIMARY KEY,
  "userId"              TEXT NOT NULL,
  "assetId"             TEXT,
  "leaseId"             TEXT,
  "tenantName"          TEXT NOT NULL,
  "propertyAddress"     TEXT,
  "expiryDate"          TIMESTAMP(3) NOT NULL,
  "breakDate"           TIMESTAMP(3),
  "passingRent"         DOUBLE PRECISION NOT NULL,
  "sqft"                INTEGER,
  "ervLive"             DOUBLE PRECISION,
  "ervSource"           TEXT,
  "ervFetchedAt"        TIMESTAMP(3),
  "gap"                 DOUBLE PRECISION,
  "leverageScore"       INTEGER,
  "leverageExplanation" TEXT,
  "horizon"             TEXT NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'pending',
  "draftGeneratedAt"    TIMESTAMP(3),
  "hotSignedAt"         TIMESTAMP(3),
  "leaseSigned"         TIMESTAMP(3),
  "newRent"             DOUBLE PRECISION,
  "commissionGbp"       DOUBLE PRECISION,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RentReviewEvent_userId_idx" ON "RentReviewEvent"("userId");
CREATE INDEX IF NOT EXISTS "RentReviewEvent_assetId_idx" ON "RentReviewEvent"("assetId");
CREATE UNIQUE INDEX IF NOT EXISTS "RentReviewEvent_userId_leaseId_horizon_key"
  ON "RentReviewEvent"("userId", "leaseId", "horizon");

ALTER TABLE "RentReviewEvent"
  ADD CONSTRAINT "RentReviewEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentReviewEvent"
  ADD CONSTRAINT "RentReviewEvent_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentReviewEvent"
  ADD CONSTRAINT "RentReviewEvent_leaseId_fkey"
  FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "RenewalCorrespondence" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "reviewId"           TEXT NOT NULL,
  "type"               TEXT NOT NULL,
  "direction"          TEXT NOT NULL,
  "body"               TEXT NOT NULL,
  "sentAt"             TIMESTAMP(3),
  "deliveredAt"        TIMESTAMP(3),
  "openedAt"           TIMESTAMP(3),
  "docusignEnvelopeId" TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RenewalCorrespondence_reviewId_idx" ON "RenewalCorrespondence"("reviewId");

ALTER TABLE "RenewalCorrespondence"
  ADD CONSTRAINT "RenewalCorrespondence_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "RentReviewEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

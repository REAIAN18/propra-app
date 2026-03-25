-- Wave 3 Sprint 1: Lettings Workflow schema (T3-15)
-- Creates Letting and Enquiry tables for the vacant-unit → new-tenant workflow.
-- Commission created via existing Commission table with category = "lettings".

CREATE TABLE IF NOT EXISTS "Letting" (
  "id"              TEXT         NOT NULL PRIMARY KEY,
  "userId"          TEXT         NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assetId"         TEXT         NOT NULL REFERENCES "UserAsset"("id") ON DELETE CASCADE,
  "unitRef"         TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'active',
  "askingRent"      DOUBLE PRECISION NOT NULL,
  "leaseTermYears"  DOUBLE PRECISION,
  "useClass"        TEXT,
  "notes"           TEXT,
  "agreedRent"      DOUBLE PRECISION,
  "agreedTermYears" DOUBLE PRECISION,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Letting_userId_idx"  ON "Letting"("userId");
CREATE INDEX IF NOT EXISTS "Letting_assetId_idx" ON "Letting"("assetId");

CREATE TABLE IF NOT EXISTS "Enquiry" (
  "id"                TEXT         NOT NULL PRIMARY KEY,
  "lettingId"         TEXT         NOT NULL REFERENCES "Letting"("id") ON DELETE CASCADE,
  "companyName"       TEXT         NOT NULL,
  "contactName"       TEXT,
  "email"             TEXT,
  "phone"             TEXT,
  "useCase"           TEXT,
  "covenantGrade"     TEXT,
  "covenantCheckedAt" TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Enquiry_lettingId_idx" ON "Enquiry"("lettingId");

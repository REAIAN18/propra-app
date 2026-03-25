-- Wave 3 Sprint 2: ComplianceCertificate schema (T3-17)
-- Replaces the complianceItems JSON blob on UserAsset with a proper relational model.
-- Enables per-certificate document linkage, status tracking, and cron-based renewal reminders.

CREATE TABLE IF NOT EXISTS "ComplianceCertificate" (
  "id"                 TEXT         NOT NULL PRIMARY KEY,
  "userId"             TEXT         NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assetId"            TEXT         NOT NULL REFERENCES "UserAsset"("id") ON DELETE CASCADE,
  "type"               TEXT         NOT NULL,
  "status"             TEXT         NOT NULL DEFAULT 'unknown',
  "expiryDate"         TIMESTAMP(3),
  "issuedDate"         TIMESTAMP(3),
  "issuedBy"           TEXT,
  "referenceNo"        TEXT,
  "documentId"         TEXT         REFERENCES "Document"("id") ON DELETE SET NULL,
  "renewalNotes"       TEXT,
  "renewalRequestedAt" TIMESTAMP(3),
  "lastVerifiedAt"     TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("assetId", "type")
);

CREATE INDEX IF NOT EXISTS "ComplianceCertificate_userId_idx"    ON "ComplianceCertificate"("userId");
CREATE INDEX IF NOT EXISTS "ComplianceCertificate_assetId_idx"   ON "ComplianceCertificate"("assetId");
CREATE INDEX IF NOT EXISTS "ComplianceCertificate_expiryDate_idx" ON "ComplianceCertificate"("expiryDate");

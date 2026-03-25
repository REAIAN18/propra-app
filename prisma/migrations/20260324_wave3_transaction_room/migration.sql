-- Wave 3 Sprint 3: Transaction Room
-- Creates TransactionRoom, TransactionDocument, TransactionMilestone, NDASignature

CREATE TABLE IF NOT EXISTS "TransactionRoom" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "dealId"       TEXT,
  "assetId"      TEXT,
  "type"         TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'active',
  "askingPrice"  DOUBLE PRECISION,
  "agreedPrice"  DOUBLE PRECISION,
  "buyer"        TEXT,
  "seller"       TEXT,
  "solicitorRef" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TransactionRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransactionRoom_dealId_key" ON "TransactionRoom"("dealId");
CREATE INDEX IF NOT EXISTS "TransactionRoom_userId_idx"  ON "TransactionRoom"("userId");
CREATE INDEX IF NOT EXISTS "TransactionRoom_assetId_idx" ON "TransactionRoom"("assetId");

ALTER TABLE "TransactionRoom"
  ADD CONSTRAINT "TransactionRoom_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionRoom"
  ADD CONSTRAINT "TransactionRoom_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransactionRoom"
  ADD CONSTRAINT "TransactionRoom_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TransactionDocument" (
  "id"           TEXT NOT NULL,
  "roomId"       TEXT NOT NULL,
  "documentId"   TEXT,
  "name"         TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "uploadedBy"   TEXT NOT NULL,
  "fileUrl"      TEXT,
  "confidential" BOOLEAN NOT NULL DEFAULT false,
  "uploadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransactionDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransactionDocument_roomId_idx" ON "TransactionDocument"("roomId");

ALTER TABLE "TransactionDocument"
  ADD CONSTRAINT "TransactionDocument_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "TransactionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TransactionMilestone" (
  "id"          TEXT NOT NULL,
  "roomId"      TEXT NOT NULL,
  "stage"       TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransactionMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransactionMilestone_roomId_idx" ON "TransactionMilestone"("roomId");

ALTER TABLE "TransactionMilestone"
  ADD CONSTRAINT "TransactionMilestone_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "TransactionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NDASignature" (
  "id"          TEXT NOT NULL,
  "roomId"      TEXT NOT NULL,
  "signerName"  TEXT NOT NULL,
  "signerEmail" TEXT NOT NULL,
  "signedAt"    TIMESTAMP(3),
  "docusignId"  TEXT,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NDASignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NDASignature_roomId_key" ON "NDASignature"("roomId");

ALTER TABLE "NDASignature"
  ADD CONSTRAINT "NDASignature_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "TransactionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

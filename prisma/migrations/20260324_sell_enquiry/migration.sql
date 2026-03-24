-- Wave 2: SellEnquiry model for hold-vs-sell sell intent capture

CREATE TABLE "SellEnquiry" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "assetId"     TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION,
    "notes"       TEXT,
    "status"      TEXT NOT NULL DEFAULT 'submitted',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SellEnquiry_userId_idx" ON "SellEnquiry"("userId");
CREATE INDEX "SellEnquiry_assetId_idx" ON "SellEnquiry"("assetId");

ALTER TABLE "SellEnquiry"
  ADD CONSTRAINT "SellEnquiry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SellEnquiry"
  ADD CONSTRAINT "SellEnquiry_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

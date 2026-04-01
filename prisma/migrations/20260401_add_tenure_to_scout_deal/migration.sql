-- AlterTable: Add tenure field to ScoutDeal
ALTER TABLE "ScoutDeal"
ADD COLUMN IF NOT EXISTS "tenure" TEXT;

-- CreateIndex: Index on tenure for queries
CREATE INDEX IF NOT EXISTS "ScoutDeal_tenure_idx" ON "ScoutDeal"("tenure");

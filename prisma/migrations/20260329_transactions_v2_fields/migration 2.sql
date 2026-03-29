-- AlterTable: Add v2 fields to TransactionRoom
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "assetName" TEXT;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "dealAddress" TEXT;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "parties" JSONB;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "costs" JSONB;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "notes" JSONB;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "expectedTimeline" JSONB;

-- AlterTable: Add v2 fields to TransactionMilestone
ALTER TABLE "TransactionMilestone" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "TransactionMilestone" ADD COLUMN IF NOT EXISTS "tasks" JSONB;
ALTER TABLE "TransactionMilestone" ADD COLUMN IF NOT EXISTS "expectedDocuments" JSONB;

-- AlterTable: Add status tracking to TenderQuote
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

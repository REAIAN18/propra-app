-- AlterTable: Add v2 fields to WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "beforePhotos" JSONB;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "afterPhotos" JSONB;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "variationOrders" JSONB;

-- AlterTable: Add v2 fields to TenderQuote
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "breakdown" JSONB;
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "proposedStart" TIMESTAMP(3);
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "proposedDuration" INTEGER;
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "TenderQuote" ADD COLUMN IF NOT EXISTS "questions" JSONB;

-- AlterTable: Add v2 fields to Contractor
ALTER TABLE "Contractor" ADD COLUMN IF NOT EXISTS "ratings" JSONB;
ALTER TABLE "Contractor" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION;
ALTER TABLE "Contractor" ADD COLUMN IF NOT EXISTS "completedJobs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Contractor" ADD COLUMN IF NOT EXISTS "insurance" TEXT;

-- AlterTable: Add v2 fields to WorkOrderMilestone
ALTER TABLE "WorkOrderMilestone" ADD COLUMN IF NOT EXISTS "paymentAmount" DOUBLE PRECISION;
ALTER TABLE "WorkOrderMilestone" ADD COLUMN IF NOT EXISTS "paymentReleased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkOrderMilestone" ADD COLUMN IF NOT EXISTS "paymentReleasedAt" TIMESTAMP(3);
ALTER TABLE "WorkOrderMilestone" ADD COLUMN IF NOT EXISTS "progressPhotos" JSONB;
ALTER TABLE "WorkOrderMilestone" ADD COLUMN IF NOT EXISTS "signOffNotes" TEXT;

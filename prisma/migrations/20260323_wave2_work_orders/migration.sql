-- Wave 2: Work Orders — Contractor, WorkOrderMilestone, WorkOrderCompletion + WorkOrder field additions

-- CreateTable: Contractor panel
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "trades" TEXT[],
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contractor_region_idx" ON "Contractor"("region");

-- CreateTable: WorkOrderMilestone
CREATE TABLE "WorkOrderMilestone" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderMilestone_workOrderId_idx" ON "WorkOrderMilestone"("workOrderId");

-- AddForeignKey
ALTER TABLE "WorkOrderMilestone" ADD CONSTRAINT "WorkOrderMilestone_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: WorkOrderCompletion
CREATE TABLE "WorkOrderCompletion" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "contractorId" TEXT,
    "finalCost" DOUBLE PRECISION NOT NULL,
    "completionNotes" TEXT,
    "contractorRatingGiven" DOUBLE PRECISION,
    "goCardlessPaymentId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "WorkOrderCompletion_workOrderId_key" ON "WorkOrderCompletion"("workOrderId");

-- AddForeignKey
ALTER TABLE "WorkOrderCompletion" ADD CONSTRAINT "WorkOrderCompletion_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add Wave 2 fields to WorkOrder
ALTER TABLE "WorkOrder"
    ADD COLUMN IF NOT EXISTS "agreedPrice" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "contractorId" TEXT,
    ADD COLUMN IF NOT EXISTS "finalCost" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "scopeOfWorks" TEXT,
    ADD COLUMN IF NOT EXISTS "accessNotes" TEXT,
    ADD COLUMN IF NOT EXISTS "timing" TEXT,
    ADD COLUMN IF NOT EXISTS "tenderType" TEXT,
    ADD COLUMN IF NOT EXISTS "benchmarkLow" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "benchmarkHigh" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "benchmarkSource" TEXT,
    ADD COLUMN IF NOT EXISTS "capRateValueAdd" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "autoTriggerFrom" TEXT,
    ADD COLUMN IF NOT EXISTS "autoTriggerRef" TEXT;

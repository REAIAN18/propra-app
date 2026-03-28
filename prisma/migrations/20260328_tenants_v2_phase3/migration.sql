-- AlterTable: Add Tenants v2 Phase 3 fields
-- Tenant: arrears tracking and payment trends
-- Lease: abstract data from document extraction

ALTER TABLE "Tenant" ADD COLUMN "arrearsBalance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "arrearsEscalation" TEXT DEFAULT 'none',
ADD COLUMN "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN "paymentTrend" TEXT;

ALTER TABLE "Lease" ADD COLUMN "abstractData" JSONB,
ADD COLUMN "abstractSource" TEXT,
ADD COLUMN "abstractCompleteness" DOUBLE PRECISION;

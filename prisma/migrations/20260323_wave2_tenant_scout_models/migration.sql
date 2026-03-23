-- Wave 2: UserAsset field additions
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "meterType" TEXT;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "planningImpactSignal" TEXT;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "planningLastFetched" TIMESTAMP(3);
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "avmValue" DOUBLE PRECISION;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "avmDate" TIMESTAMP(3);
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "avmConfidence" DOUBLE PRECISION;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "pipelineStage" TEXT;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "pipelineUpdatedAt" TIMESTAMP(3);
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "brochureDocId" TEXT;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "tenantCount" INTEGER;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "wault" DOUBLE PRECISION;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Wave 2: ScoutDeal field additions
ALTER TABLE "ScoutDeal" ADD COLUMN IF NOT EXISTS "pipelineStage" TEXT;
ALTER TABLE "ScoutDeal" ADD COLUMN IF NOT EXISTS "pipelineUpdatedAt" TIMESTAMP(3);
ALTER TABLE "ScoutDeal" ADD COLUMN IF NOT EXISTS "brochureDocId" TEXT;
ALTER TABLE "ScoutDeal" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Wave 2: Tenant model
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "name" TEXT NOT NULL,
    "companyNumber" TEXT,
    "covenantGrade" TEXT,
    "covenantScore" DOUBLE PRECISION,
    "covenantCheckedAt" TIMESTAMP(3),
    "sector" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_userId_name_key" ON "Tenant"("userId", "name");
CREATE INDEX IF NOT EXISTS "Tenant_userId_idx" ON "Tenant"("userId");
ALTER TABLE "Tenant" ADD CONSTRAINT IF NOT EXISTS "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT IF NOT EXISTS "Tenant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Wave 2: Lease model
CREATE TABLE IF NOT EXISTS "Lease" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "documentId" TEXT,
    "leaseRef" TEXT,
    "sqft" INTEGER NOT NULL DEFAULT 0,
    "passingRent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentPerSqft" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "breakDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "currency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lease_userId_idx" ON "Lease"("userId");
CREATE INDEX IF NOT EXISTS "Lease_tenantId_idx" ON "Lease"("tenantId");
CREATE INDEX IF NOT EXISTS "Lease_assetId_idx" ON "Lease"("assetId");
ALTER TABLE "Lease" ADD CONSTRAINT IF NOT EXISTS "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT IF NOT EXISTS "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT IF NOT EXISTS "Lease_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wave 2: TenantPayment model
CREATE TABLE IF NOT EXISTS "TenantPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TenantPayment_leaseId_idx" ON "TenantPayment"("leaseId");
CREATE INDEX IF NOT EXISTS "TenantPayment_tenantId_idx" ON "TenantPayment"("tenantId");
ALTER TABLE "TenantPayment" ADD CONSTRAINT IF NOT EXISTS "TenantPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT IF NOT EXISTS "TenantPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPayment" ADD CONSTRAINT IF NOT EXISTS "TenantPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wave 2: TenantEngagement model
CREATE TABLE IF NOT EXISTS "TenantEngagement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "letterDraft" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantEngagement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TenantEngagement_leaseId_idx" ON "TenantEngagement"("leaseId");
ALTER TABLE "TenantEngagement" ADD CONSTRAINT IF NOT EXISTS "TenantEngagement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantEngagement" ADD CONSTRAINT IF NOT EXISTS "TenantEngagement_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantEngagement" ADD CONSTRAINT IF NOT EXISTS "TenantEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wave 2: TenantLetter model
CREATE TABLE IF NOT EXISTS "TenantLetter" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "sentToEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantLetter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TenantLetter_leaseId_idx" ON "TenantLetter"("leaseId");
CREATE INDEX IF NOT EXISTS "TenantLetter_tenantId_idx" ON "TenantLetter"("tenantId");

-- Wave 2: ScoutUnderwriting model
CREATE TABLE IF NOT EXISTS "ScoutUnderwriting" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passedRentPa" DOUBLE PRECISION,
    "vacancyRate" DOUBLE PRECISION,
    "opexPct" DOUBLE PRECISION,
    "capexEstimate" DOUBLE PRECISION,
    "noiGross" DOUBLE PRECISION,
    "noinet" DOUBLE PRECISION,
    "capRate" DOUBLE PRECISION,
    "marketCapRate" DOUBLE PRECISION,
    "capRateGap" DOUBLE PRECISION,
    "yieldOnCost" DOUBLE PRECISION,
    "grossYield" DOUBLE PRECISION,
    "dscr" DOUBLE PRECISION,
    "irr5yr" DOUBLE PRECISION,
    "dataSource" TEXT NOT NULL DEFAULT 'estimated',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoutUnderwriting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScoutUnderwriting_dealId_key" ON "ScoutUnderwriting"("dealId");
ALTER TABLE "ScoutUnderwriting" ADD CONSTRAINT IF NOT EXISTS "ScoutUnderwriting_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutUnderwriting" ADD CONSTRAINT IF NOT EXISTS "ScoutUnderwriting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wave 2: ScoutLOI model
CREATE TABLE IF NOT EXISTS "ScoutLOI" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerPrice" DOUBLE PRECISION NOT NULL,
    "depositPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "conditionalDays" INTEGER NOT NULL DEFAULT 28,
    "completionDays" INTEGER NOT NULL DEFAULT 90,
    "specialConditions" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoutLOI_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ScoutLOI_dealId_userId_idx" ON "ScoutLOI"("dealId", "userId");
ALTER TABLE "ScoutLOI" ADD CONSTRAINT IF NOT EXISTS "ScoutLOI_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutLOI" ADD CONSTRAINT IF NOT EXISTS "ScoutLOI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wave 2: HoldSellScenario model
CREATE TABLE IF NOT EXISTS "HoldSellScenario" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdIRR" DOUBLE PRECISION,
    "holdNPV" DOUBLE PRECISION,
    "equityMultiple" DOUBLE PRECISION,
    "sellProceeds" DOUBLE PRECISION,
    "sellNPV" DOUBLE PRECISION,
    "recommendation" TEXT,
    "confidence" DOUBLE PRECISION,
    "userAssumptions" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HoldSellScenario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HoldSellScenario_assetId_idx" ON "HoldSellScenario"("assetId");
ALTER TABLE "HoldSellScenario" ADD CONSTRAINT IF NOT EXISTS "HoldSellScenario_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HoldSellScenario" ADD CONSTRAINT IF NOT EXISTS "HoldSellScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

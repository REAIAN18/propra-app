-- Complete baseline schema for RealHQ (propra). Generated from prisma/schema.prisma.
-- Replaces all prior db-push history; all 2026* migrations are subsequently marked applied.

-- CreateEnum
CREATE TYPE "Portfolio" AS ENUM ('FL_MIXED', 'SE_LOGISTICS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "portfolio" "Portfolio" NOT NULL DEFAULT 'FL_MIXED',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SignupLead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "assetCount" INTEGER,
    "portfolioValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unsubscribe" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEmail" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sendAfter" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectKey" TEXT,
    "touchNumber" INTEGER,
    "market" TEXT,

    CONSTRAINT "ScheduledEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "portfolioInput" TEXT NOT NULL,
    "assetType" TEXT,
    "assetCount" INTEGER,
    "estimateTotal" INTEGER,
    "estimateJson" TEXT,
    "enrichmentsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" TEXT,
    "summary" TEXT,
    "extractedData" JSONB,
    "extractedJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExtract" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawText" TEXT,
    "structuredJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExtract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectStatus" (
    "id" TEXT NOT NULL,
    "prospectKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "linkedinSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "touch1SentAt" TEXT,
    "touch2SentAt" TEXT,
    "touch3SentAt" TEXT,
    "emailOpened" BOOLEAN NOT NULL DEFAULT false,
    "emailClicked" BOOLEAN NOT NULL DEFAULT false,
    "emailBounced" BOOLEAN NOT NULL DEFAULT false,
    "lastContact" TEXT,
    "emailOverride" TEXT,
    "linkedinOverride" TEXT,
    "manualStatus" TEXT,
    "manualNote" TEXT,
    "manualUpdatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "ProspectStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sqft" INTEGER,
    "grossIncome" INTEGER,
    "netIncome" INTEGER,
    "passingRent" DOUBLE PRECISION,
    "marketERV" DOUBLE PRECISION,
    "insurancePremium" INTEGER,
    "marketInsurance" INTEGER,
    "energyCost" INTEGER,
    "marketEnergyCost" INTEGER,
    "occupancy" DOUBLE PRECISION,
    "sourceDocumentId" TEXT,
    "address" TEXT,
    "postcode" TEXT,
    "country" TEXT DEFAULT 'UK',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "epcRating" TEXT,
    "epcFetched" BOOLEAN NOT NULL DEFAULT false,
    "formattedAddress" TEXT,
    "epcExpiry" TIMESTAMP(3),
    "floodRisk" TEXT,
    "floodZone" TEXT,
    "femaZoneRaw" JSONB,
    "planningHistory" JSONB,
    "satelliteUrl" TEXT,
    "marketCapRate" DOUBLE PRECISION,
    "marketRentSqft" DOUBLE PRECISION,
    "meterType" TEXT,
    "planningImpactSignal" TEXT,
    "planningLastFetched" TIMESTAMP(3),
    "avmValue" DOUBLE PRECISION,
    "avmLow" DOUBLE PRECISION,
    "avmHigh" DOUBLE PRECISION,
    "avmDate" TIMESTAMP(3),
    "avmConfidence" DOUBLE PRECISION,
    "pipelineStage" TEXT,
    "pipelineUpdatedAt" TIMESTAMP(3),
    "brochureDocId" TEXT,
    "tenantCount" INTEGER,
    "wault" DOUBLE PRECISION,
    "region" TEXT,
    "insuranceRiskScore" DOUBLE PRECISION,
    "insuranceRiskFactors" JSONB,
    "insuranceRoadmap" JSONB,
    "insuranceRiskAssessedAt" TIMESTAMP(3),
    "siteCoveragePct" DOUBLE PRECISION,
    "pdRights" TEXT,
    "pdRightsDetail" TEXT,
    "changeOfUsePotential" TEXT,
    "changeOfUseDetail" TEXT,
    "airRightsPotential" TEXT,
    "airRightsDetail" TEXT,
    "devPotentialAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyComparable" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "attomId" TEXT,
    "address" TEXT NOT NULL,
    "sqft" INTEGER,
    "yearBuilt" INTEGER,
    "saleAmount" DOUBLE PRECISION,
    "saleDate" TEXT,
    "pricePerSqft" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'attom',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyComparable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "carrier" TEXT NOT NULL,
    "quoteRef" TEXT,
    "policyType" TEXT,
    "currentPremium" DOUBLE PRECISION,
    "quotedPremium" DOUBLE PRECISION NOT NULL,
    "annualSaving" DOUBLE PRECISION,
    "coverageDetails" JSONB,
    "dataSource" TEXT NOT NULL DEFAULT 'benchmark',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "supplier" TEXT NOT NULL,
    "currentSupplier" TEXT,
    "currentRate" DOUBLE PRECISION,
    "quotedRate" DOUBLE PRECISION NOT NULL,
    "annualUsage" DOUBLE PRECISION,
    "currentCost" DOUBLE PRECISION,
    "quotedCost" DOUBLE PRECISION NOT NULL,
    "annualSaving" DOUBLE PRECISION,
    "dataSource" TEXT NOT NULL DEFAULT 'benchmark',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "category" TEXT NOT NULL,
    "sourceId" TEXT,
    "annualSaving" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "commissionValue" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "placedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroRate" (
    "id" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MacroRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acquisition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "sqft" INTEGER,
    "askingPrice" DOUBLE PRECISION NOT NULL,
    "estimatedYield" DOUBLE PRECISION NOT NULL,
    "marketYield" DOUBLE PRECISION,
    "score" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'screening',
    "rationale" TEXT,
    "noi" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Acquisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "opportunityType" TEXT NOT NULL,
    "opportunityLabel" TEXT,
    "annualIncome" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "tenderType" TEXT,
    "jobType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scopeOfWorks" TEXT,
    "accessNotes" TEXT,
    "timing" TEXT,
    "targetStart" TEXT,
    "budgetEstimate" DOUBLE PRECISION,
    "benchmarkLow" DOUBLE PRECISION,
    "benchmarkHigh" DOUBLE PRECISION,
    "benchmarkSource" TEXT,
    "capRateValueAdd" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contractor" TEXT,
    "costEstimate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "autoTriggerFrom" TEXT,
    "autoTriggerRef" TEXT,
    "agreedPrice" DOUBLE PRECISION,
    "contractorId" TEXT,
    "finalCost" DOUBLE PRECISION,
    "aiScopeJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderQuote" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "warranty" TEXT,
    "timeline" TEXT,
    "rating" DOUBLE PRECISION,
    "notes" TEXT,
    "awarded" BOOLEAN NOT NULL DEFAULT false,
    "tenderToken" TEXT,
    "contractorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantEngagementAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaseRef" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantEngagementAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutDeal" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "address" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "sqft" INTEGER,
    "askingPrice" DOUBLE PRECISION,
    "guidePrice" DOUBLE PRECISION,
    "capRate" DOUBLE PRECISION,
    "brokerName" TEXT,
    "daysOnMarket" INTEGER,
    "sourceTag" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "hasLisPendens" BOOLEAN NOT NULL DEFAULT false,
    "hasInsolvency" BOOLEAN NOT NULL DEFAULT false,
    "lastSaleYear" INTEGER,
    "hasPlanningApplication" BOOLEAN NOT NULL DEFAULT false,
    "solarIncomeEstimate" DOUBLE PRECISION,
    "inFloodZone" BOOLEAN NOT NULL DEFAULT false,
    "auctionDate" TIMESTAMP(3),
    "ownerName" TEXT,
    "satelliteImageUrl" TEXT,
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" TEXT NOT NULL DEFAULT 'active',
    "pipelineStage" TEXT,
    "pipelineUpdatedAt" TIMESTAMP(3),
    "brochureDocId" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Tenant" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPayment" (
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

-- CreateTable
CREATE TABLE "TenantEngagement" (
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

-- CreateTable
CREATE TABLE "TenantLetter" (
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

-- CreateTable
CREATE TABLE "ScoutUnderwriting" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutUnderwriting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutLOI" (
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

-- CreateTable
CREATE TABLE "HoldSellScenario" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdNPV" DOUBLE PRECISION,
    "holdIRR" DOUBLE PRECISION,
    "holdEquityMultiple" DOUBLE PRECISION,
    "holdCashYield" DOUBLE PRECISION,
    "estimatedSalePrice" DOUBLE PRECISION,
    "sellNetProceeds" DOUBLE PRECISION,
    "sellRedeployedNPV" DOUBLE PRECISION,
    "sellIRR" DOUBLE PRECISION,
    "sellEquityMultiple" DOUBLE PRECISION,
    "recommendation" TEXT,
    "rationale" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "dataSource" TEXT,
    "holdPeriodYears" DOUBLE PRECISION,
    "rentGrowthPct" DOUBLE PRECISION,
    "exitYield" DOUBLE PRECISION,
    "vacancyAllowance" DOUBLE PRECISION,
    "capexSchedule" DOUBLE PRECISION,
    "sellingCostsPct" DOUBLE PRECISION,
    "redeploymentYield" DOUBLE PRECISION,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldSellScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentReviewEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "leaseId" TEXT,
    "tenantName" TEXT NOT NULL,
    "propertyAddress" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "breakDate" TIMESTAMP(3),
    "passingRent" DOUBLE PRECISION NOT NULL,
    "sqft" INTEGER,
    "ervLive" DOUBLE PRECISION,
    "ervSource" TEXT,
    "ervFetchedAt" TIMESTAMP(3),
    "gap" DOUBLE PRECISION,
    "leverageScore" INTEGER,
    "leverageExplanation" TEXT,
    "horizon" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "draftGeneratedAt" TIMESTAMP(3),
    "hotSignedAt" TIMESTAMP(3),
    "leaseSigned" TIMESTAMP(3),
    "newRent" DOUBLE PRECISION,
    "commissionGbp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalCorrespondence" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "docusignEnvelopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalCorrespondence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValuation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "valuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "avmValue" DOUBLE PRECISION,
    "avmLow" DOUBLE PRECISION,
    "avmHigh" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "capRateUsed" DOUBLE PRECISION,
    "capRateSource" TEXT,
    "noiEstimate" DOUBLE PRECISION,
    "incomeCapValue" DOUBLE PRECISION,
    "pricePerSqft" DOUBLE PRECISION,
    "sqftValue" DOUBLE PRECISION,
    "compsUsed" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "previousValue" DOUBLE PRECISION,
    "changeAbsolute" DOUBLE PRECISION,
    "changePct" DOUBLE PRECISION,

    CONSTRAINT "AssetValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellEnquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "refNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applicant" TEXT,
    "applicantAgent" TEXT,
    "applicationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "validDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "siteAddress" TEXT,
    "postcode" TEXT,
    "distanceMetres" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lpaCode" TEXT,
    "lpaName" TEXT,
    "country" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'admin',
    "sourceRef" TEXT,
    "sourceUrl" TEXT,
    "impact" TEXT,
    "impactScore" DOUBLE PRECISION,
    "impactRationale" TEXT,
    "holdSellLink" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "lastStatusSeen" TEXT,
    "alertSentAt" TIMESTAMP(3),
    "alertAcked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "kwh" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyAnomaly" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectionBasis" TEXT NOT NULL,
    "annualSavingGbp" DOUBLE PRECISION,
    "calculationDetail" JSONB,
    "probableCause" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "actionTaken" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roofAreaSqm" DOUBLE PRECISION,
    "panelCountEstimate" INTEGER,
    "annualGenKwh" DOUBLE PRECISION,
    "googleSolarRaw" JSONB,
    "currentUnitRateP" DOUBLE PRECISION,
    "segExportRateP" DOUBLE PRECISION,
    "selfConsumptionSavingGbp" DOUBLE PRECISION,
    "exportIncomeGbp" DOUBLE PRECISION,
    "installCostGbp" DOUBLE PRECISION,
    "paybackYears" DOUBLE PRECISION,
    "epcImprovementBands" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'viable',
    "notViableReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarQuoteRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarQuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutComparable" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "sqft" INTEGER,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "pricePerSqft" DOUBLE PRECISION,
    "capRateAtSale" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutComparable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "unitRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "askingRent" DOUBLE PRECISION NOT NULL,
    "leaseTermYears" DOUBLE PRECISION,
    "useClass" TEXT,
    "notes" TEXT,
    "agreedRent" DOUBLE PRECISION,
    "agreedTermYears" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "lettingId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "useCase" TEXT,
    "covenantGrade" TEXT,
    "covenantCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "SignupLead_email_key" ON "SignupLead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Unsubscribe_email_key" ON "Unsubscribe"("email");

-- CreateIndex
CREATE INDEX "ScheduledEmail_sendAfter_sentAt_idx" ON "ScheduledEmail"("sendAfter", "sentAt");

-- CreateIndex
CREATE INDEX "DocumentExtract_documentId_idx" ON "DocumentExtract"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectStatus_prospectKey_key" ON "ProspectStatus"("prospectKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAsset_userId_name_key" ON "UserAsset"("userId", "name");

-- CreateIndex
CREATE INDEX "PropertyComparable_assetId_idx" ON "PropertyComparable"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyComparable_assetId_source_address_key" ON "PropertyComparable"("assetId", "source", "address");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortfolio_urlKey_key" ON "ClientPortfolio"("urlKey");

-- CreateIndex
CREATE UNIQUE INDEX "MacroRate_series_date_key" ON "MacroRate"("series", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TenderQuote_tenderToken_key" ON "TenderQuote"("tenderToken");

-- CreateIndex
CREATE INDEX "TenantEngagementAction_userId_leaseRef_idx" ON "TenantEngagementAction"("userId", "leaseRef");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutDeal_externalId_key" ON "ScoutDeal"("externalId");

-- CreateIndex
CREATE INDEX "ScoutReaction_userId_idx" ON "ScoutReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutReaction_userId_dealId_key" ON "ScoutReaction"("userId", "dealId");

-- CreateIndex
CREATE INDEX "Contractor_region_idx" ON "Contractor"("region");

-- CreateIndex
CREATE INDEX "WorkOrderMilestone_workOrderId_idx" ON "WorkOrderMilestone"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderCompletion_workOrderId_key" ON "WorkOrderCompletion"("workOrderId");

-- CreateIndex
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_name_key" ON "Tenant"("userId", "name");

-- CreateIndex
CREATE INDEX "Lease_userId_idx" ON "Lease"("userId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_assetId_idx" ON "Lease"("assetId");

-- CreateIndex
CREATE INDEX "TenantPayment_leaseId_idx" ON "TenantPayment"("leaseId");

-- CreateIndex
CREATE INDEX "TenantPayment_tenantId_idx" ON "TenantPayment"("tenantId");

-- CreateIndex
CREATE INDEX "TenantEngagement_leaseId_idx" ON "TenantEngagement"("leaseId");

-- CreateIndex
CREATE INDEX "TenantLetter_leaseId_idx" ON "TenantLetter"("leaseId");

-- CreateIndex
CREATE INDEX "TenantLetter_tenantId_idx" ON "TenantLetter"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutUnderwriting_dealId_key" ON "ScoutUnderwriting"("dealId");

-- CreateIndex
CREATE INDEX "ScoutLOI_dealId_userId_idx" ON "ScoutLOI"("dealId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "HoldSellScenario_assetId_key" ON "HoldSellScenario"("assetId");

-- CreateIndex
CREATE INDEX "RentReviewEvent_userId_idx" ON "RentReviewEvent"("userId");

-- CreateIndex
CREATE INDEX "RentReviewEvent_assetId_idx" ON "RentReviewEvent"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "RentReviewEvent_userId_leaseId_horizon_key" ON "RentReviewEvent"("userId", "leaseId", "horizon");

-- CreateIndex
CREATE INDEX "RenewalCorrespondence_reviewId_idx" ON "RenewalCorrespondence"("reviewId");

-- CreateIndex
CREATE INDEX "AssetValuation_userId_idx" ON "AssetValuation"("userId");

-- CreateIndex
CREATE INDEX "AssetValuation_assetId_idx" ON "AssetValuation"("assetId");

-- CreateIndex
CREATE INDEX "SellEnquiry_userId_idx" ON "SellEnquiry"("userId");

-- CreateIndex
CREATE INDEX "SellEnquiry_assetId_idx" ON "SellEnquiry"("assetId");

-- CreateIndex
CREATE INDEX "PlanningApplication_userId_idx" ON "PlanningApplication"("userId");

-- CreateIndex
CREATE INDEX "PlanningApplication_assetId_idx" ON "PlanningApplication"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningApplication_assetId_sourceRef_key" ON "PlanningApplication"("assetId", "sourceRef");

-- CreateIndex
CREATE INDEX "EnergyRead_assetId_readAt_idx" ON "EnergyRead"("assetId", "readAt" DESC);

-- CreateIndex
CREATE INDEX "EnergyAnomaly_userId_idx" ON "EnergyAnomaly"("userId");

-- CreateIndex
CREATE INDEX "EnergyAnomaly_assetId_idx" ON "EnergyAnomaly"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "SolarAssessment_assetId_key" ON "SolarAssessment"("assetId");

-- CreateIndex
CREATE INDEX "SolarAssessment_userId_idx" ON "SolarAssessment"("userId");

-- CreateIndex
CREATE INDEX "SolarQuoteRequest_userId_idx" ON "SolarQuoteRequest"("userId");

-- CreateIndex
CREATE INDEX "SolarQuoteRequest_assetId_idx" ON "SolarQuoteRequest"("assetId");

-- CreateIndex
CREATE INDEX "ScoutComparable_dealId_idx" ON "ScoutComparable"("dealId");

-- CreateIndex
CREATE INDEX "Letting_userId_idx" ON "Letting"("userId");

-- CreateIndex
CREATE INDEX "Letting_assetId_idx" ON "Letting"("assetId");

-- CreateIndex
CREATE INDEX "Enquiry_lettingId_idx" ON "Enquiry"("lettingId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentExtract" ADD CONSTRAINT "DocumentExtract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAsset" ADD CONSTRAINT "UserAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAsset" ADD CONSTRAINT "UserAsset_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyComparable" ADD CONSTRAINT "PropertyComparable_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceQuote" ADD CONSTRAINT "InsuranceQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceQuote" ADD CONSTRAINT "InsuranceQuote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyQuote" ADD CONSTRAINT "EnergyQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyQuote" ADD CONSTRAINT "EnergyQuote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acquisition" ADD CONSTRAINT "Acquisition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeActivation" ADD CONSTRAINT "IncomeActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeActivation" ADD CONSTRAINT "IncomeActivation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderQuote" ADD CONSTRAINT "TenderQuote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEngagementAction" ADD CONSTRAINT "TenantEngagementAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReaction" ADD CONSTRAINT "ScoutReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReaction" ADD CONSTRAINT "ScoutReaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMilestone" ADD CONSTRAINT "WorkOrderMilestone_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCompletion" ADD CONSTRAINT "WorkOrderCompletion_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEngagement" ADD CONSTRAINT "TenantEngagement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEngagement" ADD CONSTRAINT "TenantEngagement_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEngagement" ADD CONSTRAINT "TenantEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutUnderwriting" ADD CONSTRAINT "ScoutUnderwriting_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutUnderwriting" ADD CONSTRAINT "ScoutUnderwriting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutLOI" ADD CONSTRAINT "ScoutLOI_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutLOI" ADD CONSTRAINT "ScoutLOI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldSellScenario" ADD CONSTRAINT "HoldSellScenario_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldSellScenario" ADD CONSTRAINT "HoldSellScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReviewEvent" ADD CONSTRAINT "RentReviewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReviewEvent" ADD CONSTRAINT "RentReviewEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentReviewEvent" ADD CONSTRAINT "RentReviewEvent_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalCorrespondence" ADD CONSTRAINT "RenewalCorrespondence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "RentReviewEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValuation" ADD CONSTRAINT "AssetValuation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValuation" ADD CONSTRAINT "AssetValuation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellEnquiry" ADD CONSTRAINT "SellEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellEnquiry" ADD CONSTRAINT "SellEnquiry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningApplication" ADD CONSTRAINT "PlanningApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningApplication" ADD CONSTRAINT "PlanningApplication_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyRead" ADD CONSTRAINT "EnergyRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyRead" ADD CONSTRAINT "EnergyRead_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyAnomaly" ADD CONSTRAINT "EnergyAnomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyAnomaly" ADD CONSTRAINT "EnergyAnomaly_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarAssessment" ADD CONSTRAINT "SolarAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarAssessment" ADD CONSTRAINT "SolarAssessment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarQuoteRequest" ADD CONSTRAINT "SolarQuoteRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarQuoteRequest" ADD CONSTRAINT "SolarQuoteRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarQuoteRequest" ADD CONSTRAINT "SolarQuoteRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "SolarAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutComparable" ADD CONSTRAINT "ScoutComparable_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letting" ADD CONSTRAINT "Letting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letting" ADD CONSTRAINT "Letting_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_lettingId_fkey" FOREIGN KEY ("lettingId") REFERENCES "Letting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


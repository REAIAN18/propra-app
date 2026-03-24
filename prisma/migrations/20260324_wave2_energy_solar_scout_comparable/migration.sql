-- Wave 2: Energy (EnergyRead, EnergyAnomaly, SolarAssessment, SolarQuoteRequest),
--         Scout (ScoutComparable), and TenderQuote field additions (tenderToken, contractorId)

-- ── EnergyRead ──────────────────────────────────────────────────────────────

CREATE TABLE "EnergyRead" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "assetId"   TEXT NOT NULL,
    "meterId"   TEXT NOT NULL,
    "readAt"    TIMESTAMP(3) NOT NULL,
    "kwh"       DOUBLE PRECISION NOT NULL,
    "source"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyRead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnergyRead_assetId_readAt_idx" ON "EnergyRead"("assetId", "readAt" DESC);

ALTER TABLE "EnergyRead"
  ADD CONSTRAINT "EnergyRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnergyRead"
  ADD CONSTRAINT "EnergyRead_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EnergyAnomaly ────────────────────────────────────────────────────────────

CREATE TABLE "EnergyAnomaly" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "assetId"           TEXT NOT NULL,
    "anomalyType"       TEXT NOT NULL,
    "detectedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectionBasis"    TEXT NOT NULL,
    "annualSavingGbp"   DOUBLE PRECISION,
    "calculationDetail" JSONB,
    "probableCause"     TEXT,
    "status"            TEXT NOT NULL DEFAULT 'open',
    "actionTaken"       TEXT,
    "resolvedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyAnomaly_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnergyAnomaly_userId_idx" ON "EnergyAnomaly"("userId");
CREATE INDEX "EnergyAnomaly_assetId_idx" ON "EnergyAnomaly"("assetId");

ALTER TABLE "EnergyAnomaly"
  ADD CONSTRAINT "EnergyAnomaly_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnergyAnomaly"
  ADD CONSTRAINT "EnergyAnomaly_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SolarAssessment ──────────────────────────────────────────────────────────

CREATE TABLE "SolarAssessment" (
    "id"                       TEXT NOT NULL,
    "userId"                   TEXT NOT NULL,
    "assetId"                  TEXT NOT NULL,
    "assessedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roofAreaSqm"              DOUBLE PRECISION,
    "panelCountEstimate"       INTEGER,
    "annualGenKwh"             DOUBLE PRECISION,
    "googleSolarRaw"           JSONB,
    "currentUnitRateP"         DOUBLE PRECISION,
    "segExportRateP"           DOUBLE PRECISION,
    "selfConsumptionSavingGbp" DOUBLE PRECISION,
    "exportIncomeGbp"          DOUBLE PRECISION,
    "installCostGbp"           DOUBLE PRECISION,
    "paybackYears"             DOUBLE PRECISION,
    "epcImprovementBands"      INTEGER,
    "status"                   TEXT NOT NULL DEFAULT 'viable',
    "notViableReason"          TEXT,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SolarAssessment_assetId_key" ON "SolarAssessment"("assetId");
CREATE INDEX "SolarAssessment_userId_idx" ON "SolarAssessment"("userId");

ALTER TABLE "SolarAssessment"
  ADD CONSTRAINT "SolarAssessment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SolarAssessment"
  ADD CONSTRAINT "SolarAssessment_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SolarQuoteRequest ────────────────────────────────────────────────────────

CREATE TABLE "SolarQuoteRequest" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "assetId"         TEXT NOT NULL,
    "assessmentId"    TEXT NOT NULL,
    "requestedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "approvedQuoteId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarQuoteRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SolarQuoteRequest_userId_idx" ON "SolarQuoteRequest"("userId");
CREATE INDEX "SolarQuoteRequest_assetId_idx" ON "SolarQuoteRequest"("assetId");

ALTER TABLE "SolarQuoteRequest"
  ADD CONSTRAINT "SolarQuoteRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SolarQuoteRequest"
  ADD CONSTRAINT "SolarQuoteRequest_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SolarQuoteRequest"
  ADD CONSTRAINT "SolarQuoteRequest_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "SolarAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScoutComparable ──────────────────────────────────────────────────────────

CREATE TABLE "ScoutComparable" (
    "id"            TEXT NOT NULL,
    "dealId"        TEXT NOT NULL,
    "address"       TEXT NOT NULL,
    "assetType"     TEXT NOT NULL,
    "sqft"          INTEGER,
    "salePrice"     DOUBLE PRECISION NOT NULL,
    "saleDate"      TIMESTAMP(3) NOT NULL,
    "pricePerSqft"  DOUBLE PRECISION,
    "capRateAtSale" DOUBLE PRECISION,
    "source"        TEXT NOT NULL,
    "sourceRef"     TEXT,
    "currency"      TEXT NOT NULL DEFAULT 'GBP',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutComparable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoutComparable_dealId_idx" ON "ScoutComparable"("dealId");

ALTER TABLE "ScoutComparable"
  ADD CONSTRAINT "ScoutComparable_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TenderQuote: add tenderToken + contractorId ──────────────────────────────

ALTER TABLE "TenderQuote"
  ADD COLUMN "tenderToken"  TEXT,
  ADD COLUMN "contractorId" TEXT;

CREATE UNIQUE INDEX "TenderQuote_tenderToken_key" ON "TenderQuote"("tenderToken");

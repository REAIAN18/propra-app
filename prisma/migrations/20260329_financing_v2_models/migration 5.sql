-- CreateTable: Add Loan model for Financing v2
CREATE TABLE IF NOT EXISTS "Loan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "assetId" TEXT,
  "lender" TEXT NOT NULL,
  "lenderContact" TEXT,
  "outstandingBalance" DOUBLE PRECISION NOT NULL,
  "originalBalance" DOUBLE PRECISION NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "rateType" TEXT NOT NULL,
  "rateReference" TEXT,
  "spread" DOUBLE PRECISION,
  "termYears" DOUBLE PRECISION NOT NULL,
  "maturityDate" TIMESTAMP(3) NOT NULL,
  "ltvCovenant" DOUBLE PRECISION,
  "dscrCovenant" DOUBLE PRECISION,
  "currentLTV" DOUBLE PRECISION,
  "currentDSCR" DOUBLE PRECISION,
  "monthlyPayment" DOUBLE PRECISION NOT NULL,
  "annualDebtService" DOUBLE PRECISION NOT NULL,
  "prepaymentPenalty" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Loan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: Add LenderRelationship model
CREATE TABLE IF NOT EXISTS "LenderRelationship" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lenderName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "lastInteraction" TIMESTAMP(3),
  "notes" TEXT,
  "loansCount" INTEGER NOT NULL DEFAULT 0,
  "avgRate" DOUBLE PRECISION,
  "avgLTV" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LenderRelationship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Loan_userId_idx" ON "Loan"("userId");
CREATE INDEX IF NOT EXISTS "Loan_assetId_idx" ON "Loan"("assetId");
CREATE INDEX IF NOT EXISTS "Loan_maturityDate_idx" ON "Loan"("maturityDate");
CREATE INDEX IF NOT EXISTS "LenderRelationship_userId_idx" ON "LenderRelationship"("userId");

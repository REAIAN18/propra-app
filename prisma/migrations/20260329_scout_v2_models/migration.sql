-- CreateTable
CREATE TABLE "DealFinanceModel" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "loanAmount" DOUBLE PRECISION,
    "loanRate" DOUBLE PRECISION,
    "loanTerm" INTEGER,
    "ltvPct" DOUBLE PRECISION,
    "equityRequired" DOUBLE PRECISION,
    "mezzAmount" DOUBLE PRECISION,
    "mezzRate" DOUBLE PRECISION,
    "totalCapital" DOUBLE PRECISION,
    "leveragedIRR" DOUBLE PRECISION,
    "cashOnCash" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealFinanceModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorOutreach" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),
    "responseStatus" TEXT,
    "notes" TEXT,

    CONSTRAINT "InvestorOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealFinanceModel_dealId_key" ON "DealFinanceModel"("dealId");

-- CreateIndex
CREATE INDEX "InvestorContact_userId_idx" ON "InvestorContact"("userId");

-- CreateIndex
CREATE INDEX "InvestorContact_status_idx" ON "InvestorContact"("status");

-- CreateIndex
CREATE INDEX "InvestorOutreach_investorId_idx" ON "InvestorOutreach"("investorId");

-- CreateIndex
CREATE INDEX "InvestorOutreach_dealId_idx" ON "InvestorOutreach"("dealId");

-- CreateIndex
CREATE INDEX "InvestorOutreach_sentAt_idx" ON "InvestorOutreach"("sentAt");

-- AddForeignKey
ALTER TABLE "DealFinanceModel" ADD CONSTRAINT "DealFinanceModel_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorContact" ADD CONSTRAINT "InvestorContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorOutreach" ADD CONSTRAINT "InvestorOutreach_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "InvestorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorOutreach" ADD CONSTRAINT "InvestorOutreach_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

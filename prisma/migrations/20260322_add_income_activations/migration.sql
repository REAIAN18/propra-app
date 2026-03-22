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

-- AddForeignKey
ALTER TABLE "IncomeActivation" ADD CONSTRAINT "IncomeActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeActivation" ADD CONSTRAINT "IncomeActivation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UserAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

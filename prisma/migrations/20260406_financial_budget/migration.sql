-- Create FinancialBudget table (PRO-997)
CREATE TABLE "FinancialBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "budgetedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedOpEx" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedNOI" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedEnergy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedMaintenance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedManagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialBudget_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint
CREATE UNIQUE INDEX "FinancialBudget_userId_year_key" ON "FinancialBudget"("userId", "year");

-- Add index
CREATE INDEX "FinancialBudget_userId_idx" ON "FinancialBudget"("userId");

-- Add foreign key
ALTER TABLE "FinancialBudget" ADD CONSTRAINT "FinancialBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

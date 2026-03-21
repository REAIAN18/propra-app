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

-- AddForeignKey
ALTER TABLE "Acquisition" ADD CONSTRAINT "Acquisition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

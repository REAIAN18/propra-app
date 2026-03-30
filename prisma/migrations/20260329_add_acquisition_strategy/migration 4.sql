-- CreateTable
CREATE TABLE "AcquisitionStrategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "targetTypes" TEXT[],
    "targetGeography" TEXT[],
    "minYield" DOUBLE PRECISION,
    "maxYield" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "minSqft" INTEGER,
    "maxSqft" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcquisitionStrategy_userId_idx" ON "AcquisitionStrategy"("userId");

-- AddForeignKey
ALTER TABLE "AcquisitionStrategy" ADD CONSTRAINT "AcquisitionStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

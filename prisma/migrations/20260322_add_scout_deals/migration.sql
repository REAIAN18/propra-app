-- CreateTable
CREATE TABLE "ScoutDeal" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "sqft" INTEGER,
    "askingPrice" DOUBLE PRECISION,
    "guidePrice" DOUBLE PRECISION,
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

-- CreateIndex
CREATE UNIQUE INDEX "ScoutReaction_userId_dealId_key" ON "ScoutReaction"("userId", "dealId");

-- CreateIndex
CREATE INDEX "ScoutReaction_userId_idx" ON "ScoutReaction"("userId");

-- AddForeignKey
ALTER TABLE "ScoutReaction" ADD CONSTRAINT "ScoutReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReaction" ADD CONSTRAINT "ScoutReaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

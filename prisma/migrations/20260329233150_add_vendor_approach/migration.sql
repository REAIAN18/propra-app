-- CreateTable
CREATE TABLE "VendorApproach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vendorEmail" TEXT,
    "vendorName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "transactionRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorApproach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorApproach_transactionRoomId_key" ON "VendorApproach"("transactionRoomId");

-- CreateIndex
CREATE INDEX "VendorApproach_userId_idx" ON "VendorApproach"("userId");

-- CreateIndex
CREATE INDEX "VendorApproach_dealId_idx" ON "VendorApproach"("dealId");

-- CreateIndex
CREATE INDEX "VendorApproach_status_idx" ON "VendorApproach"("status");

-- AddForeignKey
ALTER TABLE "VendorApproach" ADD CONSTRAINT "VendorApproach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApproach" ADD CONSTRAINT "VendorApproach_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApproach" ADD CONSTRAINT "VendorApproach_transactionRoomId_fkey" FOREIGN KEY ("transactionRoomId") REFERENCES "TransactionRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

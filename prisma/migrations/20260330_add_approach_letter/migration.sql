-- CreateTable
CREATE TABLE "ApproachLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "letterContent" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'formal',
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientAddress" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT,
    "responseStatus" TEXT,
    "followUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApproachLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApproachLetter_userId_idx" ON "ApproachLetter"("userId");

-- CreateIndex
CREATE INDEX "ApproachLetter_dealId_idx" ON "ApproachLetter"("dealId");

-- CreateIndex
CREATE INDEX "ApproachLetter_sentAt_idx" ON "ApproachLetter"("sentAt");

-- AddForeignKey
ALTER TABLE "ApproachLetter" ADD CONSTRAINT "ApproachLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApproachLetter" ADD CONSTRAINT "ApproachLetter_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ScoutDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

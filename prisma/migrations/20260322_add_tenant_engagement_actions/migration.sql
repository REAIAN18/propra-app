-- CreateTable
CREATE TABLE "TenantEngagementAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaseRef" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantEngagementAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantEngagementAction_userId_leaseRef_idx" ON "TenantEngagementAction"("userId", "leaseRef");

-- AddForeignKey
ALTER TABLE "TenantEngagementAction" ADD CONSTRAINT "TenantEngagementAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

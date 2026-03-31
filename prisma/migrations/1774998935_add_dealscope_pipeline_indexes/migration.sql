-- AddIndex
CREATE INDEX "UserAsset_userId_idx" ON "UserAsset"("userId");

-- AddIndex
CREATE INDEX "UserAsset_postcode_idx" ON "UserAsset"("postcode");

-- AddIndex
CREATE INDEX "UserAsset_createdAt_idx" ON "UserAsset"("createdAt");

-- AddIndex
CREATE INDEX "ScoutDeal_userId_idx" ON "ScoutDeal"("userId");

-- AddIndex
CREATE INDEX "ScoutDeal_createdAt_idx" ON "ScoutDeal"("createdAt");

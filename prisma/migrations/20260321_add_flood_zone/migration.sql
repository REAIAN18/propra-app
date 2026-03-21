-- AddColumns: floodZone and femaZoneRaw to UserAsset for FEMA flood zone data (PRO-319)
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "floodZone" TEXT;
ALTER TABLE "UserAsset" ADD COLUMN IF NOT EXISTS "femaZoneRaw" JSONB;

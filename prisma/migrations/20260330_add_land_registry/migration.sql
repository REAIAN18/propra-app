-- CreateTable LandRegistryPricePaid
CREATE TABLE "LandRegistryPricePaid" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "postcodeSector" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sqft" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'land_registry',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandRegistryPricePaid_pkey" PRIMARY KEY ("id")
);

-- CreateTable LandRegistryCCOD
CREATE TABLE "LandRegistryCCOD" (
    "id" TEXT NOT NULL,
    "titleNumber" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "postcodeSector" TEXT NOT NULL,
    "county" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'land_registry',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandRegistryCCOD_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for LandRegistryPricePaid
CREATE UNIQUE INDEX "LandRegistryPricePaid_transactionId_key" ON "LandRegistryPricePaid"("transactionId");
CREATE INDEX "LandRegistryPricePaid_postcodeSector_propertyType_transferDate_idx" ON "LandRegistryPricePaid"("postcodeSector", "propertyType", "transferDate");
CREATE INDEX "LandRegistryPricePaid_postcode_idx" ON "LandRegistryPricePaid"("postcode");
CREATE INDEX "LandRegistryPricePaid_transferDate_idx" ON "LandRegistryPricePaid"("transferDate");
CREATE INDEX "LandRegistryPricePaid_lat_lng_idx" ON "LandRegistryPricePaid"("lat", "lng");

-- CreateIndex for LandRegistryCCOD
CREATE INDEX "LandRegistryCCOD_companyNumber_idx" ON "LandRegistryCCOD"("companyNumber");
CREATE INDEX "LandRegistryCCOD_postcodeSector_idx" ON "LandRegistryCCOD"("postcodeSector");
CREATE INDEX "LandRegistryCCOD_address_idx" ON "LandRegistryCCOD"("address");
CREATE UNIQUE INDEX "LandRegistryCCOD_titleNumber_companyNumber_key" ON "LandRegistryCCOD"("titleNumber", "companyNumber");

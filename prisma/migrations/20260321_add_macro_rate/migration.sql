-- CreateTable
CREATE TABLE "MacroRate" (
    "id" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MacroRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MacroRate_series_date_key" ON "MacroRate"("series", "date");

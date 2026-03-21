-- AlterTable: add extracts relation (no SQL needed — defined by DocumentExtract FK)

-- CreateTable
CREATE TABLE "DocumentExtract" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawText" TEXT,
    "structuredJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExtract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentExtract_documentId_idx" ON "DocumentExtract"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentExtract" ADD CONSTRAINT "DocumentExtract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

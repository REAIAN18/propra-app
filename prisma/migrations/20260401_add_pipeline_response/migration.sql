-- CreateTable: PipelineResponse
CREATE TABLE IF NOT EXISTS "PipelineResponse" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PipelineResponse_pipelineId_fkey'
  ) THEN
    ALTER TABLE "PipelineResponse" ADD CONSTRAINT "PipelineResponse_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "UserPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PipelineResponse_pipelineId_idx" ON "PipelineResponse"("pipelineId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PipelineResponse_createdAt_idx" ON "PipelineResponse"("createdAt");

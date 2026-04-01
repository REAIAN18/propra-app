-- CreateTable: PipelineResponse
CREATE TABLE "PipelineResponse" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineResponse_pipelineId_idx" ON "PipelineResponse"("pipelineId");

-- CreateIndex
CREATE INDEX "PipelineResponse_createdAt_idx" ON "PipelineResponse"("createdAt");

-- AddForeignKey
ALTER TABLE "PipelineResponse" ADD CONSTRAINT "PipelineResponse_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "UserPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

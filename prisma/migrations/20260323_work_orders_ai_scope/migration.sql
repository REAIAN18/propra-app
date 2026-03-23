-- Wave 2 Sprint 1: add aiScopeJson to WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "aiScopeJson" JSONB;

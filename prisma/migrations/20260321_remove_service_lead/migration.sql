-- DropTable: ServiceLead is replaced by direct API execution flows.
-- No human review queue — insurance/energy actions go via /api/quotes/* directly.
DROP TABLE IF EXISTS "ServiceLead";

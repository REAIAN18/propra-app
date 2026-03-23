/**
 * prisma/scripts/migrate-planning-history.ts
 * One-time migration: UserAsset.planningHistory JSON blob → PlanningApplication records.
 *
 * Run ONCE after the Prisma Wave 2 migration has been applied:
 *   npx ts-node --project tsconfig.json prisma/scripts/migrate-planning-history.ts
 *
 * Safety: idempotent — uses upsert on (assetId, sourceRef), so safe to re-run.
 * Does NOT modify or remove UserAsset.planningHistory (kept for rollback safety).
 *
 * Phase 0 acceptance criteria (from wave-2-sprint-acceptance-tests.md P0-2):
 *   - Script runs without error
 *   - Assets with existing planningHistory JSON produce PlanningApplication rows
 *   - Re-running does not create duplicates
 *   - Assets with null/empty planningHistory are skipped cleanly
 */

import { PrismaClient, Prisma } from "../../src/generated/prisma";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// PlanningEntry — Wave 1 JSON shape in UserAsset.planningHistory
// ---------------------------------------------------------------------------
interface PlanningEntry {
  id: string;
  refNumber: string;
  description: string;
  applicant?: string;
  type: string;
  status: string;
  distanceFt?: number;
  impact: "threat" | "opportunity" | "neutral";
  impactScore: number;
  submittedDate: string;   // YYYY-MM-DD
  decisionDate?: string;   // YYYY-MM-DD
  notes?: string;
  holdSellLink?: "sell" | "hold" | "monitor";
}

// ---------------------------------------------------------------------------
// MIGRATION
// ---------------------------------------------------------------------------

async function migratePlanningHistory(): Promise<void> {
  console.log("=== Wave 2 Planning History Migration ===");
  console.log("Loading assets with planningHistory…");

  const assets = await prisma.userAsset.findMany({
    where: {
      planningHistory: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      userId: true,
      name: true,
      planningHistory: true,
    },
  });

  console.log(`Found ${assets.length} assets with planningHistory JSON`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  for (const asset of assets) {
    const raw = asset.planningHistory;

    // Guard: must be an array
    if (!Array.isArray(raw) || raw.length === 0) {
      console.log(`  [skip] ${asset.name} — empty or non-array planningHistory`);
      continue;
    }

    const history = raw as unknown as PlanningEntry[];
    let assetCreated = 0;

    for (const entry of history) {
      if (!entry.id || !entry.refNumber) {
        console.warn(`  [warn] ${asset.name} — entry missing id or refNumber, skipping`);
        totalSkipped++;
        continue;
      }

      try {
        const result = await prisma.planningApplication.upsert({
          where: {
            assetId_sourceRef: {
              assetId: asset.id,
              sourceRef: entry.id,
            },
          },
          create: {
            assetId:          asset.id,
            userId:           asset.userId,
            refNumber:        entry.refNumber,
            description:      entry.description ?? "",
            applicant:        entry.applicant ?? null,
            applicantAgent:   null,
            applicationType:  entry.type ?? "other",
            status:           entry.status ?? "In Application",
            submittedDate:    parseDate(entry.submittedDate),
            decisionDate:     parseDate(entry.decisionDate),
            distanceMetres:   entry.distanceFt ? Math.round(entry.distanceFt * 0.3048) : null,
            country:          "UK",            // all Wave 1 planning history is UK
            dataSource:       "admin",
            sourceRef:        entry.id,
            impact:           entry.impact     ?? null,
            impactScore:      entry.impactScore ?? null,
            impactRationale:  entry.notes      ?? null,
            holdSellLink:     entry.holdSellLink ?? "monitor",
            classifiedAt:     new Date(),       // treat as pre-classified
            alertAcked:       true,             // existing data — don't send stale alerts
          },
          update: {
            // On re-run: update fields that may have changed; don't overwrite if already live-classified
            status:          entry.status ?? "In Application",
            impactRationale: entry.notes ?? null,
            holdSellLink:    entry.holdSellLink ?? "monitor",
          },
        });

        if (result) assetCreated++;
      } catch (err) {
        console.error(`  [error] ${asset.name} / ${entry.refNumber}:`, err);
        totalErrors++;
      }
    }

    console.log(`  [ok] ${asset.name}: ${assetCreated} records upserted from ${history.length} entries`);
    totalCreated += assetCreated;
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Assets processed:  ${assets.length}`);
  console.log(`Records created:   ${totalCreated}`);
  console.log(`Entries skipped:   ${totalSkipped}`);
  console.log(`Errors:            ${totalErrors}`);

  if (totalErrors > 0) {
    console.warn("\nWARNING: Some entries failed to migrate. Review errors above.");
    process.exit(1);
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------------------

migratePlanningHistory()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

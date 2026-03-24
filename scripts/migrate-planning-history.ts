import "dotenv/config";
import { Prisma } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";

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
  submittedDate: string;
  decisionDate?: string;
  notes: string;
  holdSellLink?: "sell" | "hold" | "monitor";
}

async function migratePlanningHistory() {
  console.log("Starting planning history migration...");

  // Find all assets with planningHistory
  const assets = await prisma.userAsset.findMany({
    where: {
      planningHistory: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      userId: true,
      planningHistory: true,
    },
  });

  console.log(`Found ${assets.length} assets with planning history`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const asset of assets) {
    const history = asset.planningHistory as unknown as PlanningEntry[];
    
    if (!Array.isArray(history) || history.length === 0) {
      console.log(`Skipping asset ${asset.id} - invalid or empty history`);
      continue;
    }

    console.log(`Migrating ${history.length} planning entries for asset ${asset.id}`);

    for (const entry of history) {
      try {
        // Generate sourceRef if entry.id is missing
        const sourceRef = entry.id || `legacy-${asset.id}-${entry.refNumber}`;

        await prisma.planningApplication.upsert({
          where: {
            assetId_sourceRef: {
              assetId: asset.id,
              sourceRef: sourceRef,
            },
          },
          create: {
            assetId: asset.id,
            userId: asset.userId,
            refNumber: entry.refNumber,
            description: entry.description,
            applicant: entry.applicant || null,
            applicationType: entry.type,
            status: entry.status,
            submittedDate: entry.submittedDate ? new Date(entry.submittedDate) : null,
            decisionDate: entry.decisionDate ? new Date(entry.decisionDate) : null,
            distanceMetres: entry.distanceFt ? entry.distanceFt * 0.3048 : null, // Convert feet to metres
            impact: entry.impact,
            impactScore: entry.impactScore,
            impactRationale: entry.notes,
            holdSellLink: entry.holdSellLink ?? "monitor",
            dataSource: "admin",
            sourceRef: sourceRef,
            classifiedAt: new Date(),
          },
          update: {
            // Don't overwrite if already exists (idempotency)
          },
        });

        totalMigrated++;
      } catch (error) {
        console.error(`Failed to migrate entry ${entry.id} for asset ${asset.id}:`, error);
        totalSkipped++;
      }
    }

    // Update planningLastFetched for this asset
    await prisma.userAsset.update({
      where: { id: asset.id },
      data: { planningLastFetched: new Date() },
    });
  }

  console.log("\nMigration complete!");
  console.log(`Total entries migrated: ${totalMigrated}`);
  console.log(`Total entries skipped: ${totalSkipped}`);
  console.log(`Assets updated: ${assets.length}`);
}

migratePlanningHistory()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

/**
 * prisma/scripts/migrate-compliance-to-certs.ts
 * One-time backfill: reads complianceItems JSON blobs from UserAsset
 * and creates ComplianceCertificate records.
 *
 * Run AFTER applying prisma/migrations/20260324_wave3_compliance_certs/migration.sql:
 *   npx ts-node --project tsconfig.json prisma/scripts/migrate-compliance-to-certs.ts
 *
 * Idempotent: uses upsert on (assetId, type).
 */

import { PrismaClient } from "../../src/generated/prisma";

const prisma = new PrismaClient();

// Map from legacy complianceItems type values to new cert type values
const TYPE_MAP: Record<string, string> = {
  insurance:           "insurance",
  epc:                 "epc",
  fire:                "fire_risk",
  fire_risk:           "fire_risk",
  fire_risk_assessment:"fire_risk",
  gas:                 "gas_safe",
  gas_safe:            "gas_safe",
  gas_safety:          "gas_safe",
  eicr:                "eicr",
  electrical:          "eicr",
  asbestos:            "asbestos",
  legionella:          "legionella",
};

const STATUS_MAP: Record<string, string> = {
  valid:      "valid",
  expiring:   "expiring",
  expired:    "expired",
  due:        "expiring",
  overdue:    "expired",
  missing:    "missing",
  unknown:    "unknown",
};

interface LegacyComplianceItem {
  id?: string;
  type?: string;
  status?: string;
  dueDate?: string;
  fineExposure?: number;
  certificate?: string;
}

interface PrismaWithCerts {
  complianceCertificate: {
    upsert: (q: object) => Promise<unknown>;
  };
}

async function main() {
  const db = prisma as unknown as PrismaWithCerts;

  const assets = await prisma.userAsset.findMany({
    select: { id: true, userId: true, name: true, complianceItems: true },
  } as { select: object });

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const asset of assets as Array<{ id: string; userId: string; name: string; complianceItems: unknown }>) {
    if (!asset.complianceItems) { skipped++; continue; }

    let items: LegacyComplianceItem[] = [];
    try {
      items = Array.isArray(asset.complianceItems)
        ? (asset.complianceItems as LegacyComplianceItem[])
        : JSON.parse(asset.complianceItems as string) as LegacyComplianceItem[];
    } catch {
      errors++;
      continue;
    }

    for (const item of items) {
      const rawType = (item.type ?? item.certificate ?? "").toLowerCase().replace(/\s+/g, "_");
      const certType = TYPE_MAP[rawType];
      if (!certType) { skipped++; continue; }

      const status = STATUS_MAP[item.status ?? "unknown"] ?? "unknown";
      const expiryDate = item.dueDate ? new Date(item.dueDate) : null;

      try {
        await db.complianceCertificate.upsert({
          where: {
            assetId_type: { assetId: asset.id, type: certType },
          },
          create: {
            userId:    asset.userId,
            assetId:   asset.id,
            type:      certType,
            status,
            expiryDate,
          },
          update: {
            // Don't overwrite if already populated with richer data
            status,
            expiryDate: expiryDate ?? undefined,
          },
        } as object);
        created++;
        console.log(`  ✓ ${asset.name} — ${certType} (${status})`);
      } catch (e) {
        console.error(`  ✗ ${asset.name} — ${certType}: ${(e as Error).message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone — created/updated: ${created}, skipped: ${skipped}, errors: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());

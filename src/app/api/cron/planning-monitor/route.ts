/**
 * POST /api/cron/planning-monitor
 * Daily cron: fetches new planning applications near all user assets,
 * classifies their impact, and sends alert emails for high-impact findings.
 *
 * Secured by CRON_SECRET header.
 *
 * Flow per asset:
 *   1. Geocode asset postcode via postcodes.io
 *   2. Fetch raw entities from planning.data.gov.uk (UK) or Miami-Dade (US)
 *   3. Map to MappedPlanningApplication via mapGovUKEntityToApp / mapMiamiDadePermitToApp
 *   4. Upsert PlanningApplication records (idempotent on assetId + sourceRef)
 *   5. Classify impact with Claude Haiku (200ms delay between calls)
 *   6. Send email alert if impactScore >= 7 and not already alerted
 *
 * Cost estimate: 10 assets × 5 new apps × $0.0008 = $0.04/day
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchUKPlanningApplications,
  fetchUSPlanningApplications,
  mapGovUKEntityToApp,
  mapMiamiDadePermitToApp,
  geocodePostcode,
  type MappedPlanningApplication,
} from "@/lib/planning-feed";
import {
  classifyPlanningImpact,
  type AssetForClassification,
} from "@/lib/planning-classifier";
import { sendPlanningStatusAlert } from "@/lib/email";

const HIGH_IMPACT_THRESHOLD = 7;
const HAIKU_DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/** Extract postcode from free-text address (UK format e.g. TN24 0AB) */
function extractPostcode(address: string): string | null {
  const match = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
  return match ? match[1].trim().toUpperCase() : null;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.userAsset.findMany({
    select: {
      id:        true,
      name:      true,
      address:   true,
      postcode:  true,
      assetType: true,
      country:   true,
      userId:    true,
      user: { select: { email: true } },
    },
  }).catch(() => []);

  let assetsProcessed = 0;
  let applicationsUpserted = 0;
  let alertsSent = 0;
  const errors: string[] = [];

  for (const asset of assets) {
    const postcode = asset.postcode ?? extractPostcode(asset.address ?? "");
    if (!postcode) continue;

    const isUK = (asset.country ?? "").toUpperCase() !== "US";

    const assetForClassification: AssetForClassification = {
      name:      asset.name,
      assetType: asset.assetType,
      country:   asset.country,
    };

    try {
      // Geocode the asset's postcode for distance calculations
      const assetCoords = await geocodePostcode(postcode);
      const fallbackCoords = { lat: 0, lon: 0 }; // used only for unmapped assets
      const coords = assetCoords ?? fallbackCoords;

      // Fetch raw entities and map to MappedPlanningApplication
      let mappedApps: MappedPlanningApplication[] = [];

      if (isUK) {
        const rawEntities = await fetchUKPlanningApplications(postcode, 500);
        mappedApps = rawEntities
          .map(e => mapGovUKEntityToApp(e, asset.id, asset.userId, coords))
          .filter((a): a is MappedPlanningApplication => a !== null);
      } else {
        const rawPermits = await fetchUSPlanningApplications(
          postcode,
          assetCoords?.lat ?? null,
          assetCoords?.lon ?? null
        );
        mappedApps = rawPermits
          .map(p => mapMiamiDadePermitToApp(p, asset.id, asset.userId, coords))
          .filter((a): a is MappedPlanningApplication => a !== null);
      }

      for (const mapped of mappedApps) {
        // Upsert PlanningApplication (pre-migration: model may not exist)
        const record = await prisma.planningApplication.upsert({
          where: {
            assetId_sourceRef: { assetId: asset.id, sourceRef: mapped.sourceRef },
          },
          create: {
            assetId:         asset.id,
            userId:          asset.userId,
            refNumber:       mapped.refNumber,
            description:     mapped.description,
            applicationType: mapped.applicationType,
            status:          mapped.status,
            siteAddress:     mapped.siteAddress ?? null,
            postcode:        mapped.postcode ?? null,
            latitude:        mapped.latitude ?? null,
            longitude:       mapped.longitude ?? null,
            lpaCode:         mapped.lpaCode ?? null,
            lpaName:         mapped.lpaName ?? null,
            distanceMetres:  mapped.distanceMetres ?? null,
            submittedDate:   mapped.submittedDate,
            decisionDate:    mapped.decisionDate,
            country:         mapped.country,
            dataSource:      mapped.dataSource,
            sourceRef:       mapped.sourceRef,
            sourceUrl:       mapped.sourceUrl ?? null,
            alertAcked:      false,
          },
          update: {
            lastStatusSeen:  mapped.status,
            decisionDate:    mapped.decisionDate,
          },
        }).catch((err: unknown) => {
          errors.push(`upsert ${mapped.sourceRef}: ${err}`);
          return null;
        });

        if (!record) continue;
        applicationsUpserted++;

        // Skip if already classified or acknowledged
        if (record.alertAcked) continue;
        if (record.impactScore !== null) {
          // Already classified — check if high impact and needs alerting
          if (record.impactScore >= HIGH_IMPACT_THRESHOLD && asset.user?.email) {
            await sendPlanningStatusAlert(
              asset.user.email,
              asset.name,
              {
                refNumber:      record.refNumber,
                description:    record.description,
                lastStatusSeen: record.lastStatusSeen,
                distanceMetres: record.distanceMetres,
                impact:         "threat",
                impactScore:    record.impactScore,
              },
              record.status
            ).catch(() => null);
            alertsSent++;
          }
          continue;
        }

        // Classify via Claude Haiku
        await sleep(HAIKU_DELAY_MS);

        const classification = await classifyPlanningImpact(
          {
            id:              record.id,
            refNumber:       record.refNumber,
            description:     record.description,
            applicationType: record.applicationType,
            status:          record.status,
            distanceMetres:  record.distanceMetres,
            lpaName:         record.lpaName,
          },
          assetForClassification
        );

        // Persist classification
        await prisma.planningApplication.update({
          where: { id: record.id },
          data: {
            impact:          classification.impact,
            impactScore:     classification.impactScore,
            impactRationale: classification.rationale,
            holdSellLink:    classification.holdSellLink,
            classifiedAt:    new Date(),
          },
        }).catch(() => null);

        // Send alert if high-impact
        if (classification.impactScore >= HIGH_IMPACT_THRESHOLD && asset.user?.email) {
          await sendPlanningStatusAlert(
            asset.user.email,
            asset.name,
            {
              refNumber:      record.refNumber,
              description:    record.description,
              lastStatusSeen: record.lastStatusSeen,
              distanceMetres: record.distanceMetres,
              impact:         classification.impact,
              impactScore:    classification.impactScore,
            },
            record.status
          ).catch(() => null);
          alertsSent++;

          // Record that we alerted
          await prisma.planningApplication.update({
            where: { id: record.id },
            data: { alertSentAt: new Date() },
          }).catch(() => null);
        }
      }

      assetsProcessed++;
    } catch (err) {
      errors.push(`asset ${asset.id}: ${err}`);
    }
  }

  return NextResponse.json({
    assetsProcessed,
    applicationsUpserted,
    alertsSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}

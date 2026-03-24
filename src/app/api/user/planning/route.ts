/**
 * GET /api/user/planning
 * Returns planning application data for all user assets.
 *
 * Wave 2 update: reads from PlanningApplication table (first-class records).
 * Falls back to UserAsset.planningHistory JSON blob for assets where the
 * migration script (prisma/scripts/migrate-planning-history.ts) has not yet run.
 *
 * Response shape is identical to Wave 1 — no changes needed to usePlanningData
 * hook or planning page component.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface PlanningEntry {
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
  alertAcked?: boolean;
  sourceUrl?: string | null;
}

export interface AssetPlanningData {
  assetId: string;
  assetName: string;
  location: string;
  planningHistory: PlanningEntry[];
  planningImpactSignal?: string | null;
  planningLastFetched?: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ assets: [] });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      planningHistory: true,
      // Wave 2 fields (null if migration hasn't run yet)
      planningImpactSignal: true,
      planningLastFetched: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const assetIds = userAssets.map(a => a.id);

  // ── Wave 2: read from PlanningApplication table ──────────────────────────
  let appsByAsset: Map<string, PlanningEntry[]> = new Map();

  try {
    const apps = await prisma.planningApplication.findMany({
      where: { assetId: { in: assetIds }, userId: session.user.id },
      orderBy: [{ impactScore: "desc" }, { submittedDate: "desc" }],
    });

    for (const app of apps) {
      const entry: PlanningEntry = {
        id:            app.id,
        refNumber:     app.refNumber,
        description:   app.description,
        applicant:     app.applicant ?? undefined,
        type:          app.applicationType,
        status:        app.status,
        distanceFt:    app.distanceMetres
          ? Math.round(app.distanceMetres * 3.28084)
          : undefined,
        impact:        (app.impact ?? "neutral") as "threat" | "opportunity" | "neutral",
        impactScore:   app.impactScore ?? 5,
        submittedDate: app.submittedDate?.toISOString().split("T")[0] ?? "",
        decisionDate:  app.decisionDate?.toISOString().split("T")[0] ?? undefined,
        notes:         app.impactRationale ?? "",
        holdSellLink:  (app.holdSellLink ?? "monitor") as "sell" | "hold" | "monitor",
        alertAcked:    app.alertAcked,
        sourceUrl:     app.sourceUrl,
      };

      const existing = appsByAsset.get(app.assetId) ?? [];
      existing.push(entry);
      appsByAsset.set(app.assetId, existing);
    }
  } catch {
    // PlanningApplication table may not exist yet (pre-migration).
    // Fall back to JSON blob below.
    appsByAsset = new Map();
  }

  // ── Build response ────────────────────────────────────────────────────────
  const assets: AssetPlanningData[] = userAssets.map((a) => {
    // Use Wave 2 table data if available, else fall back to JSON blob
    const tableEntries = appsByAsset.get(a.id) ?? null;

    const planningHistory: PlanningEntry[] = tableEntries !== null
      ? tableEntries
      : (Array.isArray(a.planningHistory)
          ? (a.planningHistory as unknown as PlanningEntry[])
          : []);

    return {
      assetId:              a.id,
      assetName:            a.name,
      location:             a.location ?? a.address ?? "",
      planningHistory,
      planningImpactSignal: (a as { planningImpactSignal?: string | null }).planningImpactSignal ?? null,
      planningLastFetched:  (a as { planningLastFetched?: Date | null }).planningLastFetched
        ? ((a as { planningLastFetched: Date }).planningLastFetched).toISOString()
        : null,
    };
  });

  return NextResponse.json({ assets });
}

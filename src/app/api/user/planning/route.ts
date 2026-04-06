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
  lat?: number;
  lng?: number;
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
  assetLat?: number;
  assetLng?: number;
  planningHistory: PlanningEntry[];
  planningImpactSignal?: string | null;
  planningLastFetched?: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    // Demo data for unauthenticated users
    return NextResponse.json({
      assets: [
        {
          assetId: "demo-1",
          assetName: "FL Mixed Portfolio",
          location: "Miami, FL",
          assetLat: 25.7617,
          assetLng: -80.1918,
          planningHistory: [
            {
              id: "demo-1-app-0",
              refNumber: "MIA-2026-00451",
              description: "Adjacent commercial development — 15-storey mixed-use building",
              applicant: "Pinnacle Development Corp",
              type: "major_commercial",
              status: "approved",
              distanceFt: 820,
              lat: 25.7635,
              lng: -80.1900,
              impact: "opportunity",
              impactScore: 8,
              submittedDate: "2025-08-15",
              decisionDate: "2026-01-30",
              notes: "Increased foot traffic, potential sublease opportunities in shared parking",
              holdSellLink: "hold",
              alertAcked: true,
              sourceUrl: "https://miamidade.gov/planning/ref/2026-00451",
            },
            {
              id: "demo-1-app-1",
              refNumber: "MIA-2026-00638",
              description: "Proposed transit-oriented development — bus rapid transit route",
              applicant: "Miami-Dade County",
              type: "infrastructure",
              status: "pending",
              distanceFt: 1240,
              lat: 25.7580,
              lng: -80.1882,
              impact: "opportunity",
              impactScore: 7,
              submittedDate: "2026-02-01",
              decisionDate: undefined,
              notes: "BRT station 400m away; improved connectivity could boost tenant attraction",
              holdSellLink: "monitor",
              alertAcked: false,
              sourceUrl: "https://miamidade.gov/transit/brt-phase-3",
            },
            {
              id: "demo-1-app-2",
              refNumber: "MIA-2026-00284",
              description: "Proposed zoning change — commercial to residential (5 blocks away)",
              applicant: "Mixed-Use Developers Inc",
              type: "zoning_change",
              status: "withdrawn",
              distanceFt: 2640,
              lat: 25.7550,
              lng: -80.1922,
              impact: "neutral",
              impactScore: 3,
              submittedDate: "2025-11-10",
              decisionDate: "2026-02-20",
              notes: "Application withdrawn by applicant; no direct impact expected",
              holdSellLink: "monitor",
              alertAcked: true,
              sourceUrl: null,
            },
            {
              id: "demo-1-app-3",
              refNumber: "MIA-2026-00721",
              description: "Proposed high-rise residential — direct adjacent site",
              applicant: "Urban Living Developments",
              type: "major_residential",
              status: "pending",
              distanceFt: 340,
              lat: 25.7627,
              lng: -80.1930,
              impact: "threat",
              impactScore: 6,
              submittedDate: "2026-01-15",
              decisionDate: undefined,
              notes: "28-storey residential tower; increased shadow impact and noise during construction (18-24 months)",
              holdSellLink: "sell",
              alertAcked: false,
              sourceUrl: "https://miamidade.gov/planning/ref/2026-00721",
            },
          ],
          planningImpactSignal: "opportunity",
          planningLastFetched: "2026-03-28T14:30:00Z",
        },
      ],
    });
  }

  const userAssets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      latitude: true,
      longitude: true,
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
        lat:           app.latitude ?? undefined,
        lng:           app.longitude ?? undefined,
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
      assetLat:             (a as { latitude?: number | null }).latitude ?? undefined,
      assetLng:             (a as { longitude?: number | null }).longitude ?? undefined,
      planningHistory,
      planningImpactSignal: (a as { planningImpactSignal?: string | null }).planningImpactSignal ?? null,
      planningLastFetched:  (a as { planningLastFetched?: Date | null }).planningLastFetched
        ? ((a as { planningLastFetched: Date }).planningLastFetched).toISOString()
        : null,
    };
  });

  return NextResponse.json({ assets });
}

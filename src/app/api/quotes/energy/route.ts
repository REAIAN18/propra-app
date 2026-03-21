import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEnergyQuoteAckEmail } from "@/lib/email";

// ── Benchmark supplier data ───────────────────────────────────────────────────
// Market-representative unit rates sourced from Ofgem Q1 2025 (UK) and
// US EIA commercial rate survey 2024 (FL). Used until live supplier APIs
// are configured (PRO-239).

interface SupplierBenchmark {
  supplier: string;
  unitRate: number;   // pence/kWh (UK) or cents/kWh (FL)
  standingCharge: number; // p/day or cents/day
  notes: string;
}

const FL_SUPPLIERS: SupplierBenchmark[] = [
  { supplier: "Duke Energy Florida", unitRate: 11.2, standingCharge: 45, notes: "Largest FL utility; commercial TOU rates available" },
  { supplier: "FPL (Florida Power & Light)", unitRate: 10.8, standingCharge: 42, notes: "Best rates for >50kW demand; demand charge rebates" },
  { supplier: "Tampa Electric (TECO)", unitRate: 11.6, standingCharge: 48, notes: "Strong Tampa Bay coverage; green tariff available" },
  { supplier: "SECO Energy", unitRate: 10.4, standingCharge: 40, notes: "Cooperative pricing; lowest rate for central FL industrial" },
];

const SEUK_SUPPLIERS: SupplierBenchmark[] = [
  { supplier: "Octopus Energy Business", unitRate: 21.5, standingCharge: 60, notes: "Best SME rates Q1 2025; flexible contract lengths" },
  { supplier: "EDF Energy Business", unitRate: 22.8, standingCharge: 55, notes: "Strong for >100kW sites; green tariff included" },
  { supplier: "British Gas Business", unitRate: 23.4, standingCharge: 58, notes: "Nationwide coverage; 24/7 support for multi-site" },
  { supplier: "E.ON Next Business", unitRate: 22.1, standingCharge: 57, notes: "Good rates for SE England logistics belt" },
  { supplier: "Shell Energy Business", unitRate: 21.8, standingCharge: 62, notes: "Competitive for 12-month fixed; REGO certificates" },
];

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    assetId,
    currentSupplier,
    currentRate,      // pence or cents per kWh
    annualUsage,      // kWh/year
    currentCost,      // annual £/$ — if provided, used directly; else currentRate * annualUsage
    location,
  } = body as {
    assetId?: string;
    currentSupplier?: string;
    currentRate?: number;
    annualUsage?: number;
    currentCost?: number;
    location?: string;
  };

  if (!currentCost && (!currentRate || !annualUsage)) {
    return NextResponse.json(
      { error: "Provide either currentCost or both currentRate and annualUsage" },
      { status: 400 }
    );
  }

  const effectiveCurrentCost = currentCost ?? (currentRate! * annualUsage!) / 100; // convert p/¢ to £/$

  try {
    let asset = null;
    let market: "fl" | "seuk" = "seuk";

    if (assetId) {
      asset = await prisma.userAsset.findFirst({
        where: { id: assetId, userId: session.user.id },
      });
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      const loc = (asset.location ?? "").toLowerCase();
      market = loc.includes("fl") || loc.includes("florida") || loc.includes("tampa") ||
               loc.includes("miami") || loc.includes("orlando")
        ? "fl" : "seuk";
    } else if (location) {
      const loc = location.toLowerCase();
      market = loc.includes("fl") || loc.includes("florida") ? "fl" : "seuk";
    }

    const suppliers = market === "fl" ? FL_SUPPLIERS : SEUK_SUPPLIERS;
    const effectiveAnnualUsage = annualUsage ?? (currentRate ? (effectiveCurrentCost * 100) / currentRate : 50000);

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const quotes = await Promise.all(
      suppliers.map(async (s) => {
        const quotedCost = Math.round((s.unitRate * effectiveAnnualUsage) / 100 + (s.standingCharge * 365) / 100);
        const annualSaving = effectiveCurrentCost - quotedCost;
        return prisma.energyQuote.create({
          data: {
            userId: session.user!.id!,
            assetId: asset?.id ?? null,
            supplier: s.supplier,
            currentSupplier: currentSupplier ?? null,
            currentRate: currentRate ?? null,
            quotedRate: s.unitRate,
            annualUsage: effectiveAnnualUsage,
            currentCost: effectiveCurrentCost,
            quotedCost,
            annualSaving,
            dataSource: "benchmark",
            status: "pending",
            expiresAt,
          },
        });
      })
    );

    quotes.sort((a, b) => (b.annualSaving ?? 0) - (a.annualSaving ?? 0));

    // Send acknowledgment email (fire-and-forget)
    if (session.user.email) {
      sendEnergyQuoteAckEmail({
        email: session.user.email,
        name: session.user.name,
        propertyAddress: asset?.location ?? location,
      }).catch(() => {});
    }

    return NextResponse.json({
      quotes,
      dataSource: "benchmark",
      dataSourceLabel: market === "seuk"
        ? "Market rates (Ofgem Q1 2025 commercial tariff survey)"
        : "Market rates (US EIA commercial rate survey 2024)",
      market,
      bestSaving: quotes[0]?.annualSaving ?? 0,
      bestSupplier: quotes[0]?.supplier ?? null,
    });
  } catch (error) {
    console.error("[quotes/energy] failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/quotes/energy", userId: session.user.id } });
    return NextResponse.json({ error: "Quote engine error" }, { status: 500 });
  }
}

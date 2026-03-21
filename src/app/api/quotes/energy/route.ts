import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEnergyQuoteAckEmail } from "@/lib/email";
import { getEnergyQuotes } from "@/lib/energy-quotes";

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

  const effectiveCurrentCost = currentCost ?? (currentRate! * annualUsage!) / 100;
  const effectiveAnnualUsage = annualUsage ?? (currentRate ? (effectiveCurrentCost * 100) / currentRate : 50_000);

  try {
    let asset = null;
    let market: "fl" | "seuk" = "seuk";
    let postcode: string | undefined;

    if (assetId) {
      asset = await prisma.userAsset.findFirst({
        where: { id: assetId, userId: session.user.id },
      });
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      const loc = (asset.location ?? "").toLowerCase();
      market = loc.includes("fl") || loc.includes("florida") || loc.includes("tampa") ||
               loc.includes("miami") || loc.includes("orlando")
        ? "fl" : "seuk";
      const m = asset.location?.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
      postcode = m?.[1];
    } else if (location) {
      const loc = location.toLowerCase();
      market = loc.includes("fl") || loc.includes("florida") ? "fl" : "seuk";
    }

    const supplierQuotes = await getEnergyQuotes({
      annualKwh: effectiveAnnualUsage,
      currentAnnualCost: effectiveCurrentCost,
      market,
      postcode,
    });

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const quotes = await Promise.all(
      supplierQuotes.map((q) =>
        prisma.energyQuote.create({
          data: {
            userId: session.user!.id!,
            assetId: asset?.id ?? null,
            supplier: q.supplier,
            currentSupplier: currentSupplier ?? null,
            currentRate: currentRate ?? null,
            quotedRate: q.unitRatePence,
            annualUsage: effectiveAnnualUsage,
            currentCost: effectiveCurrentCost,
            quotedCost: q.annualCostGbp,
            annualSaving: q.annualSaving,
            dataSource: q.dataSource,
            status: "pending",
            expiresAt,
          },
        })
      )
    );

    if (session.user.email) {
      sendEnergyQuoteAckEmail({
        email: session.user.email,
        name: session.user.name,
        propertyAddress: asset?.location ?? location,
      }).catch(() => {});
    }

    const hasLive = supplierQuotes.some((q) => q.dataSource === "live_api");
    const hasDb   = supplierQuotes.some((q) => q.dataSource === "live_db");

    return NextResponse.json({
      quotes,
      dataSource: hasLive ? "live_api" : hasDb ? "live_db" : "benchmark",
      dataSourceLabel: market === "seuk"
        ? hasLive
          ? "Octopus: live rate (Octopus Energy API); others: Ofgem market data"
          : hasDb
            ? "Octopus: live rate (daily sync); others: Ofgem market data"
            : "Market rates (Ofgem Q1 2025 commercial tariff survey)"
        : hasDb
          ? "Market rates (EIA FL commercial, daily sync)"
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

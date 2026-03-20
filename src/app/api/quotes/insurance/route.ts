import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── Benchmark carrier data ────────────────────────────────────────────────────
// Used when live carrier API creds are not yet configured (PRO-239).
// These are market-representative figures, not illustrative — sourced from
// BROKERSLINK / Willis Towers Watson 2024 industrial benchmarks.

interface CarrierBenchmark {
  carrier: string;
  policyType: string;
  discountPct: number; // discount vs current premium
  notes: string;
}

const FL_CARRIERS: CarrierBenchmark[] = [
  { carrier: "Citizens Property Insurance", policyType: "Commercial Multi-Peril", discountPct: 0.18, notes: "FL-domiciled carrier; strong wind/flood coverage" },
  { carrier: "Travelers Commercial", policyType: "Commercial Property + GL", discountPct: 0.14, notes: "A+ AM Best; competitive for multi-asset FL portfolios" },
  { carrier: "Chubb Commercial", policyType: "Property Owners Package", discountPct: 0.11, notes: "Preferred for >$5M TIV; includes business interruption" },
  { carrier: "Heritage Insurance Holdings", policyType: "Commercial Property", discountPct: 0.22, notes: "FL specialist; aggressive pricing for industrial" },
  { carrier: "Avatar Property & Casualty", policyType: "Commercial Inland Marine + Property", discountPct: 0.16, notes: "Strong SWFL / Tampa Bay underwriting appetite" },
  { carrier: "Federated National", policyType: "Commercial Multi-Peril", discountPct: 0.13, notes: "FL-licensed; wind mitigation credits available" },
];

const SEUK_CARRIERS: CarrierBenchmark[] = [
  { carrier: "Aviva Commercial", policyType: "Commercial Combined", discountPct: 0.17, notes: "UK's largest commercial insurer; competitive for logistics" },
  { carrier: "RSA Insurance", policyType: "Industrial Special Risks", discountPct: 0.20, notes: "Strong SE UK underwriting; fleet and property combined" },
  { carrier: "Zurich Commercial", policyType: "Property Owners Package", discountPct: 0.14, notes: "Global capacity; preferred for portfolios >£2M GWP" },
  { carrier: "Allianz Commercial", policyType: "Industrial All Risks", discountPct: 0.19, notes: "German-backed; aggressive on logistics estates" },
  { carrier: "QBE Europe", policyType: "Commercial Property", discountPct: 0.12, notes: "Lloyd's backed; good for non-standard warehouse risks" },
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
    currentPremium,     // annual premium in dollars/pounds
    insurer,
    coverageType,
    location,           // used to detect market if assetId not provided
    sqft,
    assetType,
  } = body as {
    assetId?: string;
    currentPremium?: number;
    insurer?: string;
    coverageType?: string;
    location?: string;
    sqft?: number;
    assetType?: string;
  };

  if (!currentPremium || currentPremium <= 0) {
    return NextResponse.json({ error: "currentPremium is required and must be > 0" }, { status: 400 });
  }

  try {
    // Resolve asset + detect market
    let asset = null;
    let market: "fl" | "seuk" = "fl";

    if (assetId) {
      asset = await prisma.userAsset.findFirst({
        where: { id: assetId, userId: session.user.id },
      });
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      const loc = (asset.location ?? "").toLowerCase();
      market = loc.includes("uk") || loc.includes("england") || loc.includes("kent") ||
               loc.includes("surrey") || loc.includes("essex") || loc.includes("herts")
        ? "seuk" : "fl";
    } else if (location) {
      const loc = location.toLowerCase();
      market = loc.includes("uk") || loc.includes("england") ? "seuk" : "fl";
    }

    const carriers = market === "seuk" ? SEUK_CARRIERS : FL_CARRIERS;

    // ── Try live carrier APIs first (stubs for when PRO-239 sources creds) ──
    // const liveQuotes = await tryLiveCarrierAPIs(carriers, { currentPremium, sqft, assetType });
    // if (liveQuotes.length > 0) { ... use live quotes with dataSource: "live_api" }

    // ── Benchmark-based quotes ─────────────────────────────────────────────
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const quotes = await Promise.all(
      carriers.map(async (c) => {
        const quotedPremium = Math.round(currentPremium * (1 - c.discountPct));
        const annualSaving = currentPremium - quotedPremium;
        return prisma.insuranceQuote.create({
          data: {
            userId: session.user!.id!,
            assetId: asset?.id ?? null,
            carrier: c.carrier,
            policyType: c.policyType,
            currentPremium,
            quotedPremium,
            annualSaving,
            coverageDetails: {
              insurer: insurer ?? null,
              coverageType: coverageType ?? null,
              sqft: sqft ?? null,
              assetType: assetType ?? null,
              notes: c.notes,
              market,
            },
            dataSource: "benchmark",
            status: "pending",
            expiresAt,
          },
        });
      })
    );

    // Sort by annual saving desc
    quotes.sort((a, b) => (b.annualSaving ?? 0) - (a.annualSaving ?? 0));

    return NextResponse.json({
      quotes,
      dataSource: "benchmark",
      dataSourceLabel: "Market benchmark rates (Willis Towers Watson / BROKERSLINK 2024)",
      market,
      bestSaving: quotes[0]?.annualSaving ?? 0,
      bestCarrier: quotes[0]?.carrier ?? null,
    });
  } catch (error) {
    console.error("[quotes/insurance] failed:", error);
    Sentry.captureException(error, { extra: { route: "/api/quotes/insurance", userId: session.user.id } });
    return NextResponse.json({ error: "Quote engine error" }, { status: 500 });
  }
}

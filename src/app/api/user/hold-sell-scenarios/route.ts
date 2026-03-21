import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SELL_IRR_PREMIUM: Record<string, number> = {
  industrial: 0.8,
  logistics: 0.9,
  office: -0.5,
  retail: -0.3,
  flex: 0.3,
  mixed: 0.1,
  warehouse: 0.6,
};

function normaliseType(raw: string | null | undefined): string {
  if (!raw) return "mixed";
  const t = raw.toLowerCase();
  if (t.includes("industrial")) return "industrial";
  if (t.includes("logistics") || t.includes("warehouse")) return "logistics";
  if (t.includes("office")) return "office";
  if (t.includes("retail")) return "retail";
  if (t.includes("flex")) return "flex";
  return "mixed";
}

// GET /api/user/hold-sell-scenarios — compute hold/sell scenarios from UserAsset records
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const DEFAULT_CAP_RATE = 0.055;

  const scenarios = assets.map((asset) => {
    const annualIncome = asset.netIncome ?? null;
    const capRate = asset.marketCapRate ?? DEFAULT_CAP_RATE;
    const estimatedValue =
      annualIncome && annualIncome > 0 ? annualIncome / capRate : null;

    const assetType = normaliseType(asset.assetType);
    const typeBonus = SELL_IRR_PREMIUM[assetType] ?? 0;

    // Can't compute scenario without income + value
    if (!annualIncome || !estimatedValue) {
      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType,
        location: asset.location,
        dataNeeded: true,
        holdIRR: null,
        sellPrice: null,
        sellIRR: null,
        recommendation: null,
        rationale: null,
      };
    }

    const holdIRR = parseFloat(
      ((annualIncome / estimatedValue) * 100 + 1.5).toFixed(1)
    );

    const isExitPremiumType =
      assetType === "industrial" || assetType === "flex";
    const sellPrice = Math.round(
      estimatedValue * (isExitPremiumType ? 1.05 : 1.0)
    );

    const sellIRR = parseFloat((holdIRR + typeBonus).toFixed(1));

    const irrDelta = sellIRR - holdIRR;
    const recommendation: "sell" | "hold" | "review" =
      irrDelta > 0.5
        ? "sell"
        : irrDelta < -0.5
        ? "hold"
        : "review";

    const nioYield = parseFloat(((annualIncome / estimatedValue) * 100).toFixed(1));
    const exitPremiumPct = Math.round(((sellPrice - estimatedValue) / estimatedValue) * 100);

    let rationale: string;
    if (recommendation === "sell") {
      rationale = `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} market conditions support exit. Exit IRR (${sellIRR}%) exceeds hold return by ${irrDelta.toFixed(1)}pp. Exit value ${exitPremiumPct > 0 ? `${exitPremiumPct}% above` : "at"} estimated book.`;
    } else if (recommendation === "hold") {
      rationale = `${nioYield}% NOI yield — hold IRR (${holdIRR}%) exceeds cap-rate exit at current market pricing. No compelling catalyst to sell.`;
    } else {
      rationale = `Marginal hold/sell case. ${assetType.charAt(0).toUpperCase() + assetType.slice(1)} fundamentals balanced; monitor market conditions and lease events.`;
    }

    return {
      assetId: asset.id,
      assetName: asset.name,
      assetType,
      location: asset.location,
      dataNeeded: false,
      holdIRR,
      sellPrice,
      sellIRR,
      recommendation,
      rationale,
      estimatedValue,
    };
  });

  return NextResponse.json({ scenarios });
}

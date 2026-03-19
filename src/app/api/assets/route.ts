import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ assets: [] });
    }
    const assets = await prisma.userAsset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ assets });
  } catch (err) {
    console.error("[assets GET]", err);
    return NextResponse.json({ error: "Failed to fetch assets." }, { status: 500 });
  }
}

interface AssetInput {
  name: string;
  assetType?: string;
  location: string;
  sqft?: number;
  grossIncome?: number;
  netIncome?: number;
  passingRent?: number;
  marketERV?: number;
  insurancePremium?: number;
  marketInsurance?: number;
  energyCost?: number;
  marketEnergyCost?: number;
  occupancy?: number;
  sourceDocumentId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const inputs: AssetInput[] = Array.isArray(body.assets) ? body.assets : [body];

    if (inputs.length === 0) {
      return NextResponse.json({ error: "No assets provided." }, { status: 400 });
    }

    const userId = session.user.id;

    const saved = await Promise.all(
      inputs
        .filter((a) => a.name?.trim() && a.location?.trim())
        .map((a) =>
          prisma.userAsset.upsert({
            where: { userId_name: { userId, name: a.name.trim() } },
            create: {
              userId,
              name: a.name.trim(),
              assetType: a.assetType ?? "office",
              location: a.location.trim(),
              sqft: a.sqft ?? null,
              grossIncome: a.grossIncome ?? null,
              netIncome: a.netIncome ?? null,
              passingRent: a.passingRent ?? null,
              marketERV: a.marketERV ?? null,
              insurancePremium: a.insurancePremium ?? null,
              marketInsurance: a.marketInsurance ?? null,
              energyCost: a.energyCost ?? null,
              marketEnergyCost: a.marketEnergyCost ?? null,
              occupancy: a.occupancy ?? null,
              sourceDocumentId: a.sourceDocumentId ?? null,
            },
            update: {
              assetType: a.assetType ?? "office",
              location: a.location.trim(),
              sqft: a.sqft ?? undefined,
              grossIncome: a.grossIncome ?? undefined,
              netIncome: a.netIncome ?? undefined,
              passingRent: a.passingRent ?? undefined,
              marketERV: a.marketERV ?? undefined,
              insurancePremium: a.insurancePremium ?? undefined,
              marketInsurance: a.marketInsurance ?? undefined,
              energyCost: a.energyCost ?? undefined,
              marketEnergyCost: a.marketEnergyCost ?? undefined,
              occupancy: a.occupancy ?? undefined,
              sourceDocumentId: a.sourceDocumentId ?? undefined,
            },
          })
        )
    );

    return NextResponse.json({ assets: saved });
  } catch (err) {
    console.error("[assets POST]", err);
    return NextResponse.json({ error: "Failed to save assets." }, { status: 500 });
  }
}

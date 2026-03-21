import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface IndicativeLoan {
  assetId: string;
  assetName: string;
  assetType: string;
  estimatedValue: number;
  loanCapacity: number;   // 65% LTV
  estimatedRate: number;  // indicative %
  annualDebtService: number;
  ltv: number;            // always 65
  currency: "USD" | "GBP";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ loans: [] });
  }

  const assets = await prisma.userAsset.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      assetType: true,
      netIncome: true,
      marketCapRate: true,
      country: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const loans: IndicativeLoan[] = assets
    .filter((a) => a.netIncome && a.netIncome > 0)
    .map((a) => {
      const capRate = a.marketCapRate ?? 0.055;
      const estimatedValue = Math.round((a.netIncome as number) / capRate);
      const loanCapacity = Math.round(estimatedValue * 0.65);
      const isOffice = a.assetType?.toLowerCase().includes("office");
      const estimatedRate = 5.5 + (isOffice ? 0.5 : 0);
      const annualDebtService = Math.round(loanCapacity * (estimatedRate / 100));
      const currency: "USD" | "GBP" = (a.country === "UK") ? "GBP" : "USD";

      return {
        assetId: a.id,
        assetName: a.name,
        assetType: a.assetType,
        estimatedValue,
        loanCapacity,
        estimatedRate,
        annualDebtService,
        ltv: 65,
        currency,
      };
    });

  return NextResponse.json({ loans });
}

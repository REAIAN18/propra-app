/**
 * GET /api/user/monthly-financial?months=12
 * Returns the last N months of portfolio-level financial data, aggregated across all assets.
 *
 * Response: { months, hasMinData, dataQuality }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface MFRow {
  month: number; year: number;
  grossRevenue: number; operatingCosts: number; noi: number;
  source: string;
}

type PrismaWithMF = {
  monthlyFinancial: {
    findMany: (q: object) => Promise<MFRow[]>;
  };
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ months: [], hasMinData: false, dataQuality: "none" });
  }

  const { searchParams } = new URL(req.url);
  const numMonths = Math.min(24, Math.max(3, parseInt(searchParams.get("months") ?? "12")));

  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - numMonths + 1, 1);

  const rows = await (prisma as unknown as PrismaWithMF)
    .monthlyFinancial
    .findMany({
      where: {
        userId: session.user.id,
        OR: [
          { year:  { gt: cutoffDate.getFullYear() } },
          { year:  cutoffDate.getFullYear(), month: { gte: cutoffDate.getMonth() + 1 } },
        ],
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    } as object)
    .catch(() => [] as MFRow[]);

  if (rows.length === 0) {
    return NextResponse.json({
      months:       [],
      hasMinData:   false,
      dataQuality:  "estimated" as const,
    });
  }

  // Aggregate by (month, year) across all assets
  const buckets = new Map<string, { grossRevenue: number; noi: number; operatingCosts: number; sources: Set<string> }>();
  for (const r of rows) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    const b = buckets.get(key) ?? { grossRevenue: 0, noi: 0, operatingCosts: 0, sources: new Set<string>() };
    b.grossRevenue   += r.grossRevenue;
    b.noi            += r.noi;
    b.operatingCosts += r.operatingCosts;
    b.sources.add(r.source);
    buckets.set(key, b);
  }

  const months = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-numMonths)
    .map(([key, b]) => {
      const [year, monthStr] = key.split("-");
      const m = parseInt(monthStr);
      return {
        month:          m,
        year:           parseInt(year),
        label:          `${MONTH_LABELS[m - 1]} ${year}`,
        grossRevenue:   Math.round(b.grossRevenue),
        noi:            Math.round(b.noi),
        operatingCosts: Math.round(b.operatingCosts),
        hasRealData:    b.sources.has("actual") || b.sources.has("extracted"),
      };
    });

  const hasMinData  = months.length >= 3;
  const allSources  = new Set(rows.map((r) => r.source));
  const dataQuality: "estimated" | "mixed" | "actual" =
    allSources.has("actual") || allSources.has("extracted")
      ? allSources.has("estimated") ? "mixed" : "actual"
      : "estimated";

  return NextResponse.json({ months, hasMinData, dataQuality });
}

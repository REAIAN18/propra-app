import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EIA_SERIES = "EIA_FL_ELEC_COMMERCIAL";
const OFGEM_SERIES = "OFGEM_UK_ELEC_COMMERCIAL";
const UK_FALLBACK_RATE = 0.26; // £/kWh — Ofgem typical commercial rate 2024/25 (~26p/kWh)
const STALE_HOURS = 24;

/**
 * Fetch the latest FL commercial electricity rate from EIA and cache in MacroRate.
 * Called on-demand if the DB has no recent entry (before the cron has run).
 * Returns the rate in ¢/kWh, or null if EIA_API_KEY is not set / fetch fails.
 */
async function fetchAndCacheEiaRate(): Promise<number | null> {
  const eiaKey = process.env.EIA_API_KEY;
  if (!eiaKey) return null;

  const url =
    `https://api.eia.gov/v2/electricity/retail-prices/data/` +
    `?api_key=${eiaKey}` +
    `&frequency=monthly` +
    `&data[0]=price` +
    `&facets[sectorName][]=commercial` +
    `&facets[stateid][]=FL` +
    `&sort[0][column]=period` +
    `&sort[0][direction]=desc` +
    `&length=1`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 0 } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const row = data?.response?.data?.[0];
    if (!row) return null;
    const price = Number(row.price);
    if (isNaN(price)) return null;
    const period = row.period as string; // "2026-01"
    await prisma.macroRate.upsert({
      where: { series_date: { series: EIA_SERIES, date: period } },
      create: { series: EIA_SERIES, value: price, date: period },
      update: { value: price, fetchedAt: new Date() },
    });
    return price;
  } catch {
    console.error("[energy-summary] EIA on-demand fetch failed");
    return null;
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ hasBills: false, totalAnnualSpend: 0, bills: [], benchmarkRate: null, benchmarkDate: null });
  }

  // ── Detect UK vs US from user's portfolio currency ──
  const firstPortfolio = await prisma.portfolio.findFirst({ where: { userId: session.user.id } });
  const isUK = firstPortfolio?.currency === "GBP";
  const activeSeries = isUK ? OFGEM_SERIES : EIA_SERIES;

  // ── Live market rate from MacroRate DB ──
  // Fall back to on-demand EIA fetch (US) or hardcoded Ofgem fallback (UK)
  let benchmarkRate: number | null = null;
  let benchmarkDate: string | null = null;

  const latestRate = await prisma.macroRate.findFirst({
    where: { series: activeSeries },
    orderBy: { date: "desc" },
  });

  if (latestRate) {
    const ageHours = (Date.now() - latestRate.fetchedAt.getTime()) / 3_600_000;
    benchmarkRate = latestRate.value;
    benchmarkDate = latestRate.date;

    if (ageHours > STALE_HOURS && !isUK) {
      // Refresh in background — US only (UK uses hardcoded fallback until Ofgem API is wired)
      fetchAndCacheEiaRate().then((fresh) => {
        if (fresh !== null) console.log(`[energy-summary] refreshed EIA rate: ${fresh}¢/kWh`);
      }).catch(() => {});
    }
  } else if (isUK) {
    // UK: no cached Ofgem rate — use hardcoded fallback (~26p/kWh typical commercial 2024/25)
    benchmarkRate = UK_FALLBACK_RATE;
    benchmarkDate = new Date().toISOString().slice(0, 7);
  } else {
    // US: first load — fetch synchronously so this response has live data
    benchmarkRate = await fetchAndCacheEiaRate();
    benchmarkDate = benchmarkRate !== null
      ? new Date().toISOString().slice(0, 7) // "YYYY-MM" — approximation until cron sets exact date
      : null;
  }

  // ── Uploaded energy bills ──
  const docs = await prisma.document.findMany({
    where: { userId: session.user.id, documentType: "energy_bill", status: "done" },
    orderBy: { createdAt: "desc" },
  });

  if (!docs.length) {
    return NextResponse.json({ hasBills: false, totalAnnualSpend: 0, bills: [], benchmarkRate, benchmarkDate });
  }

  const bills = docs.map((d) => {
    const data = (d.extractedData as Record<string, unknown>) ?? {};
    return {
      id: d.id,
      supplier: (data.supplier as string) ?? "Unknown",
      accountNumber: (data.accountNumber as string) ?? null,
      billingPeriod: (data.billingPeriod as string) ?? null,
      totalCost: Number(data.totalCost) || 0,
      unitRate: Number(data.unitRate) || 0,
      consumption: Number(data.consumption) || 0,
      filename: d.filename,
    };
  });

  const totalAnnualSpend = bills.reduce((s, b) => s + b.totalCost, 0);
  const ratedBills = bills.filter((b) => b.unitRate > 0);
  const avgUnitRate =
    ratedBills.length > 0
      ? ratedBills.reduce((s, b) => s + b.unitRate, 0) / ratedBills.length
      : 0;

  return NextResponse.json({
    hasBills: true,
    totalAnnualSpend,
    avgUnitRate,
    benchmarkRate,
    benchmarkDate,
    bills,
  });
}

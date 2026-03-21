import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily cron: fetch FL commercial electricity rate from EIA and persist.
// Wire on Railway/cron-job.org to call once per day with:
//   Authorization: Bearer <CRON_SECRET>
// EIA series: retail electricity price, commercial sector, Florida
// Free API key at https://www.eia.gov/opendata/register.php

const EIA_SERIES = "EIA_FL_ELEC_COMMERCIAL";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const eiaKey = process.env.EIA_API_KEY;
  if (!eiaKey) {
    return NextResponse.json({ ok: false, skipped: true, reason: "EIA_API_KEY not set" });
  }

  // EIA v2: FL commercial electricity retail prices, most recent 3 months
  const url =
    `https://api.eia.gov/v2/electricity/retail-prices/data/` +
    `?api_key=${eiaKey}` +
    `&frequency=monthly` +
    `&data[0]=price` +
    `&facets[sectorName][]=commercial` +
    `&facets[stateid][]=FL` +
    `&sort[0][column]=period` +
    `&sort[0][direction]=desc` +
    `&length=3`;

  let eiaData: { response?: { data?: { period: string; price: number | string }[] } };
  try {
    const resp = await fetch(url, { next: { revalidate: 0 } });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[cron/energy-rates] EIA error:", text);
      return NextResponse.json({ ok: false, error: `EIA returned ${resp.status}` }, { status: 502 });
    }
    eiaData = await resp.json();
  } catch (err) {
    console.error("[cron/energy-rates] fetch error:", err);
    return NextResponse.json({ ok: false, error: "Failed to reach EIA API" }, { status: 502 });
  }

  const rows = eiaData?.response?.data;
  if (!rows?.length) {
    return NextResponse.json({ ok: false, error: "No data returned from EIA", raw: eiaData });
  }

  // Persist each monthly data point (upsert prevents duplicates)
  const results: { date: string; value: number }[] = [];
  for (const row of rows) {
    const price = Number(row.price);
    const date = row.period; // "2026-01" format
    if (!date || isNaN(price)) continue;
    // EIA returns price in cents/kWh — store as-is (e.g. 9.52 = 9.52¢/kWh)
    await prisma.macroRate.upsert({
      where: { series_date: { series: EIA_SERIES, date } },
      create: { series: EIA_SERIES, value: price, date },
      update: { value: price, fetchedAt: new Date() },
    });
    results.push({ date, value: price });
  }

  console.log(`[cron/energy-rates] stored ${results.length} EIA FL commercial rate(s)`);
  return NextResponse.json({ ok: true, series: EIA_SERIES, results });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily cron: fetch live UK commercial electricity unit rate from Octopus Energy.
// No API key required — tariff endpoints are public.
//
// Product: BUS-12M-FIXED-BAND2-26-03-16 (Octopus 12M Fixed, Band 2 — representative mid-market SME)
// Region:  C (Greater London / South East — RealHQ target market)
// Tariff:  E-1R-BUS-12M-FIXED-BAND2-26-03-16-C
// Rate:    value_inc_vat in p/kWh
//
// Wire on Railway cron (or cron-job.org) once per day:
//   GET /api/cron/octopus-rates
//   Authorization: Bearer <CRON_SECRET>

const SERIES = "OCTOPUS_UK_ELEC_COMMERCIAL";
const PRODUCT_CODE = "BUS-12M-FIXED-BAND2-26-03-16";
const TARIFF_CODE = "E-1R-BUS-12M-FIXED-BAND2-26-03-16-C";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url =
    `https://api.octopus.energy/v1/products/${PRODUCT_CODE}` +
    `/electricity-tariffs/${TARIFF_CODE}/standard-unit-rates/?page_size=1`;

  let rateData: { results?: { value_inc_vat: number; valid_from: string; valid_to: string | null }[] };
  try {
    const resp = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[cron/octopus-rates] Octopus API error:", resp.status, text);
      return NextResponse.json({ ok: false, error: `Octopus API returned ${resp.status}` }, { status: 502 });
    }
    rateData = await resp.json();
  } catch (err) {
    console.error("[cron/octopus-rates] fetch error:", err);
    return NextResponse.json({ ok: false, error: "Failed to reach Octopus Energy API" }, { status: 502 });
  }

  const latest = rateData?.results?.[0];
  if (!latest) {
    return NextResponse.json({ ok: false, error: "No rate data returned from Octopus" });
  }

  // value_inc_vat is p/kWh inc VAT — store as-is (e.g. 27.3 = 27.3p/kWh)
  const rateValue = latest.value_inc_vat;
  // Use valid_from date (YYYY-MM-DD) as the record date; fall back to today
  const date = latest.valid_from?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  await prisma.macroRate.upsert({
    where: { series_date: { series: SERIES, date } },
    create: { series: SERIES, value: rateValue, date },
    update: { value: rateValue, fetchedAt: new Date() },
  });

  console.log(`[cron/octopus-rates] stored ${SERIES} = ${rateValue}p/kWh for ${date}`);
  return NextResponse.json({
    ok: true,
    series: SERIES,
    productCode: PRODUCT_CODE,
    tariffCode: TARIFF_CODE,
    unitRatePKwhIncVat: rateValue,
    date,
  });
}

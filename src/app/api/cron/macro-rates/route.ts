/**
 * src/app/api/cron/macro-rates/route.ts
 * Wave J4 — daily cron that snapshots BoE base rate, CPI and GDP into MacroRate.
 *
 * Runs daily; ONS series only update monthly/quarterly so most days will
 * upsert no-op rows. Each fetcher is fault-tolerant — failures don't block
 * the others.
 *
 * Wire on Railway/cron-job.org to call once per day with:
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAllMacroRates } from "@/lib/macro-rates";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const observations = await fetchAllMacroRates();
  if (observations.length === 0) {
    return NextResponse.json({ ok: false, reason: "no observations fetched" });
  }

  const written: { series: string; date: string; value: number }[] = [];
  for (const obs of observations) {
    try {
      await prisma.macroRate.upsert({
        where: { series_date: { series: obs.series, date: obs.date } },
        create: { series: obs.series, value: obs.value, date: obs.date },
        update: { value: obs.value, fetchedAt: new Date() },
      });
      written.push(obs);
    } catch (err) {
      console.warn(`[cron/macro-rates] upsert failed for ${obs.series}:`, err);
    }
  }

  console.log(`[cron/macro-rates] persisted ${written.length}/${observations.length} series`);
  return NextResponse.json({ ok: true, count: written.length, written });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily cron: fetch latest SOFR rate from FRED and persist.
// Wire this on Railway/cron-job.org to call once per day with:
//   Authorization: Bearer <CRON_SECRET>
// FRED series: SOFR (Secured Overnight Financing Rate)
// Free public API — register for a free key at https://fred.stlouisfed.org/docs/api/api_key.html

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) {
    return NextResponse.json({ ok: false, skipped: true, reason: "FRED_API_KEY not set" });
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=SOFR&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`;

  let fredData: { observations?: { date: string; value: string }[] };
  try {
    const resp = await fetch(url, { next: { revalidate: 0 } });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[cron/sofr] FRED error:", text);
      return NextResponse.json({ ok: false, error: `FRED returned ${resp.status}` }, { status: 502 });
    }
    fredData = await resp.json();
  } catch (err) {
    console.error("[cron/sofr] fetch error:", err);
    return NextResponse.json({ ok: false, error: "Failed to reach FRED API" }, { status: 502 });
  }

  const obs = fredData.observations?.[0];
  if (!obs || obs.value === "." || isNaN(Number(obs.value))) {
    return NextResponse.json({ ok: false, error: "No valid observation returned", raw: obs });
  }

  const date = obs.date;       // "2026-03-20"
  const value = Number(obs.value);

  await prisma.macroRate.upsert({
    where: { series_date: { series: "SOFR", date } },
    create: { series: "SOFR", value, date },
    update: { value, fetchedAt: new Date() },
  });

  console.log(`[cron/sofr] stored SOFR ${value}% for ${date}`);
  return NextResponse.json({ ok: true, series: "SOFR", value, date });
}

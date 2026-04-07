"use client";

// Design source: 03-pipeline-alerts-settings.html — pipe-analytics state

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import s from "./analytics.module.css";

const STAGES = ["Identified", "Researched", "Approached", "Negotiating", "Under Offer", "Completing"];
const STAGE_COLORS: Record<string, string> = {
  Identified: "var(--acc)",
  Researched: "rgba(124,106,240,.8)",
  Approached: "rgba(124,106,240,.65)",
  Negotiating: "var(--amb)",
  "Under Offer": "var(--grn)",
  Completing: "var(--grn)",
};

type Entry = {
  id: string;
  stage: string;
  property?: { askingPrice?: number; dealScore?: number };
  mandate?: { id: string; name: string } | null;
};

function formatTotal(n: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

export default function PipelineAnalyticsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dealscope/pipeline")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data) => {
        const list: Entry[] = Array.isArray(data) ? data : (data.entries ?? []);
        setEntries(list);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const stageCounts: Record<string, number> = {};
  for (const stage of STAGES) stageCounts[stage] = 0;
  for (const e of entries) {
    const stage = e.stage ?? "Identified";
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }
  const totalDeals = entries.length;
  const totalValue = entries.reduce((sum, e) => sum + (Number(e.property?.askingPrice) || 0), 0);
  const maxStage = Math.max(1, ...Object.values(stageCounts));

  // Group by mandate
  const byMandate = new Map<string, { name: string; count: number; value: number; scoreSum: number }>();
  for (const e of entries) {
    const key = e.mandate?.name ?? "Unassigned";
    const cur = byMandate.get(key) ?? { name: key, count: 0, value: 0, scoreSum: 0 };
    cur.count += 1;
    cur.value += Number(e.property?.askingPrice) || 0;
    cur.scoreSum += Number(e.property?.dealScore) || 0;
    byMandate.set(key, cur);
  }
  const mandateRows = Array.from(byMandate.values());

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Pipeline Analytics</h1>
          <div className={s.barActions}>
            <Link href="/scope/pipeline" className={s.btnS}>Back to pipeline</Link>
          </div>
        </div>

        <div className={s.body}>
          {loading ? (
            <div className={s.loading}>Loading…</div>
          ) : (
            <>
              <div className={s.statGrid}>
                <div className={s.stat}><div className={s.statVal}>{totalDeals}</div><div className={s.statLbl}>Total deals</div></div>
                <div className={s.stat}><div className={s.statVal} style={{ color: "var(--grn)" }}>{formatTotal(totalValue)}</div><div className={s.statLbl}>Pipeline value</div></div>
                <div className={s.stat}><div className={s.statVal}>—</div><div className={s.statLbl}>Conversion rate</div></div>
                <div className={s.stat}><div className={s.statVal}>—</div><div className={s.statLbl}>Avg. days to offer</div></div>
              </div>

              <div className={s.twoCol}>
                <div className={s.card}>
                  <div className={s.cardTitle}>Conversion funnel</div>
                  <div className={s.funnel}>
                    {STAGES.map((stage) => {
                      const n = stageCounts[stage] || 0;
                      const pct = Math.max(4, Math.round((n / maxStage) * 100));
                      return (
                        <div key={stage} className={s.funnelRow}>
                          <div className={s.funnelLbl}>{stage}</div>
                          <div className={s.funnelBar} style={{ width: `${pct}%`, background: STAGE_COLORS[stage] }}>{n}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={s.card}>
                  <div className={s.cardTitle}>Time in stage (average)</div>
                  <div className={s.muted}>Stage history not yet tracked. Once deals move between stages, average dwell time will appear here.</div>
                </div>
              </div>

              <div className={s.card}>
                <div className={s.cardTitle}>Pipeline by mandate</div>
                {mandateRows.length === 0 ? (
                  <div className={s.muted}>No deals in pipeline yet.</div>
                ) : (
                  <table className={s.tbl}>
                    <thead>
                      <tr><th>Mandate</th><th>Deals</th><th>Value</th><th>Avg score</th></tr>
                    </thead>
                    <tbody>
                      {mandateRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className={s.m}>{row.count}</td>
                          <td className={s.m}>{formatTotal(row.value)}</td>
                          <td className={s.m}>{row.count > 0 && row.scoreSum > 0 ? (row.scoreSum / row.count).toFixed(1) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

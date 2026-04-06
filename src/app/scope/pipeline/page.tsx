"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import s from "./pipeline.module.css";

const STAGES = ["Identified", "Researched", "Approached", "Negotiating", "Under Offer", "Completing"];

type Deal = {
  id: string;
  propertyId?: string;
  name?: string;
  loc?: string;
  price?: string;
  score?: number;
  time?: string;
  mandate?: string;
  urgent?: boolean;
  status?: string;
  statusColor?: string;
};

function scoreColor(sc: number) { return sc >= 7 ? s.scGreen : sc >= 5 ? s.scAmber : s.scRed; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PipelinePage() {
  const [filter, setFilter] = useState("All");
  const [deals, setDeals] = useState<Record<string, Deal[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await fetch("/api/dealscope/pipeline");
        if (res.ok) {
          const data = await res.json();
          // API returns { entries: [{ id, propertyId, stage, addedAt, ... }] }
          // Group by stage name
          const grouped: Record<string, Deal[]> = {};
          const entries: any[] = Array.isArray(data) ? data : (data.entries ?? []);
          for (const entry of entries) {
            const stage = entry.stage ?? "Identified";
            if (!grouped[stage]) grouped[stage] = [];
            grouped[stage].push({
              id: entry.id,
              propertyId: entry.propertyId,
              name: entry.property?.address ?? entry.address ?? entry.name ?? "Property",
              loc: entry.property?.location ?? entry.location ?? "",
              price: entry.property?.askingPrice ? `£${Number(entry.property.askingPrice).toLocaleString()}` : undefined,
              score: entry.property?.dealScore ?? entry.score ?? undefined,
              time: entry.updatedAt ? timeAgo(entry.updatedAt) : entry.addedAt ? timeAgo(entry.addedAt) : undefined,
            });
          }
          setDeals(grouped);
        }
      } catch (err) {
        console.error("Failed to load pipeline:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPipeline();
  }, []);

  const totalDeals = Object.values(deals).flat().length;

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Pipeline</h1>
          <div className={s.barStats}>
            <div><strong>{totalDeals}</strong> <span>deals</span></div>
          </div>
          <div className={s.barChips}>
            <button className={`${s.chip} ${filter === "All" ? s.chipOn : ""}`} onClick={() => setFilter("All")}>All</button>
          </div>
          <div className={s.barActions}>
            <button className={s.btnS}>Export CSV</button>
          </div>
        </div>

        <div className={s.kanban}>
          {STAGES.map((stage) => (
            <div key={stage} className={s.column}>
              <div className={s.colHeader}>
                <span>{stage}</span>
                <span className={s.colCount}>{deals[stage]?.length || 0}</span>
              </div>
              {loading ? (
                <div className={s.emptyCol}>Loading…</div>
              ) : (deals[stage] || []).length === 0 ? (
                <div className={s.emptyCol}>No deals yet</div>
              ) : (
                (deals[stage] || []).map((deal) => (
                  <Link key={deal.id} href={`/scope/property/${deal.propertyId ?? deal.id}`} className={s.card}>
                    {deal.urgent && <div className={s.urgentDot} />}
                    <div className={s.cardName}>{deal.name}</div>
                    {deal.loc && <div className={s.cardLoc}>{deal.loc}</div>}
                    {deal.price && <div className={s.cardPrice}>{deal.price}</div>}
                    <div className={s.cardFoot}>
                      {deal.score != null && <span className={`${s.cardScore} ${scoreColor(deal.score)}`}>{deal.score.toFixed(1)}</span>}
                      {deal.time && <span className={s.cardTime}>{deal.time}</span>}
                    </div>
                    {deal.mandate && <div className={s.cardMandate}>{deal.mandate}</div>}
                    {deal.status && (
                      <div className={s.cardStatus} style={{ color: deal.statusColor === "green" ? "var(--grn)" : deal.statusColor === "amber" ? "var(--amb)" : "var(--tx3)" }}>
                        {deal.status}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

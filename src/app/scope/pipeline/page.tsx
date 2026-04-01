"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import s from "./pipeline.module.css";

const STAGES = ["Identified", "Researched", "Approached", "Negotiating", "Under Offer", "Completing"];

const DEMO_DEALS: Record<string, any[]> = {
  Identified: [
    { id: "1", name: "Meridian BP, Unit 7", loc: "Rochester", price: "£480–560k", score: 7.2, time: "1h ago", mandate: "SE Industrial", urgent: true },
    { id: "2", name: "Redfield Manor", loc: "Reigate", price: "£720k", score: 6.8, time: "3h" },
    { id: "3", name: "Vale Trading Estate", loc: "Billericay", price: "£340k", score: 5.4, time: "5h" },
    { id: "4", name: "Beckenham Flex", loc: "London BR3", price: "£680k", score: 5.1, time: "1d" },
  ],
  Researched: [
    { id: "5", name: "Ashworth Close, U2", loc: "Crawley", price: "£480k", score: 6.9, time: "2d", mandate: "SE Industrial" },
    { id: "6", name: "Kingfield Ind.", loc: "Woking", price: "£920k", score: 7.1, time: "3d" },
    { id: "7", name: "Gravesend Ind. Est", loc: "Gravesend", price: "£440k", score: 5.6, time: "4d" },
  ],
  Approached: [
    { id: "8", name: "Whiteley Manor", loc: "Hampshire", price: "£1.1M", score: 7.5, time: "5d", status: "Sent 26 Mar · Awaiting response" },
    { id: "9", name: "Fenton Business Hub", loc: "Stoke", price: "£390k", score: 6.2, time: "8d", status: "Follow-up due tomorrow", statusColor: "amber" },
  ],
  Negotiating: [
    { id: "10", name: "Stonegate Retail", loc: "Brighton", price: "£750k", score: 8.1, time: "12d", status: "Counter-offer received: £680k", statusColor: "green" },
  ],
  "Under Offer": [
    { id: "11", name: "Thurrock Wh.", loc: "Grays", price: "£510k", score: 8.3, time: "18d", status: "Offer accepted £495k · Sols instructed", statusColor: "green" },
  ],
  Completing: [
    { id: "12", name: "Sutton Ind. Park", loc: "Sutton", price: "£620k", score: 8.7, time: "25d", status: "Completion: 14 Apr 2026", statusColor: "green" },
  ],
};

function scoreColor(sc: number) { return sc >= 7 ? s.scGreen : sc >= 5 ? s.scAmber : s.scRed; }

export default function PipelinePage() {
  const [filter, setFilter] = useState("All");
  const totalDeals = Object.values(DEMO_DEALS).flat().length;

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Pipeline</h1>
          <div className={s.barStats}>
            <div><strong>{totalDeals}</strong> <span>deals</span></div>
            <div><strong>£4.8M</strong> <span>value</span></div>
            <div><strong>12.4%</strong> <span>avg IRR</span></div>
          </div>
          <div className={s.barChips}>
            {["All", "SE Industrial", "London Office"].map((f) => (
              <button key={f} className={`${s.chip} ${filter === f ? s.chipOn : ""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className={s.barActions}>
            <button className={s.btnS}>Bulk approach</button>
            <button className={s.btnS}>Analytics</button>
            <button className={s.btnS}>Export CSV</button>
          </div>
        </div>

        <div className={s.kanban}>
          {STAGES.map((stage) => (
            <div key={stage} className={s.column}>
              <div className={s.colHeader}>
                <span>{stage}</span>
                <span className={s.colCount}>{DEMO_DEALS[stage]?.length || 0}</span>
              </div>
              {(DEMO_DEALS[stage] || []).map((deal) => (
                <Link key={deal.id} href={`/scope/property/${deal.id}`} className={s.card}>
                  {deal.urgent && <div className={s.urgentDot} />}
                  <div className={s.cardName}>{deal.name}</div>
                  <div className={s.cardLoc}>{deal.loc}</div>
                  <div className={s.cardPrice}>{deal.price}</div>
                  <div className={s.cardFoot}>
                    <span className={`${s.cardScore} ${scoreColor(deal.score)}`}>{deal.score}</span>
                    <span className={s.cardTime}>{deal.time}</span>
                  </div>
                  {deal.mandate && <div className={s.cardMandate}>{deal.mandate}</div>}
                  {deal.status && (
                    <div className={s.cardStatus} style={{ color: deal.statusColor === "green" ? "var(--grn)" : deal.statusColor === "amber" ? "var(--amb)" : "var(--tx3)" }}>
                      {deal.status}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

// Design source: 03-pipeline-alerts-settings.html — pipe-active + pipe-empty states

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
  priceNum?: number;
  score?: number;
  time?: string;
  mandate?: string;
  mandateId?: string;
  urgent?: boolean;
  status?: string;
  statusColor?: string;
};

type Mandate = { id: string; name: string };

function scoreColor(sc: number) { return sc >= 7 ? s.scGreen : sc >= 5 ? s.scAmber : s.scRed; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTotal(n: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

export default function PipelinePage() {
  const [filter, setFilter] = useState("All");
  const [deals, setDeals] = useState<Record<string, Deal[]>>({});
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await fetch("/api/dealscope/pipeline");
        if (res.ok) {
          const data = await res.json();
          const grouped: Record<string, Deal[]> = {};
          const entries: any[] = Array.isArray(data) ? data : (data.entries ?? []);
          for (const entry of entries) {
            const stage = entry.stage ?? "Identified";
            if (!grouped[stage]) grouped[stage] = [];
            const priceNum = entry.property?.askingPrice ? Number(entry.property.askingPrice) : undefined;
            grouped[stage].push({
              id: entry.id,
              propertyId: entry.propertyId,
              name: entry.property?.address ?? entry.address ?? entry.name ?? "Property",
              loc: entry.property?.location ?? entry.location ?? "",
              price: priceNum ? `£${priceNum.toLocaleString()}` : undefined,
              priceNum,
              score: entry.property?.dealScore ?? entry.score ?? undefined,
              time: entry.updatedAt ? timeAgo(entry.updatedAt) : entry.addedAt ? timeAgo(entry.addedAt) : undefined,
              mandate: entry.mandate?.name,
              mandateId: entry.mandateId ?? entry.mandate?.id,
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

    fetch("/api/dealscope/mandates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Mandate[]) => setMandates(Array.isArray(data) ? data : []))
      .catch(() => setMandates([]));
  }, []);

  const allDeals = Object.values(deals).flat();
  const visibleDeals =
    filter === "All" ? allDeals : allDeals.filter((d) => d.mandate === filter || d.mandateId === filter);
  const visibleByStage: Record<string, Deal[]> = {};
  for (const stage of STAGES) {
    visibleByStage[stage] = (deals[stage] || []).filter((d) =>
      filter === "All" ? true : d.mandate === filter || d.mandateId === filter
    );
  }
  const totalDeals = visibleDeals.length;
  const totalValue = visibleDeals.reduce((sum, d) => sum + (d.priceNum || 0), 0);
  const isEmpty = !loading && allDeals.length === 0;

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.bar}>
          <h1 className={s.barTitle}>Pipeline</h1>
          {!isEmpty && (
            <>
              <div className={s.barStats}>
                <div><strong>{totalDeals}</strong> <span>deals</span></div>
                <div><strong>{formatTotal(totalValue)}</strong> <span>total value</span></div>
              </div>
              <div className={s.barChips}>
                <button className={`${s.chip} ${filter === "All" ? s.chipOn : ""}`} onClick={() => setFilter("All")}>All</button>
                {mandates.map((m) => (
                  <button
                    key={m.id}
                    className={`${s.chip} ${filter === m.name ? s.chipOn : ""}`}
                    onClick={() => setFilter(m.name)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <div className={s.barActions}>
                <button className={s.btnS} onClick={() => setShowBulk(true)}>Bulk approach</button>
                <Link href="/scope/pipeline/analytics" className={s.btnS}>Analytics</Link>
                <button className={s.btnS}>Export CSV</button>
              </div>
            </>
          )}
        </div>

        {isEmpty ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>⊞</div>
            <div className={s.emptyTitle}>Your pipeline is empty</div>
            <div className={s.emptyMsg}>
              When you find a deal you want to track, click &ldquo;+ Pipeline&rdquo; in the dossier to add it here.
              Deals move through stages from identification to completion.
            </div>
            <div className={s.emptyActions}>
              <Link href="/scope" className={s.btnP}>Browse opportunities</Link>
              <button className={s.btnS}>Import from spreadsheet</button>
            </div>
            <div className={s.ghostStages}>
              {STAGES.map((stage) => (
                <div key={stage} className={s.ghostStage}>{stage}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className={s.kanban}>
            {STAGES.map((stage) => (
              <div key={stage} className={s.column}>
                <div className={s.colHeader}>
                  <span>{stage}</span>
                  <span className={s.colCount}>{visibleByStage[stage]?.length || 0}</span>
                </div>
                {loading ? (
                  <div className={s.emptyCol}>Loading…</div>
                ) : (visibleByStage[stage] || []).length === 0 ? (
                  <div className={s.emptyCol}>No deals yet</div>
                ) : (
                  (visibleByStage[stage] || []).map((deal) => (
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
        )}

        {/* ── BULK APPROACH MODAL ── (design 04 bulk-approach) */}
        {showBulk && (
          <div className={s.modalBg} onClick={() => setShowBulk(false)}>
            <div className={s.modal} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHdr}>
                <div>
                  <div className={s.modalTitle}>Bulk approach</div>
                  <div className={s.modalSub}>
                    Send approach letters to {visibleDeals.length} {visibleDeals.length === 1 ? "property" : "properties"}
                  </div>
                </div>
                <button className={s.modalClose} onClick={() => setShowBulk(false)}>✕</button>
              </div>
              <div className={s.modalBody}>
                {visibleDeals.length === 0 ? (
                  <div className={s.emptyCol}>No deals selected. Add deals to your pipeline first.</div>
                ) : (
                  <table className={s.bulkTbl}>
                    <thead>
                      <tr><th>Property</th><th>Mandate</th><th>Stage</th><th>Asking</th></tr>
                    </thead>
                    <tbody>
                      {visibleDeals.map((d) => (
                        <tr key={d.id}>
                          <td>{d.name}</td>
                          <td>{d.mandate || "—"}</td>
                          <td>{
                            STAGES.find((stg) => (deals[stg] || []).some((x) => x.id === d.id)) || "—"
                          }</td>
                          <td className={s.mono}>{d.price || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className={s.bulkStats}>
                  <div className={s.bulkStat}>
                    <div className={s.bulkStatVal}>{visibleDeals.length}</div>
                    <div className={s.bulkStatLbl}>Letters</div>
                  </div>
                  <div className={s.bulkStat}>
                    <div className={s.bulkStatVal} style={{ color: "var(--grn)" }}>{formatTotal(visibleDeals.reduce((sum, d) => sum + (d.priceNum || 0), 0))}</div>
                    <div className={s.bulkStatLbl}>Total ask</div>
                  </div>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button className={s.btnS} onClick={() => setShowBulk(false)}>Cancel</button>
                <button className={s.btnS} disabled>Preview all letters</button>
                <button className={s.btnP} disabled>Send all letters</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

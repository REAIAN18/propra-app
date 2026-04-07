"use client";

// Design source: 02-dossier-full.html — tab "Approach".
// Wired to the real /api/dealscope/letter endpoint (Claude-backed) and
// the deal's actual signals/data sources for the DD checklist. Per Rule 3
// we never display fabricated negotiation leverage or fake DD line items.

import { useState } from "react";
import s from "../dossier.module.css";
import type { RawDeal } from "./types";

interface Props {
  deal: RawDeal;
}

type LetterTone = "professional" | "friendly" | "formal" | "casual";

const TONES: { id: LetterTone; label: string }[] = [
  { id: "formal", label: "Formal" },
  { id: "professional", label: "Direct" },
  { id: "friendly", label: "Consultative" },
];

const CHANNELS = ["Post + PDF", "Email", "Phone script"] as const;

function buildChecklist(deal: RawDeal): { done: boolean; label: string; sub: string }[] {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const items: { done: boolean; label: string; sub: string }[] = [];

  // Title — done if we have an owner record
  const companyOwner = ds.companyOwner as { companyName?: string; companyNumber?: string } | undefined;
  items.push({
    done: !!companyOwner?.companyNumber,
    label: "Title / owner check",
    sub: companyOwner?.companyName
      ? `Owner: ${companyOwner.companyName}`
      : "Land Registry CCOD lookup pending",
  });

  // Tenancy
  items.push({
    done: deal.occupancyPct != null,
    label: "Tenancy status",
    sub: deal.occupancyPct != null
      ? `Occupancy ${Math.round(deal.occupancyPct * 100)}%`
      : "Not yet confirmed",
  });

  // EPC
  items.push({
    done: !!deal.epcRating,
    label: "EPC verified",
    sub: deal.epcRating
      ? `Rating ${deal.epcRating}${["F", "G"].includes(deal.epcRating) ? " — MEES upgrade required" : ""}`
      : "EPC register lookup pending",
  });

  // Planning
  const planningApps = (ds.planning as unknown[] | undefined) ?? [];
  items.push({
    done: planningApps.length > 0 || deal.hasPlanningApplication === false,
    label: "Planning history",
    sub: planningApps.length > 0
      ? `${planningApps.length} application(s) on record`
      : deal.hasPlanningApplication
        ? "Active application flagged"
        : "No applications found",
  });

  // Flood
  const flood = ds.flood as Record<string, unknown> | undefined;
  items.push({
    done: !!flood,
    label: "Flood risk",
    sub: flood
      ? `Zone: ${(flood.floodZone as string) ?? "checked"}`
      : "Environment Agency lookup pending",
  });

  // Comps
  const comps = (ds.comps as unknown[] | undefined) ?? [];
  items.push({
    done: comps.length >= 3,
    label: "Comparable evidence",
    sub: comps.length > 0 ? `${comps.length} comp(s) collected` : "No comps yet",
  });

  // Manual due diligence (always open)
  items.push({ done: false, label: "Environmental Phase 1", sub: "Commission desktop study" });
  items.push({ done: false, label: "Building survey", sub: "Engage surveyor" });
  items.push({ done: false, label: "Local searches", sub: "LA + water" });

  return items;
}

export function ApproachTab({ deal }: Props) {
  const [tone, setTone] = useState<LetterTone>("professional");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("Post + PDF");
  const [letter, setLetter] = useState<string | null>(null);
  const [letterHtml, setLetterHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const listing = ds.listing as Record<string, unknown> | undefined;
  const companyOwner = ds.companyOwner as { companyName?: string; companyNumber?: string } | undefined;
  const ricsAnalysis = ds.ricsAnalysis as Record<string, unknown> | undefined;
  const verdict = ricsAnalysis?.verdict as Record<string, unknown> | undefined;
  const targetRange = verdict?.targetOfferRange as { low?: number; high?: number } | undefined;

  const checklist = buildChecklist(deal);
  const completed = checklist.filter((c) => c.done).length;

  async function generateLetter() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/dealscope/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyContext: {
            address: deal.address,
            propertyType: deal.assetType,
            price: deal.askingPrice ?? deal.guidePrice,
            description: (listing?.description as string | undefined) ?? undefined,
          },
          ownerIntel: companyOwner?.companyName
            ? { estimatedOwnerProfile: `Registered owner: ${companyOwner.companyName} (${companyOwner.companyNumber})` }
            : undefined,
          tone,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to generate letter");
        return;
      }
      setLetter((data.data?.letter as string) ?? null);
      setLetterHtml((data.data?.letterHtml as string) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className={s.grid2}>
        <div>
          <div className={s.card}>
            <div className={s.cardTitle}>Generated approach letter</div>
            {letter ? (
              editing ? (
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 280,
                    padding: 12,
                    background: "var(--s2)",
                    border: "1px solid var(--s3)",
                    borderRadius: 8,
                    color: "var(--tx)",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
                    lineHeight: 1.6,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div className={s.letterView} style={{ whiteSpace: "pre-wrap" as const }}>
                  {letterHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: letterHtml }} />
                  ) : (
                    letter
                  )}
                </div>
              )
            ) : (
              <div style={{ fontSize: 12, color: "var(--tx3)", padding: "20px 0", textAlign: "center" }}>
                {generating ? "Generating letter via Claude…" : "Click \"Generate letter\" to draft an approach letter using property context and live owner data."}
              </div>
            )}

            {error && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(240,96,96,.08)", border: "1px solid rgba(240,96,96,.2)", borderRadius: 6, fontSize: 12, color: "var(--red)" }}>
                {error}
              </div>
            )}

            <div className={s.chipRow} style={{ marginTop: 12 }}>
              <span className={s.chipRowLabel}>Tone:</span>
              {TONES.map((t) => (
                <button
                  key={t.id}
                  className={`${s.chip} ${tone === t.id ? s.chipOn : ""}`}
                  onClick={() => setTone(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={s.chipRow}>
              <span className={s.chipRowLabel}>Via:</span>
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  className={`${s.chip} ${channel === c ? s.chipOn : ""}`}
                  onClick={() => setChannel(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={s.letterActions}>
              <button className={s.btnP} onClick={generateLetter} disabled={generating}>
                {generating ? "Generating…" : letter ? "Regenerate" : "Generate letter"}
              </button>
              {letter && (
                <button className={s.btnS} onClick={() => setEditing((v) => !v)}>
                  {editing ? "Done editing" : "Edit letter"}
                </button>
              )}
            </div>
          </div>

          {targetRange && (targetRange.low != null || targetRange.high != null) && (
            <div className={s.card}>
              <div className={s.cardTitle}>Suggested target offer (RICS analysis)</div>
              <div style={{ fontSize: 18, fontFamily: "var(--mono)", color: "var(--acc)", marginBottom: 4 }}>
                £{(targetRange.low ?? 0).toLocaleString()} – £{(targetRange.high ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                Computed from RICS reconciled valuation and target yield.
              </div>
            </div>
          )}
        </div>

        <div>
          <div className={s.card}>
            <div className={s.cardTitle}>DD checklist</div>
            {checklist.map((item) => (
              <div key={item.label} className={s.ddRow}>
                <div className={`${s.ddBox} ${item.done ? s.ddDone : s.ddOpen}`}>{item.done ? "✓" : ""}</div>
                <div>
                  <div className={s.ddLabel} style={{ color: item.done ? "var(--tx)" : "var(--amb)" }}>{item.label}</div>
                  <div className={s.ddSub}>{item.sub}</div>
                </div>
              </div>
            ))}
            <div className={s.sep} />
            <div className={s.row}>
              <span className={s.rowL}>Completed</span>
              <span className={`${s.rowV} ${s.mono}`} style={{ color: "var(--grn)" }}>
                {completed} of {checklist.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

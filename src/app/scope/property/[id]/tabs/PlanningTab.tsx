"use client";

/**
 * DS-T22: Planning Tab Assembly
 * Assembles planning applications and dev potential (T11).
 */

import { PlanningApplications } from "@/components/dealscope/PlanningApplications";
import type { PlanningApplication, PlanningStatus } from "@/components/dealscope/PlanningApplications";
import type { RawDeal } from "./types";
import s from "../dossier.module.css";

interface Props {
  deal: RawDeal;
}

function statusFromString(s: string): PlanningStatus {
  const lower = s.toLowerCase();
  if (lower.includes("approved") || lower.includes("granted")) return "approved";
  if (lower.includes("refused") || lower.includes("rejected") || lower.includes("denied")) return "refused";
  if (lower.includes("withdrawn")) return "withdrawn";
  return "pending";
}

function toApp(app: Record<string, unknown>, i: number, dealAddress: string): PlanningApplication {
  const ref = (app.reference ?? `APP-${i}`) as string;
  const siteAddr = (app["site-address"] ?? app.siteAddress ?? "") as string;
  const addrFirst = dealAddress.toLowerCase().split(",")[0];
  const isThis = addrFirst && siteAddr.toLowerCase().includes(addrFirst);
  const proximity = isThis ? "This property" : (app.distance as string | undefined) ?? "Nearby";
  const description = (app.description ?? app.title ?? "Planning application") as string;
  const status = statusFromString((app.status ?? "pending") as string);
  const rawDate = (app.date ?? app["start-date"]) as string | undefined;
  const decisionDate = rawDate
    ? new Date(rawDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : undefined;
  return { ref, proximity, description, status, decisionDate, fullDescription: app.fullDescription as string | undefined };
}

export function PlanningTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const planningApps = (ds.planning as Record<string, unknown>[] | undefined) ?? [];
  const devPotential = ds.devPotential as Record<string, unknown> | undefined;
  const ai = ds.ai as Record<string, unknown> | undefined;

  const apps: PlanningApplication[] = planningApps.map((app, i) => toApp(app, i, deal.address));

  return (
    <>
      {/* Dev potential — AI assessment */}
      {devPotential && (
        <div className={s.card} style={{ background: "linear-gradient(135deg,rgba(124,106,240,.06),rgba(52,211,153,.03))", borderColor: "rgba(124,106,240,.15)" }}>
          <div className={s.cardTitle} style={{ color: "#a899ff" }}>Development potential</div>
          {!!devPotential.summary && (
            <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.7, marginBottom: 10 }}>
              {devPotential.summary as string}
            </div>
          )}
          {devPotential.score != null && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--tx3)" }}>Potential score</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 600, color: "var(--acc)" }}>
                  {devPotential.score as number}/10
                </div>
              </div>
              {!!devPotential.useCases && (
                <div>
                  <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 4 }}>Use cases</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)" }}>
                    {(devPotential.useCases as string[]).join(" · ")}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI planning summary */}
      {ai?.planningSummary && (
        <div className={s.card}>
          <div className={s.cardTitle}>Planning context</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7 }}>
            {ai.planningSummary as string}
          </div>
        </div>
      )}

      {/* Planning applications */}
      <div className={s.card}>
        <div className={s.cardTitle}>
          Planning history{" "}
          <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: 0, color: "var(--tx3)" }}>
            — Source: planning.data.gov.uk
          </span>
        </div>
        <PlanningApplications applications={apps} />
      </div>

      {/* Planning flag */}
      {deal.hasPlanningApplication && apps.length === 0 && (
        <div className={s.card} style={{ borderColor: "rgba(251,191,36,.3)", background: "rgba(251,191,36,.04)" }}>
          <div style={{ fontSize: 12, color: "var(--amb)" }}>
            Active or recent planning application flagged for this property.
          </div>
        </div>
      )}
    </>
  );
}

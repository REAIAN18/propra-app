"use client";

/**
 * DS-T22: Planning Tab Assembly
 * Assembles planning applications and dev potential (T11).
 */

import type { RawDeal } from "./types";
import s from "../dossier.module.css";

interface Props {
  deal: RawDeal;
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const color = lower.includes("approved") ? "var(--grn)"
    : lower.includes("refused") || lower.includes("rejected") ? "var(--red)"
    : "var(--amb)";
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color, background: `${color}18`, padding: "2px 6px", borderRadius: 4, fontFamily: "var(--mono)" }}>
      {status}
    </span>
  );
}

export function PlanningTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const planningApps = (ds.planning as Record<string, unknown>[] | undefined) ?? [];
  const devPotential = ds.devPotential as Record<string, unknown> | undefined;
  const ai = ds.ai as Record<string, unknown> | undefined;

  // Split: this property vs nearby
  const addrLower = deal.address.toLowerCase();
  const thisPropertyApps: Record<string, unknown>[] = [];
  const nearbyApps: Record<string, unknown>[] = [];
  planningApps.forEach((app) => {
    const appAddr = ((app["site-address"] ?? app.siteAddress ?? "") as string).toLowerCase();
    if (appAddr && addrLower.split(",")[0] && appAddr.includes(addrLower.split(",")[0])) {
      thisPropertyApps.push(app);
    } else {
      nearbyApps.push(app);
    }
  });

  function PlanRow({ app, i }: { app: Record<string, unknown>; i: number }) {
    const ref = (app.reference ?? `APP-${i}`) as string;
    const desc = `${app["site-address"] ? (app["site-address"] as string) + " — " : ""}${(app.description ?? app.title ?? "Planning application") as string}`;
    const status = (app.status ?? "Unknown") as string;
    const rawDate = (app.date ?? app["start-date"]) as string | undefined;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "Unknown";
    return (
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--s2)", fontSize: 11, alignItems: "start" }}>
        <span style={{ fontFamily: "var(--mono)", color: "var(--tx3)", fontSize: 9 }}>{ref}</span>
        <span style={{ color: "var(--tx2)" }}>{desc}</span>
        <StatusBadge status={status} />
        <span style={{ color: "var(--tx3)", fontSize: 9 }}>{dateStr}</span>
      </div>
    );
  }

  const hasPlanningData = planningApps.length > 0 || deal.hasPlanningApplication;

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

      {/* Planning applications — this property */}
      <div className={s.card}>
        <div className={s.cardTitle}>
          This property — planning history ({thisPropertyApps.length})
        </div>
        {thisPropertyApps.length > 0 ? (
          thisPropertyApps.map((app, i) => <PlanRow key={i} app={app} i={i} />)
        ) : (
          <div style={{ fontSize: 11, color: "var(--tx3)", padding: "8px 0" }}>
            {hasPlanningData ? "No direct applications found for this address." : "No planning data available."}
          </div>
        )}
      </div>

      {/* Planning applications — nearby */}
      <div className={s.card}>
        <div className={s.cardTitle}>Nearby applications ({nearbyApps.length})</div>
        {nearbyApps.length > 0 ? (
          nearbyApps.slice(0, 10).map((app, i) => <PlanRow key={i} app={app} i={i} />)
        ) : (
          <div style={{ fontSize: 11, color: "var(--tx3)", padding: "8px 0" }}>
            No nearby applications found.
          </div>
        )}
      </div>

      {/* Planning flag */}
      {deal.hasPlanningApplication && thisPropertyApps.length === 0 && (
        <div className={s.card} style={{ borderColor: "rgba(251,191,36,.3)", background: "rgba(251,191,36,.04)" }}>
          <div style={{ fontSize: 12, color: "var(--amb)" }}>
            Active or recent planning application flagged for this property.
          </div>
        </div>
      )}
    </>
  );
}

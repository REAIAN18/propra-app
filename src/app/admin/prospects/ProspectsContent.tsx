"use client";

import { useState, useEffect } from "react";
import { ProspectPipeline, FL_PROSPECTS, SEUK_PROSPECTS, estimateCommission } from "./ProspectPipeline";

type Market = "fl" | "seuk";

const MARKETS: { id: Market; flag: string; label: string; subtitle: string }[] = [
  { id: "fl",   flag: "🇺🇸", label: "Florida",    subtitle: "Commercial owner-operators · Industrial / mixed-use" },
  { id: "seuk", flag: "🇬🇧", label: "SE England", subtitle: "Logistics landlords · Kent · Surrey · Essex · Herts" },
];

interface MarketSummary {
  ready: number;
  contacted: number;
  demosBooked: number;
  commission: number;
}

export function ProspectsContent() {
  const [market, setMarket] = useState<Market>("fl");
  const [fl, setFl] = useState<MarketSummary>({ ready: 0, contacted: 0, demosBooked: 0, commission: 0 });
  const [uk, setUk] = useState<MarketSummary>({ ready: 0, contacted: 0, demosBooked: 0, commission: 0 });

  const active = MARKETS.find((m) => m.id === market)!;

  useEffect(() => {
    async function loadSummaries() {
      const [flRes, ukRes] = await Promise.all([
        fetch("/api/admin/prospect-status?market=fl").catch(() => null),
        fetch("/api/admin/prospect-status?market=seuk").catch(() => null),
      ]);
      const flMap: Record<string, { status?: string; emailOverride?: string }> =
        flRes?.ok ? await flRes.json() : {};
      const ukMap: Record<string, { status?: string; emailOverride?: string }> =
        ukRes?.ok ? await ukRes.json() : {};

      function summarise(
        prospects: typeof FL_PROSPECTS,
        store: typeof flMap,
        mkt: "fl" | "seuk",
      ): MarketSummary {
        let ready = 0, contacted = 0, demosBooked = 0, commission = 0;
        for (const p of prospects) {
          const status = store[p.id]?.status ?? p.initialStatus;
          const email = store[p.id]?.emailOverride || p.email;
          if (status === "to_contact" && email) ready++;
          if (status === "contacted") contacted++;
          if (status === "demo_booked") demosBooked++;
          if (!["lost", "research_needed"].includes(status)) {
            commission += estimateCommission(p, mkt);
          }
        }
        return { ready, contacted, demosBooked, commission };
      }

      setFl(summarise(FL_PROSPECTS, flMap, "fl"));
      setUk(summarise(SEUK_PROSPECTS, ukMap, "seuk"));
    }
    loadSummaries();
  }, []);

  function fmtComm(v: number, sym: string) {
    return v >= 1_000_000 ? `~${sym}${(v / 1_000_000).toFixed(1)}M` : `~${sym}${Math.round(v / 1_000)}k`;
  }

  return (
    <div className="space-y-6">
      {/* Cross-market pipeline summary bar */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
      >
        <span style={{ color: "#8ba0b8" }}>
          <span style={{ color: "#e8eef5", fontWeight: 600 }}>FL</span>
          {": "}
          <span style={{ color: "#F5A94A" }}>{fl.ready} ready</span>
          {" · "}
          {fl.contacted} contacted
          {" · "}
          <span style={{ color: "#8b5cf6" }}>{fl.demosBooked} demos booked</span>
          <span style={{ color: "#2a4060" }}> | </span>
          <span style={{ color: "#e8eef5", fontWeight: 600 }}>UK</span>
          {": "}
          <span style={{ color: "#F5A94A" }}>{uk.ready} ready</span>
          {" · "}
          {uk.contacted} contacted
          {" · "}
          <span style={{ color: "#8b5cf6" }}>{uk.demosBooked} demos booked</span>
          <span style={{ color: "#2a4060" }}> | </span>
          {"Est. commission: "}
          <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmtComm(fl.commission, "$")}</span>
          {" FL · "}
          <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmtComm(uk.commission, "£")}</span>
          {" UK"}
        </span>
      </div>

      {/* Market tabs + subtitle */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: market === m.id ? "#1a2d45" : "transparent",
                color: market === m.id ? "#e8eef5" : "#5a7a96",
                border: `1px solid ${market === m.id ? "#2a4060" : "#1a2d45"}`,
              }}
            >
              <span>{m.flag}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm" style={{ color: "#5a7a96" }}>
          {active.flag} {active.subtitle}
        </p>
      </div>

      <ProspectPipeline key={market} market={market} />
    </div>
  );
}

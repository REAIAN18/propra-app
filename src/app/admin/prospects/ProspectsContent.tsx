"use client";

import { useState } from "react";
import { ProspectPipeline } from "./ProspectPipeline";

type Market = "fl" | "seuk";

const MARKETS: { id: Market; flag: string; label: string; subtitle: string }[] = [
  { id: "fl",   flag: "🇺🇸", label: "Florida",    subtitle: "Commercial owner-operators · Industrial / mixed-use" },
  { id: "seuk", flag: "🇬🇧", label: "SE England", subtitle: "Logistics landlords · Kent · Surrey · Essex · Herts" },
];

export function ProspectsContent() {
  const [market, setMarket] = useState<Market>("fl");
  const active = MARKETS.find((m) => m.id === market)!;

  return (
    <div className="space-y-6">
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

      <ProspectPipeline market={market} />
    </div>
  );
}

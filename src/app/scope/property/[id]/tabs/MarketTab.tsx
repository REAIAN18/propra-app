"use client";

// Design source: 06-market-intelligence-errors.html — tab-market
// Real benchmarks only (scout-benchmarks + MacroRate). Per Rule 3, fields we
// cannot compute are shown as "—" rather than fabricated.

import { useEffect, useState } from "react";
import s from "../dossier.module.css";

interface Props {
  propertyId: string;
}

type MarketIntel = {
  property: { id: string; address: string; assetType: string; sqft: number | null; askingPrice: number | null };
  market: {
    region: string;
    capRate: number | null;
    ervPerSqft: number | null;
    subjectERV: number | null;
    subjectYield: number | null;
    capRateMin: number | null;
    capRateMax: number | null;
    ervMin: number | null;
    ervMax: number | null;
  };
  macro: { sofr: number | null; sofrDate: string | null; basRate: number | null; cpi: number | null; gdp: number | null };
};

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}
function fmtCcy(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function Row({ l, v, color }: { l: string; v: string; color?: string }) {
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={`${s.rowV} ${s.mono}`} style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}

export function MarketTab({ propertyId }: Props) {
  const [data, setData] = useState<MarketIntel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dealscope/properties/${propertyId}/market-intel`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return <div className={s.tabContent}>Loading market intelligence…</div>;
  }
  if (!data) {
    return <div className={s.tabContent}>Could not load market intelligence.</div>;
  }

  const { market, macro, property } = data;

  return (
    <div className={s.tabContent}>
      <div className={s.sideCard} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Market summary</div>
        <div className={s.sideText}>
          Benchmarks for <strong>{market.region}</strong> {property.assetType}. Subject ERV based on
          {" "}{property.sqft ? `${property.sqft.toLocaleString()} sqft` : "unknown size"} at the regional rate of {market.ervPerSqft ? `£${market.ervPerSqft.toFixed(2)}/sqft` : "—"}.
        </div>
      </div>

      <div className={s.sideCard} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Sector benchmarks ({market.region})</div>
        <Row l="Prime cap rate (asset)" v={fmtPct(market.capRate)} />
        <Row l="Region cap rate range" v={market.capRateMin != null && market.capRateMax != null ? `${(market.capRateMin * 100).toFixed(2)}% – ${(market.capRateMax * 100).toFixed(2)}%` : "—"} />
        <Row l="Prime ERV (asset)" v={market.ervPerSqft != null ? `£${market.ervPerSqft.toFixed(2)}/sqft` : "—"} />
        <Row l="Region ERV range" v={market.ervMin != null && market.ervMax != null ? `£${market.ervMin.toFixed(2)} – £${market.ervMax.toFixed(2)}/sqft` : "—"} />
        <Row l="Subject ERV (computed)" v={fmtCcy(market.subjectERV)} />
        <Row l="Subject yield on ask" v={fmtPct(market.subjectYield)} color={market.subjectYield && market.capRate && market.subjectYield > market.capRate ? "var(--grn)" : undefined} />
        <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
          Source: scout-benchmarks.ts (CBRE/Savills SE England commercial market reports, updated quarterly).
        </div>
      </div>

      <div className={s.sideCard} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Financing environment</div>
        <Row l="SOFR (latest)" v={macro.sofr != null ? `${macro.sofr.toFixed(2)}%` : "—"} />
        <Row l="SOFR as of" v={macro.sofrDate ?? "—"} />
        <Row l="BoE base rate" v={fmtPct(macro.basRate)} />
        <Row l="CPI inflation" v={fmtPct(macro.cpi)} />
        <Row l="GDP growth" v={fmtPct(macro.gdp)} />
        <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
          Source: MacroRate model (FRED daily). BoE/CPI/GDP feeds not yet wired — values shown as &quot;—&quot;.
        </div>
      </div>
    </div>
  );
}

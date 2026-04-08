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
  macro: {
    sofr: number | null; sofrDate: string | null;
    basRate: number | null; basRateDate?: string | null;
    cpi: number | null; cpiDate?: string | null;
    gdp: number | null; gdpDate?: string | null;
  };
  salesComps: Array<{
    address: string;
    type: string;
    sqft: number | null;
    price: number | null;
    pricePerSqft: number | null;
    impliedYield: number | null;
    date: string | null;
    source: string;
    score?: number | null;
    provenance?: { source: string; dataset: string; retrievedAt: string } | null;
  }>;
  salesStats: {
    avgPsf: number | null;
    minPsf: number | null;
    maxPsf: number | null;
    avgYield: number | null;
    count: number;
  };
  rentalComps: Array<{
    address: string;
    type: string;
    sqft: number | null;
    rentPa: number | null;
    rentPsf: number | null;
    lease: string | null;
    date: string | null;
  }>;
  rentalStats: {
    avgRentPsf: number | null;
    minRentPsf: number | null;
    maxRentPsf: number | null;
    count: number;
  };
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

  const { market, macro, property, salesComps, salesStats, rentalComps, rentalStats } = data;

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
        <div className={s.cardTitle}>Sales evidence (comparable sales)</div>
        {salesComps.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
            No comparable sales retrieved. Re-run enrichment to query Land Registry PPD.
          </div>
        ) : (
          <>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>£/sqft</th>
                  <th>Implied yield</th>
                  <th>Date</th>
                  <th>Quality</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {salesComps.slice(0, 20).map((c, i) => (
                  <tr key={i}>
                    <td>{c.address}</td>
                    <td>{c.type}</td>
                    <td className={s.mono}>{c.sqft != null ? c.sqft.toLocaleString() : "—"}</td>
                    <td className={s.mono}>{fmtCcy(c.price)}</td>
                    <td className={s.mono}>{c.pricePerSqft != null ? `£${c.pricePerSqft.toLocaleString()}` : "—"}</td>
                    <td className={s.mono}>{fmtPct(c.impliedYield)}</td>
                    <td className={s.mono}>{c.date ?? "—"}</td>
                    <td className={s.mono} style={{ color: (c.score ?? 0) >= 70 ? "var(--grn)" : (c.score ?? 0) >= 40 ? "var(--amb)" : "var(--tx3)" }}>
                      {c.score != null ? `${c.score}/100` : "—"}
                    </td>
                    <td style={{ fontSize: 9, color: "var(--tx3)" }} title={c.provenance?.dataset ?? ""}>
                      {c.provenance?.source ?? c.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.grid3} style={{ marginTop: 10 }}>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Avg £/sqft</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>{salesStats.avgPsf != null ? `£${salesStats.avgPsf.toLocaleString()}` : "—"}</div>
              </div>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Range £/sqft</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>
                  {salesStats.minPsf != null && salesStats.maxPsf != null
                    ? `£${salesStats.minPsf.toLocaleString()} – £${salesStats.maxPsf.toLocaleString()}`
                    : "—"}
                </div>
              </div>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Avg implied yield</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>{fmtPct(salesStats.avgYield)}</div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
              Source: Land Registry Price Paid Data. Implied yield = comp sqft × regional ERV ÷ sale price (labelled — not transacted yield).
            </div>
          </>
        )}
      </div>

      <div className={s.sideCard} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Rental evidence (comparable lettings)</div>
        {rentalComps.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
            No comparable lettings retrieved. Lettings feed not yet wired into enrichment.
          </div>
        ) : (
          <>
            <table className={s.tbl}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Rent p.a.</th>
                  <th>£/sqft</th>
                  <th>Lease</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rentalComps.slice(0, 20).map((c, i) => (
                  <tr key={i}>
                    <td>{c.address}</td>
                    <td>{c.type}</td>
                    <td className={s.mono}>{c.sqft != null ? c.sqft.toLocaleString() : "—"}</td>
                    <td className={s.mono}>{fmtCcy(c.rentPa)}</td>
                    <td className={s.mono}>{c.rentPsf != null ? `£${c.rentPsf.toFixed(2)}` : "—"}</td>
                    <td>{c.lease ?? "—"}</td>
                    <td className={s.mono}>{c.date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.grid3} style={{ marginTop: 10 }}>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Avg £/sqft</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>
                  {rentalStats.avgRentPsf != null ? `£${rentalStats.avgRentPsf.toFixed(2)}` : "—"}
                </div>
              </div>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Range £/sqft</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>
                  {rentalStats.minRentPsf != null && rentalStats.maxRentPsf != null
                    ? `£${rentalStats.minRentPsf.toFixed(2)} – £${rentalStats.maxRentPsf.toFixed(2)}`
                    : "—"}
                </div>
              </div>
              <div style={{ padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
                <div className={s.statLabel}>Comps</div>
                <div className={s.mono} style={{ fontSize: 14, color: "var(--tx)", marginTop: 2 }}>{rentalStats.count}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={s.sideCard} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Financing environment</div>
        <Row l="SOFR (latest)" v={macro.sofr != null ? `${macro.sofr.toFixed(2)}%` : "—"} />
        <Row l="SOFR as of" v={macro.sofrDate ?? "—"} />
        <Row l="BoE base rate" v={macro.basRate != null ? `${macro.basRate.toFixed(2)}%` : "—"} />
        {macro.basRateDate && <Row l="BoE as of" v={macro.basRateDate} />}
        <Row l="CPI inflation" v={macro.cpi != null ? `${macro.cpi.toFixed(1)}%` : "—"} />
        {macro.cpiDate && <Row l="CPI as of" v={macro.cpiDate} />}
        <Row l="GDP growth (qoq)" v={macro.gdp != null ? `${macro.gdp.toFixed(1)}%` : "—"} />
        {macro.gdpDate && <Row l="GDP as of" v={macro.gdpDate} />}
        <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
          Sources: SOFR via FRED · BoE Bank Rate via Bank of England statistical DB · CPIH + GDP via ONS API
        </div>
      </div>
    </div>
  );
}

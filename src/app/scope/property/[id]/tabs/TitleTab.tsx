"use client";

// Design source: 02-dossier-full.html — tab "Title & Legal".
// Real fields only. We do not have a Land Registry title-by-title feed,
// so charges/covenants/sales-history are sourced from `dataSources` if
// the enrichment pipeline populated them and rendered as "—" otherwise.
// Per Rule 3 we never invent values.

import s from "../dossier.module.css";
import type { RawDeal } from "./types";

interface Props {
  deal: RawDeal;
}

function Row({ l, v, mono, color }: { l: string; v: string; mono?: boolean; color?: "green" | "amber" | "red" }) {
  const c = color === "green" ? "var(--grn)" : color === "red" ? "var(--red)" : color === "amber" ? "var(--amb)" : "var(--tx)";
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""}`} style={{ color: c }}>{v}</span>
    </div>
  );
}

function fmtCcy(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TitleTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const companyOwner = ds.companyOwner as { companyName?: string; companyNumber?: string } | undefined;
  const listing = ds.listing as Record<string, unknown> | undefined;

  // Tenure: prefer explicit deal.tenure; fall back to listing.tenure
  const tenure = deal.tenure ?? (listing?.tenure as string | undefined) ?? null;

  // Sales history (Land Registry PPD via enrichment, if populated)
  const rawSales = (ds.salesHistory as Record<string, unknown>[] | undefined) ?? [];
  const sales = Array.isArray(rawSales) ? rawSales : [];

  // Charges register — only present if we ever populate it from CH/LR
  const rawCharges = (ds.charges as Record<string, unknown>[] | undefined) ?? [];
  const charges = Array.isArray(rawCharges) ? rawCharges : [];

  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Title details</div>
          <Row l="Tenure" v={tenure ?? "—"} />
          <Row l="Registered owner" v={companyOwner?.companyName ?? deal.ownerName ?? "—"} />
          <Row l="Company number" v={companyOwner?.companyNumber ?? "—"} mono />
          <Row l="Title number" v="—" mono />
          <Row l="Title class" v="—" />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
            Source: Land Registry CCOD (owner). Title-level fields require a paid HMLR title download.
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}>Encumbrances & rights</div>
          <Row l="Restrictive covenants" v="—" />
          <Row l="Easements" v="—" />
          <Row l="Leases granted" v="—" />
          <Row l="Notices / cautions" v="—" />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
            Not yet wired — purchase title register from HMLR to populate.
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Sales history</div>
        {sales.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
            No Land Registry price-paid records on file for this address.
          </div>
        ) : (
          <table className={s.tbl}>
            <thead><tr><th>Date</th><th>Price</th><th>Type</th><th>Tenure</th><th>New build</th></tr></thead>
            <tbody>
              {sales.map((r, i) => (
                <tr key={i}>
                  <td>{fmtDate((r.date ?? r.transferDate ?? r.dateSold) as string | undefined)}</td>
                  <td className={s.mono}>{fmtCcy((r.price ?? r.pricePaid) as number | undefined)}</td>
                  <td>{((r.type ?? r.propertyType) as string) ?? "—"}</td>
                  <td>{((r.tenure as string) ?? "—")}</td>
                  <td>{((r.newBuild ?? r.isNew) as boolean | undefined) ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={s.card}>
        <div className={s.cardTitle}>Charges register</div>
        {charges.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
            No charges on file. Companies House charges feed not yet wired into enrichment.
          </div>
        ) : (
          <table className={s.tbl}>
            <thead><tr><th>Priority</th><th>Lender</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {charges.map((c, i) => (
                <tr key={i}>
                  <td className={s.mono}>{(c.priority as string) ?? "—"}</td>
                  <td>{(c.lender as string) ?? "—"}</td>
                  <td className={s.mono}>{fmtCcy(c.amount as number | undefined)}</td>
                  <td>{fmtDate(c.date as string | undefined)}</td>
                  <td>{(c.status as string) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

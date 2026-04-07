"use client";

// Design source: 02-dossier-full.html — tab "Ownership".
// Real fields only. companyOwner comes from Land Registry CCOD via the
// enrichment pipeline; ownerPortfolio is derived from the same source.
// Directors / charges / Gazette feeds are not yet wired and render as "—".

import { useEffect, useState } from "react";
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
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

export function OwnershipTab({ deal }: Props) {
  const ds = (deal.dataSources ?? {}) as Record<string, unknown>;
  const companyOwner = ds.companyOwner as { companyName?: string; companyNumber?: string } | undefined;
  const portfolio = (ds.ownerPortfolio as Record<string, unknown>[] | undefined) ?? [];
  const covenant = ds.covenant as Record<string, unknown> | undefined;

  // Lazy-load extended company detail from Companies House proxy if we have a number
  const [companyDetail, setCompanyDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  useEffect(() => {
    if (!companyOwner?.companyNumber) return;
    setLoadingDetail(true);
    fetch(`/api/dealscope/companies/${companyOwner.companyNumber}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCompanyDetail(d))
      .catch(() => setCompanyDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [companyOwner?.companyNumber]);

  const ownerName = companyOwner?.companyName ?? deal.ownerName ?? null;
  const status = (companyDetail?.companyStatus as string | undefined) ?? null;
  const incorporated = (companyDetail?.dateOfCreation as string | undefined) ?? null;
  const sicCodes = (companyDetail?.sicCodes as string[] | undefined) ?? [];
  const officers = (companyDetail?.officers as Array<{ name: string; position: string; appointedOn?: string }> | null | undefined) ?? null;
  const chDirCharges = (companyDetail?.charges as Array<Record<string, unknown>> | null | undefined) ?? null;
  const chargesTotal = companyDetail?.chargesTotal as number | undefined;
  const insolvencyCases = (companyDetail?.insolvency as Array<Record<string, unknown>> | null | undefined) ?? null;

  const insolvency = deal.hasInsolvency === true || (insolvencyCases?.length ?? 0) > 0;

  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Company profile</div>
          <Row l="Name" v={ownerName ?? "—"} />
          <Row l="Company no." v={companyOwner?.companyNumber ?? "—"} mono />
          <Row
            l="Status"
            v={status ?? (insolvency ? "Insolvency flag detected" : loadingDetail ? "Loading…" : "—")}
            color={insolvency ? "red" : status?.toLowerCase().includes("active") ? "green" : undefined}
          />
          <Row l="Incorporated" v={incorporated ?? "—"} mono />
          <Row l="SIC code(s)" v={sicCodes.length > 0 ? sicCodes.join(", ") : "—"} />
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>
            Source: Land Registry CCOD (ownership) + Companies House proxy. Officers, charges and Gazette feeds not yet wired into enrichment.
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}>Tenant covenant</div>
          {covenant ? (
            <>
              <Row l="Tenant" v={(covenant.tenantName as string) ?? "—"} />
              <Row l="Covenant strength" v={(covenant.strength as string) ?? "—"} />
              <Row l="Credit score" v={covenant.creditScore != null ? String(covenant.creditScore) : "—"} mono />
              <Row l="Annual revenue" v={fmtCcy(covenant.revenue as number | undefined)} mono />
              {!!covenant.summary && (
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 10, lineHeight: 1.5 }}>
                  {covenant.summary as string}
                </div>
              )}
              <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>Source: covenant proxy</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
              No tenant identified for this property. Covenant analysis requires a named tenant in the listing.
            </div>
          )}
        </div>
      </div>

      {officers && officers.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Officers & directors</div>
          <table className={s.tbl}>
            <thead><tr><th>Name</th><th>Role</th><th>Appointed</th></tr></thead>
            <tbody>
              {officers.slice(0, 20).map((o, i) => (
                <tr key={i}>
                  <td>{o.name}</td>
                  <td>{o.position}</td>
                  <td className={s.mono}>{o.appointedOn ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>Source: Companies House officers API</div>
        </div>
      )}

      {chDirCharges && chDirCharges.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>
            Charges register{chargesTotal ? ` (${chargesTotal} total)` : ""}
          </div>
          <table className={s.tbl}>
            <thead><tr><th>#</th><th>Class</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {chDirCharges.slice(0, 20).map((c, i) => (
                <tr key={i}>
                  <td className={s.mono}>{(c.chargeNumber as number | undefined) ?? "—"}</td>
                  <td>{(c.classOfCharge as string) ?? (c.description as string) ?? "—"}</td>
                  <td>
                    <span style={{ color: (c.status as string) === "outstanding" ? "var(--amb)" : "var(--grn)" }}>
                      {(c.status as string) ?? "—"}
                    </span>
                  </td>
                  <td className={s.mono}>{(c.dateCreated ?? c.dateOfCreation) as string ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>Source: Companies House charges API</div>
        </div>
      )}

      {insolvencyCases && insolvencyCases.length > 0 && (
        <div className={s.card} style={{ borderColor: "rgba(240,96,96,.3)", background: "rgba(240,96,96,.04)" }}>
          <div className={s.cardTitle} style={{ color: "var(--red)" }}>Insolvency cases</div>
          {insolvencyCases.map((c, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < insolvencyCases.length - 1 ? "1px solid var(--s3)" : "none" }}>
              <Row l="Status" v={(c.status as string) ?? "—"} color="red" />
              {!!c.caseNumber && <Row l="Case number" v={c.caseNumber as string} mono />}
              {!!c.dateOfInsolvencyEvent && <Row l="Date" v={c.dateOfInsolvencyEvent as string} mono />}
              {!!c.notes && <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>{c.notes as string}</div>}
            </div>
          ))}
          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 8 }}>Source: Companies House insolvency API</div>
        </div>
      )}

      <div className={s.card}>
        <div className={s.cardTitle}>Other properties owned by this entity</div>
        {portfolio.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>
            {companyOwner?.companyNumber
              ? "No other CCOD records found for this company."
              : "Owner not identified — Land Registry CCOD lookup returned no match."}
          </div>
        ) : (
          <table className={s.tbl}>
            <thead><tr><th>Address</th><th>Postcode</th><th>County</th><th>Tenure</th></tr></thead>
            <tbody>
              {portfolio.slice(0, 20).map((p, i) => (
                <tr key={i}>
                  <td>{(p.address as string) ?? "—"}</td>
                  <td className={s.mono}>{(p.postcode as string) ?? "—"}</td>
                  <td>{(p.county as string) ?? "—"}</td>
                  <td>{(p.tenure as string) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

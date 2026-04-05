"use client";

/* ═══════════════════════════════════════════════════
   TitleDetailsCard — DS-T12 — matches 02-dossier-full.html
   Title number, tenure, proprietor, charges (Land Registry)
   ═══════════════════════════════════════════════════ */

export interface TitleCharge {
  priority: string;
  lender: string;
  amount: number;
  date: string;
  status: "outstanding" | "discharged" | "bridging";
}

export interface TitleDetails {
  titleNumber?: string;
  tenure?: string;
  titleClass?: string;
  registeredOwner?: string;
  registeredAddress?: string;
  dateRegistered?: string;
  pricePaid?: number;
  restrictiveCovenants?: string;
  easements?: string;
  rightsOfWay?: string;
  noticesCautions?: string;
  leasesGranted?: string;
  charges?: TitleCharge[];
}

interface TitleDetailsCardProps {
  title: TitleDetails;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--tx3, #555566)", flexShrink: 0, marginRight: 8 }}>{label}</span>
      <span style={{ color: green ? "var(--grn)" : "var(--tx)", fontFamily: "'DM Sans', sans-serif", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function TitleDetailsCard({ title: t }: TitleDetailsCardProps) {
  if (!t.titleNumber && !t.tenure && !t.registeredOwner) {
    return (
      <div style={{ padding: 10, background: "var(--s2)", borderRadius: 6, border: "1px dashed var(--s3)", fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
        No title information available
      </div>
    );
  }

  const chargeStatusLabel = (s: TitleCharge["status"]) =>
    s === "outstanding" ? "Outstanding" : s === "discharged" ? "Discharged" : "Outstanding (bridging)";
  const chargeStatusColor = (s: TitleCharge["status"]) =>
    s === "discharged" ? "var(--grn)" : s === "bridging" ? "var(--red)" : "var(--amb)";

  return (
    <div>
      {t.titleNumber    && <Row label="Title number"      value={t.titleNumber} />}
      {t.tenure         && <Row label="Tenure"            value={t.tenure} />}
      {t.titleClass     && <Row label="Title class"       value={t.titleClass} green={t.titleClass.toLowerCase().includes("absolute")} />}
      {t.registeredOwner   && <Row label="Registered owner"   value={t.registeredOwner} />}
      {t.registeredAddress && <Row label="Registered address" value={t.registeredAddress} />}
      {t.dateRegistered    && <Row label="Date registered"    value={t.dateRegistered} />}
      {t.pricePaid != null && <Row label="Price paid"         value={fmt(t.pricePaid)} />}

      {(t.restrictiveCovenants || t.easements || t.rightsOfWay || t.noticesCautions || t.leasesGranted) && (
        <>
          <div style={{ borderTop: "1px solid var(--s3, #1f1f2c)", margin: "8px 0" }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx2)", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Encumbrances</div>
          {t.restrictiveCovenants && <Row label="Restrictive covenants" value={t.restrictiveCovenants} />}
          {t.easements            && <Row label="Easements"             value={t.easements} />}
          {t.rightsOfWay          && <Row label="Rights of way"         value={t.rightsOfWay} green={t.rightsOfWay.toLowerCase().includes("none")} />}
          {t.noticesCautions      && <Row label="Notices / cautions"    value={t.noticesCautions} green={t.noticesCautions.toLowerCase().includes("none")} />}
          {t.leasesGranted        && <Row label="Leases granted"        value={t.leasesGranted} green={t.leasesGranted.toLowerCase().includes("none")} />}
        </>
      )}

      {t.charges && t.charges.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--s3, #1f1f2c)", margin: "8px 0" }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx2)", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
            Charges register
          </div>
          {t.charges.map((charge, i) => (
            <div key={i} style={{ padding: "8px", background: "var(--s2)", borderRadius: 6, marginBottom: 6 }}>
              <Row label={`${charge.priority} charge`} value={`${charge.lender} — ${fmt(charge.amount)}`} />
              <Row label="Date" value={charge.date} />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                <span style={{ color: "var(--tx3)" }}>Status</span>
                <span style={{ color: chargeStatusColor(charge.status), fontWeight: 600, fontSize: 10 }}>{chargeStatusLabel(charge.status)}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

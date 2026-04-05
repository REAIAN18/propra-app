"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

interface LettingDetail {
  id: string;
  assetName: string;
  unitRef: string | null;
  status: string;
  askingRent: number;
  agreedRent: number | null;
  leaseTermYears: number | null;
  agreedTermYears: number | null;
  useClass: string | null;
  notes: string | null;
  daysListed: number;
  createdAt: string;
}

interface Enquiry {
  id: string;
  companyName: string;
  covenantGrade: string | null;
  createdAt: string;
  status: string;
}

function fmt(v: number, sym = "$") {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function statusStyle(status: string): { bg: string; color: string; border: string; label: string } {
  switch (status) {
    case "viewing": return { bg: "var(--acc-lt)", color: "var(--acc)", border: "var(--acc-bdr)", label: "VIEWING" };
    case "under_offer": return { bg: "var(--amb-lt)", color: "var(--amb)", border: "var(--amb-bdr)", label: "UNDER OFFER" };
    case "let": return { bg: "var(--grn-lt)", color: "var(--grn)", border: "var(--grn-bdr)", label: "LET" };
    case "withdrawn": return { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)", label: "WITHDRAWN" };
    default: return { bg: "var(--s3)", color: "var(--tx3)", border: "var(--bdr)", label: "ENQUIRY" };
  }
}

function covenantStyle(grade: string | null): { color: string; label: string } {
  switch (grade) {
    case "strong": return { color: "var(--grn)", label: "Grade A" };
    case "satisfactory": return { color: "var(--amb)", label: "Grade B" };
    case "weak": return { color: "var(--red)", label: "Grade C" };
    default: return { color: "var(--tx3)", label: "Ungraded" };
  }
}

export default function LettingDetailPage() {
  const params = useParams();
  const lettingId = params.id as string;
  const [letting, setLetting] = useState<LettingDetail | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/lettings/${lettingId}`)
      .then((r) => r.json())
      .then((data) => {
        setLetting(data.letting ?? null);
        setEnquiries(data.enquiries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lettingId]);

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Letting" />
        <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 80px" }}>
          <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Loading...</div>
        </main>
      </AppShell>
    );
  }

  if (!letting) {
    return (
      <AppShell>
        <TopBar title="Letting" />
        <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 80px" }}>
          <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>Letting not found.</div>
          <Link href="/tenants" style={{ color: "var(--acc)", textDecoration: "none", font: "500 12px var(--sans)" }}>← Back to Tenants</Link>
        </main>
      </AppShell>
    );
  }

  const voidCostPerMonth = Math.round(letting.askingRent / 12);

  return (
    <AppShell>
      <TopBar title={`Letting — ${letting.unitRef ?? letting.assetName}`} />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 16, font: "400 11px var(--sans)", color: "var(--tx3)" }}>
          <Link href="/tenants" style={{ color: "var(--tx3)", textDecoration: "none" }}>Tenants</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "var(--tx)" }}>{letting.unitRef ?? letting.assetName}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 400, color: "var(--tx)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {letting.unitRef ? `${letting.unitRef} — ${letting.assetName}` : letting.assetName}
          </h1>
          <p style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
            Vacancy management · {letting.useClass ?? "Commercial"} · Listed {letting.daysListed} days ago
          </p>
        </div>

        {/* KPI Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--bdr)",
          border: "1px solid var(--bdr)",
          borderRadius: "var(--r)",
          overflow: "hidden",
          marginBottom: 24,
        }}>
          {[
            { label: "Days Listed", value: letting.daysListed.toString(), sub: "since activation" },
            { label: "Enquiries", value: enquiries.length.toString(), sub: "received" },
            { label: "Asking Rent", value: fmt(letting.askingRent), sub: "per year" },
            { label: "Void Cost", value: fmt(voidCostPerMonth), sub: "per month at 0% occupancy" },
          ].map((kpi, i) => (
            <div key={i} style={{ background: "var(--s1)", padding: "14px 16px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                {kpi.label}
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: 3 }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Enquiries */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
            Enquiries ({enquiries.length})
          </div>
          {enquiries.length === 0 ? (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", padding: "32px 24px", textAlign: "center" }}>
              <div style={{ font: "400 13px var(--sans)", color: "var(--tx3)", marginBottom: 6 }}>No enquiries yet</div>
              <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>
                Share the listing to attract prospective tenants
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden" }}>
              {enquiries.map((enq, i) => {
                const ss = statusStyle(enq.status);
                const cs = covenantStyle(enq.covenantGrade);
                const isLast = i === enquiries.length - 1;
                return (
                  <div key={enq.id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: isLast ? "none" : "1px solid var(--bdr-lt)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "600 13px var(--sans)", color: "var(--tx)", marginBottom: 2 }}>{enq.companyName}</div>
                      <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)" }}>
                        {new Date(enq.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {enq.covenantGrade && (
                          <span style={{ marginLeft: 8, color: cs.color }}>{cs.label} covenant</span>
                        )}
                      </div>
                    </div>
                    <span style={{ font: "500 8px/1 var(--mono)", padding: "3px 8px", borderRadius: 5, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      {ss.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Listing Details */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", font: "500 9px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "2px" }}>
            Listing Details
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            {[
              { label: "Asking Rent", value: `${fmt(letting.askingRent)}/yr` },
              { label: "Lease Term", value: letting.leaseTermYears ? `${letting.leaseTermYears} years` : "Negotiable" },
              { label: "Use Class", value: letting.useClass ?? "Commercial" },
              { label: "Status", value: letting.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
              { label: "Listed", value: new Date(letting.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
              ...(letting.notes ? [{ label: "Notes", value: letting.notes }] : []),
            ].map((row, i) => (
              <div key={i}>
                <div style={{ font: "500 9px var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2 }}>{row.label}</div>
                <div style={{ font: "400 12px var(--sans)", color: "var(--tx)" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`/api/user/lettings/${lettingId}/hot`}
            style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 16px", background: "var(--acc)", color: "#fff", borderRadius: 8, font: "600 12px/1 var(--sans)", textDecoration: "none" }}
          >
            Generate HoTs →
          </a>
          <Link
            href="/tenants"
            style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", background: "transparent", color: "var(--tx3)", border: "1px solid var(--bdr)", borderRadius: 8, font: "500 12px/1 var(--sans)", textDecoration: "none" }}
          >
            ← Back to Tenants
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

type ComplianceSummary = {
  hasCerts: boolean;
  fineExposure: number;
  expired: number;
  expiringSoon: number;
  compliant: number;
  total: number;
  certs: {
    id: string;
    certType: string;
    propertyAddress: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    daysToExpiry: number | null;
    status: string;
    fineExposure: number;
    filename: string;
  }[];
};

type ComplianceAsset = {
  assetId: string;
  assetName: string;
  urgentCount: number;
  missingCount: number;
  certificates: {
    id: string | null;
    type: string;
    status: "missing" | "valid" | "expiring" | "expired" | "renewal_requested";
    expiryDate: string | null;
    daysToExpiry: number | null;
    documentId: string | null;
    renewalRequestedAt: string | null;
  }[];
};

type ComplianceData = {
  assets: ComplianceAsset[];
  totalUrgent: number;
  nextExpiry: string | null;
};

const CERT_TYPE_LABELS: Record<string, string> = {
  epc: "EPC Certificate",
  fire_risk: "Fire Risk Assessment",
  gas_safe: "Gas Safety (CP12)",
  eicr: "EICR (Electrical)",
  asbestos: "Asbestos Survey",
  legionella: "Legionella Risk",
  insurance: "Insurance Certificate",
};

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

export default function CompliancePage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/compliance-summary").then((r) => r.json()),
      fetch("/api/user/compliance").then((r) => r.json()),
    ])
      .then(([summaryData, complianceData]) => {
        setSummary(summaryData);
        setComplianceData(complianceData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCerts = summary?.total ?? 0;
  const compliantCerts = summary?.compliant ?? 0;
  const expiringSoon = summary?.expiringSoon ?? 0;
  const expired = summary?.expired ?? 0;
  const fineExposure = summary?.fineExposure ?? 0;

  // Build certificate matrix rows
  const matrixRows: { assetName: string; certs: Map<string, ComplianceAsset["certificates"][0]> }[] = [];
  if (complianceData) {
    complianceData.assets.forEach((asset) => {
      const certMap = new Map<string, ComplianceAsset["certificates"][0]>();
      asset.certificates.forEach((cert) => {
        certMap.set(cert.type, cert);
      });
      matrixRows.push({ assetName: asset.assetName, certs: certMap });
    });
  }

  const certTypes = ["epc", "fire_risk", "gas_safe", "eicr", "legionella", "asbestos", "insurance"];

  return (
    <AppShell>
      <TopBar title="Compliance" />

      <main className="flex-1 overflow-y-auto" style={{ padding: "28px 32px 80px" }}>
        <div style={{ maxWidth: "1080px" }}>

          {/* Page Header */}
          <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: 400, color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "4px" }}>
                Compliance
              </h1>
              <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)" }}>
                Track certificates, avoid fines, stay ahead of renewals across your portfolio.
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "1px",
            background: "var(--bdr)",
            border: "1px solid var(--bdr)",
            borderRadius: "var(--r)",
            overflow: "hidden",
            marginBottom: "24px"
          }}>
            <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--s1)"}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Total Certificates
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--tx)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {totalCerts}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                across {complianceData?.assets.length ?? 0} properties
              </div>
            </div>

            <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--s1)"}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Compliant
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--grn)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {compliantCerts}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--grn)" }}>{totalCerts > 0 ? Math.round((compliantCerts / totalCerts) * 100) : 0}%</span> of portfolio
              </div>
            </div>

            <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--s1)"}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Expiring Soon
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--amb)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {expiringSoon}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--amb)" }}>within 90 days</span>
              </div>
            </div>

            <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--s1)"}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Expired
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {expired}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                <span style={{ color: "var(--red)" }}>action required</span>
              </div>
            </div>

            <div style={{ background: "var(--s1)", padding: "14px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--s2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--s1)"}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                Fine Exposure
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--red)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {formatCurrency(fineExposure)}
              </div>
              <div style={{ font: "400 10px var(--sans)", color: "var(--tx3)", marginTop: "3px" }}>
                {expired > 0 && <span style={{ color: "var(--red)" }}>↑ {expired} expired cert{expired === 1 ? "" : "s"}</span>}
              </div>
            </div>
          </div>

          {/* Fine Exposure Alert */}
          {fineExposure > 0 && (
            <div style={{
              background: "var(--s1)",
              border: "1px solid var(--red-bdr)",
              borderRadius: "var(--r)",
              padding: "22px 24px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "24px",
              alignItems: "center"
            }}>
              <div>
                <div style={{ font: "500 9px/1 var(--mono)", color: "var(--red)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  Compliance Risk
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "18px", fontWeight: 400, color: "var(--tx)", marginBottom: "3px" }}>
                  {expired} expired certificate{expired === 1 ? "" : "s"} — {formatCurrency(fineExposure)} in fine exposure and growing.
                </div>
                <div style={{ fontSize: "12px", color: "var(--tx3)", lineHeight: 1.6, maxWidth: "480px" }}>
                  Renew immediately to stop accruing fines and maintain compliance across your portfolio.
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "32px", fontWeight: 400, color: "var(--red)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {formatCurrency(fineExposure)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>
                  total exposure
                </div>
              </div>
            </div>
          )}

          {/* Certificate Matrix */}
          {loading ? (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", padding: "40px", textAlign: "center" }}>
              <div style={{ color: "var(--tx3)" }}>Loading compliance data...</div>
            </div>
          ) : matrixRows.length > 0 ? (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>Certificate Status Matrix</h4>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--bdr)", position: "sticky", top: 0, background: "var(--s1)" }}>
                        Property
                      </th>
                      {certTypes.map((type) => (
                        <th key={type} style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--bdr)", position: "sticky", top: 0, background: "var(--s1)" }}>
                          {type.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row, idx) => (
                      <tr key={idx} style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => {
                          const cells = e.currentTarget.querySelectorAll("td");
                          cells.forEach((cell) => (cell as HTMLElement).style.background = "var(--s2)");
                        }}
                        onMouseLeave={(e) => {
                          const cells = e.currentTarget.querySelectorAll("td");
                          cells.forEach((cell) => (cell as HTMLElement).style.background = "transparent");
                        }}>
                        <td style={{ padding: "10px 12px", borderBottom: idx === matrixRows.length - 1 ? "none" : "1px solid var(--bdr-lt)", font: "400 12px var(--sans)", color: "var(--tx)", verticalAlign: "middle" }}>
                          {row.assetName}
                        </td>
                        {certTypes.map((type) => {
                          const cert = row.certs.get(type);
                          const status = cert?.status ?? "missing";
                          const daysToExpiry = cert?.daysToExpiry;

                          let badgeStyle = {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            font: "500 9px/1 var(--mono)",
                            letterSpacing: "0.3px",
                          };

                          let statusStyle = {};
                          let statusText = "";
                          let showDot = false;
                          let dotPulse = false;

                          if (status === "missing") {
                            statusStyle = { background: "var(--s3)", color: "var(--tx3)", border: "1px dashed var(--bdr)" };
                            statusText = "Missing";
                          } else if (status === "expired") {
                            statusStyle = { background: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)" };
                            statusText = "Expired";
                            showDot = true;
                            dotPulse = true;
                          } else if (status === "expiring") {
                            statusStyle = { background: "var(--amb-lt)", color: "var(--amb)", border: "1px solid var(--amb-bdr)" };
                            statusText = daysToExpiry !== null ? `${daysToExpiry}d` : "Expiring";
                            showDot = true;
                          } else if (status === "valid") {
                            statusStyle = { background: "var(--grn-lt)", color: "var(--grn)", border: "1px solid var(--grn-bdr)" };
                            statusText = "Valid";
                            showDot = true;
                          } else if (status === "renewal_requested") {
                            statusStyle = { background: "var(--acc-lt)", color: "var(--acc)", border: "1px solid var(--acc-bdr)" };
                            statusText = "Renewal";
                            showDot = true;
                          }

                          return (
                            <td key={type} style={{ padding: "10px 12px", borderBottom: idx === matrixRows.length - 1 ? "none" : "1px solid var(--bdr-lt)", font: "400 12px var(--sans)", color: "var(--tx)", verticalAlign: "middle" }}>
                              <div style={{ ...badgeStyle, ...statusStyle }}>
                                {showDot && (
                                  <div style={{
                                    width: "5px",
                                    height: "5px",
                                    borderRadius: "50%",
                                    background: "currentColor",
                                    animation: dotPulse ? "pulse 2s ease infinite" : "none"
                                  }} />
                                )}
                                {statusText}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "var(--r)", padding: "40px", textAlign: "center" }}>
              <div style={{ color: "var(--tx3)" }}>No properties found. Add a property to start tracking compliance.</div>
            </div>
          )}

        </div>
      </main>
    </AppShell>
  );
}

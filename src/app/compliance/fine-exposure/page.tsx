"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

type RiskCert = {
  id: string | null;
  type: string;
  status: string;
  assetId: string;
  assetName: string;
  expiryDate: string | null;
  daysToExpiry: number | null;
  fineExposure: number;
  dailyFine: number;
};

const CERT_TYPE_LABELS: Record<string, string> = {
  epc: "EPC Certificate",
  fire_risk: "Fire Risk Assessment",
  fire_inspection: "Fire Inspection",
  gas_safe: "Gas Safety (CP12)",
  eicr: "EICR (Electrical)",
  asbestos: "Asbestos Survey",
  legionella: "Legionella Assessment",
  insurance: "Insurance Certificate",
  elevator: "Elevator Inspection",
  environmental: "Environmental Assessment",
  ada: "ADA Compliance",
  roof_cert: "Roof Certification",
};

export default function FineExposurePage() {
  const router = useRouter();
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const [riskCerts, setRiskCerts] = useState<RiskCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingAll, setRenewingAll] = useState(false);

  useEffect(() => {
    fetch("/api/user/compliance")
      .then((r) => r.json())
      .then((data) => {
        const risks: RiskCert[] = [];

        for (const asset of data.assets) {
          for (const cert of asset.certificates) {
            const dailyFine = getDailyFine(cert.type);
            const fineExposure = calculateFineExposure(cert.status, cert.daysToExpiry, dailyFine);

            // Include expired, expiring (<90 days), and missing certs
            if (
              cert.status === "expired" ||
              cert.status === "missing" ||
              (cert.status === "expiring" && cert.daysToExpiry !== null && cert.daysToExpiry <= 90)
            ) {
              risks.push({
                id: cert.id,
                type: cert.type,
                status: cert.status,
                assetId: asset.assetId,
                assetName: asset.assetName,
                expiryDate: cert.expiryDate,
                daysToExpiry: cert.daysToExpiry,
                fineExposure,
                dailyFine,
              });
            }
          }
        }

        // Sort: expired first, then by fine exposure descending
        risks.sort((a, b) => {
          if (a.status === "expired" && b.status !== "expired") return -1;
          if (a.status !== "expired" && b.status === "expired") return 1;
          return b.fineExposure - a.fineExposure;
        });

        setRiskCerts(risks);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Fine Exposure — RealHQ";
    }
  }, []);

  function getDailyFine(certType: string): number {
    const FINE_PER_TYPE: Record<string, number> = {
      fire_cert: 150,
      fire_risk: 150,
      fire_inspection: 150,
      epc: 167,
      eicr: 67,
      gas_safe: 33,
      asbestos: 100,
      legionella: 83,
      elevator: 50,
      environmental: 100,
      ada: 75,
      roof_cert: 50,
    };
    return FINE_PER_TYPE[certType] ?? 33;
  }

  function calculateFineExposure(status: string, daysToExpiry: number | null, dailyFine: number): number {
    if (status === "expired" && daysToExpiry !== null) {
      return dailyFine * Math.abs(daysToExpiry);
    }
    if (status === "expiring" && daysToExpiry !== null && daysToExpiry <= 30) {
      return dailyFine * 30;
    }
    if (status === "missing") {
      return dailyFine * 30; // Potential 30-day fine if caught
    }
    return 0;
  }

  const totalFineExposure = riskCerts.reduce((sum, cert) => sum + cert.fineExposure, 0);
  const expiredCerts = riskCerts.filter((c) => c.status === "expired");

  async function handleRenewAll() {
    if (renewingAll || expiredCerts.length === 0) return;

    setRenewingAll(true);
    try {
      // Send renewal requests for all expired certificates
      await Promise.all(
        expiredCerts
          .filter((cert) => cert.id) // Only renew certs that exist (not missing)
          .map((cert) =>
            fetch("/api/user/compliance/renew", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                certId: cert.id,
                certType: CERT_TYPE_LABELS[cert.type] ?? cert.type,
                assetName: cert.assetName,
                assetLocation: cert.assetName,
                expiryDate: cert.expiryDate,
                daysToExpiry: cert.daysToExpiry,
                fineExposure: cert.fineExposure,
                action: "renew_now",
              }),
            })
          )
      );

      // Redirect to compliance page after batch renewal
      router.push("/compliance");
    } catch (error) {
      console.error("Failed to renew certificates:", error);
    } finally {
      setRenewingAll(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <div className="flow-page">
          <p style={{ color: "var(--tx3)", textAlign: "center" }}>Loading fine exposure details...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar />
      <div className="flow-page">
        <div className="flow-label a1">Flow 3 — Fine exposure detail</div>
        <div className="flow-h a1">Fine Exposure — Action Plan</div>
        <div className="flow-sub a2">
          Your portfolio has {sym}{totalFineExposure.toLocaleString()} in compliance fine exposure. Here's the
          breakdown and how to fix it.
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "var(--red-lt)",
            border: "1px solid var(--red-bdr)",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="a2"
        >
          <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>Total fine exposure</div>
          <div
            style={{ fontFamily: "var(--serif)", fontSize: "28px", color: "var(--red)", letterSpacing: "-.02em" }}
          >
            {sym}{totalFineExposure.toLocaleString()}
          </div>
        </div>

        <div className="card a3">
          <div className="card-hd">
            <h4>Breakdown by Certificate</h4>
          </div>

          {riskCerts.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--tx3)" }}>
              No compliance risks found. All certificates are compliant!
            </div>
          ) : (
            riskCerts.map((cert) => {
              const certLabel = CERT_TYPE_LABELS[cert.type] ?? cert.type;
              const statusLabel =
                cert.status === "expired"
                  ? "EXPIRED"
                  : cert.status === "missing"
                  ? "MISSING"
                  : cert.daysToExpiry !== null
                  ? `${cert.daysToExpiry} DAYS`
                  : "EXPIRING";

              const statusClass =
                cert.status === "expired"
                  ? "danger"
                  : cert.status === "missing"
                  ? "missing"
                  : "warn";

              return (
                <div key={`${cert.assetId}-${cert.type}`} className="row row-4">
                  <div>
                    <div className="row-name">
                      {certLabel} — {cert.assetName}
                    </div>
                    <div className="row-sub">
                      {cert.status === "expired" && cert.daysToExpiry !== null
                        ? `Expired ${Math.abs(cert.daysToExpiry)} days · ${sym}${cert.dailyFine}/day · Growing`
                        : cert.status === "missing"
                        ? `Missing · Required for property`
                        : cert.daysToExpiry !== null
                        ? `Expires in ${cert.daysToExpiry} days · ${sym}${cert.dailyFine}/day if missed`
                        : "Expiring soon"}
                    </div>
                  </div>
                  <span className={`row-tag ${statusClass}`}>{statusLabel}</span>
                  <span className="row-val" style={{ color: cert.status === "expired" ? "var(--red)" : "var(--amb)" }}>
                    {cert.fineExposure > 0 ? `${sym}${cert.fineExposure.toLocaleString()}` : `${sym}${cert.dailyFine} risk`}
                  </span>
                  {cert.id ? (
                    <button
                      className="cert-action renew"
                      onClick={() => router.push(`/compliance/renew/${cert.id}`)}
                    >
                      {cert.status === "expired" ? "Renew →" : "Schedule →"}
                    </button>
                  ) : (
                    <button
                      className="cert-action upload"
                      onClick={() => router.push("/compliance")}
                    >
                      Upload →
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {expiredCerts.length > 0 && (
          <button
            className="btn-primary red a4"
            onClick={handleRenewAll}
            disabled={renewingAll}
          >
            {renewingAll ? "Processing..." : `Renew all ${expiredCerts.length} expired certificate${expiredCerts.length > 1 ? "s" : ""} now`}
          </button>
        )}

        <button className="btn-secondary a4" onClick={() => router.push("/compliance")}>
          ← Back to compliance
        </button>
      </div>
    </AppShell>
  );
}

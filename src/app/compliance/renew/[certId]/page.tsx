"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

type CertificateDetail = {
  id: string;
  type: string;
  status: string;
  assetId: string;
  assetName: string;
  expiryDate: string | null;
  issuedDate: string | null;
  issuedBy: string | null;
  referenceNo: string | null;
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

export default function RenewCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const sym = portfolio.currency === "USD" ? "$" : "£";

  const certId = Array.isArray(params.certId) ? params.certId[0] : params.certId;

  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!certId) return;

    // Fetch certificate details
    fetch(`/api/user/compliance`)
      .then((r) => r.json())
      .then((data) => {
        // Find the certificate across all assets
        for (const asset of data.assets) {
          const found = asset.certificates.find((c: { id: string | null }) => c.id === certId);
          if (found) {
            // Calculate fine exposure
            const dailyFine = getDailyFine(found.type);
            const fineExposure = calculateFineExposure(found.status, found.daysToExpiry, dailyFine);

            setCert({
              id: found.id,
              type: found.type,
              status: found.status,
              assetId: asset.assetId,
              assetName: asset.assetName,
              expiryDate: found.expiryDate,
              issuedDate: null, // Not available in this API
              issuedBy: null,
              referenceNo: null,
              daysToExpiry: found.daysToExpiry,
              fineExposure,
              dailyFine,
            });
            setLoading(false);
            return;
          }
        }
        // Certificate not found
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [certId]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Renew Certificate — RealHQ";
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
    return 0;
  }

  async function handleRenew() {
    if (!cert || renewing) return;

    setRenewing(true);
    try {
      const response = await fetch("/api/user/compliance/renew", {
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
          action: cert.status === "expired" ? "renew_now" : "schedule_renewal",
          renewalNotes: notes || null,
        }),
      });

      if (response.ok) {
        // Redirect to success page
        router.push(`/compliance/renew/${certId}/success?certType=${encodeURIComponent(CERT_TYPE_LABELS[cert.type] ?? cert.type)}&assetName=${encodeURIComponent(cert.assetName)}`);
      }
    } catch (error) {
      console.error("Failed to renew certificate:", error);
    } finally {
      setRenewing(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <div className="flow-page">
          <p style={{ color: "var(--tx3)", textAlign: "center" }}>Loading certificate details...</p>
        </div>
      </AppShell>
    );
  }

  if (!cert) {
    return (
      <AppShell>
        <TopBar />
        <div className="flow-page">
          <p style={{ color: "var(--red)", textAlign: "center" }}>Certificate not found</p>
          <button
            className="btn-secondary"
            onClick={() => router.push("/compliance")}
            style={{ marginTop: "16px" }}
          >
            ← Back to compliance
          </button>
        </div>
      </AppShell>
    );
  }

  const isExpired = cert.status === "expired";
  const certLabel = CERT_TYPE_LABELS[cert.type] ?? cert.type;
  const expiryDateFormatted = cert.expiryDate
    ? new Date(cert.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Unknown";

  return (
    <AppShell>
      <TopBar />
      <div className="flow-page">
        <div className="flow-label a1">
          {isExpired ? "Flow 1a — Renew certificate (expired, urgent)" : "Flow 1 — Schedule renewal"}
        </div>

        <div style={{ textAlign: "center" }} className="a1">
          <div className={isExpired ? "confirm-icon warn" : "confirm-icon green"}>
            {isExpired ? "🔥" : "📅"}
          </div>
        </div>

        <div className="flow-h a1" style={{ textAlign: "center" }}>
          Renew {certLabel}
        </div>

        <div className="flow-sub a2" style={{ textAlign: "center" }}>
          {isExpired && cert.fineExposure > 0
            ? `${cert.assetName} — expired ${Math.abs(cert.daysToExpiry ?? 0)} days ago. Fine exposure: ${sym}${cert.fineExposure.toLocaleString()} and growing at ${sym}${cert.dailyFine}/day.`
            : cert.daysToExpiry !== null
            ? `${cert.assetName} — expires in ${cert.daysToExpiry} days.`
            : cert.assetName
          }
        </div>

        <div className="card a2">
          <div className="card-hd">
            <h4>Certificate Details</h4>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Certificate type</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{certLabel}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Property</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{cert.assetName}</div>
          </div>
          {cert.issuedDate && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Last issued</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
                {new Date(cert.issuedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          )}
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">{isExpired ? "Expired" : "Expiry"}</div>
            <div style={{ font: "600 12px var(--sans)", color: isExpired ? "var(--red)" : "var(--amb)" }}>
              {expiryDateFormatted}
              {cert.daysToExpiry !== null && ` (${isExpired ? Math.abs(cert.daysToExpiry) + " days ago" : cert.daysToExpiry + " days"})`}
            </div>
          </div>
          {cert.fineExposure > 0 && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Fine exposure</div>
              <div style={{ font: "600 12px var(--sans)", color: "var(--red)" }}>
                {sym}{cert.fineExposure.toLocaleString()} ({sym}{cert.dailyFine}/day)
              </div>
            </div>
          )}
          {cert.issuedBy && (
            <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="row-name">Previous assessor</div>
              <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>{cert.issuedBy}</div>
            </div>
          )}
        </div>

        <div className="card a3">
          <div className="card-hd">
            <h4>What happens next</h4>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">RealHQ contacts a certified assessor</div>
            <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>Today</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Assessor schedules site visit</div>
            <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>Within 3 days</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Assessment completed and certificate issued</div>
            <div style={{ font: "400 12px var(--sans)", color: "var(--tx2)" }}>Within 1 week</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Certificate uploaded to RealHQ automatically</div>
            <div style={{ font: "400 12px var(--sans)", color: "var(--grn)" }}>Automatic</div>
          </div>
        </div>

        <div className="adjust-field a3">
          <label className="adjust-label">Notes for the assessor (optional)</label>
          <input
            className="adjust-input"
            type="text"
            placeholder="e.g. Contact building manager on 555-0123, access via rear entrance"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          className={`btn-primary ${isExpired ? "red" : "purple"} a4`}
          onClick={handleRenew}
          disabled={renewing}
        >
          {renewing ? "Processing..." : isExpired ? "🔥 Renew now — stop fines accruing" : "📅 Schedule renewal"}
        </button>

        <button
          className="btn-secondary a4"
          onClick={() => router.push("/compliance")}
        >
          ← Back to compliance
        </button>

        <div className="fine-print a4">
          RealHQ coordinates the renewal. You&apos;ll be notified when the assessor is booked and when the new certificate is ready.
        </div>
      </div>
    </AppShell>
  );
}

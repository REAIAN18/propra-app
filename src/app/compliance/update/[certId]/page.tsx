"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

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

export default function UpdateCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certId = Array.isArray(params.certId) ? params.certId[0] : params.certId;

  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form fields
  const [expiryDate, setExpiryDate] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [referenceNo, setReferenceNo] = useState("");

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
            setCert({
              id: found.id,
              type: found.type,
              status: found.status,
              assetId: asset.assetId,
              assetName: asset.assetName,
              expiryDate: found.expiryDate,
              issuedDate: null,
              issuedBy: null,
              referenceNo: null,
            });

            // Pre-fill expiry date if available
            if (found.expiryDate) {
              setExpiryDate(found.expiryDate.split("T")[0]);
            }

            setLoading(false);
            return;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [certId]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Update Certificate — RealHQ";
    }
  }, []);

  async function handleUpdate() {
    if (!cert || updating) return;

    // Validation
    if (!expiryDate) {
      alert("Please enter an expiry date");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/user/compliance/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "valid",
          expiryDate,
          issuedBy: issuedBy || null,
          referenceNo: referenceNo || null,
          issuedDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Redirect back to compliance page
        router.push("/compliance");
      } else {
        alert("Failed to update certificate. Please try again.");
      }
    } catch (error) {
      console.error("Failed to update certificate:", error);
      alert("Failed to update certificate. Please try again.");
    } finally {
      setUpdating(false);
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

  const certLabel = CERT_TYPE_LABELS[cert.type] ?? cert.type;

  return (
    <AppShell>
      <TopBar />
      <div className="flow-page">
        <div className="flow-label a1">Flow 4 — Mark as renewed (manual)</div>
        <div className="flow-h a1" style={{ textAlign: "center" }}>
          Update certificate details
        </div>
        <div className="flow-sub a2" style={{ textAlign: "center" }}>
          Already have the renewed certificate? Enter the details and upload the document.
        </div>

        <div className="a2">
          <div className="adjust-field">
            <label className="adjust-label">Certificate type</label>
            <input
              className="adjust-input"
              type="text"
              value={certLabel}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Property</label>
            <input
              className="adjust-input"
              type="text"
              value={cert.assetName}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">New expiry date *</label>
            <input
              className="adjust-input"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Issued by</label>
            <input
              className="adjust-input"
              type="text"
              placeholder="e.g. FL Fire Safety Inc."
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Reference number</label>
            <input
              className="adjust-input"
              type="text"
              placeholder="e.g. FRA-2026-TB-4801"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Upload certificate document (optional)</label>
            <div
              className="upload-zone"
              style={{ margin: 0, padding: "20px", cursor: "not-allowed", opacity: 0.5 }}
              title="Document upload coming soon"
            >
              <div className="upload-icon" style={{ fontSize: "18px" }}>
                📄
              </div>
              <div className="upload-text" style={{ fontSize: "12px" }}>
                Drop certificate here or click to browse
              </div>
              <div className="upload-hint">
                If uploaded, RealHQ will extract and verify the details above
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn-primary a3"
          onClick={handleUpdate}
          disabled={updating || !expiryDate}
        >
          {updating ? "Updating..." : "✓ Update certificate"}
        </button>

        <button className="btn-secondary a3" onClick={() => router.push("/compliance")}>
          ← Back to compliance
        </button>
      </div>
    </AppShell>
  );
}

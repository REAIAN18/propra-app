"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

export default function RenewSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certType = searchParams.get("certType") ?? "Certificate";
  const assetName = searchParams.get("assetName") ?? "property";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Renewal Requested — RealHQ";
    }
  }, []);

  return (
    <AppShell>
      <TopBar />
      <div className="flow-page">
        <div className="flow-label a1">Flow 1b — Renewal requested (success)</div>

        <div className="success-icon a1">✓</div>
        <div className="success-h a1">Renewal requested</div>
        <div className="success-sub a2">
          {certType} renewal for {assetName} is now in progress. RealHQ will coordinate everything.
        </div>

        <div className="next-steps a3">
          <div className="next-step">
            <div className="next-num done">✓</div>
            <div className="next-info">
              <div className="next-name">Renewal request submitted</div>
              <div className="next-detail">RealHQ operations team notified</div>
            </div>
          </div>
          <div className="next-step">
            <div className="next-num">2</div>
            <div className="next-info">
              <div className="next-name">Assessor will contact you to schedule</div>
              <div className="next-detail">Expect contact within 1 business day</div>
            </div>
          </div>
          <div className="next-step">
            <div className="next-num">3</div>
            <div className="next-info">
              <div className="next-name">Site visit and assessment</div>
              <div className="next-detail">Typically 1–2 hours on site</div>
            </div>
          </div>
          <div className="next-step">
            <div className="next-num">4</div>
            <div className="next-info">
              <div className="next-name">New certificate issued and uploaded</div>
              <div className="next-detail">ComplianceCertificate record updated automatically</div>
              <div className="next-action" style={{ cursor: "pointer" }}>
                Set reminder to check in 5 days →
              </div>
            </div>
          </div>
        </div>

        <div className="btn-row a4">
          <button
            className="btn-primary purple"
            style={{ flex: 1 }}
            onClick={() => router.push("/compliance")}
          >
            Back to compliance
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1, marginTop: 0 }}
            onClick={() => router.push("/compliance")}
          >
            View all certificates
          </button>
        </div>
      </div>
    </AppShell>
  );
}

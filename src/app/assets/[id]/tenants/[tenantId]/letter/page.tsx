"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface TenantBasicInfo {
  id: string;
  name: string;
  email: string | null;
}

export default function TenantLetterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = params.id as string;
  const tenantId = params.tenantId as string;
  const initialType = searchParams.get("type") || "renewal";

  const [tenant, setTenant] = useState<TenantBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [letterType, setLetterType] = useState(initialType);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Fetch tenant info
    fetch(`/api/user/tenants/${tenantId}`)
      .then((res) => res.json())
      .then((data) => {
        setTenant({
          id: data.tenant.id,
          name: data.tenant.name,
          email: data.tenant.email,
        });
        setRecipientEmail(data.tenant.email || "");
        setLoading(false);
        // Auto-generate letter on load
        generateLetter(initialType, data.tenant.email || "");
      })
      .catch(() => {
        setLoading(false);
      });
  }, [tenantId, initialType]);

  const generateLetter = async (type: string, email?: string) => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/user/tenants/${tenantId}/letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType: type,
          recipientEmail: email || recipientEmail,
          send: false, // Just generate, don't send
        }),
      });
      const data = await response.json();
      setLetterBody(data.body || data.letterBody || "");
      setIsEditMode(false);
    } catch (error) {
      alert("Failed to generate letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setLetterType(type);
    generateLetter(type);
  };

  const handleSendLetter = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email");
      return;
    }

    setSending(true);
    try {
      await fetch(`/api/user/tenants/${tenantId}/letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType,
          recipientEmail,
          body: letterBody,
          send: true,
        }),
      });
      alert("Letter sent successfully");
      router.push(`/assets/${assetId}/tenants/${tenantId}`);
    } catch (error) {
      alert("Failed to send letter");
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = () => {
    // For now, just alert - PDF generation would need to be implemented
    alert("PDF download feature coming soon");
  };

  if (loading) {
    return (
      <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Tenant not found.
        </div>
      </div>
    );
  }

  const letterTypeLabels: Record<string, string> = {
    renewal: "Renewal discussion",
    rent_review: "Rent review",
    re_gear: "Re-gear proposal",
    break_notice: "Break notice",
    send_letter: "Payment reminder",
    formal_demand: "Formal demand",
    meeting_request: "Meeting request",
  };

  return (
    <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div className="sec a1">Generate Letter — {tenant.name}</div>

      <div className="adjust-field a1">
        <label className="adjust-label">Letter type</label>
        <div className="adjust-options">
          {Object.entries(letterTypeLabels).map(([type, label]) => (
            <div
              key={type}
              className={`adjust-chip ${letterType === type ? "on" : ""}`}
              onClick={() => handleTypeChange(type)}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="adjust-field a2">
        <label className="adjust-label">Recipient email</label>
        <input
          className="adjust-input"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="tenant@example.com"
        />
      </div>

      {/* Letter preview */}
      {generating ? (
        <div className="letter-preview a2">
          <div style={{ textAlign: "center", color: "var(--tx3)" }}>
            Generating letter...
          </div>
        </div>
      ) : (
        <>
          {isEditMode ? (
            <div className="adjust-field a2">
              <label className="adjust-label">Letter content</label>
              <textarea
                className="adjust-input"
                style={{ minHeight: "300px", resize: "vertical", fontFamily: "var(--sans)" }}
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
              />
            </div>
          ) : (
            <div className="letter-preview a2" style={{ whiteSpace: "pre-wrap" }}>
              {letterBody || "No letter generated yet"}
            </div>
          )}
        </>
      )}

      {/* Email status */}
      {tenant.email && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--grn-lt)",
            border: "1px solid var(--grn-bdr)",
            borderRadius: "8px",
            font: "400 12px var(--sans)",
            color: "var(--grn)",
            marginBottom: "16px",
          }}
          className="a3"
        >
          ✓ Tenant email on file: {tenant.email}
        </div>
      )}

      <div className="btn-row a3">
        <button
          className="btn-primary green"
          style={{ flex: 1 }}
          onClick={handleSendLetter}
          disabled={sending || !letterBody}
        >
          {sending ? "Sending..." : "Send to tenant →"}
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, marginTop: 0 }}
          onClick={handleDownloadPDF}
          disabled={!letterBody}
        >
          Download as PDF
        </button>
      </div>

      <button
        className="btn-secondary a3"
        onClick={() => setIsEditMode(!isEditMode)}
        disabled={!letterBody}
      >
        {isEditMode ? "Preview letter" : "Edit letter"}
      </button>

      <Link href={`/assets/${assetId}/tenants/${tenantId}`}>
        <button className="btn-secondary a3">← Back to tenant</button>
      </Link>

      <div className="fine-print a3">
        Creates a TenantLetter record. If sent, updates status to &quot;sent&quot; and emails via Resend.
      </div>
    </div>
  );
}

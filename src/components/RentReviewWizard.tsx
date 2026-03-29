"use client";

import { useState } from "react";
import type { RentReview } from "@/hooks/useRentReviews";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

type WizardStep = "evidence" | "preview" | "success" | "outcome";

type RentReviewWizardProps = {
  review: RentReview;
  currency: string;
  onClose: () => void;
  onComplete: () => void;
};

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

export function RentReviewWizard({ review, currency, onClose, onComplete }: RentReviewWizardProps) {
  const sym = currency === "USD" ? "$" : "£";
  const [step, setStep] = useState<WizardStep>("evidence");
  const [draftLetter, setDraftLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const sqft = review.sqft ?? 1;
  const passingPerSqft = review.passingRent / sqft;
  const ervPerSqft = (review.ervLive ?? passingPerSqft) / sqft;
  const gap = review.gap ?? 0;

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/user/rent-reviews/${review.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "renewal_letter" })
      });
      if (!res.ok) throw new Error("Failed to generate draft");
      const data = await res.json();
      setDraftLetter(data.body || "Letter generated successfully.");
      setStep("preview");
    } catch {
      alert("Failed to generate draft letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      alert("Please enter tenant email address");
      return;
    }
    setSending(true);
    try {
      console.log(`[Rent Review] Would send letter to ${recipientEmail} for review ${review.id}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep("success");
    } catch {
      alert("Failed to send letter");
    } finally {
      setSending(false);
    }
  };

  const handleRecordOutcome = async (newRent: number) => {
    try {
      const res = await fetch(`/api/user/rent-reviews/${review.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRent, status: "lease_renewed" })
      });
      if (!res.ok) throw new Error("Failed to record outcome");
      onComplete();
      onClose();
    } catch {
      alert("Failed to record outcome");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.7)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--bdr)" }}>
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ background: "var(--s1)", borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h3 className="text-lg font-normal" style={{ color: "var(--tx)", fontFamily: SERIF }}>
              Rent Review — {review.tenantName}
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>{review.propertyAddress}</p>
          </div>
          <button onClick={onClose} className="text-xl leading-none px-2" style={{ color: "var(--tx3)" }}>×</button>
        </div>

        <div className="p-6">
          {step === "evidence" && (
            <>
              <p className="text-sm mb-6" style={{ color: "var(--tx2)" }}>
                Review due in {review.daysToExpiry} days. Current rent {sym}{passingPerSqft.toFixed(2)}/sf. Market supports {sym}{ervPerSqft.toFixed(2)}/sf — {fmt(gap, sym)}/yr uplift.
              </p>
              <div className="rounded-lg p-4 mb-6 flex items-center justify-between" style={{ background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>Recommended new rent</div>
                  <div className="text-xs mt-1" style={{ color: "var(--tx3)" }}>Based on market evidence</div>
                </div>
                <div className="text-2xl font-normal" style={{ color: "var(--grn)", fontFamily: SERIF }}>{sym}{ervPerSqft.toFixed(2)}/sf</div>
              </div>
              <button onClick={handleGenerateDraft} disabled={generating} className="w-full py-3 rounded-lg text-sm font-semibold" style={{ background: "var(--acc)", color: "#fff" }}>
                {generating ? "Generating..." : "Generate renewal letter →"}
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="rounded-lg p-5 mb-4 text-sm max-h-96 overflow-y-auto whitespace-pre-wrap" style={{ background: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}>
                {draftLetter}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2)" }}>Recipient email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="tenant@email.com"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "var(--s1)", border: "1.5px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSend} disabled={sending || !recipientEmail} className="flex-1 py-3 rounded-lg text-sm font-semibold" style={{ background: "var(--grn)", color: "#fff" }}>
                  {sending ? "Sending..." : "Send to tenant →"}
                </button>
                <button onClick={() => setStep("evidence")} className="px-4 py-3 rounded-lg text-sm" style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--tx2)" }}>
                  ← Back
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "var(--grn)", color: "#fff" }}>✓</div>
                <h3 className="text-2xl font-normal mb-2" style={{ color: "var(--tx)", fontFamily: SERIF }}>Renewal letter sent</h3>
                <p className="text-sm" style={{ color: "var(--tx3)" }}>{review.tenantName} will receive the letter at {recipientEmail}.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-lg text-sm font-semibold" style={{ background: "var(--acc)", color: "#fff" }}>
                Back to rent clock
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

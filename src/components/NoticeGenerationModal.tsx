"use client";

import { useState } from "react";

const SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";

type NoticeType = "renewal_letter" | "section_25" | "hot" | "break_response";

type NoticeGenerationModalProps = {
  reviewId: string;
  onClose: () => void;
};

export function NoticeGenerationModal({ reviewId, onClose }: NoticeGenerationModalProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (type: NoticeType) => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/user/rent-reviews/${reviewId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });

      if (!res.ok) throw new Error("Failed to generate notice");

      const data = await res.json();
      alert(`${type} generated successfully. Check your documents.`);
      onClose();
    } catch (err) {
      alert("Failed to generate notice. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.7)" }}>
      <div
        className="w-full max-w-lg rounded-xl"
        style={{ background: "var(--bg)", border: "1px solid var(--bdr)" }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--s1)", borderBottom: "1px solid var(--bdr)" }}>
          <h3 className="text-lg font-normal" style={{ color: "var(--tx)", fontFamily: SERIF }}>
            Generate Notice
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none px-2"
            style={{ color: "var(--tx3)" }}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm mb-6" style={{ color: "var(--tx2)" }}>
            Choose the type of notice to generate. Claude drafts it from your lease data and market evidence.
          </p>

          <div className="space-y-2 mb-6">
            <button
              onClick={() => handleGenerate("renewal_letter")}
              disabled={generating}
              className="w-full text-left p-4 rounded-lg transition-all"
              style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Renewal Letter
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                Standard rent review proposal with market evidence. Non-statutory.
              </div>
            </button>

            <button
              onClick={() => handleGenerate("section_25")}
              disabled={generating}
              className="w-full text-left p-4 rounded-lg transition-all"
              style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Section 25 Notice (UK only)
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                Statutory notice to terminate or renew under the Landlord & Tenant Act 1954.
              </div>
            </button>

            <button
              onClick={() => handleGenerate("hot")}
              disabled={generating}
              className="w-full text-left p-4 rounded-lg transition-all"
              style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Heads of Terms
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                Agreed commercial terms for a new lease or renewal. Sent after negotiation.
              </div>
            </button>

            <button
              onClick={() => handleGenerate("break_response")}
              disabled={generating}
              className="w-full text-left p-4 rounded-lg transition-all"
              style={{ background: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Break Clause Response
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                Counter-proposal to retain a tenant exercising a break clause.
              </div>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all"
            style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
          >
            ← Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

type Deal = {
  id: string;
  address: string;
  assetType: string;
  askingPrice: number | null;
  guidePrice: number | null;
  brokerName: string | null;
  currency: string;
};

type ExpressInterestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  onSuccess: () => void;
};

export function ExpressInterestModal({
  isOpen,
  onClose,
  deal,
  onSuccess,
}: ExpressInterestModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!deal) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/scout/deals/${deal.id}/express-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || null }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setMessage("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to express interest");
      }
    } catch (err) {
      console.error("Error expressing interest:", err);
      setError("Failed to express interest. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setMessage("");
      setError("");
      onClose();
    }
  };

  if (!isOpen || !deal) return null;

  const price = deal.askingPrice ?? deal.guidePrice;
  const sym = deal.currency === "GBP" ? "£" : "$";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg)] border border-[var(--bdr)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="border-b border-[var(--bdr)] p-5 flex items-center justify-between sticky top-0 bg-[var(--bg)] z-10">
          <div>
            <h2 className="text-[18px] font-serif font-normal text-[var(--tx)] mb-1">
              Express Interest
            </h2>
            <p className="text-[12px] text-[var(--tx3)]">
              RealHQ will approach the vendor on your behalf
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-[var(--tx3)] hover:text-[var(--tx)] text-[20px] leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Deal Info */}
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-4">
            <div className="text-[13px] font-medium text-[var(--tx)] mb-1">
              {deal.address}
            </div>
            <div className="text-[11px] text-[var(--tx3)] mb-2">
              {deal.assetType.charAt(0).toUpperCase() + deal.assetType.slice(1)}
              {price && ` • ${sym}${price.toLocaleString()}`}
            </div>
            {deal.brokerName && (
              <div className="text-[10px] text-[var(--tx3)] mt-2 pt-2 border-t border-[var(--bdr)]">
                Broker: {deal.brokerName}
              </div>
            )}
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
              Message to Vendor (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any specific questions or information you'd like to convey..."
              rows={5}
              disabled={submitting}
              className="w-full px-4 py-3 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)] resize-none disabled:opacity-50"
            />
            <p className="text-[10px] text-[var(--tx3)] mt-2">
              Your contact details and a professional introduction will be included automatically.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-[var(--red-lt)] border border-[var(--red-bdr)] rounded-lg p-3 text-[12px] text-[var(--red)]">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-[var(--acc-lt)] border border-[var(--acc-bdr)] rounded-lg p-3">
            <div className="text-[11px] text-[var(--acc)] font-medium mb-1">
              What happens next?
            </div>
            <ul className="text-[10px] text-[var(--tx3)] space-y-1 ml-4 list-disc">
              <li>RealHQ sends a professional approach email to the vendor</li>
              <li>You&apos;ll be notified when the vendor views your interest</li>
              <li>If accepted, we&apos;ll create a transaction room to manage the deal</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--bdr)] p-5 flex items-center justify-end gap-3 sticky bottom-0 bg-[var(--bg)]">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-5 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-[var(--acc)] text-white border-none rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Express Interest"}
          </button>
        </div>
      </div>
    </div>
  );
}

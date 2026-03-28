"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────
type QuoteData = {
  id: string;
  carrier: string;
  carrierRating: string;
  policyType: string;
  premium: number;
  cover: number;
  deductible: number;
  saving: number;
  coverage: {
    flood?: { included: boolean };
    hurricane?: { included: boolean };
  };
};

type PolicyData = {
  propertyName: string;
  carrier: string;
  premium: number;
  cover: number;
  deductible: number;
};

// ── Modal Wrapper ─────────────────────────────────────────────────────
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .modal-content {
          background: var(--bg);
          border: 1px solid var(--bdr);
          border-radius: 12px;
          max-width: 580px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 375px) {
          .modal-overlay {
            padding: 0;
          }
          .modal-content {
            max-height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Flow 1: Bind Confirmation ─────────────────────────────────────────
type BindConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy: PolicyData;
  newQuote: QuoteData;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function BindConfirmModal({
  isOpen,
  onClose,
  currentPolicy,
  newQuote,
  onConfirm,
  isLoading = false,
}: BindConfirmModalProps) {
  const annualSaving = newQuote.saving;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <style jsx>{`
        .confirm-header {
          text-align: center;
          padding: 32px 24px 24px;
        }
        .confirm-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--grn-lt);
          border: 1px solid var(--grn-bdr);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin: 0 auto 14px;
        }
        .flow-h {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          color: var(--tx);
          margin-bottom: 6px;
        }
        .flow-sub {
          font: 300 13px/1.5 var(--sans);
          color: var(--tx3);
        }
        .card {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          overflow: hidden;
          margin: 0 24px 16px;
        }
        .card-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--bdr-lt);
          font: 600 13px var(--sans);
          color: var(--tx);
        }
        .change-summary {
          padding: 14px 18px;
        }
        .change-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .change-row:last-child {
          margin-bottom: 0;
        }
        .change-from,
        .change-to {
          flex: 1;
          text-align: center;
        }
        .change-arrow {
          color: var(--tx3);
          font-size: 12px;
          flex-shrink: 0;
        }
        .change-label {
          font: 500 8px/1 var(--mono);
          color: var(--tx3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .change-val {
          font: 500 13px var(--sans);
          color: var(--tx);
        }
        .change-val.old {
          color: var(--tx3);
          text-decoration: line-through;
        }
        .change-val.new {
          color: var(--grn);
        }
        .change-val.same {
          color: var(--tx3);
        }
        .save-highlight {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--grn-lt);
          border: 1px solid var(--grn-bdr);
          border-radius: 10px;
          margin: 0 24px 16px;
        }
        .save-text {
          font: 500 13px var(--sans);
          color: var(--tx);
        }
        .save-val {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--grn);
          letter-spacing: -0.02em;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 18px;
          border-bottom: 1px solid var(--bdr-lt);
        }
        .row:last-child {
          border-bottom: none;
        }
        .row-l {
          font: 400 12px var(--sans);
          color: var(--tx3);
        }
        .row-r {
          font: 500 12px var(--sans);
          color: var(--tx);
        }
        .row-r.warn {
          color: var(--amb);
        }
        .row-r.good {
          color: var(--grn);
        }
        .btn-primary {
          width: calc(100% - 48px);
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--grn);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin: 0 24px;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2bb886;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          width: calc(100% - 48px);
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 13px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin: 8px 24px;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }
        .fine-print {
          font: 400 11px/1.5 var(--sans);
          color: var(--tx3);
          text-align: center;
          padding: 0 24px 24px;
        }
        @media (max-width: 480px) {
          .change-row {
            flex-direction: column;
            gap: 4px;
          }
          .change-from,
          .change-to {
            text-align: left;
            width: 100%;
          }
        }
      `}</style>

      <div className="confirm-header">
        <div className="confirm-icon">🛡️</div>
        <div className="flow-h">Confirm new policy</div>
        <div className="flow-sub">
          Review the change before we bind. Nothing happens until you approve.
        </div>
      </div>

      <div className="card">
        <div className="card-hd">{currentPolicy.propertyName}</div>
        <div className="change-summary">
          <div className="change-row">
            <div className="change-from">
              <div className="change-label">Current</div>
              <div className="change-val old">{currentPolicy.carrier}</div>
            </div>
            <div className="change-arrow">→</div>
            <div className="change-to">
              <div className="change-label">New</div>
              <div className="change-val new">{newQuote.carrier}</div>
            </div>
          </div>
          <div className="change-row">
            <div className="change-from">
              <div className="change-label">Premium</div>
              <div className="change-val old">
                ${currentPolicy.premium.toLocaleString()}/yr
              </div>
            </div>
            <div className="change-arrow">→</div>
            <div className="change-to">
              <div className="change-label">Premium</div>
              <div className="change-val new">
                ${newQuote.premium.toLocaleString()}/yr
              </div>
            </div>
          </div>
          <div className="change-row">
            <div className="change-from">
              <div className="change-label">Cover</div>
              <div className="change-val same">
                ${(currentPolicy.cover / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="change-arrow">=</div>
            <div className="change-to">
              <div className="change-label">Cover</div>
              <div className="change-val same">
                ${(newQuote.cover / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
          <div className="change-row">
            <div className="change-from">
              <div className="change-label">Deductible</div>
              <div className="change-val same">
                ${currentPolicy.deductible.toLocaleString()}
              </div>
            </div>
            <div className="change-arrow">=</div>
            <div className="change-to">
              <div className="change-label">Deductible</div>
              <div className="change-val same">
                ${newQuote.deductible.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="save-highlight">
        <div className="save-text">Annual saving</div>
        <div className="save-val">${(annualSaving / 1000).toFixed(1)}k/yr</div>
      </div>

      <div className="card">
        <div className="card-hd">What happens next</div>
        <div className="row">
          <div className="row-l">CoverForce binds the {newQuote.carrier} policy</div>
          <div className="row-r">Instant</div>
        </div>
        <div className="row">
          <div className="row-l">Certificate of insurance emailed to you</div>
          <div className="row-r">Within 1 hour</div>
        </div>
        <div className="row">
          <div className="row-l">Old {currentPolicy.carrier} policy</div>
          <div className="row-r warn">You cancel separately</div>
        </div>
        <div className="row">
          <div className="row-l">New policy effective date</div>
          <div className="row-r">Aligned to current expiry</div>
        </div>
        <div className="row">
          <div className="row-l">Pro-rata refund on {currentPolicy.carrier}</div>
          <div className="row-r good">Likely back</div>
        </div>
      </div>

      <button className="btn-primary" onClick={onConfirm} disabled={isLoading}>
        {isLoading ? "Processing..." : `✓ Approve — bind ${newQuote.carrier} policy`}
      </button>
      <button className="btn-secondary" onClick={onClose}>
        ← Go back to quotes
      </button>
      <div className="fine-print">
        By approving, you authorise CoverForce to bind this policy on your behalf. You
        can cancel within 14 days under cooling-off rules.
      </div>
    </Modal>
  );
}

// ── Flow 2: Bound Success ─────────────────────────────────────────────
type BindSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  propertyName: string;
};

export function BindSuccessModal({
  isOpen,
  onClose,
  quote,
  propertyName,
}: BindSuccessModalProps) {
  const capRate = 0.066;
  const portfolioValueIncrease = Math.round((quote.saving / capRate) / 1000) * 1000;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <style jsx>{`
        .success-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: var(--grn);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #fff;
          margin: 32px auto 20px;
          animation: checkPop 0.4s ease both 0.2s;
        }
        @keyframes checkPop {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        .success-h {
          font-family: var(--serif);
          font-size: 28px;
          font-weight: 400;
          color: var(--tx);
          text-align: center;
          margin-bottom: 6px;
        }
        .success-sub {
          font: 300 14px/1.5 var(--sans);
          color: var(--tx3);
          text-align: center;
          padding: 0 24px;
          margin-bottom: 32px;
        }
        .save-highlight {
          padding: 16px 20px;
          background: var(--grn-lt);
          border: 1px solid var(--grn-bdr);
          border-radius: 10px;
          margin: 0 24px 16px;
        }
        .save-main {
          font: 600 13px var(--sans);
          color: var(--tx);
          margin-bottom: 2px;
        }
        .save-detail {
          font: 400 11px var(--sans);
          color: var(--tx3);
        }
        .next-steps {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          overflow: hidden;
          margin: 0 24px 16px;
        }
        .next-step {
          display: flex;
          align-items: start;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--bdr-lt);
        }
        .next-step:last-child {
          border-bottom: none;
        }
        .next-num {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--s2);
          border: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          justify-content: center;
          font: 600 10px var(--mono);
          color: var(--tx3);
          flex-shrink: 0;
        }
        .next-num.done {
          background: var(--grn-lt);
          border-color: var(--grn-bdr);
          color: var(--grn);
        }
        .next-info {
          flex: 1;
        }
        .next-name {
          font: 500 12px var(--sans);
          color: var(--tx);
        }
        .next-detail {
          font: 300 11px var(--sans);
          color: var(--tx3);
          margin-top: 2px;
        }
        .next-action {
          font: 500 11px var(--sans);
          color: var(--acc);
          margin-top: 4px;
          cursor: pointer;
        }
        .btn-row {
          display: flex;
          gap: 8px;
          padding: 0 24px 24px;
        }
        .btn-primary {
          flex: 1;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--acc);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-primary:hover {
          background: #6d5ce0;
        }
        .btn-secondary {
          flex: 1;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 13px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }
        @media (max-width: 480px) {
          .btn-row {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="success-icon">✓</div>
      <div className="success-h">Policy bound</div>
      <div className="success-sub">
        {quote.carrier} {quote.policyType} is now active for {propertyName}. You're
        saving ${(quote.saving / 1000).toFixed(1)}k per year.
      </div>

      <div className="save-highlight">
        <div className="save-main">
          ${(quote.saving / 1000).toFixed(1)}k/yr saved
        </div>
        <div className="save-detail">
          That's ${(portfolioValueIncrease / 1000).toFixed(0)}k in portfolio value at a{" "}
          {(capRate * 100).toFixed(1)}% cap rate
        </div>
      </div>

      <div className="next-steps">
        <div className="next-step">
          <div className="next-num done">✓</div>
          <div className="next-info">
            <div className="next-name">{quote.carrier} policy bound via CoverForce</div>
            <div className="next-detail">Policy effective immediately</div>
          </div>
        </div>
        <div className="next-step">
          <div className="next-num done">✓</div>
          <div className="next-info">
            <div className="next-name">Certificate of insurance sent</div>
            <div className="next-detail">Emailed to you · Also saved to Documents</div>
            <div className="next-action">View certificate →</div>
          </div>
        </div>
        <div className="next-step">
          <div className="next-num">3</div>
          <div className="next-info">
            <div className="next-name">Cancel your old policy</div>
            <div className="next-detail">
              Contact your previous carrier to cancel. You should receive a pro-rata
              refund for the unused portion.
            </div>
            <div className="next-action">Download cancellation letter template →</div>
          </div>
        </div>
        <div className="next-step">
          <div className="next-num">4</div>
          <div className="next-info">
            <div className="next-name">Notify your lender (if applicable)</div>
            <div className="next-detail">
              If you have financing on this property, your lender needs the new
              certificate. RealHQ can include this in a portal link.
            </div>
            <div className="next-action">Create lender portal link →</div>
          </div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-primary" onClick={onClose}>
          Back to insurance overview
        </button>
        <button className="btn-secondary" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </button>
      </div>
    </Modal>
  );
}

// ── Flow 3: Adjust & Re-quote ─────────────────────────────────────────
type AdjustRequirementsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentCover: number;
  currentDeductible: number;
  onRequote: (params: {
    coverLevel: number;
    deductible: number;
    policyType: string;
    coverages: string[];
    carrierPreference: string;
  }) => void;
};

export function AdjustRequirementsModal({
  isOpen,
  onClose,
  currentCover,
  currentDeductible,
  onRequote,
}: AdjustRequirementsModalProps) {
  const [coverLevel, setCoverLevel] = useState(currentCover.toString());
  const [deductible, setDeductible] = useState(currentDeductible);
  const [policyType, setPolicyType] = useState("Property All-Risk");
  const [coverages, setCoverages] = useState({
    flood: true,
    hurricane: true,
    businessInterruption: true,
    terrorism: false,
    equipmentBreakdown: false,
  });
  const [carrierPref, setCarrierPref] = useState("A-rated or above");

  const handleSubmit = () => {
    const selectedCoverages = Object.entries(coverages)
      .filter(([_, enabled]) => enabled)
      .map(([name, _]) => name);

    onRequote({
      coverLevel: parseInt(coverLevel.replace(/[^0-9]/g, ""), 10),
      deductible,
      policyType,
      coverages: selectedCoverages,
      carrierPreference: carrierPref,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <style jsx>{`
        .modal-body {
          padding: 32px 24px 24px;
        }
        .flow-h {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          color: var(--tx);
          margin-bottom: 6px;
        }
        .flow-sub {
          font: 300 13px/1.5 var(--sans);
          color: var(--tx3);
          margin-bottom: 24px;
        }
        .adjust-field {
          margin-bottom: 16px;
        }
        .adjust-label {
          font: 500 11px var(--sans);
          color: var(--tx2);
          margin-bottom: 6px;
          display: block;
        }
        .adjust-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--s1);
          border: 1.5px solid var(--bdr);
          border-radius: 9px;
          font: 400 14px var(--sans);
          color: var(--tx);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .adjust-input:focus {
          border-color: var(--acc-bdr);
          box-shadow: 0 0 0 3px var(--acc-dim);
        }
        .adjust-warning {
          font: 400 10px var(--sans);
          color: var(--amb);
          margin-top: 4px;
        }
        .adjust-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .adjust-chip {
          padding: 7px 14px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 7px;
          font: 500 12px var(--sans);
          color: var(--tx3);
          cursor: pointer;
          transition: all 0.12s;
        }
        .adjust-chip:hover {
          border-color: var(--tx3);
          color: var(--tx2);
        }
        .adjust-chip.on {
          background: var(--acc-lt);
          border-color: var(--acc-bdr);
          color: var(--acc);
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--bdr-lt);
        }
        .toggle-row:last-child {
          border-bottom: none;
        }
        .toggle-label {
          font: 400 12px var(--sans);
          color: var(--tx);
        }
        .toggle-sub {
          font: 400 10px var(--sans);
          color: var(--tx3);
        }
        .toggle {
          width: 36px;
          height: 20px;
          border-radius: 10px;
          background: var(--s3);
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle.on {
          background: var(--acc);
        }
        .toggle::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s;
        }
        .toggle.on::after {
          transform: translateX(16px);
        }
        .btn-primary {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--acc);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 16px;
        }
        .btn-primary:hover {
          background: #6d5ce0;
        }
        .btn-secondary {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 13px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 8px;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }
      `}</style>

      <div className="modal-body">
        <div className="flow-h">Adjust your requirements</div>
        <div className="flow-sub">
          Change what you're looking for and we'll fetch new quotes from CoverForce.
        </div>

        <div className="adjust-field">
          <label className="adjust-label">Cover level</label>
          <input
            className="adjust-input"
            type="text"
            value={`$${parseInt(coverLevel).toLocaleString()}`}
            onChange={(e) =>
              setCoverLevel(e.target.value.replace(/[^0-9]/g, ""))
            }
          />
          <div className="adjust-warning">
            ⚠️ Rebuild cost estimate is $19.2M — consider increasing cover
          </div>
        </div>

        <div className="adjust-field">
          <label className="adjust-label">Deductible preference</label>
          <div className="adjust-options">
            {[10000, 25000, 50000, 100000].map((amt) => (
              <div
                key={amt}
                className={`adjust-chip ${deductible === amt ? "on" : ""}`}
                onClick={() => setDeductible(amt)}
              >
                ${(amt / 1000).toFixed(0)}k
              </div>
            ))}
          </div>
        </div>

        <div className="adjust-field">
          <label className="adjust-label">Policy type</label>
          <div className="adjust-options">
            {["Property All-Risk", "Commercial Package", "Landlord Only"].map((type) => (
              <div
                key={type}
                className={`adjust-chip ${policyType === type ? "on" : ""}`}
                onClick={() => setPolicyType(type)}
              >
                {type}
              </div>
            ))}
          </div>
        </div>

        <div className="adjust-field">
          <label className="adjust-label">Include these coverages</label>
          <div style={{ padding: "4px 0" }}>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Flood cover</div>
                <div className="toggle-sub">Required for FL properties</div>
              </div>
              <div
                className={`toggle ${coverages.flood ? "on" : ""}`}
                onClick={() =>
                  setCoverages({ ...coverages, flood: !coverages.flood })
                }
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Wind / Hurricane</div>
                <div className="toggle-sub">Essential in FL — check sub-deductible</div>
              </div>
              <div
                className={`toggle ${coverages.hurricane ? "on" : ""}`}
                onClick={() =>
                  setCoverages({ ...coverages, hurricane: !coverages.hurricane })
                }
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Business Interruption</div>
                <div className="toggle-sub">Covers lost rent if building damaged</div>
              </div>
              <div
                className={`toggle ${coverages.businessInterruption ? "on" : ""}`}
                onClick={() =>
                  setCoverages({
                    ...coverages,
                    businessInterruption: !coverages.businessInterruption,
                  })
                }
              />
            </div>
            <div className="toggle-row">
              <div className="toggle-label">Terrorism</div>
              <div
                className={`toggle ${coverages.terrorism ? "on" : ""}`}
                onClick={() =>
                  setCoverages({ ...coverages, terrorism: !coverages.terrorism })
                }
              />
            </div>
            <div className="toggle-row">
              <div className="toggle-label">Equipment Breakdown</div>
              <div
                className={`toggle ${coverages.equipmentBreakdown ? "on" : ""}`}
                onClick={() =>
                  setCoverages({
                    ...coverages,
                    equipmentBreakdown: !coverages.equipmentBreakdown,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="adjust-field">
          <label className="adjust-label">Carrier preference (optional)</label>
          <div className="adjust-options">
            {["Any carrier", "A-rated or above", "Exclude Travelers"].map((pref) => (
              <div
                key={pref}
                className={`adjust-chip ${carrierPref === pref ? "on" : ""}`}
                onClick={() => setCarrierPref(pref)}
              >
                {pref}
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={handleSubmit}>
          ⚡ Get new quotes with these requirements
        </button>
        <button className="btn-secondary" onClick={onClose}>
          ← Back to current quotes
        </button>
      </div>
    </Modal>
  );
}

// ── Flow 4: Dismiss Quote ─────────────────────────────────────────────
type DismissQuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  carrierName: string;
  onDismiss: (reason: string, note: string) => void;
};

export function DismissQuoteModal({
  isOpen,
  onClose,
  carrierName,
  onDismiss,
}: DismissQuoteModalProps) {
  const [selectedReason, setSelectedReason] = useState("Too expensive");
  const [note, setNote] = useState("");

  const reasons = [
    "Too expensive",
    "Don't trust the carrier",
    "Deductible too high",
    "Hurricane sub-deductible is a dealbreaker",
    "Cover doesn't match what I need",
    "Bad claims experience in the past",
    "Other reason",
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <style jsx>{`
        .modal-body {
          padding: 32px 24px 24px;
        }
        .flow-h {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          color: var(--tx);
          margin-bottom: 6px;
        }
        .flow-sub {
          font: 300 13px/1.5 var(--sans);
          color: var(--tx3);
          margin-bottom: 24px;
        }
        .dismiss-reasons {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }
        .dismiss-reason {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .dismiss-reason:hover {
          border-color: var(--acc-bdr);
          background: var(--s2);
        }
        .dismiss-reason.selected {
          border-color: var(--acc);
          background: var(--acc-lt);
        }
        .dismiss-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.5px solid var(--bdr);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s;
        }
        .dismiss-reason.selected .dismiss-dot {
          border-color: var(--acc);
          background: var(--acc);
        }
        .dismiss-reason.selected .dismiss-dot::after {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
        }
        .dismiss-text {
          font: 400 13px var(--sans);
          color: var(--tx);
        }
        .dismiss-note {
          width: 100%;
          padding: 12px 16px;
          background: var(--s1);
          border: 1.5px solid var(--bdr);
          border-radius: 9px;
          font: 400 13px var(--sans);
          color: var(--tx);
          outline: none;
          resize: vertical;
          min-height: 60px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .dismiss-note:focus {
          border-color: var(--acc-bdr);
        }
        .dismiss-note::placeholder {
          color: var(--tx3);
        }
        .btn-primary {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--acc);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 16px;
        }
        .btn-primary:hover {
          background: #6d5ce0;
        }
        .btn-secondary {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 13px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 8px;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }
        .hint {
          font: 400 11px var(--sans);
          color: var(--tx3);
          text-align: center;
          margin-top: 12px;
        }
      `}</style>

      <div className="modal-body">
        <div className="flow-h">Not interested in {carrierName}?</div>
        <div className="flow-sub">
          Tell us why and we'll improve future quotes. One tap — takes 2 seconds.
        </div>

        <div className="dismiss-reasons">
          {reasons.map((reason) => (
            <div
              key={reason}
              className={`dismiss-reason ${selectedReason === reason ? "selected" : ""}`}
              onClick={() => setSelectedReason(reason)}
            >
              <div className="dismiss-dot" />
              <div className="dismiss-text">{reason}</div>
            </div>
          ))}
        </div>

        <textarea
          className="dismiss-note"
          placeholder="Optional: anything else we should know? (e.g. 'had a bad claims experience with Travelers in 2023')"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          className="btn-primary"
          onClick={() => onDismiss(selectedReason, note)}
        >
          Dismiss {carrierName} quote
        </button>
        <button className="btn-secondary" onClick={onClose}>
          ← Keep this quote
        </button>

        <div className="hint">
          This helps RealHQ learn your preferences. Future quotes will avoid carriers
          and terms you don't like.
        </div>
      </div>
    </Modal>
  );
}

// ── Flow 5: No Quotes Work ────────────────────────────────────────────
type NoQuotesWorkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdjustRequirements: () => void;
  onRequestBroker: () => void;
  onSaveQuotes: () => void;
  onTellUsMore: () => void;
};

export function NoQuotesWorkModal({
  isOpen,
  onClose,
  onAdjustRequirements,
  onRequestBroker,
  onSaveQuotes,
  onTellUsMore,
}: NoQuotesWorkModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <style jsx>{`
        .modal-body {
          padding: 32px 24px 24px;
        }
        .flow-h {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          color: var(--tx);
          margin-bottom: 6px;
        }
        .flow-sub {
          font: 300 13px/1.5 var(--sans);
          color: var(--tx3);
          margin-bottom: 24px;
        }
        .fallback-card {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 24px;
          text-align: center;
          margin-bottom: 14px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fallback-card:hover {
          border-color: var(--acc-bdr);
          background: var(--s2);
        }
        .fallback-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .fallback-h {
          font: 600 14px var(--sans);
          color: var(--tx);
          margin-bottom: 4px;
        }
        .fallback-sub {
          font: 300 12px var(--sans);
          color: var(--tx3);
        }
        .saved-quotes-hint {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          font: 400 12px var(--sans);
          color: var(--tx3);
          margin-top: 16px;
        }
        .saved-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--amb);
          flex-shrink: 0;
        }
        .btn-secondary {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 13px/1 var(--sans);
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 8px;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }
      `}</style>

      <div className="modal-body">
        <div className="flow-h">None of these right for you?</div>
        <div className="flow-sub">No problem. Here are your options.</div>

        <div className="fallback-card" onClick={onAdjustRequirements}>
          <div className="fallback-icon">🔄</div>
          <div className="fallback-h">Adjust requirements & re-quote</div>
          <div className="fallback-sub">
            Change cover level, deductible, policy type, or coverages and get fresh
            quotes instantly.
          </div>
        </div>

        <div className="fallback-card" onClick={onRequestBroker}>
          <div className="fallback-icon">👤</div>
          <div className="fallback-h">Request a manual broker review</div>
          <div className="fallback-sub">
            A specialist CRE insurance broker reviews your portfolio and sources quotes
            from carriers not on CoverForce. Typically 2–3 business days.
          </div>
        </div>

        <div className="fallback-card" onClick={onSaveQuotes}>
          <div className="fallback-icon">📅</div>
          <div className="fallback-h">Save quotes & come back later</div>
          <div className="fallback-sub">
            These quotes are valid for 30 days. We'll remind you 7 days before they
            expire.
          </div>
        </div>

        <div className="fallback-card" onClick={onTellUsMore}>
          <div className="fallback-icon">💬</div>
          <div className="fallback-h">Tell us what you're looking for</div>
          <div className="fallback-sub">
            Describe what's missing and our system learns. Next time you quote, results
            will be closer to what you need.
          </div>
        </div>

        <div className="saved-quotes-hint">
          <div className="saved-dot" />
          These quotes are saved. You can return to them from the insurance page any
          time within 30 days.
        </div>

        <button className="btn-secondary" onClick={onClose}>
          ← Back to insurance
        </button>
      </div>
    </Modal>
  );
}

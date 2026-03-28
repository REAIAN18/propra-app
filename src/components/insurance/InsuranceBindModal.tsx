"use client";

import { useState } from "react";

type Quote = {
  id: string;
  carrier: string;
  premium: number;
  cover: number;
  deductible: number;
  policyType: string;
};

type CurrentPolicy = {
  carrier: string;
  premium: number;
  cover: number;
  deductible: number;
};

interface InsuranceBindModalProps {
  quote: Quote;
  currentPolicy: CurrentPolicy | null;
  propertyName: string;
  onClose: () => void;
  onBind: (quoteId: string) => Promise<void>;
}

export function InsuranceBindModal({
  quote,
  currentPolicy,
  propertyName,
  onClose,
  onBind,
}: InsuranceBindModalProps) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [binding, setBinding] = useState(false);

  const saving = currentPolicy
    ? currentPolicy.premium - quote.premium
    : 0;

  const handleBind = async () => {
    setBinding(true);
    try {
      await onBind(quote.id);
      setStep("success");
    } catch (error) {
      console.error("Failed to bind policy:", error);
      alert("Failed to bind policy. Please try again.");
    } finally {
      setBinding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && !binding && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden"
        style={{ background: "var(--bg)", border: "1px solid var(--bdr)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {step === "confirm" ? (
          <ConfirmationView
            quote={quote}
            currentPolicy={currentPolicy}
            propertyName={propertyName}
            saving={saving}
            binding={binding}
            onBind={handleBind}
            onClose={onClose}
          />
        ) : (
          <SuccessView
            quote={quote}
            currentPolicy={currentPolicy}
            propertyName={propertyName}
            saving={saving}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// Flow 1: Bind Confirmation
function ConfirmationView({
  quote,
  currentPolicy,
  propertyName,
  saving,
  binding,
  onBind,
  onClose,
}: {
  quote: Quote;
  currentPolicy: CurrentPolicy | null;
  propertyName: string;
  saving: number;
  binding: boolean;
  onBind: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--grn-lt)",
            border: "1px solid var(--grn-bdr)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            margin: "0 auto 14px",
          }}
        >
          📋
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: "24px", fontWeight: "400", color: "var(--tx)", marginBottom: "6px" }}>
          Confirm new policy
        </div>
        <div style={{ font: "300 13px/1.5 var(--sans)", color: "var(--tx3)" }}>
          Review the change before we bind. Nothing happens until you approve.
        </div>
      </div>

      {/* What's changing */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
          <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>{propertyName}</h4>
        </div>
        <div style={{ padding: "14px 18px" }}>
          {currentPolicy && (
            <>
              <ChangeRow
                label="Carrier"
                currentValue={currentPolicy.carrier}
                newValue={quote.carrier}
                changed={currentPolicy.carrier !== quote.carrier}
              />
              <ChangeRow
                label="Premium"
                currentValue={`$${(currentPolicy.premium / 1000).toFixed(1)}k/yr`}
                newValue={`$${(quote.premium / 1000).toFixed(1)}k/yr`}
                changed={currentPolicy.premium !== quote.premium}
              />
            </>
          )}
          {!currentPolicy && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>
                New Policy
              </div>
              <div style={{ font: "500 13px var(--sans)", color: "var(--grn)" }}>
                {quote.carrier} — ${(quote.premium / 1000).toFixed(1)}k/yr
              </div>
            </div>
          )}
          <ChangeRow
            label="Cover"
            currentValue={`$${currentPolicy ? currentPolicy.cover / 1000000 : quote.cover / 1000000}M`}
            newValue={`$${quote.cover / 1000000}M`}
            changed={false}
          />
          <ChangeRow
            label="Deductible"
            currentValue={`$${currentPolicy ? (currentPolicy.deductible / 1000).toFixed(0) : (quote.deductible / 1000).toFixed(0)}k`}
            newValue={`$${(quote.deductible / 1000).toFixed(0)}k`}
            changed={false}
          />
        </div>
      </div>

      {/* Saving highlight */}
      {saving > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: "10px", marginBottom: "16px" }}>
          <div style={{ font: "500 13px var(--sans)", color: "var(--tx)" }}>Annual saving</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--grn)", letterSpacing: "-.02em" }}>
            ${(saving / 1000).toFixed(1)}k/yr
          </div>
        </div>
      )}

      {/* What happens next */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
          <h4 style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>What happens next</h4>
        </div>
        <Row label="CoverForce binds the policy" value="Instant" />
        <Row label="Certificate of insurance emailed" value="Within 1 hour" />
        {currentPolicy && (
          <>
            <Row label={`Old ${currentPolicy.carrier} policy`} value="You cancel separately" valueColor="var(--amb)" />
            <Row label="Pro-rata refund estimate" value={`~$${((saving * 0.6) / 1000).toFixed(1)}k back`} valueColor="var(--grn)" />
          </>
        )}
        <Row label="New policy effective date" value="Immediately" />
      </div>

      {/* Buttons */}
      <button
        onClick={onBind}
        disabled={binding}
        style={{
          width: "100%",
          height: "46px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: binding ? "var(--tx3)" : "var(--grn)",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          font: "600 14px/1 var(--sans)",
          cursor: binding ? "not-allowed" : "pointer",
          transition: "all .15s",
          marginBottom: "8px",
        }}
      >
        {binding ? "Binding..." : `✓ Approve — bind ${quote.carrier} policy`}
      </button>
      <button
        onClick={onClose}
        disabled={binding}
        style={{
          width: "100%",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          color: "var(--tx2)",
          border: "1px solid var(--bdr)",
          borderRadius: "10px",
          font: "500 13px/1 var(--sans)",
          cursor: binding ? "not-allowed" : "pointer",
          transition: "all .15s",
        }}
      >
        ← Go back to quotes
      </button>
      <div style={{ font: "400 11px/1.5 var(--sans)", color: "var(--tx3)", textAlign: "center", marginTop: "12px" }}>
        By approving, you authorise CoverForce to bind this policy on your behalf. You can cancel within 14 days under cooling-off rules.
      </div>
    </div>
  );
}

// Flow 2: Success
function SuccessView({
  quote,
  currentPolicy,
  propertyName,
  saving,
  onClose,
}: {
  quote: Quote;
  currentPolicy: CurrentPolicy | null;
  propertyName: string;
  saving: number;
  onClose: () => void;
}) {
  const capRate = 6.6; // Default cap rate for portfolio value calculation
  const portfolioValue = Math.round((saving / capRate) * 100);

  return (
    <div style={{ padding: "40px 28px" }}>
      {/* Success icon */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "var(--grn)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          color: "#fff",
          margin: "0 auto 20px",
        }}
      >
        ✓
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: "28px", fontWeight: "400", color: "var(--tx)", textAlign: "center", marginBottom: "6px" }}>
        Policy bound
      </div>
      <div style={{ font: "300 14px/1.5 var(--sans)", color: "var(--tx3)", textAlign: "center", marginBottom: "32px" }}>
        {quote.policyType} is now active for {propertyName}.{saving > 0 && ` You're saving $${(saving / 1000).toFixed(1)}k per year.`}
      </div>

      {/* Saving highlight with cap rate */}
      {saving > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--grn-lt)", border: "1px solid var(--grn-bdr)", borderRadius: "10px", marginBottom: "16px" }}>
          <div>
            <div style={{ font: "600 13px var(--sans)", color: "var(--tx)" }}>${(saving / 1000).toFixed(1)}k/yr saved</div>
            <div style={{ font: "400 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>
              That's ${portfolioValue}k in portfolio value at a {capRate}% cap rate
            </div>
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "18px", color: "var(--grn)", letterSpacing: "-.02em" }}>
            ${(saving / 1000).toFixed(1)}k
          </div>
        </div>
      )}

      {/* Next steps */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", marginBottom: "16px", overflow: "hidden" }}>
        <NextStep
          number="✓"
          title={`${quote.carrier} policy bound via CoverForce`}
          detail={`Policy #${quote.carrier.substring(0, 2).toUpperCase()}-FL-2026-${Math.floor(Math.random() * 9000) + 1000} · Effective immediately`}
          done
        />
        <NextStep
          number="✓"
          title="Certificate of insurance sent"
          detail="Emailed to you · Also saved to Documents"
          action="View certificate →"
          done
        />
        {currentPolicy && (
          <NextStep
            number="3"
            title={`Cancel your old ${currentPolicy.carrier} policy`}
            detail={`Contact ${currentPolicy.carrier} to cancel. You should receive a pro-rata refund of approximately $${((saving * 0.6) / 1000).toFixed(1)}k for the unused portion.`}
            action="Download cancellation letter template →"
          />
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          width: "100%",
          height: "46px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--acc)",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          font: "600 14px/1 var(--sans)",
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        Done
      </button>
    </div>
  );
}

// Helper components
function ChangeRow({
  label,
  currentValue,
  newValue,
  changed,
}: {
  label: string;
  currentValue: string;
  newValue: string;
  changed: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
      <div style={{ flex: 1, textAlign: "right" }}>
        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>
          {changed ? "Current" : label}
        </div>
        <div style={{ font: "500 13px var(--sans)", color: changed ? "var(--tx3)" : "var(--tx)", textDecoration: changed ? "line-through" : "none" }}>
          {currentValue}
        </div>
      </div>
      <div style={{ color: "var(--tx3)", fontSize: "12px", flexShrink: 0 }}>{changed ? "→" : "="}</div>
      <div style={{ flex: 1 }}>
        <div style={{ font: "500 8px/1 var(--mono)", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>
          {changed ? "New" : label}
        </div>
        <div style={{ font: "500 13px var(--sans)", color: changed ? "var(--grn)" : "var(--tx3)" }}>{newValue}</div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
      <div style={{ font: "400 12px var(--sans)", color: "var(--tx3)" }}>{label}</div>
      <div style={{ font: "500 12px var(--sans)", color: valueColor || "var(--tx)" }}>{value}</div>
    </div>
  );
}

function NextStep({
  number,
  title,
  detail,
  action,
  done,
}: {
  number: string;
  title: string;
  detail: string;
  action?: string;
  done?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "start", gap: "12px", padding: "14px 18px", borderBottom: "1px solid var(--bdr-lt)" }}>
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          background: done ? "var(--grn-lt)" : "var(--s2)",
          border: done ? "1px solid var(--grn-bdr)" : "1px solid var(--bdr)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: "600 10px var(--mono)",
          color: done ? "var(--grn)" : "var(--tx3)",
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{title}</div>
        <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)", marginTop: "2px" }}>{detail}</div>
        {action && (
          <div style={{ font: "500 11px var(--sans)", color: "var(--acc)", marginTop: "4px", cursor: "pointer" }}>{action}</div>
        )}
      </div>
    </div>
  );
}

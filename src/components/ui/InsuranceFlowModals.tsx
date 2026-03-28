"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────
export type Quote = {
  id: string;
  carrier: string;
  carrierRating?: string;
  policyType: string;
  premium: number;
  cover: number;
  deductible: number;
  saving?: number;
  isBest?: boolean;
  review?: string;
};

export type FlowType = "bind" | "success" | "adjust" | "dismiss" | "none-work";

export type AdjustRequirements = {
  coverLevel: string;
  deductible: string;
  policyType: string;
  floodCover: boolean;
  windHurricane: boolean;
  businessInterruption: boolean;
  terrorism: boolean;
  equipmentBreakdown: boolean;
  carrierPreference: "any" | "a-rated" | "exclude-travelers";
};

interface InsuranceBindModalProps {
  quote: Quote;
  currentPremium?: number;
  initialFlow?: FlowType;
  onClose: () => void;
  onBind?: (quoteId: string) => void;
  onDismiss?: (quoteId: string, reason: string, note?: string) => void;
  onAdjust?: (requirements: AdjustRequirements) => void;
}

const DISMISS_REASONS = [
  "Too expensive",
  "Don't trust the carrier",
  "Deductible too high",
  "Hurricane sub-deductible is a dealbreaker",
  "Cover doesn't match what I need",
  "Bad claims experience in the past",
  "Other reason",
];

// ── Unified Modal Component ───────────────────────────────────────────
export function InsuranceBindModal({
  quote,
  currentPremium,
  initialFlow = "bind",
  onClose,
  onBind,
  onDismiss,
  onAdjust,
}: InsuranceBindModalProps) {
  const [flow, setFlow] = useState<FlowType>(initialFlow);
  const [binding, setBinding] = useState(false);

  // Adjust flow state
  const [coverLevel, setCoverLevel] = useState("Replacement cost");
  const [deductible, setDeductible] = useState("$25,000");
  const [policyType, setPolicyType] = useState("Named peril");
  const [floodCover, setFloodCover] = useState(true);
  const [windHurricane, setWindHurricane] = useState(true);
  const [businessInterruption, setBusinessInterruption] = useState(true);
  const [terrorism, setTerrorism] = useState(false);
  const [equipmentBreakdown, setEquipmentBreakdown] = useState(false);
  const [carrierPreference, setCarrierPreference] = useState<"any" | "a-rated" | "exclude-travelers">("a-rated");

  // Dismiss flow state
  const [dismissReason, setDismissReason] = useState("");
  const [dismissNote, setDismissNote] = useState("");

  const savings = currentPremium ? currentPremium - quote.premium : 0;
  const savingsPct = currentPremium ? ((savings / currentPremium) * 100).toFixed(1) : "0";

  async function handleBind() {
    setBinding(true);
    if (onBind) {
      await onBind(quote.id);
    }
    setBinding(false);
    setFlow("success");
  }

  function handleDismissSubmit() {
    if (onDismiss && dismissReason) {
      onDismiss(quote.id, dismissReason, dismissNote || undefined);
    }
    onClose();
  }

  function handleAdjustSubmit() {
    if (onAdjust) {
      onAdjust({
        coverLevel,
        deductible,
        policyType,
        floodCover,
        windHurricane,
        businessInterruption,
        terrorism,
        equipmentBreakdown,
        carrierPreference,
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg, #09090b)", border: "1px solid var(--bdr, #252533)" }}
      >
        {/* Flow 1: Bind Confirmation */}
        {flow === "bind" && (
          <>
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bdr, #252533)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    Bind this policy?
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                    {quote.carrier} · {quote.policyType}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                  style={{ color: "var(--tx3, #555568)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Savings highlight */}
              {savings > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--grn-lt, rgba(52,211,153,.07))", border: "1px solid var(--grn-bdr, rgba(52,211,153,.22))" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="text-2xl">💰</div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--grn, #34d399)" }}>
                        Save ${savings.toLocaleString()}/year
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                        {savingsPct}% reduction vs current policy
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Policy summary */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="text-sm" style={{ color: "var(--tx2, #8888a0)" }}>Annual premium</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    ${quote.premium.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm" style={{ color: "var(--tx2, #8888a0)" }}>Deductible</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    ${quote.deductible.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm" style={{ color: "var(--tx2, #8888a0)" }}>Coverage amount</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    ${quote.cover.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm" style={{ color: "var(--tx2, #8888a0)" }}>Policy type</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    {quote.policyType}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx2, #8888a0)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBind}
                  disabled={binding}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--acc, #7c6af0)", color: "#fff" }}
                >
                  {binding ? "Binding..." : "⚡ Approve & bind"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Flow 2: Success State */}
        {flow === "success" && (
          <div className="p-6 flex flex-col items-center gap-5 py-10">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ background: "var(--grn-lt, rgba(52,211,153,.07))" }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" fill="var(--grn, #34d399)" />
                <path d="M8 14l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold mb-1.5" style={{ color: "var(--tx, #e4e4ec)" }}>
                Policy bound
              </div>
              <div className="text-sm" style={{ color: "var(--tx3, #555568)" }}>
                Your {quote.carrier} policy is now active
              </div>
            </div>

            <div className="w-full space-y-2.5 mt-2">
              <div className="text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                Next steps
              </div>
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx, #e4e4ec)" }}
              >
                <div className="font-medium mb-1">1. Certificate of insurance</div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  Emailed to you within 24 hours
                </div>
              </div>
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx, #e4e4ec)" }}
              >
                <div className="font-medium mb-1">2. Cancel old policy</div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  Contact your previous carrier to avoid double-payment
                </div>
              </div>
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx, #e4e4ec)" }}
              >
                <div className="font-medium mb-1">3. Notify lender (if applicable)</div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  Send updated certificate to your mortgage provider
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-90 mt-2"
              style={{ background: "var(--acc, #7c6af0)", color: "#fff" }}
            >
              Done
            </button>
          </div>
        )}

        {/* Flow 3: Adjust & Re-quote */}
        {flow === "adjust" && (
          <>
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bdr, #252533)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    Adjust requirements
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                    Get fresh quotes with your preferred settings
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                  style={{ color: "var(--tx3, #555568)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Cover level */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                  Cover level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Replacement cost", "Actual cash value", "Agreed value"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCoverLevel(opt)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: coverLevel === opt ? "var(--acc, #7c6af0)" : "var(--s1, #111116)",
                        border: `1px solid ${coverLevel === opt ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                        color: coverLevel === opt ? "#fff" : "var(--tx2, #8888a0)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deductible */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                  Deductible
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["$10,000", "$25,000", "$50,000", "$100,000"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setDeductible(opt)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: deductible === opt ? "var(--acc, #7c6af0)" : "var(--s1, #111116)",
                        border: `1px solid ${deductible === opt ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                        color: deductible === opt ? "#fff" : "var(--tx2, #8888a0)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Policy type */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                  Policy type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Named peril", "All risk"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPolicyType(opt)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: policyType === opt ? "var(--acc, #7c6af0)" : "var(--s1, #111116)",
                        border: `1px solid ${policyType === opt ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                        color: policyType === opt ? "#fff" : "var(--tx2, #8888a0)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coverage toggles */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                  Additional coverage
                </label>
                <div className="space-y-2.5">
                  {[
                    { label: "Flood cover", sub: "Required for FL properties", value: floodCover, onChange: setFloodCover },
                    { label: "Wind / Hurricane", sub: "Essential in FL — check sub-deductible carefully", value: windHurricane, onChange: setWindHurricane },
                    { label: "Business Interruption", sub: "Covers lost rent if building is damaged", value: businessInterruption, onChange: setBusinessInterruption },
                    { label: "Terrorism", sub: "", value: terrorism, onChange: setTerrorism },
                    { label: "Equipment Breakdown", sub: "", value: equipmentBreakdown, onChange: setEquipmentBreakdown },
                  ].map((toggle) => (
                    <div
                      key={toggle.label}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--tx, #e4e4ec)" }}>
                          {toggle.label}
                        </div>
                        {toggle.sub && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                            {toggle.sub}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggle.onChange(!toggle.value)}
                        className="w-11 h-6 rounded-full transition-all relative"
                        style={{
                          background: toggle.value ? "var(--acc, #7c6af0)" : "var(--s2, #18181f)",
                          border: `1px solid ${toggle.value ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                          style={{ left: toggle.value ? "22px" : "4px" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carrier preference */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2, #8888a0)" }}>
                  Carrier preference (optional)
                </label>
                <div className="flex gap-2">
                  {[
                    { label: "Any carrier", value: "any" as const },
                    { label: "A-rated or above", value: "a-rated" as const },
                    { label: "Exclude Travelers", value: "exclude-travelers" as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCarrierPreference(opt.value)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: carrierPreference === opt.value ? "var(--acc, #7c6af0)" : "var(--s1, #111116)",
                        border: `1px solid ${carrierPreference === opt.value ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                        color: carrierPreference === opt.value ? "#fff" : "var(--tx2, #8888a0)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setFlow("bind")}
                  className="flex-1 h-11 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx2, #8888a0)" }}
                >
                  ← Back to current quotes
                </button>
                <button
                  onClick={handleAdjustSubmit}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: "var(--acc, #7c6af0)", color: "#fff" }}
                >
                  ⚡ Get new quotes
                </button>
              </div>
            </div>
          </>
        )}

        {/* Flow 4: Dismiss Quote */}
        {flow === "dismiss" && (
          <>
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bdr, #252533)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    Not interested in {quote.carrier}?
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                    Tell us why and we&apos;ll improve future quotes
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                  style={{ color: "var(--tx3, #555568)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {DISMISS_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setDismissReason(reason)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                    style={{
                      background: dismissReason === reason ? "var(--s2, #18181f)" : "var(--s1, #111116)",
                      border: `1px solid ${dismissReason === reason ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)"}`,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: dismissReason === reason ? "var(--acc, #7c6af0)" : "var(--bdr, #252533)",
                        background: dismissReason === reason ? "var(--acc, #7c6af0)" : "transparent",
                      }}
                    >
                      {dismissReason === reason && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-sm" style={{ color: "var(--tx, #e4e4ec)" }}>
                      {reason}
                    </div>
                  </button>
                ))}
              </div>

              <textarea
                value={dismissNote}
                onChange={(e) => setDismissNote(e.target.value)}
                placeholder="Optional: anything else we should know? (e.g. 'had a bad claims experience with Travelers in 2023')"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all resize-none"
                style={{
                  background: "var(--s1, #111116)",
                  border: "1px solid var(--bdr, #252533)",
                  color: "var(--tx, #e4e4ec)",
                }}
              />

              <div className="text-xs text-center" style={{ color: "var(--tx3, #555568)" }}>
                This helps RealHQ learn your preferences. Future quotes will avoid carriers and terms you don&apos;t like.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setFlow("bind")}
                  className="flex-1 h-11 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx2, #8888a0)" }}
                >
                  ← Keep this quote
                </button>
                <button
                  onClick={handleDismissSubmit}
                  disabled={!dismissReason}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--acc, #7c6af0)", color: "#fff" }}
                >
                  Dismiss {quote.carrier} quote
                </button>
              </div>
            </div>
          </>
        )}

        {/* Flow 5: None Work */}
        {flow === "none-work" && (
          <>
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bdr, #252533)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                    None of these right for you?
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--tx3, #555568)" }}>
                    No problem. Here are your options.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                  style={{ color: "var(--tx3, #555568)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={() => setFlow("adjust")}
                className="w-full text-left p-4 rounded-xl transition-all hover:opacity-90"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
              >
                <div className="text-2xl mb-2">🔧</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx, #e4e4ec)" }}>
                  Adjust requirements &amp; re-quote
                </div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  Change cover level, deductible, policy type, or coverages and get fresh quotes instantly.
                </div>
              </button>

              <button
                className="w-full text-left p-4 rounded-xl transition-all hover:opacity-90"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
              >
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx, #e4e4ec)" }}>
                  Request a manual broker review
                </div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  A specialist CRE insurance broker reviews your portfolio and sources quotes from carriers not on CoverForce. Typically 2–3 business days.
                </div>
              </button>

              <button
                className="w-full text-left p-4 rounded-xl transition-all hover:opacity-90"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
              >
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx, #e4e4ec)" }}>
                  Save quotes &amp; come back later
                </div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  These quotes are valid for 30 days. We&apos;ll remind you 7 days before they expire.
                </div>
              </button>

              <button
                className="w-full text-left p-4 rounded-xl transition-all hover:opacity-90"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
              >
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx, #e4e4ec)" }}>
                  Tell us what you&apos;re looking for
                </div>
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  Describe what&apos;s missing and our system learns. Next time you quote, results will be closer to what you need.
                </div>
              </button>

              <div
                className="flex items-start gap-2 p-3 rounded-lg mt-4"
                style={{ background: "var(--s2, #18181f)", border: "1px solid var(--bdr, #252533)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--grn, #34d399)" }} />
                <div className="text-xs" style={{ color: "var(--tx3, #555568)" }}>
                  These quotes are saved. You can return to them from the insurance page any time within 30 days.
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full h-11 rounded-xl text-sm font-medium transition-all mt-3"
                style={{ background: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)", color: "var(--tx2, #8888a0)" }}
              >
                ← Back to insurance
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Backward Compatibility Wrappers ───────────────────────────────────
// These maintain the existing API for the insurance page while using the unified modal

type BindConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy: { premium: number };
  newQuote: Quote;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function BindConfirmModal({
  isOpen,
  onClose,
  currentPolicy,
  newQuote,
  onConfirm,
}: BindConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <InsuranceBindModal
      quote={newQuote}
      currentPremium={currentPolicy.premium}
      initialFlow="bind"
      onClose={onClose}
      onBind={onConfirm}
    />
  );
}

type BindSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boundQuote: Quote;
};

export function BindSuccessModal({ isOpen, onClose, boundQuote }: BindSuccessModalProps) {
  if (!isOpen) return null;
  return (
    <InsuranceBindModal
      quote={boundQuote}
      initialFlow="success"
      onClose={onClose}
    />
  );
}

type AdjustRequirementsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (params: AdjustRequirements) => void;
};

export function AdjustRequirementsModal({ isOpen, onClose, onAdjust }: AdjustRequirementsModalProps) {
  if (!isOpen) return null;
  // Use a dummy quote for adjust flow
  const dummyQuote: Quote = {
    id: "adjust",
    carrier: "Adjust",
    policyType: "Adjust Requirements",
    premium: 0,
    cover: 0,
    deductible: 0,
  };
  return (
    <InsuranceBindModal
      quote={dummyQuote}
      initialFlow="adjust"
      onClose={onClose}
      onAdjust={onAdjust}
    />
  );
}

type DismissQuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  onDismiss: (reason: string, note: string) => void;
};

export function DismissQuoteModal({ isOpen, onClose, quote, onDismiss }: DismissQuoteModalProps) {
  if (!isOpen) return null;
  return (
    <InsuranceBindModal
      quote={quote}
      initialFlow="dismiss"
      onClose={onClose}
      onDismiss={(_, reason, note) => onDismiss(reason, note || "")}
    />
  );
}

type NoQuotesWorkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRequestBroker?: () => void;
  onSaveQuotes?: () => void;
  onTellUsMore?: () => void;
};

export function NoQuotesWorkModal({ isOpen, onClose }: NoQuotesWorkModalProps) {
  if (!isOpen) return null;
  // Use a dummy quote for none-work flow
  const dummyQuote: Quote = {
    id: "none-work",
    carrier: "None",
    policyType: "None",
    premium: 0,
    cover: 0,
    deductible: 0,
  };
  return (
    <InsuranceBindModal
      quote={dummyQuote}
      initialFlow="none-work"
      onClose={onClose}
    />
  );
}

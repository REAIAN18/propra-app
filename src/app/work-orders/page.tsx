"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { workOrders, WorkOrder, WorkOrderStatus } from "@/lib/data/work-orders";
import {
  TENDER_JOB_TYPES,
  TENDER_CATEGORIES,
  getBenchmark,
  TenderCategory,
} from "@/lib/data/tender-benchmarks";
import { useLoading } from "@/hooks/useLoading";
import { useNav } from "@/components/layout/NavContext";
import Link from "next/link";

// ── Status config ─────────────────────────────────────────────────────────────

type FullStatus = WorkOrderStatus | "quotes_received";

const STATUS_META: Record<FullStatus, { label: string; color: string; badgeVariant: "gray" | "blue" | "amber" | "green" | "red" }> = {
  draft:           { label: "Draft",           color: "#9CA3AF", badgeVariant: "gray" },
  tendered:        { label: "Sent to Network", color: "#1647E8", badgeVariant: "blue" },
  quotes_received: { label: "Quotes Received", color: "#8B5CF6", badgeVariant: "blue" },
  awarded:         { label: "Awarded",         color: "#F5A94A", badgeVariant: "amber" },
  in_progress:     { label: "In Progress",     color: "#F5A94A", badgeVariant: "amber" },
  complete:        { label: "Complete",        color: "#0A8A4C", badgeVariant: "green" },
};

const STATUS_PIPELINE: FullStatus[] = ["draft", "tendered", "quotes_received", "awarded", "in_progress", "complete"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function overBenchmarkPct(order: WorkOrder) {
  return ((order.costEstimate - order.benchmarkCost) / order.benchmarkCost) * 100;
}

function CostCell({ order, sym }: { order: WorkOrder; sym: string }) {
  const pct = overBenchmarkPct(order);
  const isOver = pct > 15;
  const isUnder = pct < 0;
  const color = isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#111827";

  return (
    <div className="text-right">
      <div className="text-sm font-semibold" style={{ color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
        {fmt(order.costEstimate, sym)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: isOver ? "#f06040" : isUnder ? "#0A8A4C" : "#9CA3AF" }}>
        {isOver ? `+${pct.toFixed(0)}% over benchmark` : isUnder ? `${pct.toFixed(0)}% under` : `+${pct.toFixed(0)}% vs benchmark`}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserAssetOption { id: string; name: string; sqft?: number; currency: string }

interface TenderQuote {
  id: string;
  contractorName: string;
  price: number;
  warranty: string | null;
  timeline: string | null;
  rating: number | null;
  notes: string | null;
  awarded: boolean;
}

interface ApiWorkOrder {
  id: string;
  tenderType: string | null;
  jobType: string;
  description: string;
  scopeOfWorks: string | null;
  status: string;
  currency: string;
  budgetEstimate: number | null;
  benchmarkLow: number | null;
  benchmarkHigh: number | null;
  benchmarkSource: string | null;
  capRateValueAdd: number | null;
  costEstimate: number | null;
  contractor: string | null;
  targetStart: string | null;
  autoTriggerFrom: string | null;
  createdAt: string;
  asset: { name: string; location: string } | null;
  quotes: TenderQuote[];
}

// ── Brief Builder Modal ───────────────────────────────────────────────────────

const STEP_LABELS = ["Category", "Details", "Brief", "Review"];

interface BriefBuilderProps {
  assets: UserAssetOption[];
  onClose: () => void;
  onCreated: () => void;
  // optional pre-fill from auto-trigger
  prefilledJobType?: string;
  prefilledCategory?: TenderCategory;
  autoTriggerFrom?: string;
  autoTriggerRef?: string;
}

function BriefBuilderModal({
  assets,
  onClose,
  onCreated,
  prefilledJobType,
  prefilledCategory,
  autoTriggerFrom,
  autoTriggerRef,
}: BriefBuilderProps) {
  const [step, setStep] = useState(prefilledCategory ? 1 : 0);
  const [category, setCategory] = useState<TenderCategory | "">(prefilledCategory ?? "");
  const [jobKey, setJobKey] = useState(prefilledJobType ?? "");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [timing, setTiming] = useState("");
  const [targetStart, setTargetStart] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.id === assetId);
  const currency = selectedAsset?.currency === "USD" ? "USD" : "GBP";
  const sym = currency === "USD" ? "$" : "£";
  const jobTypes = TENDER_JOB_TYPES.filter((j) => !category || j.category === category);
  const selectedJob = TENDER_JOB_TYPES.find((j) => j.key === jobKey);
  const benchmark = jobKey ? getBenchmark(jobKey, currency as "GBP" | "USD", selectedAsset?.sqft) : null;
  const isCapital = category === "CAPITAL_WORKS" || category === "CONSTRUCTION" || category === "GREEN_ESG";

  // Cap rate value implication — rough: assume 6.5% cap rate, annual saving from typical range
  const capRateNote = (() => {
    if (!selectedJob?.valueAddNote) return null;
    return selectedJob.valueAddNote;
  })();

  async function handleSubmit() {
    if (!jobKey || !description.trim()) {
      setError("Please complete all required fields");
      return;
    }
    setSubmitting(true);
    setError(null);
    const jobType = selectedJob?.label ?? jobKey;

    try {
      const res = await fetch("/api/user/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenderType: category || null,
          jobType,
          assetId: assetId || undefined,
          description: description.trim(),
          accessNotes: accessNotes.trim() || undefined,
          timing: timing.trim() || undefined,
          targetStart: targetStart || undefined,
          benchmarkLow: benchmark?.low ?? undefined,
          benchmarkHigh: benchmark?.high ?? undefined,
          benchmarkSource: benchmark?.source ?? undefined,
          autoTriggerFrom: autoTriggerFrom ?? undefined,
          autoTriggerRef: autoTriggerRef ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create tender");
        return;
      }
      onCreated();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-xl rounded-2xl flex flex-col"
        style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#111827" }}>Start a Tender</h2>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}</p>
          </div>
          <button onClick={onClose} className="text-sm" style={{ color: "#9CA3AF" }}>✕</button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 pt-4 gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i <= step ? "#1647E8" : "#E5E7EB" }}
            />
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Step 0: Category */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "#374151" }}>What type of work do you need?</p>
              <div className="grid grid-cols-2 gap-2">
                {TENDER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => { setCategory(cat.key); setJobKey(""); }}
                    className="text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `1.5px solid ${category === cat.key ? "#1647E8" : "#E5E7EB"}`,
                      backgroundColor: category === cat.key ? "#EEF2FF" : "#F9FAFB",
                      color: category === cat.key ? "#1647E8" : "#374151",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Job type + asset */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
                  Specific work type
                </label>
                <select
                  value={jobKey}
                  onChange={(e) => setJobKey(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                >
                  <option value="">— Select —</option>
                  {jobTypes.map((j) => (
                    <option key={j.key} value={j.key}>{j.label}</option>
                  ))}
                </select>
              </div>

              {assets.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Property</label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                  >
                    <option value="">— No property —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Benchmark preview */}
              {benchmark && (
                <div
                  className="rounded-xl px-4 py-3 space-y-1"
                  style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "#0369A1" }}>Benchmark cost range</p>
                  <p className="text-lg font-bold" style={{ color: "#0369A1", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {sym}{benchmark.low.toLocaleString()} – {sym}{benchmark.high.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "#0369A1" }}>
                    {benchmark.unit} · Source: {benchmark.source}
                  </p>
                  {isCapital && capRateNote && (
                    <p className="text-xs mt-1" style={{ color: "#0369A1" }}>
                      {capRateNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Brief */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
                  Describe the work needed <span style={{ color: "#f06040" }}>*</span>
                </label>
                <p className="text-xs mb-2" style={{ color: "#9CA3AF" }}>
                  Write in plain English — RealHQ structures this into a formal brief for contractors.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={`e.g. Annual HVAC service and refrigerant check across all 3 rooftop units. Last serviced 14 months ago. One unit making intermittent noise.`}
                  className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                  style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Access requirements</label>
                <input
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  placeholder="e.g. Tenant in situ — 48 hours notice required. Roof access via plant room."
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Timing constraints</label>
                  <input
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    placeholder="e.g. Before Q2 2026"
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Target start date</label>
                  <input
                    type="date"
                    value={targetStart}
                    onChange={(e) => setTargetStart(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid #D1D5DB", color: "#111827" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>Work type</p>
                  <p className="text-sm font-semibold" style={{ color: "#111827" }}>{selectedJob?.label ?? jobKey}</p>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>{selectedJob?.categoryLabel}</p>
                </div>
                {selectedAsset && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>Property</p>
                    <p className="text-sm" style={{ color: "#111827" }}>{selectedAsset.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>Description</p>
                  <p className="text-sm" style={{ color: "#374151" }}>{description}</p>
                </div>
                {accessNotes && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>Access</p>
                    <p className="text-sm" style={{ color: "#374151" }}>{accessNotes}</p>
                  </div>
                )}
                {benchmark && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>Benchmark</p>
                    <p className="text-sm font-semibold" style={{ color: "#0369A1" }}>
                      {sym}{benchmark.low.toLocaleString()} – {sym}{benchmark.high.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>{benchmark.source}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <p className="text-xs" style={{ color: "#374151" }}>
                  <span style={{ color: "#0A8A4C", fontWeight: 600 }}>What happens next:</span>{" "}
                  RealHQ sends this brief to vetted contractors in your area — minimum 3 approached.
                  Quotes come back within 5 business days. You review and award.
                </p>
              </div>

              {error && <p className="text-xs" style={{ color: "#f06040" }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 flex gap-3" style={{ borderTop: "1px solid #E5E7EB" }}>
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
            >
              Cancel
            </button>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <button
              onClick={() => {
                if (step === 0 && !category) return;
                if (step === 1 && !jobKey) return;
                setStep((s) => s + 1);
              }}
              disabled={(step === 0 && !category) || (step === 1 && !jobKey)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: "#1647E8", color: "#fff", opacity: ((step === 0 && !category) || (step === 1 && !jobKey)) ? 0.4 : 1 }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: "#F5A94A", color: "#0B1622", opacity: (submitting || !description.trim()) ? 0.5 : 1 }}
            >
              {submitting ? "Saving…" : "Start Tender"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Quote Modal ───────────────────────────────────────────────────────────

interface AddQuoteModalProps {
  order: ApiWorkOrder;
  sym: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddQuoteModal({ order, sym, onClose, onAdded }: AddQuoteModalProps) {
  const [contractorName, setContractorName] = useState("");
  const [price, setPrice] = useState("");
  const [warranty, setWarranty] = useState("");
  const [timeline, setTimeline] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractorName.trim() || !price) {
      setError("Contractor name and price are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/work-orders/${order.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorName: contractorName.trim(),
          price: Number(price),
          warranty: warranty.trim() || undefined,
          timeline: timeline.trim() || undefined,
          rating: rating ? Number(rating) : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add quote");
        return;
      }
      onAdded();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#111827" }}>Add Quote Received</h2>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{order.jobType} · {order.asset?.name}</p>
          </div>
          <button onClick={onClose} style={{ color: "#9CA3AF" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Contractor name <span style={{ color: "#f06040" }}>*</span></label>
            <input
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="e.g. CoolAir Solutions"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
              Price ({sym}) <span style={{ color: "#f06040" }}>*</span>
              {order.benchmarkLow && order.benchmarkHigh && (
                <span className="font-normal ml-1" style={{ color: "#9CA3AF" }}>
                  Benchmark: {sym}{order.benchmarkLow.toLocaleString()}–{sym}{order.benchmarkHigh.toLocaleString()}
                </span>
              )}
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              placeholder="0"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Warranty</label>
              <input
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="12 months"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Timeline</label>
              <input
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="2 weeks"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Rating (0–5)</label>
              <input
                type="number"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                min={0}
                max={5}
                step={0.1}
                placeholder="4.5"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any relevant notes…"
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "#f06040" }}>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#8B5CF6", color: "#fff", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Adding…" : "Add Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Quote Comparison Table ────────────────────────────────────────────────────

interface QuoteComparisonProps {
  order: ApiWorkOrder;
  sym: string;
  onAward: (quoteId: string, contractorName: string, price: number) => Promise<void>;
  onAddQuote: () => void;
}

function QuoteComparison({ order, sym, onAward, onAddQuote }: QuoteComparisonProps) {
  const quotes = order.quotes ?? [];
  const hasBench = order.benchmarkLow != null && order.benchmarkHigh != null;
  const [awarding, setAwarding] = useState<string | null>(null);

  async function award(q: TenderQuote) {
    setAwarding(q.id);
    await onAward(q.id, q.contractorName, q.price);
    setAwarding(null);
  }

  const recommended = quotes.length > 0
    ? [...quotes].sort((a, b) => {
        // Recommend: lowest price within benchmark + highest rating
        const aInBench = hasBench ? a.price <= (order.benchmarkHigh ?? Infinity) : true;
        const bInBench = hasBench ? b.price <= (order.benchmarkHigh ?? Infinity) : true;
        if (aInBench && !bInBench) return -1;
        if (!aInBench && bInBench) return 1;
        const aScore = -(a.price * 0.6) + (a.rating ?? 0) * 1000;
        const bScore = -(b.price * 0.6) + (b.rating ?? 0) * 1000;
        return bScore - aScore;
      })[0]
    : null;

  return (
    <div className="space-y-3">
      {hasBench && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#0369A1" }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0369A1" }} />
          Benchmark: {sym}{order.benchmarkLow?.toLocaleString()} – {sym}{order.benchmarkHigh?.toLocaleString()}
          {order.benchmarkSource && <span style={{ color: "#9CA3AF" }}>· {order.benchmarkSource}</span>}
        </div>
      )}

      {/* Quote table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: "#9CA3AF" }}>
              <th className="text-left py-2 pr-4 font-medium">Contractor</th>
              <th className="text-right py-2 pr-4 font-medium">Price</th>
              {hasBench && <th className="text-right py-2 pr-4 font-medium">vs Benchmark</th>}
              <th className="text-right py-2 pr-4 font-medium">Warranty</th>
              <th className="text-right py-2 pr-4 font-medium">Timeline</th>
              {quotes.some((q) => q.rating) && <th className="text-right py-2 pr-4 font-medium">Rating</th>}
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const isRec = q.id === recommended?.id;
              const isOverBench = hasBench && order.benchmarkHigh != null && q.price > order.benchmarkHigh * 1.1;
              const pctVsBench = hasBench && order.benchmarkHigh != null
                ? ((q.price - order.benchmarkHigh) / order.benchmarkHigh) * 100
                : null;
              return (
                <tr
                  key={q.id}
                  style={{
                    backgroundColor: isRec ? "#F0FDF4" : "transparent",
                    borderRadius: isRec ? 8 : 0,
                  }}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      {isRec && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                        >
                          Best
                        </span>
                      )}
                      <span className="font-medium" style={{ color: "#111827" }}>{q.contractorName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span
                      className="font-semibold"
                      style={{
                        color: isOverBench ? "#f06040" : "#0A8A4C",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {sym}{q.price.toLocaleString()}
                    </span>
                  </td>
                  {hasBench && (
                    <td className="py-2.5 pr-4 text-right">
                      {pctVsBench !== null ? (
                        <span style={{ color: pctVsBench > 10 ? "#f06040" : "#0A8A4C" }}>
                          {pctVsBench > 0 ? "+" : ""}{pctVsBench.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </td>
                  )}
                  <td className="py-2.5 pr-4 text-right" style={{ color: "#6B7280" }}>{q.warranty ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-right" style={{ color: "#6B7280" }}>{q.timeline ?? "—"}</td>
                  {quotes.some((q) => q.rating) && (
                    <td className="py-2.5 pr-4 text-right" style={{ color: "#6B7280" }}>
                      {q.rating != null ? `${q.rating}★` : "—"}
                    </td>
                  )}
                  <td className="py-2.5">
                    <button
                      onClick={() => award(q)}
                      disabled={awarding === q.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: isRec ? "#0A8A4C" : "#F5A94A",
                        color: isRec ? "#fff" : "#0B1622",
                        opacity: awarding === q.id ? 0.6 : 1,
                      }}
                    >
                      {awarding === q.id ? "Awarding…" : "Award"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onAddQuote}
        className="text-xs font-medium"
        style={{ color: "#1647E8" }}
      >
        + Add another quote
      </button>
    </div>
  );
}

// ── Real-user work order card ─────────────────────────────────────────────────

interface OrderCardProps {
  order: ApiWorkOrder;
  sym: string;
  onTender: (id: string) => void;
  onAward: (id: string, quoteId: string, contractor: string, price: number) => Promise<void>;
  onAddQuote: (order: ApiWorkOrder) => void;
  tenderingIds: Set<string>;
}

function OrderCard({ order, sym, onTender, onAward, onAddQuote, tenderingIds }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[(order.status as FullStatus) ?? "draft"] ?? STATUS_META.draft;
  const isTendering = tenderingIds.has(order.id);
  const hasQuotes = (order.quotes?.length ?? 0) > 0;
  const hasBench = order.benchmarkLow != null && order.benchmarkHigh != null;

  const lowestQuote = hasQuotes
    ? [...order.quotes].sort((a, b) => a.price - b.price)[0]
    : null;
  const isOverBench = lowestQuote && hasBench && order.benchmarkHigh != null
    ? lowestQuote.price > order.benchmarkHigh * 1.1
    : false;

  return (
    <div style={{ borderBottom: "1px solid #E5E7EB" }}>
      <div
        className="flex items-center justify-between px-5 py-4 gap-3 hover:bg-[#F9FAFB] cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-8 w-1 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: meta.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-medium" style={{ color: "#111827" }}>{order.jobType}</span>
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              {order.autoTriggerFrom && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                  From {order.autoTriggerFrom}
                </span>
              )}
            </div>
            {order.asset && (
              <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                {order.asset.name} · {order.asset.location}
              </div>
            )}
            <div className="text-xs" style={{ color: "#D1D5DB" }}>{order.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {hasBench && !hasQuotes && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold" style={{ color: "#0369A1" }}>
                {sym}{order.benchmarkLow?.toLocaleString()}–{sym}{order.benchmarkHigh?.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>Benchmark</div>
            </div>
          )}

          {lowestQuote && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold" style={{ color: isOverBench ? "#f06040" : "#0A8A4C" }}>
                {sym}{lowestQuote.price.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>
                {(order.quotes?.length ?? 0)} quote{(order.quotes?.length ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {order.status === "draft" && (
            <button
              onClick={(e) => { e.stopPropagation(); onTender(order.id); }}
              disabled={isTendering}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#F5A94A", color: "#0B1622", opacity: isTendering ? 0.6 : 1 }}
            >
              {isTendering ? "Starting…" : "Start Tender"}
            </button>
          )}

          {order.status === "tendered" && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#1647E8" }} />
                <span className="text-xs font-medium" style={{ color: "#1647E8" }}>Awaiting quotes</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAddQuote(order); }}
                className="text-xs font-medium"
                style={{ color: "#8B5CF6" }}
              >
                + Add quote received
              </button>
            </div>
          )}

          {order.status === "quotes_received" && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "#8B5CF6", color: "#fff" }}
            >
              Compare quotes
            </button>
          )}

          {(order.status === "awarded" || order.status === "in_progress") && (
            <span className="text-xs" style={{ color: "#9CA3AF" }}>
              {order.contractor ? `Awarded — ${order.contractor}` : "In hand"}
            </span>
          )}

          <span className="text-xs" style={{ color: "#9CA3AF" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 ml-4">
          {order.scopeOfWorks && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#374151" }}>Formal brief</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>{order.scopeOfWorks}</p>
            </div>
          )}

          {order.status === "quotes_received" && hasQuotes && (
            <QuoteComparison
              order={order}
              sym={sym}
              onAward={async (quoteId, contractorName, price) => {
                await onAward(order.id, quoteId, contractorName, price);
              }}
              onAddQuote={() => onAddQuote(order)}
            />
          )}

          {order.status === "tendered" && (
            <button
              onClick={() => onAddQuote(order)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6", border: "1px solid #8B5CF640" }}
            >
              + Add quote received
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Real-user procurement view ────────────────────────────────────────────────

function RealUserWorkOrders() {
  const searchParams = useSearchParams();
  const triggerCategory = searchParams.get("category") as TenderCategory | null;
  const triggerJobKey = searchParams.get("jobKey");
  const triggerFrom = searchParams.get("from");
  const triggerRef = searchParams.get("ref");

  const [orders, setOrders] = useState<ApiWorkOrder[]>([]);
  const [assets, setAssets] = useState<UserAssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBriefBuilder, setShowBriefBuilder] = useState(!!triggerCategory);
  const [addQuoteOrder, setAddQuoteOrder] = useState<ApiWorkOrder | null>(null);
  const [tenderingIds, setTenderingIds] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/user/work-orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    fetch("/api/user/assets")
      .then((r) => r.json())
      .then((d) =>
        setAssets(
          (d.assets ?? []).map((a: { id: string; name: string; sqft?: number; currency?: string }) => ({
            id: a.id,
            name: a.name,
            sqft: a.sqft,
            currency: a.currency ?? "GBP",
          }))
        )
      )
      .catch(() => {});
  }, [reload]);

  async function handleTender(orderId: string) {
    setTenderingIds((prev) => new Set([...prev, orderId]));
    try {
      const res = await fetch(`/api/user/work-orders/${orderId}/tender`, { method: "POST" });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "tendered" } : o)));
      }
    } finally {
      setTenderingIds((prev) => {
        const s = new Set(prev);
        s.delete(orderId);
        return s;
      });
    }
  }

  async function handleAward(orderId: string, quoteId: string, contractorName: string, price: number) {
    const res = await fetch(`/api/user/work-orders/${orderId}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId, contractorName, awardedPrice: price }),
    });
    if (res.ok) {
      reload();
    }
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Procurement" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-4">
            {[0, 1, 2].map((i) => <CardSkeleton key={i} rows={3} />)}
          </div>
        </main>
      </AppShell>
    );
  }

  const sym = orders.find((o) => o.currency === "USD") ? "$" : "£";
  const activeOrders = orders.filter((o) => o.status !== "complete");
  const completeOrders = orders.filter((o) => o.status === "complete");

  return (
    <>
      {showBriefBuilder && (
        <BriefBuilderModal
          assets={assets}
          onClose={() => setShowBriefBuilder(false)}
          onCreated={() => { setShowBriefBuilder(false); reload(); }}
          prefilledCategory={triggerCategory ?? undefined}
          prefilledJobType={triggerJobKey ?? undefined}
          autoTriggerFrom={triggerFrom ?? undefined}
          autoTriggerRef={triggerRef ?? undefined}
        />
      )}
      {addQuoteOrder && (
        <AddQuoteModal
          order={addQuoteOrder}
          sym={sym}
          onClose={() => setAddQuoteOrder(null)}
          onAdded={() => { setAddQuoteOrder(null); reload(); }}
        />
      )}

      <AppShell>
        <TopBar title="Procurement" />
        <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "#111827" }}>Procurement</h1>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                {activeOrders.length} active tender{activeOrders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowBriefBuilder(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
            >
              + Start a Tender
            </button>
          </div>

          {orders.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center max-w-lg mx-auto mt-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F5A94A20" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="13" rx="2" stroke="#F5A94A" strokeWidth="1.5" />
                  <path d="M6 8H14M6 11H11" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 2V5M13 2V5" stroke="#F5A94A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-base font-semibold mb-2" style={{ color: "#111827" }}>No active tenders</h2>
              <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
                RealHQ gets you 3+ competing quotes from vetted contractors — maintenance, refurb,
                compliance, green upgrades. Every saving has a cap rate value implication.
              </p>
              <button
                onClick={() => setShowBriefBuilder(true)}
                className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90"
                style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
              >
                Start a Tender
              </button>
              <div className="text-xs mt-4" style={{ color: "#9CA3AF" }}>
                HVAC service · LED retrofit · Roof repair · EPC survey · Car park resurfacing
              </div>
            </div>
          ) : (
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader
                  title="Active Tenders"
                  subtitle={`${activeOrders.length} tender${activeOrders.length !== 1 ? "s" : ""}`}
                />
              </div>
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  sym={sym}
                  onTender={handleTender}
                  onAward={handleAward}
                  onAddQuote={setAddQuoteOrder}
                  tenderingIds={tenderingIds}
                />
              ))}
            </div>
          )}

          {completeOrders.length > 0 && (
            <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <SectionHeader title="Completed" subtitle={`${completeOrders.length} closed`} />
              </div>
              <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
                {completeOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>{order.jobType}</span>
                          <Badge variant="green">Complete</Badge>
                        </div>
                        {order.asset && (
                          <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>{order.asset.name}</div>
                        )}
                      </div>
                    </div>
                    {order.costEstimate && (
                      <div className="text-sm font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {sym}{order.costEstimate.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </AppShell>
    </>
  );
}

// ── Demo portfolio view ───────────────────────────────────────────────────────

function WorkOrdersInner() {
  const { portfolioId } = useNav();
  const loading = useLoading(450, portfolioId);
  const [tenderedIds, setTenderedIds] = useState<Set<string>>(new Set());

  const isRealUser = portfolioId === "user";

  if (isRealUser) {
    return <RealUserWorkOrders />;
  }

  const portfolio = portfolioId as "fl-mixed" | "se-logistics";
  const sym = portfolio === "fl-mixed" ? "$" : "£";

  const orders = workOrders.filter((o) => o.portfolio === portfolio);
  const activeOrders = orders.filter((o) => o.status !== "complete");
  const completeOrders = orders.filter((o) => o.status === "complete");

  const totalOutstanding = activeOrders.reduce((s, o) => s + o.costEstimate, 0);
  const benchmarkSavings = activeOrders
    .filter((o) => overBenchmarkPct(o) > 15)
    .reduce((s, o) => s + (o.costEstimate - o.benchmarkCost), 0);
  const overBenchmarkCount = activeOrders.filter((o) => overBenchmarkPct(o) > 15).length;

  const sortedOrders = [...orders].sort((a, b) => {
    const statusOrder: WorkOrderStatus[] = ["in_progress", "awarded", "tendered", "draft", "complete"];
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  return (
    <AppShell>
      <TopBar title="Procurement" />
      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {loading ? (
          <CardSkeleton rows={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Outstanding Work", value: fmt(totalOutstanding, sym), valueColor: "#F5A94A", sub: `${activeOrders.length} active` },
              { label: "Over Benchmark", value: String(overBenchmarkCount), valueColor: overBenchmarkCount > 0 ? "#FF8080" : "#5BF0AC", sub: overBenchmarkCount > 0 ? "Quotes >15% above rate" : "All at benchmark" },
              { label: "Savings Available", value: fmt(benchmarkSavings, sym), valueColor: benchmarkSavings > 0 ? "#5BF0AC" : "#6B7280", sub: "Via retendering" },
              { label: "Completed", value: String(completeOrders.length), valueColor: "#5BF0AC", sub: "orders closed" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
                <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>{c.label}</p>
                <p className="text-2xl font-bold mb-0.5" style={{ color: c.valueColor, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{c.value}</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Active Work Orders" subtitle={`${activeOrders.length} orders`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {sortedOrders.filter((o) => o.status !== "complete").map((order) => {
                const meta = STATUS_META[order.status] ?? STATUS_META.draft;
                const pct = overBenchmarkPct(order);
                const isOver = pct > 15;
                const isTendered = tenderedIds.has(order.id);

                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-3 hover:bg-[#F9FAFB]">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-8 w-1 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: isOver && !isTendered ? "#f06040" : meta.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#111827" }}>{order.jobType}</span>
                          <Badge variant={isTendered ? "blue" : meta.badgeVariant}>
                            {isTendered ? "Sent to Network" : meta.label}
                          </Badge>
                          {isOver && !isTendered && <Badge variant="red">+{pct.toFixed(0)}% over benchmark</Badge>}
                        </div>
                        <div className="text-xs mb-0.5" style={{ color: "#9CA3AF" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline">{order.assetName}</Link>
                          {" "}· {order.assetLocation}
                        </div>
                        <div className="text-xs" style={{ color: "#D1D5DB" }}>{order.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <CostCell order={order} sym={sym} />
                      {isTendered ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#1647E8" }} />
                          <span className="text-xs font-medium" style={{ color: "#1647E8" }}>Awaiting quotes</span>
                        </div>
                      ) : order.status === "draft" || order.status === "tendered" ? (
                        <button
                          onClick={() => setTenderedIds((prev) => new Set([...prev, order.id]))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                          style={{ backgroundColor: "#F5A94A", color: "#0B1622" }}
                        >
                          {isOver ? "Retender" : "Start Tender"}
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>In hand</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && completeOrders.length > 0 && (
          <div className="rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
              <SectionHeader title="Completed" subtitle={`${completeOrders.length} orders closed`} />
            </div>
            <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
              {completeOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "#0A8A4C" }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "#6B7280" }}>{order.jobType}</span>
                        <Badge variant="green">Complete</Badge>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#D1D5DB" }}>
                        <Link href={`/assets/${order.assetId}`} className="hover:underline">{order.assetName}</Link>
                        {order.contractor ? ` · ${order.contractor}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {fmt(order.costEstimate, sym)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export default function WorkOrdersPage() {
  return (
    <Suspense>
      <WorkOrdersInner />
    </Suspense>
  );
}

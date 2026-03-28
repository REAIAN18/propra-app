"use client";

export const dynamic = "force-dynamic";

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
  draft:           { label: "Draft",           color: "var(--tx3)", badgeVariant: "gray" },
  tendered:        { label: "Sent to Network", color: "var(--acc)", badgeVariant: "blue" },
  quotes_received: { label: "Quotes Received", color: "var(--acc)", badgeVariant: "blue" },
  awarded:         { label: "Awarded",         color: "var(--amb)", badgeVariant: "amber" },
  in_progress:     { label: "In Progress",     color: "var(--amb)", badgeVariant: "amber" },
  complete:        { label: "Complete",        color: "var(--grn)", badgeVariant: "green" },
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
  const color = isOver ? "var(--red)" : isUnder ? "var(--grn)" : "var(--tx)";

  return (
    <div className="text-right">
      <div className="text-sm font-semibold" style={{ color, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
        {fmt(order.costEstimate, sym)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: isOver ? "var(--red)" : isUnder ? "var(--grn)" : "var(--tx3)" }}>
        {isOver ? `+${pct.toFixed(0)}% over benchmark` : isUnder ? `${pct.toFixed(0)}% under` : `+${pct.toFixed(0)}% vs benchmark`}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserAssetOption { id: string; name: string; sqft?: number; currency: string; assetType?: string }

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
  const [scopeGenerating, setScopeGenerating] = useState(false);
  const [generatedScope, setGeneratedScope] = useState<string | null>(null);

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

  async function generateScope() {
    if (!description.trim() || !jobKey) return;
    setScopeGenerating(true);
    try {
      const jobType = selectedJob?.label ?? jobKey;
      const res = await fetch("/api/user/work-orders/preview/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          jobType,
          assetType: selectedAsset?.assetType ?? undefined,
          sqft:      selectedAsset?.sqft ?? undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { scopeOfWorks?: string };
        if (data.scopeOfWorks) setGeneratedScope(data.scopeOfWorks);
      }
    } catch {
      // Non-fatal — user can proceed without generated scope
    } finally {
      setScopeGenerating(false);
    }
  }

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
        style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>Start a Tender</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}</p>
          </div>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--tx3)" }}>✕</button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 pt-4 gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i <= step ? "var(--acc)" : "var(--bdr)" }}
            />
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Step 0: Category */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--tx2)" }}>What type of work do you need?</p>
              <div className="grid grid-cols-2 gap-2">
                {TENDER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => { setCategory(cat.key); setJobKey(""); }}
                    className="text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `1.5px solid ${category === cat.key ? "var(--acc)" : "var(--bdr)"}`,
                      backgroundColor: category === cat.key ? "var(--acc-lt)" : "var(--s2)",
                      color: category === cat.key ? "var(--acc)" : "var(--tx2)",
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
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
                  Specific work type
                </label>
                <select
                  value={jobKey}
                  onChange={(e) => setJobKey(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
                >
                  <option value="">— Select —</option>
                  {jobTypes.map((j) => (
                    <option key={j.key} value={j.key}>{j.label}</option>
                  ))}
                </select>
              </div>

              {assets.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Property</label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
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
                  style={{ backgroundColor: "var(--acc-lt)", border: "1px solid var(--acc-bdr)" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "var(--acc)" }}>Benchmark cost range</p>
                  <p className="text-lg font-bold" style={{ color: "var(--acc)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                    {sym}{benchmark.low.toLocaleString()} – {sym}{benchmark.high.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--acc)" }}>
                    {benchmark.unit} · Source: {benchmark.source}
                  </p>
                  {isCapital && capRateNote && (
                    <p className="text-xs mt-1" style={{ color: "var(--acc)" }}>
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
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
                  Describe the work needed <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--tx3)" }}>
                  Write in plain English — RealHQ structures this into a formal brief for contractors.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={`e.g. Annual HVAC service and refrigerant check across all 3 rooftop units. Last serviced 14 months ago. One unit making intermittent noise.`}
                  className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                  style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
                {description.trim().length > 20 && jobKey && (
                  <button
                    type="button"
                    onClick={generateScope}
                    disabled={scopeGenerating}
                    className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
                    style={{ backgroundColor: "var(--acc)20", color: "var(--acc)", border: "1px solid var(--acc)40", opacity: scopeGenerating ? 0.6 : 1 }}
                  >
                    {scopeGenerating ? "Generating scope…" : "Generate scope →"}
                  </button>
                )}
                {generatedScope && (
                  <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: "var(--acc-lt)", border: "1px solid var(--acc-bdr)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold" style={{ color: "var(--acc)" }}>Generated scope of works</p>
                      <button
                        type="button"
                        onClick={() => setGeneratedScope(null)}
                        className="text-xs"
                        style={{ color: "var(--tx3)" }}
                      >dismiss</button>
                    </div>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--tx2)" }}>{generatedScope}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Access requirements</label>
                <input
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  placeholder="e.g. Tenant in situ — 48 hours notice required. Roof access via plant room."
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Timing constraints</label>
                  <input
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    placeholder="e.g. Before Q2 2026"
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Target start date</label>
                  <input
                    type="date"
                    value={targetStart}
                    onChange={(e) => setTargetStart(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--tx3)" }}>Work type</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{selectedJob?.label ?? jobKey}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{selectedJob?.categoryLabel}</p>
                </div>
                {selectedAsset && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--tx3)" }}>Property</p>
                    <p className="text-sm" style={{ color: "var(--tx)" }}>{selectedAsset.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--tx3)" }}>Description</p>
                  <p className="text-sm" style={{ color: "var(--tx2)" }}>{description}</p>
                </div>
                {accessNotes && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--tx3)" }}>Access</p>
                    <p className="text-sm" style={{ color: "var(--tx2)" }}>{accessNotes}</p>
                  </div>
                )}
                {benchmark && (
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--tx3)" }}>Benchmark</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--acc)" }}>
                      {sym}{benchmark.low.toLocaleString()} – {sym}{benchmark.high.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: "var(--tx3)" }}>{benchmark.source}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}>
                <p className="text-xs" style={{ color: "var(--tx2)" }}>
                  <span style={{ color: "var(--grn)", fontWeight: 600 }}>What happens next:</span>{" "}
                  RealHQ sends this brief to vetted contractors in your area — minimum 3 approached.
                  Quotes come back within 5 business days. You review and award.
                </p>
              </div>

              {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 flex gap-3" style={{ borderTop: "1px solid var(--bdr)" }}>
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid var(--bdr)", color: "var(--tx2)" }}
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: "1px solid var(--bdr)", color: "var(--tx2)" }}
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
              style={{ backgroundColor: "var(--acc)", color: "#fff", opacity: ((step === 0 && !category) || (step === 1 && !jobKey)) ? 0.4 : 1 }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: "var(--amb)", color: "var(--s1)", opacity: (submitting || !description.trim()) ? 0.5 : 1 }}
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

interface ContractorHint { id: string; name: string; rating: number; jobCount: number; verified: boolean }

function AddQuoteModal({ order, sym, onClose, onAdded }: AddQuoteModalProps) {
  const [contractorName, setContractorName] = useState("");
  const [price, setPrice] = useState("");
  const [warranty, setWarranty] = useState("");
  const [timeline, setTimeline] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedContractors, setSuggestedContractors] = useState<ContractorHint[]>([]);

  useEffect(() => {
    const trade = encodeURIComponent(order.jobType ?? "");
    fetch(`/api/user/contractors${trade ? `?trade=${trade}` : ""}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contractors: ContractorHint[] } | null) => {
        if (d?.contractors?.length) setSuggestedContractors(d.contractors.slice(0, 4));
      })
      .catch(() => {});
  }, [order.jobType]);

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
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>Add Quote Received</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>{order.jobType} · {order.asset?.name}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--tx3)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {suggestedContractors.length > 0 && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: "var(--tx3)" }}>Vetted contractors in your area</div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedContractors.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContractorName(c.name)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: contractorName === c.name ? "var(--grn-lt)" : "var(--s2)",
                      color: contractorName === c.name ? "var(--grn)" : "var(--tx2)",
                      border: `1px solid ${contractorName === c.name ? "var(--grn)" : "var(--bdr)"}`,
                    }}
                  >
                    {c.name}{c.verified ? " ✓" : ""} · ★{c.rating.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Contractor name <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="e.g. CoolAir Solutions"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
              Price ({sym}) <span style={{ color: "var(--red)" }}>*</span>
              {order.benchmarkLow && order.benchmarkHigh && (
                <span className="font-normal ml-1" style={{ color: "var(--tx3)" }}>
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
              style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Warranty</label>
              <input
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="12 months"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Timeline</label>
              <input
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="2 weeks"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Rating (0–5)</label>
              <input
                type="number"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                min={0}
                max={5}
                step={0.1}
                placeholder="4.5"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any relevant notes…"
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--bdr)", color: "var(--tx2)" }}>Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "var(--acc)", color: "#fff", opacity: submitting ? 0.6 : 1 }}
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
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--acc)" }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--acc)" }} />
          Benchmark: {sym}{order.benchmarkLow?.toLocaleString()} – {sym}{order.benchmarkHigh?.toLocaleString()}
          {order.benchmarkSource && <span style={{ color: "var(--tx3)" }}>· {order.benchmarkSource}</span>}
        </div>
      )}

      {/* Quote table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: "var(--tx3)" }}>
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
                    backgroundColor: isRec ? "var(--grn-lt)" : "transparent",
                    borderRadius: isRec ? 8 : 0,
                  }}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      {isRec && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: "var(--grn)", color: "#fff" }}
                        >
                          Best
                        </span>
                      )}
                      <span className="font-medium" style={{ color: "var(--tx)" }}>{q.contractorName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span
                      className="font-semibold"
                      style={{
                        color: isOverBench ? "var(--red)" : "var(--grn)",
                        fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {sym}{q.price.toLocaleString()}
                    </span>
                  </td>
                  {hasBench && (
                    <td className="py-2.5 pr-4 text-right">
                      {pctVsBench !== null ? (
                        <span style={{ color: pctVsBench > 10 ? "var(--red)" : "var(--grn)" }}>
                          {pctVsBench > 0 ? "+" : ""}{pctVsBench.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </td>
                  )}
                  <td className="py-2.5 pr-4 text-right" style={{ color: "var(--tx2)" }}>{q.warranty ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-right" style={{ color: "var(--tx2)" }}>{q.timeline ?? "—"}</td>
                  {quotes.some((q) => q.rating) && (
                    <td className="py-2.5 pr-4 text-right" style={{ color: "var(--tx2)" }}>
                      {q.rating != null ? `${q.rating}★` : "—"}
                    </td>
                  )}
                  <td className="py-2.5">
                    <button
                      onClick={() => award(q)}
                      disabled={awarding === q.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: isRec ? "var(--grn)" : "var(--amb)",
                        color: isRec ? "#fff" : "var(--s1)",
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
        style={{ color: "var(--acc)" }}
      >
        + Add another quote
      </button>
    </div>
  );
}

// ── Complete Job Modal ────────────────────────────────────────────────────────

function CompleteJobModal({
  order,
  sym,
  onClose,
  onComplete,
}: {
  order: ApiWorkOrder;
  sym: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [finalCost, setFinalCost] = useState(
    order.quotes?.find((q) => q.awarded)?.price?.toString() ?? ""
  );
  const [clientRating, setClientRating] = useState<number | null>(null);
  const [clientNote, setClientNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = parseFloat(finalCost.replace(/[^0-9.]/g, "")) || 0;
  const commission = cost > 0 ? Math.round(cost * 0.03 * 100) / 100 : 0;

  async function handleComplete() {
    if (!cost || cost <= 0) { setError("Final cost is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/work-orders/${order.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalCost: cost,
          clientRating: clientRating ?? undefined,
          clientNote:   clientNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Completion failed");
        return;
      }
      onComplete();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--tx)" }}>Mark Job Complete</h3>
          <p className="text-xs mt-1" style={{ color: "var(--tx2)" }}>{order.jobType} · {order.asset?.name}</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>
            Final cost <span style={{ color: "var(--red)" }}>*</span>
            {order.benchmarkLow && order.benchmarkHigh && (
              <span className="ml-2 font-normal" style={{ color: "var(--tx3)" }}>
                (benchmark: {sym}{order.benchmarkLow.toLocaleString()} – {sym}{order.benchmarkHigh.toLocaleString()})
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--tx2)" }}>{sym}</span>
            <input
              type="text"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg pl-7 pr-3 py-2.5 text-sm"
              style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--tx2)" }}>Rate contractor</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setClientRating(star === clientRating ? null : star)}
                className="text-xl"
                style={{ color: star <= (clientRating ?? 0) ? "var(--amb)" : "var(--bdr)" }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tx2)" }}>Note (optional)</label>
          <textarea
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
            rows={2}
            placeholder="Any feedback on the contractor or work quality…"
            className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
            style={{ border: "1px solid var(--bdr)", color: "var(--tx)" }}
          />
        </div>

        {commission > 0 && (
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--grn-lt)", border: "1px solid var(--grn-bdr)" }}>
            <p className="text-xs" style={{ color: "var(--tx2)" }}>
              <span style={{ color: "var(--grn)", fontWeight: 600 }}>Commission:</span>{" "}
              3% of final cost — {sym}{commission.toLocaleString()} will be invoiced by RealHQ on completion.
            </p>
          </div>
        )}

        {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--bdr)", color: "var(--tx2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={submitting || !cost}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
            style={{ backgroundColor: "var(--grn)", color: "#fff", opacity: submitting || !cost ? 0.5 : 1 }}
          >
            {submitting ? "Confirming…" : "Confirm completion"}
          </button>
        </div>
      </div>
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

interface WorkOrderMilestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
}

function OrderCard({ order, sym, onTender, onAward, onAddQuote, tenderingIds }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[(order.status as FullStatus) ?? "draft"] ?? STATUS_META.draft;
  const isTendering = tenderingIds.has(order.id);
  const hasQuotes = (order.quotes?.length ?? 0) > 0;
  const hasBench = order.benchmarkLow != null && order.benchmarkHigh != null;
  const [starting, setStarting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [milestones, setMilestones] = useState<WorkOrderMilestone[] | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  useEffect(() => {
    if (!expanded || order.status !== "in_progress") return;
    if (milestones !== null) return; // already loaded
    fetch(`/api/user/work-orders/${order.id}/milestones`)
      .then((r) => r.json())
      .then((data: { milestones?: WorkOrderMilestone[] }) => setMilestones(data.milestones ?? []))
      .catch(() => setMilestones([]));
  }, [expanded, order.id, order.status, milestones]);

  async function toggleMilestone(milestoneId: string, currentStatus: string) {
    const newStatus = currentStatus === "complete" ? "pending" : "complete";
    setMilestones((prev) =>
      prev?.map((m) => m.id === milestoneId ? { ...m, status: newStatus } : m) ?? null
    );
    await fetch(`/api/user/work-orders/${order.id}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  }

  async function postProgressNote() {
    if (!progressNote.trim() || postingNote) return;
    setPostingNote(true);
    try {
      await fetch(`/api/user/work-orders/${order.id}/milestone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: progressNote.trim(), type: "update" }),
      });
      setProgressNote("");
    } catch { /* non-fatal */ } finally {
      setPostingNote(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/user/work-orders/${order.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) window.location.reload();
    } catch { /* non-fatal */ } finally { setStarting(false); }
  }

  const lowestQuote = hasQuotes
    ? [...order.quotes].sort((a, b) => a.price - b.price)[0]
    : null;
  const isOverBench = lowestQuote && hasBench && order.benchmarkHigh != null
    ? lowestQuote.price > order.benchmarkHigh * 1.1
    : false;

  return (
    <div style={{ borderBottom: "1px solid var(--bdr)" }}>
      <div
        className="flex items-center justify-between px-5 py-4 gap-3 hover:bg-[var(--s2)] cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-8 w-1 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: meta.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{order.jobType}</span>
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              {order.autoTriggerFrom && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--amb-lt)", color: "var(--amb)" }}>
                  From {order.autoTriggerFrom}
                </span>
              )}
            </div>
            {order.asset && (
              <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>
                {order.asset.name} · {order.asset.location}
              </div>
            )}
            <div className="text-xs" style={{ color: "var(--bdr)" }}>{order.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {hasBench && !hasQuotes && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold" style={{ color: "var(--acc)" }}>
                {sym}{order.benchmarkLow?.toLocaleString()}–{sym}{order.benchmarkHigh?.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>Benchmark</div>
            </div>
          )}

          {lowestQuote && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold" style={{ color: isOverBench ? "var(--red)" : "var(--grn)" }}>
                {sym}{lowestQuote.price.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {(order.quotes?.length ?? 0)} quote{(order.quotes?.length ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {order.status === "draft" && (
            <button
              onClick={(e) => { e.stopPropagation(); onTender(order.id); }}
              disabled={isTendering}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--amb)", color: "var(--s1)", opacity: isTendering ? 0.6 : 1 }}
            >
              {isTendering ? "Starting…" : "Start Tender"}
            </button>
          )}

          {order.status === "tendered" && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--acc)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--acc)" }}>Awaiting quotes</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAddQuote(order); }}
                className="text-xs font-medium"
                style={{ color: "var(--acc)" }}
              >
                + Add quote received
              </button>
            </div>
          )}

          {order.status === "quotes_received" && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "var(--acc)", color: "#fff" }}
            >
              Compare quotes
            </button>
          )}

          {order.status === "awarded" && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--tx3)" }}>
                {order.contractor ? `Awarded — ${order.contractor}` : "Awarded"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleStart(); }}
                disabled={starting}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "var(--amb)", color: "var(--s1)", opacity: starting ? 0.6 : 1 }}
              >
                {starting ? "Starting…" : "Start job →"}
              </button>
            </div>
          )}

          {order.status === "in_progress" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--amb)" }}>In progress</span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCompleteModal(true); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "var(--grn)", color: "#fff" }}
              >
                Complete job
              </button>
            </div>
          )}

          <span className="text-xs" style={{ color: "var(--tx3)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 ml-4">
          {order.scopeOfWorks && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--tx2)" }}>Formal brief</p>
              <p className="text-xs" style={{ color: "var(--tx2)" }}>{order.scopeOfWorks}</p>
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
              style={{ backgroundColor: "var(--acc)20", color: "var(--acc)", border: "1px solid var(--acc)40" }}
            >
              + Add quote received
            </button>
          )}

          {order.status === "in_progress" && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postProgressNote(); } }}
                placeholder="Post a progress update…"
                className="flex-1 text-xs px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--bdr)", color: "var(--tx2)", outline: "none" }}
              />
              <button
                onClick={postProgressNote}
                disabled={!progressNote.trim() || postingNote}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "var(--acc)", color: "#fff" }}
              >
                {postingNote ? "Posting…" : "Post"}
              </button>
            </div>
          )}

          {order.status === "in_progress" && milestones !== null && milestones.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--tx2)" }}>
                Milestones ({milestones.filter((m) => m.status === "complete").length}/{milestones.length} done)
              </p>
              <div className="space-y-1.5">
                {milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); toggleMilestone(m.id, m.status); }}
                    className="w-full flex items-center gap-2.5 text-left transition-opacity hover:opacity-80"
                  >
                    <div
                      className="h-4 w-4 rounded shrink-0 flex items-center justify-center"
                      style={{
                        border: m.status === "complete" ? "none" : "1.5px solid var(--bdr)",
                        backgroundColor: m.status === "complete" ? "var(--grn)" : "transparent",
                      }}
                    >
                      {m.status === "complete" && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        color: m.status === "complete" ? "var(--tx3)" : "var(--tx2)",
                        textDecoration: m.status === "complete" ? "line-through" : "none",
                      }}
                    >
                      {m.title}
                      {m.dueDate && m.status !== "complete" && (
                        <span className="ml-1.5" style={{ color: "var(--tx3)" }}>
                          · due {new Date(m.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCompleteModal && (
        <CompleteJobModal
          order={order}
          sym={sym}
          onClose={() => setShowCompleteModal(false)}
          onComplete={() => window.location.reload()}
        />
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
              <h1 className="text-lg font-semibold" style={{ color: "var(--tx)" }}>Procurement</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                {activeOrders.length} active tender{activeOrders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowBriefBuilder(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--amb)", color: "var(--s1)" }}
            >
              + Start a Tender
            </button>
          </div>

          {orders.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center max-w-lg mx-auto mt-6"
              style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--amb)20" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="13" rx="2" stroke="var(--amb)" strokeWidth="1.5" />
                  <path d="M6 8H14M6 11H11" stroke="var(--amb)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 2V5M13 2V5" stroke="var(--amb)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--tx)" }}>No active tenders</h2>
              <p className="text-sm mb-5" style={{ color: "var(--tx2)" }}>
                RealHQ gets you 3+ competing quotes from vetted contractors — maintenance, refurb,
                compliance, green upgrades. Every saving has a cap rate value implication.
              </p>
              <button
                onClick={() => setShowBriefBuilder(true)}
                className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90"
                style={{ backgroundColor: "var(--amb)", color: "var(--s1)" }}
              >
                Start a Tender
              </button>
              <div className="text-xs mt-4" style={{ color: "var(--tx3)" }}>
                HVAC service · LED retrofit · Roof repair · EPC survey · Car park resurfacing
              </div>
            </div>
          ) : (
            <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
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
            <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
                <SectionHeader title="Completed" subtitle={`${completeOrders.length} closed`} />
              </div>
              <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
                {completeOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "var(--grn)" }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{order.jobType}</span>
                          <Badge variant="green">Complete</Badge>
                        </div>
                        {order.asset && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--bdr)" }}>{order.asset.name}</div>
                        )}
                      </div>
                    </div>
                    {order.costEstimate && (
                      <div className="text-sm font-semibold" style={{ color: "var(--tx2)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
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
              { label: "Outstanding Work", value: fmt(totalOutstanding, sym), valueColor: "var(--amb)", sub: `${activeOrders.length} active` },
              { label: "Over Benchmark", value: String(overBenchmarkCount), valueColor: overBenchmarkCount > 0 ? "var(--red)" : "var(--grn)", sub: overBenchmarkCount > 0 ? "Quotes >15% above rate" : "All at benchmark" },
              { label: "Savings Available", value: fmt(benchmarkSavings, sym), valueColor: benchmarkSavings > 0 ? "var(--grn)" : "var(--tx2)", sub: "Via retendering" },
              { label: "Completed", value: String(completeOrders.length), valueColor: "var(--grn)", sub: "orders closed" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--tx3)" }}>{c.label}</p>
                <p className="text-2xl font-bold mb-0.5" style={{ color: c.valueColor, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>{c.value}</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <SectionHeader title="Active Work Orders" subtitle={`${activeOrders.length} orders`} />
            </div>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {sortedOrders.filter((o) => o.status !== "complete").map((order) => {
                const meta = STATUS_META[order.status] ?? STATUS_META.draft;
                const pct = overBenchmarkPct(order);
                const isOver = pct > 15;
                const isTendered = tenderedIds.has(order.id);

                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-4 gap-3 hover:bg-[var(--s2)]">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-8 w-1 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: isOver && !isTendered ? "var(--red)" : meta.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{order.jobType}</span>
                          <Badge variant={isTendered ? "blue" : meta.badgeVariant}>
                            {isTendered ? "Sent to Network" : meta.label}
                          </Badge>
                          {isOver && !isTendered && <Badge variant="red">+{pct.toFixed(0)}% over benchmark</Badge>}
                        </div>
                        <div className="text-xs mb-0.5" style={{ color: "var(--tx3)" }}>
                          <Link href={`/assets/${order.assetId}`} className="hover:underline">{order.assetName}</Link>
                          {" "}· {order.assetLocation}
                        </div>
                        <div className="text-xs" style={{ color: "var(--bdr)" }}>{order.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <CostCell order={order} sym={sym} />
                      {isTendered ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--acc)" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--acc)" }}>Awaiting quotes</span>
                        </div>
                      ) : order.status === "draft" || order.status === "tendered" ? (
                        <button
                          onClick={() => setTenderedIds((prev) => new Set([...prev, order.id]))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                          style={{ backgroundColor: "var(--amb)", color: "var(--s1)" }}
                        >
                          {isOver ? "Retender" : "Start Tender"}
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--tx3)" }}>In hand</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && completeOrders.length > 0 && (
          <div className="rounded-xl" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
              <SectionHeader title="Completed" subtitle={`${completeOrders.length} orders closed`} />
            </div>
            <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
              {completeOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-6 w-1 rounded-full shrink-0" style={{ backgroundColor: "var(--grn)" }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{order.jobType}</span>
                        <Badge variant="green">Complete</Badge>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--bdr)" }}>
                        <Link href={`/assets/${order.assetId}`} className="hover:underline">{order.assetName}</Link>
                        {order.contractor ? ` · ${order.contractor}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tx2)", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
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

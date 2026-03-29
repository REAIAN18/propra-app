"use client";

import { useState } from "react";

// ── AI Scope Generator Component (PRO-802) ──────────────────────────────────
// Generates detailed scope of work using Claude AI

interface WorkItem {
  item: string;
  quantity: string;
  specification: string;
  unitCost: number | null;
}

interface ScopeData {
  scopeSummary: string;
  workItems: WorkItem[];
  safetyRequirements: string[];
  accessArrangements: string;
  exclusions: string[];
  assumptions: string[];
  estimatedDuration: string;
  tradeRequired: string;
}

interface AIScopeGeneratorProps {
  workOrderId: string;
  existingScope?: ScopeData | null;
  onGenerated: (scope: ScopeData) => void;
}

export function AIScopeGenerator({
  workOrderId,
  existingScope,
  onGenerated,
}: AIScopeGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeData | null>(existingScope || null);
  const [editing, setEditing] = useState(false);

  async function generateScope() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/generate-scope`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate scope");
      }

      const data = await res.json();
      setScope(data.scope);
      onGenerated(data.scope);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  function updateWorkItem(index: number, field: keyof WorkItem, value: any) {
    if (!scope) return;
    const newItems = [...scope.workItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setScope({ ...scope, workItems: newItems });
  }

  function addWorkItem() {
    if (!scope) return;
    setScope({
      ...scope,
      workItems: [
        ...scope.workItems,
        { item: "", quantity: "", specification: "", unitCost: null },
      ],
    });
  }

  function removeWorkItem(index: number) {
    if (!scope) return;
    setScope({
      ...scope,
      workItems: scope.workItems.filter((_, i) => i !== index),
    });
  }

  if (!scope) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="text-center">
          <div className="mb-3">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--acc)"
              strokeWidth="1.5"
              style={{ margin: "0 auto" }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
            Generate Detailed Scope
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--tx3)", maxWidth: "400px", margin: "0 auto 16px" }}>
            RealHQ AI will generate a comprehensive scope of work including work items, safety requirements, and contractor specifications.
          </p>
          <button
            onClick={generateScope}
            disabled={generating}
            className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--acc)", color: "#fff" }}
          >
            {generating ? "Generating..." : "Generate Scope with AI →"}
          </button>
          {error && (
            <div className="mt-4 px-4 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(248, 113, 113, 0.1)", color: "var(--red)" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
          Scope of Work
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: editing ? "var(--acc)" : "transparent",
              color: editing ? "#fff" : "var(--tx2)",
              border: `1px solid ${editing ? "var(--acc)" : "var(--bdr)"}`,
            }}
          >
            {editing ? "Done Editing" : "Edit Scope"}
          </button>
          <button
            onClick={generateScope}
            disabled={generating}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "transparent", color: "var(--acc)", border: "1px solid var(--bdr)" }}
          >
            {generating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="text-[9px] font-medium uppercase tracking-wide mb-2" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
          Summary
        </div>
        {editing ? (
          <textarea
            value={scope.scopeSummary}
            onChange={(e) => setScope({ ...scope, scopeSummary: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)", minHeight: "60px" }}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--tx2)" }}>
            {scope.scopeSummary}
          </p>
        )}
      </div>

      {/* Work Items */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wide" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
            Work Items ({scope.workItems.length})
          </div>
          {editing && (
            <button
              onClick={addWorkItem}
              className="text-xs font-medium px-2 py-1 rounded hover:opacity-80"
              style={{ color: "var(--acc)" }}
            >
              + Add Item
            </button>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: "var(--bdr)" }}>
          {scope.workItems.map((item, idx) => (
            <div key={idx} className="px-4 py-3">
              {editing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={item.item}
                      onChange={(e) => updateWorkItem(idx, "item", e.target.value)}
                      placeholder="Item description"
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                    />
                    <input
                      value={item.quantity}
                      onChange={(e) => updateWorkItem(idx, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="w-20 px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx)" }}
                    />
                    <button
                      onClick={() => removeWorkItem(idx)}
                      className="px-2 text-xs"
                      style={{ color: "var(--red)" }}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    value={item.specification}
                    onChange={(e) => updateWorkItem(idx, "specification", e.target.value)}
                    placeholder="Specification details"
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--tx2)" }}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                      {item.item}
                    </div>
                    <div className="text-xs font-medium" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
                      {item.quantity}
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: "var(--tx3)" }}>
                    {item.specification}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Access */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wide mb-2" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
            Safety Requirements
          </div>
          <ul className="space-y-1">
            {scope.safetyRequirements.map((req, idx) => (
              <li key={idx} className="text-xs flex items-start gap-2" style={{ color: "var(--tx2)" }}>
                <span style={{ color: "var(--acc)" }}>•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wide mb-2" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
            Estimated Duration
          </div>
          <div className="text-lg font-bold mb-3" style={{ fontFamily: "var(--serif)", color: "var(--tx)" }}>
            {scope.estimatedDuration}
          </div>
          <div className="text-[9px] font-medium uppercase tracking-wide mb-1" style={{ fontFamily: "var(--mono)", color: "var(--tx3)" }}>
            Trade Required
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--acc)" }}>
            {scope.tradeRequired}
          </div>
        </div>
      </div>
    </div>
  );
}

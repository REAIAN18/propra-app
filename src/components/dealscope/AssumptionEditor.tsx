"use client";

// Wave M — Inline assumption editor.
// Lets the user override capRate / ERV (£ p.a.) / passing rent and persists
// via PATCH /api/dealscope/properties/[id]. Each override is stamped with
// `source: "user"` so the dossier shows it as a user override and re-enrichment
// preserves it.

import { useState } from "react";

interface Props {
  propertyId: string;
  initial: {
    capRate?: number | null;       // decimal e.g. 0.075
    erv?: number | null;           // £ p.a.
    passingRent?: number | null;   // £ p.a.
  };
}

export function AssumptionEditor({ propertyId, initial }: Props) {
  const [capRate, setCapRate] = useState<string>(
    initial.capRate != null ? (initial.capRate * 100).toFixed(2) : ""
  );
  const [erv, setErv] = useState<string>(initial.erv?.toString() ?? "");
  const [passingRent, setPassingRent] = useState<string>(initial.passingRent?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const body: Record<string, number> = {};
      if (capRate.trim()) body.capRate = parseFloat(capRate) / 100;
      if (erv.trim()) body.erv = parseFloat(erv);
      if (passingRent.trim()) body.passingRent = parseFloat(passingRent);
      const res = await fetch(`/api/dealscope/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setStatus("Saved · refresh to recompute");
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--s2)", border: "1px solid var(--s3)", color: "var(--tx)",
    borderRadius: 4, padding: "4px 6px", fontSize: 11, width: 90,
    fontFamily: "var(--mono, monospace)",
  };

  return (
    <div style={{ marginTop: 10, padding: 10, background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx2)", marginBottom: 6 }}>
        OVERRIDE ASSUMPTIONS (saved to deal)
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 10, color: "var(--tx3)", display: "flex", flexDirection: "column", gap: 2 }}>
          Cap rate %
          <input style={inputStyle} value={capRate} onChange={(e) => setCapRate(e.target.value)} placeholder="7.50" />
        </label>
        <label style={{ fontSize: 10, color: "var(--tx3)", display: "flex", flexDirection: "column", gap: 2 }}>
          ERV £ p.a.
          <input style={inputStyle} value={erv} onChange={(e) => setErv(e.target.value)} placeholder="65000" />
        </label>
        <label style={{ fontSize: 10, color: "var(--tx3)", display: "flex", flexDirection: "column", gap: 2 }}>
          Passing rent £ p.a.
          <input style={inputStyle} value={passingRent} onChange={(e) => setPassingRent(e.target.value)} placeholder="49000" />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            background: "var(--acc)", color: "white", border: "none",
            padding: "6px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600,
            cursor: saving ? "wait" : "pointer", alignSelf: "flex-end",
          }}
        >
          {saving ? "Saving…" : "Save override"}
        </button>
        {status && (
          <span style={{ fontSize: 10, color: status.startsWith("Error") ? "var(--red)" : "var(--grn)" }}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

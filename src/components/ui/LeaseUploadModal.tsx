"use client";

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from "react";

type Asset = { id: string; name: string; address: string };

type ExtractedLease = {
  tenantName: string | null;
  monthlyRent: number | null;
  currency: "GBP" | "USD" | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  breakClauseDate: string | null;
  sqft: number | null;
  propertyAddress: string | null;
};

interface LeaseUploadModalProps {
  onClose: () => void;
  onDone: () => void;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const INPUT_CLASS =
  "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
const INPUT_STYLE = {
  backgroundColor: "#162032",
  border: "1px solid #243347",
  color: "#E2E8F0",
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: "#94A3B8" }}>
        {label}
      </label>
      <input
        type={type}
        className={INPUT_CLASS}
        style={INPUT_STYLE}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function LeaseUploadModal({ onClose, onDone }: LeaseUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetsLoading, setAssetsLoading] = useState(true);

  // Step 2
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  // Step 3 — editable review fields
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [currency, setCurrency] = useState<"GBP" | "USD">("GBP");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [breakClauseDate, setBreakClauseDate] = useState("");
  const [sqft, setSqft] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");

  // Step 4
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/user/assets")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets ?? []);
        if (d.assets?.length === 1) setSelectedAssetId(d.assets[0].id);
      })
      .catch(() => {})
      .finally(() => setAssetsLoading(false));
  }, []);

  function populateFromExtracted(ext: ExtractedLease) {
    setTenantName(ext.tenantName ?? "");
    setMonthlyRent(ext.monthlyRent != null ? String(ext.monthlyRent) : "");
    setCurrency(ext.currency ?? "GBP");
    setLeaseStart(ext.leaseStart ?? "");
    setLeaseEnd(ext.leaseEnd ?? "");
    setBreakClauseDate(ext.breakClauseDate ?? "");
    setSqft(ext.sqft != null ? String(ext.sqft) : "");
    setPropertyAddress(ext.propertyAddress ?? "");
  }

  async function parseFile(f: File) {
    if (f.type !== "application/pdf") {
      setParseError("Please upload a PDF file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setParseError("File must be under 10MB.");
      return;
    }

    setFile(f);
    setParsing(true);
    setParseError("");

    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/documents/parse-lease", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.ok) {
        setParseError(data.error ?? "Could not parse — please fill in details manually.");
        setParsing(false);
        // Still go to review step with blank fields
        setStep(3);
        return;
      }

      populateFromExtracted(data.extracted as ExtractedLease);
      setStep(3);
    } catch {
      setParseError("Could not parse — please fill in details manually.");
      setStep(3);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
    e.target.value = "";
  }

  async function handleConfirm() {
    if (!tenantName.trim()) {
      setSaveError("Tenant name is required.");
      return;
    }

    setSaving(true);
    setSaveError("");

    const selectedAsset = assets.find((a) => a.id === selectedAssetId);

    try {
      const res = await fetch("/api/documents/save-lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: tenantName.trim(),
          monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,
          currency,
          leaseStart: leaseStart || null,
          leaseEnd: leaseEnd || null,
          breakClauseDate: breakClauseDate || null,
          sqft: sqft ? parseFloat(sqft) : null,
          propertyAddress:
            propertyAddress.trim() || selectedAsset?.address || null,
          filename: file?.name ?? "lease.pdf",
          fileSize: file?.size ?? 0,
          assetId: selectedAssetId || null,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setSaveError(data.error ?? "Failed to save lease.");
        setSaving(false);
        return;
      }

      setStep(4);
    } catch {
      setSaveError("Failed to save lease.");
    } finally {
      setSaving(false);
    }
  }

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#0B1622", border: "1px solid #1E2D40" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1E2D40" }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>
              Add Lease
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
              Step {step} of 4 —{" "}
              {step === 1
                ? "Select property"
                : step === 2
                ? "Upload lease PDF"
                : step === 3
                ? "Review & confirm"
                : "Done"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
            style={{ color: "#64748B" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Step 1 — Property */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div className="text-xs" style={{ color: "#94A3B8" }}>
              Which property does this lease relate to?
            </div>

            {assetsLoading ? (
              <div className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: "#162032" }} />
            ) : assets.length === 0 ? (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ backgroundColor: "#162032", color: "#94A3B8" }}
              >
                No properties found. Add a property first from the Properties page.
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssetId(a.id)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-colors"
                    style={{
                      backgroundColor:
                        selectedAssetId === a.id ? "#162D4A" : "#162032",
                      border: `1px solid ${selectedAssetId === a.id ? "#1647E8" : "#243347"}`,
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: "#E2E8F0" }}>
                      {a.name}
                    </div>
                    {a.address && (
                      <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                        {a.address}
                      </div>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => { setSelectedAssetId(""); setStep(2); }}
                  className="w-full text-left rounded-xl px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: "#162032",
                    border: "1px dashed #243347",
                  }}
                >
                  <div className="text-sm" style={{ color: "#64748B" }}>
                    Skip — enter property details manually
                  </div>
                </button>
              </div>
            )}

            <button
              disabled={assets.length > 0 && !selectedAssetId}
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — Upload */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            {selectedAsset && (
              <div
                className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
                style={{ backgroundColor: "#162032", color: "#94A3B8" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#1647E8" }}>
                  <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {selectedAsset.name}
              </div>
            )}

            {parsing ? (
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-3 py-10"
                style={{ backgroundColor: "#162032", border: "1px dashed #243347" }}
              >
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: "#1647E8", animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                    />
                  ))}
                </div>
                <div className="text-xs" style={{ color: "#64748B" }}>
                  Reading your lease…
                </div>
                {file && (
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {file.name} · {fmtBytes(file.size)}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-all"
                style={{
                  backgroundColor: isDragging ? "#162D4A" : "#162032",
                  border: `1.5px dashed ${isDragging ? "#1647E8" : "#243347"}`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#64748B" }}>
                  <path d="M10 3v10M5 8l5-5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 15h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <div className="text-sm font-medium" style={{ color: "#94A3B8" }}>
                  Upload your lease PDF
                </div>
                <div className="text-xs" style={{ color: "#475569" }}>
                  Drag & drop or click · PDF only · max 10MB
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {parseError && (
              <div className="text-xs" style={{ color: "#F87171" }}>
                {parseError}
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              className="w-full py-2 rounded-xl text-xs transition-colors"
              style={{ color: "#64748B" }}
            >
              Skip upload — enter details manually →
            </button>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="text-xs mb-1" style={{ color: "#94A3B8" }}>
              {file
                ? "Review the extracted details — edit anything that looks wrong."
                : "Fill in your lease details below."}
            </div>

            <Field label="Tenant name *" value={tenantName} onChange={setTenantName} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly rent" value={monthlyRent} onChange={setMonthlyRent} type="number" />
              <div>
                <label className="block text-xs mb-1" style={{ color: "#94A3B8" }}>Currency</label>
                <select
                  className={INPUT_CLASS}
                  style={{ ...INPUT_STYLE, appearance: "none" }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "GBP" | "USD")}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lease start" value={leaseStart} onChange={setLeaseStart} type="date" />
              <Field label="Lease end" value={leaseEnd} onChange={setLeaseEnd} type="date" />
            </div>
            <Field label="Break clause date" value={breakClauseDate} onChange={setBreakClauseDate} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Floor area (sqft)" value={sqft} onChange={setSqft} type="number" />
              <Field label="Property address" value={propertyAddress} onChange={setPropertyAddress} />
            </div>

            {saveError && (
              <div className="text-xs" style={{ color: "#F87171" }}>
                {saveError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: "#162032", color: "#94A3B8" }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !tenantName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#1647E8", color: "#fff" }}
              >
                {saving ? "Saving…" : "Confirm →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="p-5 flex flex-col items-center gap-4 py-10">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full"
              style={{ backgroundColor: "#0A2A1A" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#0A8A4C" />
                <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold mb-1" style={{ color: "#E2E8F0" }}>
                Lease added
              </div>
              <div className="text-xs" style={{ color: "#64748B" }}>
                {tenantName} has been added to your rent clock.
              </div>
            </div>
            <button
              onClick={() => { onDone(); onClose(); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              View Rent Clock →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

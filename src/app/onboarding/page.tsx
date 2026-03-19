"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ASSET_TYPES = [
  "Office",
  "Retail",
  "Industrial",
  "Warehouse",
  "Flex / Mixed",
  "Other",
];

interface AssetRow {
  name: string;
  type: string;
  location: string;
  grossIncome: string;
}

function emptyAsset(): AssetRow {
  return { name: "", type: "Office", location: "", grossIncome: "" };
}

const inputBase =
  "w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150";
const inputStyle = {
  backgroundColor: "#0B1622",
  border: "1px solid #1a2d45",
  color: "#e8eef5",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetRow[]>([emptyAsset()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const energyInputRef = useRef<HTMLInputElement>(null);

  function updateAsset(i: number, field: keyof AssetRow, value: string) {
    setAssets((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function addRow() {
    setAssets((prev) => [...prev, emptyAsset()]);
  }

  function removeRow(i: number) {
    if (assets.length === 1) return;
    setAssets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleFileUpload(file: File) {
    setUploadStatus("uploading");
    setUploadMessage("Extracting your document data…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadStatus("error");
        setUploadMessage(data.error ?? "Upload failed.");
        return;
      }
      const doc = data.document;
      const extracted = doc?.extractedData ?? {};
      const kd = extracted.keyData ?? {};
      // Pre-populate first asset row from extracted data
      const name =
        kd.propertyAddress ??
        (extracted.documentType === "insurance_policy" ? "Uploaded Property" : null) ??
        "";
      const grossIncome =
        kd.annualRent
          ? String(Math.round(Number(kd.annualRent)))
          : kd.totalCost
          ? String(Math.round(Number(kd.totalCost) * 4)) // quarterly → annual
          : "";
      if (name || grossIncome) {
        setAssets((prev) =>
          prev.map((a, i) =>
            i === 0
              ? {
                  ...a,
                  name: name || a.name,
                  grossIncome: grossIncome || a.grossIncome,
                }
              : a
          )
        );
      }
      const summary = extracted.summary ?? `${doc?.documentType?.replace(/_/g, " ")} uploaded`;
      setUploadStatus("done");
      setUploadMessage(`✓ ${summary}`);
    } catch {
      setUploadStatus("error");
      setUploadMessage("Upload failed — check your connection and try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = assets.filter((a) => a.name.trim() && a.location.trim());
    if (valid.length === 0) {
      setError("Add at least one asset with a name and location.");
      return;
    }
    setLoading(true);
    setError("");

    // Persist to DB (best-effort — fall back to sessionStorage if unauthenticated/fails)
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: valid.map((a) => ({
            name: a.name.trim(),
            assetType: a.type.toLowerCase().replace(/\s*\/\s*/g, "_").replace(/\s+/g, "_"),
            location: a.location.trim(),
            grossIncome: a.grossIncome ? Math.round(parseFloat(a.grossIncome.replace(/,/g, ""))) : undefined,
          })),
        }),
      });
      if (!res.ok) {
        // Not authenticated or server error — fall back to sessionStorage
        sessionStorage.setItem("arca_user_assets", JSON.stringify(valid));
      }
    } catch {
      try {
        sessionStorage.setItem("arca_user_assets", JSON.stringify(valid));
      } catch {
        // ignore
      }
    }

    // Route to scan → dashboard with the first asset name as company
    const companyName = valid[0]?.name ?? "";
    const params = new URLSearchParams();
    if (companyName) params.set("company", companyName);
    params.set("assets", String(valid.length));
    router.push(`/scan?${params.toString()}`);
  }

  const hasValidAsset = assets.some((a) => a.name.trim() && a.location.trim());

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0B1622" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
        >
          Arca
        </span>
      </div>

      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#3d5a72" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#0f2a1c", color: "#0A8A4C" }}
            >
              ✓
            </span>
            Account
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#0A8A4C" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              2
            </span>
            Your portfolio
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: "#1a2d45" }} />
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#3d5a72" }}
          >
            <span
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#0d1825", color: "#3d5a72", border: "1px solid #1a2d45" }}
            >
              3
            </span>
            Insights
          </div>
        </div>

        <h1
          className="text-2xl font-semibold mb-1"
          style={{
            fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
            color: "#e8eef5",
          }}
        >
          Tell us about your assets
        </h1>
        <p className="text-sm mb-7" style={{ color: "#5a7a96" }}>
          Add your properties below. Arca will analyse each one and find hidden value — takes 2 minutes.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Asset rows */}
          <div className="flex flex-col gap-3">
            {assets.map((asset, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "#5a7a96" }}>
                    Asset {i + 1}
                  </span>
                  {assets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: "#3d5a72" }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Property name <span style={{ color: "#f06040" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lakeside Office Park"
                      value={asset.name}
                      onChange={(e) => updateAsset(i, "name", e.target.value)}
                      className={inputBase}
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Asset type
                    </label>
                    <select
                      value={asset.type}
                      onChange={(e) => updateAsset(i, "type", e.target.value)}
                      className={inputBase}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t} value={t} style={{ backgroundColor: "#0B1622" }}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      City / State <span style={{ color: "#f06040" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Miami, FL"
                      value={asset.location}
                      onChange={(e) => updateAsset(i, "location", e.target.value)}
                      className={inputBase}
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                    />
                  </div>

                  {/* Gross income */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#8ba0b8" }}>
                      Gross income / yr{" "}
                      <span style={{ color: "#3d5a72" }}>(optional)</span>
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: "#5a7a96" }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        placeholder="240,000"
                        value={asset.grossIncome}
                        onChange={(e) => updateAsset(i, "grossIncome", e.target.value)}
                        className={inputBase}
                        style={{ ...inputStyle, paddingLeft: "1.75rem" }}
                        onFocus={(e) => { e.target.style.borderColor = "#0A8A4C"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#1a2d45"; }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70 w-fit"
            style={{ color: "#5a7a96" }}
          >
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", color: "#5a7a96" }}
            >
              +
            </span>
            Add another asset
          </button>

          {error && (
            <p className="text-xs" style={{ color: "#f06040" }}>
              {error}
            </p>
          )}

          {/* Document upload section */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
          >
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#e8eef5" }}>
                Skip the form — upload your documents
              </p>
              <p className="text-xs" style={{ color: "#5a7a96" }}>
                Arca extracts your data automatically using AI. PDF or image, up to 10 MB.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Hidden file inputs */}
              <input
                ref={insuranceInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={energyInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => insuranceInputRef.current?.click()}
                disabled={uploadStatus === "uploading"}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all hover:border-[#0A8A4C] disabled:opacity-50"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#8ba0b8" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M7 1v8M4 4l3-3 3 3" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9A1.5 1.5 0 0013 11.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Upload insurance policy
              </button>

              <button
                type="button"
                onClick={() => energyInputRef.current?.click()}
                disabled={uploadStatus === "uploading"}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all hover:border-[#0A8A4C] disabled:opacity-50"
                style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45", color: "#8ba0b8" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M7 1v8M4 4l3-3 3 3" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9A1.5 1.5 0 0013 11.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Upload utility bill
              </button>
            </div>

            {/* Upload status */}
            {uploadStatus !== "idle" && (
              <p
                className="text-xs"
                style={{
                  color:
                    uploadStatus === "uploading"
                      ? "#5a7a96"
                      : uploadStatus === "done"
                      ? "#0A8A4C"
                      : "#f06040",
                }}
              >
                {uploadStatus === "uploading" && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#0A8A4C" }} />
                    {uploadMessage}
                  </span>
                )}
                {uploadStatus !== "uploading" && uploadMessage}
              </p>
            )}
          </div>

          {/* Info note */}
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ backgroundColor: "#0d1825", color: "#5a7a96", border: "1px solid #1a2d45" }}
          >
            Arca will run insurance, energy, and income benchmarks against each asset using market data. You&apos;ll see the numbers in under 60 seconds.
          </div>

          <button
            type="submit"
            disabled={loading || !hasValidAsset}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] mt-1"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            {loading ? "Analysing your portfolio…" : "See my portfolio analysis →"}
          </button>

          <p className="text-center text-xs" style={{ color: "#3d5a72" }}>
            Commission-only. No setup fees. No contracts.
          </p>
        </form>
      </div>

      <Link href="/dashboard" className="mt-6 text-xs transition-colors duration-150" style={{ color: "#3d5a72" }}>
        ← View demo portfolio instead
      </Link>
    </div>
  );
}

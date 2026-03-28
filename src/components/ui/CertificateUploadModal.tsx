"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

type ExtractedCertificate = {
  certificateType: string | null;
  propertyAddress: string | null;
  issuedBy: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  referenceNo: string | null;
};

interface CertificateUploadModalProps {
  certId: string;
  certType: string;
  propertyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return dateStr;
  }
}

export function CertificateUploadModal({
  certId,
  certType,
  propertyName,
  onClose,
  onSuccess,
}: CertificateUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "parsing" | "review" | "success">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedCertificate | null>(null);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function parseFile(f: File) {
    if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
      setParseError("Please upload a PDF or image file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setParseError("File must be under 10MB.");
      return;
    }

    setFile(f);
    setStep("parsing");
    setParseError("");

    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/documents/parse-certificate", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.ok) {
        setParseError(data.error ?? "Could not parse — please try another file or enter details manually.");
        setStep("upload");
        return;
      }

      setExtracted(data.extracted as ExtractedCertificate);
      setStep("review");
    } catch {
      setParseError("Could not parse — please try another file.");
      setStep("upload");
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
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/user/compliance/${certId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "valid",
          expiryDate: extracted?.expiryDate || null,
          issuedDate: extracted?.issueDate || null,
          issuedBy: extracted?.issuedBy || null,
          referenceNo: extracted?.referenceNo || null,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setSaveError(data.error ?? "Failed to update certificate.");
        setSaving(false);
        return;
      }

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setSaveError("Failed to update certificate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && step !== "parsing" && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--bdr)" }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
              Upload Certificate
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
              {certType} • {propertyName}
            </div>
          </div>
          {step !== "parsing" && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
              style={{ color: "var(--tx3)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload step */}
        {step === "upload" && (
          <div className="p-5 space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className="rounded-xl flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-all"
              style={{
                backgroundColor: isDragging ? "var(--acc-lt)" : "var(--s2)",
                border: `1.5px dashed ${isDragging ? "var(--acc)" : "var(--bdr)"}`,
              }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full"
                style={{ backgroundColor: "var(--acc-dim)", color: "var(--acc)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4v12M7 11l5-5 5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                  Upload certificate document
                </div>
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  Drag & drop or click · PDF or image · max 10MB
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {parseError && (
              <div
                className="rounded-lg p-3 text-xs"
                style={{ backgroundColor: "var(--red-lt)", border: "1px solid var(--red-bdr)", color: "var(--red)" }}
              >
                {parseError}
              </div>
            )}

            <div className="text-xs" style={{ color: "var(--tx3)" }}>
              RealHQ will extract certificate details and update your compliance record automatically.
            </div>
          </div>
        )}

        {/* Parsing step */}
        {step === "parsing" && (
          <div className="p-5 flex flex-col items-center gap-4 py-16">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--acc)",
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>
                Processing certificate
              </div>
              <div className="text-xs" style={{ color: "var(--tx2)" }}>
                RealHQ is reading your certificate and extracting key details.
              </div>
            </div>
            {file && (
              <div className="text-xs" style={{ color: "var(--tx3)" }}>
                {file.name} · {fmtBytes(file.size)}
              </div>
            )}
          </div>
        )}

        {/* Review step */}
        {step === "review" && extracted && (
          <div className="p-5 space-y-4">
            {/* Extracted file card */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "var(--grn-lt)", color: "var(--grn)" }}
                  >
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--tx)" }}>
                      {file?.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--tx3)" }}>
                      {file && fmtBytes(file.size)} · uploaded just now
                    </div>
                  </div>
                </div>
                <div
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--grn-lt)", color: "var(--grn)" }}
                >
                  ✓ EXTRACTED
                </div>
              </div>

              <div className="space-y-2">
                {extracted.certificateType && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Certificate type:</strong> {extracted.certificateType}
                    </div>
                  </div>
                )}
                {extracted.propertyAddress && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Property:</strong> {extracted.propertyAddress}
                    </div>
                  </div>
                )}
                {extracted.issuedBy && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Issued by:</strong> {extracted.issuedBy}
                    </div>
                  </div>
                )}
                {extracted.issueDate && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Issue date:</strong> {fmtDate(extracted.issueDate)}
                    </div>
                  </div>
                )}
                {extracted.expiryDate && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Expiry date:</strong> {fmtDate(extracted.expiryDate)}
                    </div>
                  </div>
                )}
                {extracted.referenceNo && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "var(--grn)" }}
                    />
                    <div className="text-xs" style={{ color: "var(--tx2)" }}>
                      <strong style={{ color: "var(--tx)" }}>Reference:</strong> {extracted.referenceNo}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation summary */}
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ backgroundColor: "var(--s2)", border: "1px solid var(--bdr)" }}
            >
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--tx)" }}>
                Confirm extracted details
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>Certificate type</span>
                <span style={{ color: "var(--tx)" }}>
                  {extracted.certificateType || certType}{" "}
                  {extracted.certificateType && <span style={{ color: "var(--grn)" }}>✓</span>}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>Linked property</span>
                <span style={{ color: "var(--tx)" }}>
                  {propertyName} <span style={{ color: "var(--grn)" }}>✓</span>
                </span>
              </div>
              {extracted.expiryDate && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--tx3)" }}>New expiry date</span>
                  <span style={{ color: "var(--grn)" }}>{fmtDate(extracted.expiryDate)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--tx3)" }}>New status</span>
                <span style={{ color: "var(--grn)" }}>VALID</span>
              </div>
            </div>

            {saveError && (
              <div
                className="rounded-lg p-3 text-xs"
                style={{ backgroundColor: "var(--red-lt)", border: "1px solid var(--red-bdr)", color: "var(--red)" }}
              >
                {saveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "var(--acc)", color: "#fff" }}
              >
                {saving ? "Updating…" : "✓ Confirm and update certificate"}
              </button>
            </div>

            <div className="text-xs text-center" style={{ color: "var(--tx3)" }}>
              RealHQ will link this document to the certificate record and update the status.
            </div>
          </div>
        )}

        {/* Success step */}
        {step === "success" && (
          <div className="p-5 flex flex-col items-center gap-4 py-12">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ backgroundColor: "var(--grn-lt)" }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="var(--grn)" />
                <path d="M10 16l4 4 8-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
                Certificate updated
              </div>
              <div className="text-xs" style={{ color: "var(--tx2)" }}>
                Your compliance record has been updated successfully.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

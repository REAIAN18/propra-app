"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

type ExtractedPolicy = {
  // Insurance fields
  currentPremium: number | null;
  insurer: string | null;
  renewalDate: string | null;
  coverageType: string | null;
  propertyAddress: string | null;
  // Energy fields
  supplier: string | null;
  annualSpend: number | null;
  unitRate: number | null;
  annualUsage: number | null;
  contractEndDate: string | null;
  currency: "GBP" | "USD" | null;
};

interface PolicyUploadWidgetProps {
  documentType?: "insurance" | "energy";
  onExtracted: (data: {
    currentPremium?: number;
    insurer?: string;
    renewalDate?: string;
    supplier?: string;
    annualSpend?: number;
    unitRate?: number;
    annualUsage?: number;
    contractEndDate?: string;
  }) => void;
}

function fmt(v: number, currency: "GBP" | "USD" | null) {
  const sym = currency === "GBP" ? "£" : "$";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${currency === "GBP" ? "£" : "$"}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v.toLocaleString()}`;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyUploadWidget({ onExtracted, documentType = "insurance" }: PolicyUploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPolicy | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.");
      setStatus("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File must be under 10MB.");
      setStatus("error");
      return;
    }

    setSelectedFile(file);
    setStatus("loading");
    setExtracted(null);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const res = await fetch("/api/documents/parse-policy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.error ?? "Could not parse this document — please enter your premium manually.");
        setStatus("error");
        return;
      }

      const ext: ExtractedPolicy = {
        currentPremium: null,
        insurer: null,
        renewalDate: null,
        coverageType: null,
        propertyAddress: null,
        supplier: null,
        annualSpend: null,
        unitRate: null,
        annualUsage: null,
        contractEndDate: null,
        currency: null,
        ...data.extracted,
      };
      setExtracted(ext);
      setStatus("success");

      // Fire the callback with non-null values
      if (documentType === "energy") {
        onExtracted({
          ...(ext.supplier ? { supplier: ext.supplier } : {}),
          ...(ext.annualSpend != null ? { annualSpend: ext.annualSpend } : {}),
          ...(ext.unitRate != null ? { unitRate: ext.unitRate } : {}),
          ...(ext.annualUsage != null ? { annualUsage: ext.annualUsage } : {}),
          ...(ext.contractEndDate ? { contractEndDate: ext.contractEndDate } : {}),
        });
      } else {
        onExtracted({
          ...(ext.currentPremium != null ? { currentPremium: ext.currentPremium } : {}),
          ...(ext.insurer ? { insurer: ext.insurer } : {}),
          ...(ext.renewalDate ? { renewalDate: ext.renewalDate } : {}),
        });
      }
    } catch {
      setErrorMsg("Could not parse this document — please enter your premium manually.");
      setStatus("error");
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleReset() {
    setStatus("idle");
    setSelectedFile(null);
    setExtracted(null);
    setErrorMsg("");
  }

  return (
    <div className="mb-5">
      {/* Drop zone — hidden once successfully parsed */}
      {status !== "success" && (
        <div
          onClick={() => status !== "loading" && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="rounded-xl flex flex-col items-center justify-center gap-2 py-6 px-4 transition-all duration-150"
          style={{
            border: `1.5px dashed ${isDragging ? "#1647E8" : "#D1D5DB"}`,
            backgroundColor: isDragging ? "#EEF2FF" : "#F9FAFB",
            cursor: status === "loading" ? "default" : "pointer",
          }}
        >
          {status === "loading" ? (
            <>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#1647E8", animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                  />
                ))}
              </div>
              <div className="text-xs font-medium" style={{ color: "#6B7280" }}>
                {documentType === "energy" ? "Reading your bill…" : "Reading your policy…"}
              </div>
              {selectedFile && (
                <div className="text-xs" style={{ color: "#9CA3AF" }}>
                  {selectedFile.name} · {fmtBytes(selectedFile.size)}
                </div>
              )}
            </>
          ) : status === "error" ? (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#9CA3AF" }}>
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div className="text-xs text-center max-w-xs" style={{ color: "#6B7280" }}>
                {errorMsg}
              </div>
              <div className="text-xs font-medium" style={{ color: "#1647E8" }}>
                Try another file
              </div>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#9CA3AF" }}>
                <path d="M10 3v10M5 8l5-5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 15h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div className="text-xs font-medium" style={{ color: "#6B7280" }}>
                {documentType === "energy" ? "Upload your latest energy bill PDF" : "Upload your insurance schedule PDF"}
              </div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>
                Drag & drop or click to browse · PDF only · max 10MB
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Extracted results */}
      {status === "success" && extracted && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" fill="#0A8A4C" />
                <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                {documentType === "energy" ? "Bill parsed — fields pre-filled" : "Extracted from your policy"}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "#9CA3AF" }}
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {documentType === "energy" ? (
              <>
                {extracted.supplier && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Supplier</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.supplier}</div>
                  </div>
                )}
                {extracted.annualSpend != null && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Annual spend</div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                      {fmt(extracted.annualSpend, extracted.currency)}
                    </div>
                  </div>
                )}
                {extracted.unitRate != null && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Unit rate</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.unitRate}p/kWh</div>
                  </div>
                )}
                {extracted.annualUsage != null && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Annual usage</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.annualUsage.toLocaleString()} kWh</div>
                  </div>
                )}
                {extracted.contractEndDate && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Contract end</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.contractEndDate}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                {extracted.currentPremium != null && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Annual premium</div>
                    <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                      {fmt(extracted.currentPremium, extracted.currency)}
                    </div>
                  </div>
                )}
                {extracted.insurer && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Insurer</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.insurer}</div>
                  </div>
                )}
                {extracted.renewalDate && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Renewal date</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.renewalDate}</div>
                  </div>
                )}
                {extracted.coverageType && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Coverage type</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.coverageType}</div>
                  </div>
                )}
                {extracted.propertyAddress && (
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-xs mb-0.5" style={{ color: "#6B7280" }}>Property</div>
                    <div className="text-sm font-medium" style={{ color: "#111827" }}>{extracted.propertyAddress}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedFile && (
            <div className="mt-3 pt-3 flex items-center gap-1.5" style={{ borderTop: "1px solid #BBF7D0" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#9CA3AF" }}>
                <path d="M2.5 1C2.5 0.724 2.724 0.5 3 0.5H8.5L11.5 3.5V11C11.5 11.276 11.276 11.5 11 11.5H3C2.724 11.5 2.5 11.276 2.5 11V1Z" stroke="currentColor" strokeWidth="1.1" />
                <path d="M8.5 0.5V4H11.5" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                {selectedFile.name} · {fmtBytes(selectedFile.size)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

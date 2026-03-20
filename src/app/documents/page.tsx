"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

type DocStatus = "pending" | "processing" | "done" | "error";

interface ExtractedData {
  documentType?: string;
  summary?: string;
  keyData?: Record<string, unknown>;
  opportunities?: string[];
  alerts?: string[];
}

interface Document {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  documentType: string | null;
  summary: string | null;
  extractedData: ExtractedData | null;
  status: DocStatus;
  error: string | null;
  createdAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance_policy: "Insurance Policy",
  energy_bill: "Energy Bill",
  rent_roll: "Rent Roll",
  compliance_cert: "Compliance Certificate",
  lease_agreement: "Lease Agreement",
  financial_statement: "Financial Statement",
  valuation_report: "Valuation Report",
  other: "Document",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  insurance_policy: "#1647E8",
  energy_bill: "#F5A94A",
  rent_roll: "#0A8A4C",
  compliance_cert: "#CC1A1A",
  lease_agreement: "#8b5cf6",
  financial_statement: "#06b6d4",
  valuation_report: "#ec4899",
  other: "#5a7a96",
};

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function KeyDataTable({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1a2d45" }}>
      {entries.map(([key, value], i) => {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        const displayValue = Array.isArray(value)
          ? (value as unknown[]).join(", ")
          : typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);

        return (
          <div
            key={key}
            className="flex items-start gap-3 px-3 py-2.5 text-xs"
            style={{
              borderBottom: i < entries.length - 1 ? "1px solid #1a2d45" : undefined,
              backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            }}
          >
            <span className="shrink-0 min-w-[120px]" style={{ color: "#5a7a96" }}>{label}</span>
            <span className="font-medium break-all" style={{ color: "#c8d8e8" }}>{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

function DocumentCard({ doc, onSelect, isSelected }: { doc: Document; onSelect: () => void; isSelected: boolean }) {
  const typeColor = DOC_TYPE_COLORS[doc.documentType ?? "other"] ?? "#5a7a96";
  const typeLabel = DOC_TYPE_LABELS[doc.documentType ?? "other"] ?? "Document";

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 hover:bg-[#111e2e]"
      style={{
        backgroundColor: isSelected ? "#111e2e" : "transparent",
        border: `1px solid ${isSelected ? "#1a3a5c" : "#1a2d45"}`,
        boxShadow: isSelected ? "inset 2px 0 0 #0A8A4C" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${typeColor}1a`, border: `1px solid ${typeColor}40` }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2C3 1.45 3.45 1 4 1H10L13 4V14C13 14.55 12.55 15 12 15H4C3.45 15 3 14.55 3 14V2Z" stroke={typeColor} strokeWidth="1.2" />
            <path d="M10 1V4H13" stroke={typeColor} strokeWidth="1.2" />
            <path d="M5.5 7H10.5M5.5 9.5H8.5" stroke={typeColor} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${typeColor}1a`, color: typeColor, fontSize: "10px" }}
            >
              {typeLabel}
            </span>
            {doc.status === "processing" && (
              <span className="text-xs" style={{ color: "#F5A94A" }}>Processing…</span>
            )}
            {doc.status === "error" && (
              <span className="text-xs" style={{ color: "#CC1A1A" }}>Error</span>
            )}
          </div>
          <div className="text-sm font-medium truncate" style={{ color: "#c8d8e8" }}>
            {doc.filename}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
            {fmtFileSize(doc.fileSize)} · {fmtDate(doc.createdAt)}
          </div>
          {doc.summary && (
            <div className="text-xs mt-1.5 line-clamp-2" style={{ color: "#8ba0b8" }}>
              {doc.summary}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function UploadZone({ onUploaded }: { onUploaded: (doc: Document) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(data.document);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150"
      style={{
        border: `2px dashed ${dragging ? "#0A8A4C" : "#1a2d45"}`,
        backgroundColor: dragging ? "#0f2a1c" : "#0d1825",
        minHeight: "180px",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onInputChange}
        disabled={uploading}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#0A8A4C", borderTopColor: "transparent" }}
          />
          <div className="text-sm font-medium" style={{ color: "#e8eef5" }}>Extracting with Claude…</div>
          <div className="text-xs" style={{ color: "#5a7a96" }}>Analysing document structure and key data</div>
        </div>
      ) : (
        <>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 3V15M11 3L7 7M11 3L15 7" stroke="#0A8A4C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 17V19H19V17" stroke="#5a7a96" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-sm font-medium mb-1" style={{ color: "#e8eef5" }}>
            Drop a PDF or image here
          </div>
          <div className="text-xs mb-3" style={{ color: "#5a7a96" }}>
            or click to browse · PDF, PNG, JPEG up to 10MB
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["Insurance Policy", "Energy Bill", "Rent Roll", "Lease", "Compliance Cert"].map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#111e2e", color: "#5a7a96", border: "1px solid #1a2d45" }}
              >
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#2a0a0a", color: "#FF8080", border: "1px solid #4a1a1a" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function DocumentDetail({ doc }: { doc: Document }) {
  const typeColor = DOC_TYPE_COLORS[doc.documentType ?? "other"] ?? "#5a7a96";
  const typeLabel = DOC_TYPE_LABELS[doc.documentType ?? "other"] ?? "Document";
  const ext = doc.extractedData;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}>
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${typeColor}1a`, border: `1px solid ${typeColor}40` }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 2C3 1.45 3.45 1 4 1H10L13 4V14C13 14.55 12.55 15 12 15H4C3.45 15 3 14.55 3 14V2Z" stroke={typeColor} strokeWidth="1.2" />
              <path d="M10 1V4H13" stroke={typeColor} strokeWidth="1.2" />
              <path d="M5.5 7H10.5M5.5 9.5H8.5" stroke={typeColor} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded mb-1 inline-block"
              style={{ backgroundColor: `${typeColor}1a`, color: typeColor, fontSize: "10px" }}
            >
              {typeLabel}
            </span>
            <div className="text-sm font-semibold break-all" style={{ color: "#e8eef5" }}>{doc.filename}</div>
            <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
              {fmtFileSize(doc.fileSize)} · {fmtDate(doc.createdAt)}
            </div>
          </div>
        </div>
        {doc.summary && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "#8ba0b8" }}>{doc.summary}</p>
        )}
      </div>

      {/* Alerts */}
      {ext?.alerts && ext.alerts.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#1a0a0a", border: "1px solid #4a1a1a" }}>
          <div className="px-4 py-2.5 text-xs font-semibold flex items-center gap-2" style={{ color: "#FF8080", borderBottom: "1px solid #4a1a1a" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 10H1L6 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 5V7.5M6 8.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Alerts
          </div>
          <div className="px-4 py-3 space-y-2">
            {ext.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#e8a0a0" }}>
                <span className="shrink-0 mt-0.5" style={{ color: "#CC1A1A" }}>▲</span>
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {ext?.opportunities && ext.opportunities.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0f2a1c", border: "1px solid #1a4a2a" }}>
          <div className="px-4 py-2.5 text-xs font-semibold flex items-center gap-2" style={{ color: "#0A8A4C", borderBottom: "1px solid #1a4a2a" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Opportunities
          </div>
          <div className="px-4 py-3 space-y-2">
            {ext.opportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6abf8a" }}>
                <span className="shrink-0" style={{ color: "#0A8A4C" }}>›</span>
                {opp}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Data */}
      {ext?.keyData && Object.keys(ext.keyData).length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2 px-0.5" style={{ color: "#5a7a96", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Extracted Data
          </div>
          <KeyDataTable data={ext.keyData as Record<string, unknown>} />
        </div>
      )}

      {doc.status === "error" && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#1a0a0a", color: "#FF8080", border: "1px solid #4a1a1a" }}>
          <strong>Extraction failed:</strong> {doc.error}
        </div>
      )}

      {/* Contextual next-step CTAs based on document type */}
      {doc.status !== "error" && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <div className="text-xs font-semibold mb-2.5" style={{ color: "#5a7a96", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Next steps
          </div>
          <div className="flex flex-wrap gap-2">
            {(doc.documentType === "insurance_policy" || doc.documentType === "insurance_schedule") && (
              <Link
                href="/insurance"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: "#F5A94A22", color: "#F5A94A", border: "1px solid #F5A94A44" }}
              >
                Start insurance retender →
              </Link>
            )}
            {doc.documentType === "energy_bill" && (
              <Link
                href="/energy"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: "#F5A94A22", color: "#F5A94A", border: "1px solid #F5A94A44" }}
              >
                Start energy switch →
              </Link>
            )}
            {(doc.documentType === "lease" || doc.documentType === "rent_roll") && (
              <Link
                href="/income"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C", border: "1px solid #0A8A4C44" }}
              >
                View income opportunities →
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: "#1a2d45", color: "#8ba0b8", border: "1px solid #1a2d45" }}
            >
              Back to dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDocuments() {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocuments(); }, []);

  function onUploaded(doc: Document) {
    setDocuments((prev) => [doc, ...prev]);
    setSelected(doc);
  }

  return (
    <AppShell>
      <TopBar title="Documents" />
      <main className="flex-1 px-4 lg:px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ color: "#e8eef5", fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif" }}
          >
            Document Ingestion
          </h1>
          <p className="text-sm" style={{ color: "#5a7a96" }}>
            Upload insurance policies, energy bills, rent rolls, or compliance certificates. Claude extracts structured data automatically.
          </p>
        </div>

        {/* Upload zone */}
        <div id="upload-zone" className="mb-6">
          <UploadZone onUploaded={onUploaded} />
        </div>

        {/* Split view: list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Document list */}
          <div className="lg:col-span-2 space-y-2">
            <div className="text-xs font-semibold mb-3 px-0.5" style={{ color: "#5a7a96", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {loading ? "Loading…" : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
            </div>

            {!loading && documents.length === 0 && (
              <div
                className="rounded-xl px-5 py-8 text-center"
                style={{ backgroundColor: "#0d1825", border: "1px dashed #1a2d45" }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>No documents yet</div>
                <div className="text-xs mb-4" style={{ color: "#5a7a96" }}>
                  Upload a rent roll, insurance policy, energy bill, or compliance certificate to unlock real data across all pages.
                </div>
                <a
                  href="#upload-zone"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Upload your first document →
                </a>
              </div>
            )}

            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isSelected={selected?.id === doc.id}
                onSelect={() => setSelected(doc)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {selected ? (
              <DocumentDetail doc={selected} />
            ) : (
              <div
                className="rounded-xl px-6 py-12 flex flex-col items-center justify-center text-center"
                style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45", minHeight: "300px" }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M5 3C5 2.45 5.45 2 6 2H14.5L19 6.5V19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V3Z" stroke="#3d5a72" strokeWidth="1.5" />
                    <path d="M14.5 2V7H19" stroke="#3d5a72" strokeWidth="1.5" />
                    <path d="M8 10H14M8 13H12" stroke="#3d5a72" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: "#8ba0b8" }}>Select a document to view extracted data</div>
                <div className="text-xs" style={{ color: "#3d5a72" }}>or upload a new document above</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

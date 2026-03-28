"use client";

import { useState, useEffect, useRef } from "react";
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
  insurance_policy: "Insurance",
  insurance_schedule: "Insurance",
  energy_bill: "Energy",
  rent_roll: "Lease",
  lease_agreement: "Lease",
  compliance_cert: "Compliance",
  epc_certificate: "Compliance",
  financial_statement: "Financial",
  valuation_report: "Financial",
  work_order_invoice: "Financial",
  other: "Other",
};

const FILTER_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "lease", label: "Leases" },
  { key: "energy", label: "Energy" },
  { key: "insurance", label: "Insurance" },
  { key: "compliance", label: "Compliance" },
  { key: "financial", label: "Financial" },
] as const;

type FilterKey = typeof FILTER_CATEGORIES[number]["key"];

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getDocumentCategory(doc: Document): FilterKey {
  const type = DOC_TYPE_LABELS[doc.documentType ?? "other"] ?? "Other";
  if (type === "Lease") return "lease";
  if (type === "Energy") return "energy";
  if (type === "Insurance") return "insurance";
  if (type === "Compliance") return "compliance";
  if (type === "Financial") return "financial";
  return "all";
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
        border: `2px dashed ${dragging ? "var(--acc-bdr)" : "var(--bdr)"}`,
        backgroundColor: dragging ? "var(--acc-lt)" : "transparent",
        minHeight: "140px",
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
            style={{ borderColor: "var(--acc)", borderTopColor: "transparent" }}
          />
          <div className="text-sm font-medium" style={{ color: "var(--tx)" }}>Extracting with Claude…</div>
          <div className="text-xs" style={{ color: "var(--tx3)" }}>Analysing document structure and key data</div>
        </div>
      ) : (
        <>
          <div className="text-2xl mb-2" style={{ opacity: 0.4 }}>📁</div>
          <div className="text-sm font-medium" style={{ color: "var(--tx2)" }}>
            Drop any document here — RealHQ identifies and extracts automatically
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
            PDF, JPG, PNG, DOCX · Leases, bills, certificates, financials · Auto-categorised
          </div>
        </>
      )}

      {error && (
        <div className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--red-lt)", color: "var(--red)", border: "1px solid var(--red-bdr)" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, onClick }: { doc: Document; onClick: () => void }) {
  const typeLabel = DOC_TYPE_LABELS[doc.documentType ?? "other"] ?? "Other";
  const statusTag = doc.status === "done" ? "EXTRACTED" : doc.status === "processing" ? "PROCESSING" : doc.status === "error" ? "ERROR" : "UPLOADED";
  const statusColor = doc.status === "done" ? "done" : doc.status === "error" ? "danger" : doc.status === "processing" ? "active" : "muted";

  return (
    <div
      className="grid items-center gap-3 px-5 py-3 cursor-pointer transition-all duration-100"
      style={{
        gridTemplateColumns: "1fr auto auto auto auto",
        borderBottom: "1px solid var(--bdr-lt)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--s2)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <div>
        <div className="text-xs font-medium leading-snug" style={{ color: "var(--tx)" }}>
          {doc.filename}
        </div>
        {doc.summary && (
          <div className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--tx3)" }}>
            {doc.summary}
          </div>
        )}
      </div>
      <span
        className="text-[9px] font-medium px-2 py-1 rounded uppercase tracking-wide"
        style={{
          backgroundColor: statusColor === "done" ? "var(--grn-lt)" : statusColor === "danger" ? "var(--red-lt)" : statusColor === "active" ? "var(--acc-lt)" : "var(--s3)",
          color: statusColor === "done" ? "var(--grn)" : statusColor === "danger" ? "var(--red)" : statusColor === "active" ? "var(--acc)" : "var(--tx3)",
          border: `1px solid ${statusColor === "done" ? "var(--grn-bdr)" : statusColor === "danger" ? "var(--red-bdr)" : statusColor === "active" ? "var(--acc-bdr)" : "var(--bdr)"}`,
          fontFamily: "var(--mono)",
        }}
      >
        {statusTag}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--tx2)", fontFamily: "var(--mono)" }}>
        {typeLabel}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--tx2)", fontFamily: "var(--mono)" }}>
        {fmtDate(doc.createdAt)}
      </span>
      <span className="text-xs" style={{ color: "var(--tx3)" }}>↓</span>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
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
  }

  const filteredDocs = filter === "all"
    ? documents
    : documents.filter(doc => getDocumentCategory(doc) === filter);

  const counts = FILTER_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = cat.key === "all"
      ? documents.length
      : documents.filter(doc => getDocumentCategory(doc) === cat.key).length;
    return acc;
  }, {} as Record<FilterKey, number>);

  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  return (
    <AppShell>
      <TopBar title="Documents" />
      <main className="flex-1 px-4 lg:px-6 py-6">
        <div className="max-w-5xl">
          {/* Page header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h1
                className="text-2xl font-normal mb-1"
                style={{
                  color: "var(--tx)",
                  fontFamily: "var(--serif)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Documents
              </h1>
              <p className="text-sm font-light" style={{ color: "var(--tx3)" }}>
                All uploaded files across your portfolio — leases, bills, certificates, financials.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex gap-0 mb-5 w-fit overflow-hidden"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
              borderRadius: "8px",
            }}
          >
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className="px-4 py-2 text-xs font-medium border-none cursor-pointer transition-colors"
                style={{
                  background: filter === cat.key ? "var(--acc)" : "transparent",
                  color: filter === cat.key ? "#fff" : "var(--tx3)",
                  fontFamily: "var(--sans)",
                  fontWeight: 500,
                  fontSize: "11px",
                }}
                onMouseEnter={(e) => {
                  if (filter !== cat.key) e.currentTarget.style.color = "var(--tx2)";
                }}
                onMouseLeave={(e) => {
                  if (filter !== cat.key) e.currentTarget.style.color = "var(--tx3)";
                }}
              >
                {cat.label} ({counts[cat.key]})
              </button>
            ))}
          </div>

          {/* Document table */}
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bdr)",
            }}
          >
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--bdr)" }}
            >
              <h4 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                All Documents
              </h4>
              <span className="text-xs" style={{ color: "var(--tx3)" }}>
                {filteredDocs.length} files · {fmtFileSize(totalSize)}
              </span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-sm" style={{ color: "var(--tx3)" }}>
                Loading documents…
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-sm font-medium mb-1" style={{ color: "var(--tx2)" }}>
                  {filter === "all" ? "No documents yet" : `No ${filter} documents`}
                </div>
                <div className="text-xs" style={{ color: "var(--tx3)" }}>
                  {filter === "all"
                    ? "Upload a document to get started"
                    : "Try selecting a different filter"}
                </div>
              </div>
            ) : (
              <>
                {filteredDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onClick={() => {
                      // TODO: Open document detail modal or navigate to detail page
                      window.open(`/api/documents/${doc.id}/download`, '_blank');
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Upload zone */}
          <UploadZone onUploaded={onUploaded} />
        </div>
      </main>
    </AppShell>
  );
}

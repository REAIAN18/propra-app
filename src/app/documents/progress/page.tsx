"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type DocStatus = "uploading" | "extracting" | "done" | "error";

interface ExtractedData {
  documentType?: string;
  summary?: string;
  keyData?: Record<string, unknown>;
  opportunities?: string[];
  alerts?: string[];
}

interface ProcessingDocument {
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

interface PropertyContext {
  name: string;
  address: string;
  type: string;
  sqft: number;
  location: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getFileIcon(mimeType: string): { emoji: string; className: string } {
  if (mimeType.includes("pdf")) return { emoji: "📄", className: "pdf" };
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return { emoji: "📊", className: "xlsx" };
  if (mimeType.includes("image")) return { emoji: "🖼", className: "img" };
  return { emoji: "📄", className: "pdf" };
}

function FileCard({ doc }: { doc: ProcessingDocument }) {
  const icon = getFileIcon(doc.mimeType);
  const ext = doc.extractedData;

  return (
    <div className="file-card">
      <div className="file-top">
        <div className={`file-icon ${icon.className}`}>{icon.emoji}</div>
        <div className="file-info">
          <div className="file-name">{doc.filename}</div>
          <div className="file-meta">{formatFileSize(doc.fileSize)} · {doc.mimeType.split("/")[1]?.toUpperCase() || "FILE"} · {formatTime(doc.createdAt)}</div>
        </div>
        <div className={`file-status ${doc.status}`}>
          {doc.status === "uploading" && (
            <>
              <div className="spinner" /> Uploading...
            </>
          )}
          {doc.status === "extracting" && (
            <>
              <div className="spinner" /> Extracting...
            </>
          )}
          {doc.status === "done" && "✓ Extracted"}
          {doc.status === "error" && "⚠ Error"}
        </div>
      </div>

      {doc.status === "done" && ext && (
        <div className="file-extract">
          {ext.keyData && Object.entries(ext.keyData).slice(0, 3).map(([key, value], i) => {
            const isWarning = key.toLowerCase().includes("finding") || key.toLowerCase().includes("above");
            return (
              <div key={i} className="extract-item">
                <div className={`extract-dot ${isWarning ? "warn" : "found"}`} />
                <div className="extract-text">
                  <strong>{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}:</strong> {String(value)}
                </div>
              </div>
            );
          })}
          {ext.alerts && ext.alerts.slice(0, 2).map((alert, i) => (
            <div key={`alert-${i}`} className="extract-item">
              <div className="extract-dot warn" />
              <div className="extract-text"><strong>Finding:</strong> {alert}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId");

  const [documents, setDocuments] = useState<ProcessingDocument[]>([]);
  const [property, setProperty] = useState<PropertyContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll for document updates
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    }

    // Fetch property context if assetId provided
    async function fetchProperty() {
      if (!assetId) return;
      try {
        const res = await fetch(`/api/user/assets/${assetId}`);
        if (res.ok) {
          const data = await res.json();
          setProperty({
            name: data.asset.name || data.asset.address || "Property",
            address: data.asset.address || "",
            type: data.asset.propertyType || "Property",
            sqft: data.asset.sqft || 0,
            location: data.asset.city && data.asset.state ? `${data.asset.city} ${data.asset.state}` : "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch property:", err);
      }
    }

    fetchDocuments();
    fetchProperty();

    // Poll every 2 seconds while there are processing documents
    const interval = setInterval(() => {
      if (documents.some(d => d.status === "uploading" || d.status === "extracting")) {
        fetchDocuments();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [assetId, documents]);

  const processedCount = documents.filter(d => d.status === "done" || d.status === "error").length;
  const totalCount = documents.length;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  // Count by document type
  const leaseCount = documents.filter(d => d.status === "done" && d.documentType?.includes("lease")).length;
  const insuranceCount = documents.filter(d => d.status === "done" && d.documentType?.includes("insurance")).length;
  const energyCount = documents.filter(d => d.status === "done" && d.documentType?.includes("energy")).length;

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tx3)"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-mark"><span>R</span>ealHQ</div>
        <div className="nav-r">
          <Link href="/dashboard" className="btn-skip">Skip to dashboard →</Link>
        </div>
      </nav>

      {/* Page */}
      <div className="page">
        {/* Header */}
        <div className="header a1">
          <div className="header-label">Processing documents</div>
          <h1 className="header-h">Reading your files</h1>
          <p className="header-sub">RealHQ extracts leases, insurance schedules, energy bills, and more — no manual entry.</p>
        </div>

        {/* Property context */}
        {property && (
          <div className="context-bar a2">
            <div className="context-sat">🏢</div>
            <div className="context-info">
              <div className="context-name">{property.name}</div>
              <div className="context-addr">
                {property.type} · {property.sqft > 0 ? `${property.sqft.toLocaleString()} sqft · ` : ""}{property.location}
              </div>
            </div>
          </div>
        )}

        {/* Overall progress */}
        {documents.length > 0 && (
          <div className="progress-bar a2">
            <div className="progress-bg">
              <div
                className={`progress-fill ${progressPercent === 100 ? "done" : "working"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="progress-label">
              <span>{processedCount} of {totalCount} files processed</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* File cards */}
        {documents.map((doc, i) => (
          <div key={doc.id} className={`a${Math.min(i + 3, 4)}`}>
            <FileCard doc={doc} />
          </div>
        ))}

        {/* Summary */}
        {documents.some(d => d.status === "done") && (
          <div className="summary a4">
            <div className="summary-h">What we extracted so far</div>
            <div className="summary-sub">This data is now live in your property profile. Numbers that were estimates are now verified.</div>

            <div className="summary-grid">
              <div className="summary-cell">
                <div className="summary-val">{leaseCount}</div>
                <div className="summary-label">Leases</div>
              </div>
              <div className="summary-cell">
                <div className="summary-val">{insuranceCount}</div>
                <div className="summary-label">Insurance {insuranceCount === 1 ? "Policy" : "Policies"}</div>
              </div>
              <div className="summary-cell">
                <div className="summary-val">{energyCount}</div>
                <div className="summary-label">Energy Bills</div>
              </div>
            </div>

            <div className="summary-items">
              {documents.filter(d => d.status === "done").map((doc, i) => {
                const dotClass = doc.documentType?.includes("lease") ? "lease"
                  : doc.documentType?.includes("insurance") ? "insurance"
                  : doc.documentType?.includes("energy") ? "energy"
                  : "other";
                return (
                  <div key={doc.id} className="summary-item">
                    <div className={`summary-item-dot ${dotClass}`} />
                    {doc.summary || `${doc.filename} extracted`}
                  </div>
                );
              })}
              {documents.filter(d => d.status === "extracting").map(doc => (
                <div key={doc.id} className="summary-item">
                  <div className="summary-item-dot other" />
                  {doc.filename} extracting...
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTAs */}
        <div className="bottom-cta">
          <button
            className="btn-primary"
            onClick={() => router.push("/dashboard")}
          >
            Go to dashboard →
          </button>
          <button
            className="btn-secondary"
            onClick={() => router.push("/documents")}
          >
            Upload more files
          </button>
        </div>
        <div className="add-more">
          <Link href="/documents">You can always upload more documents later from any property page</Link>
        </div>
      </div>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 52px;
          background: rgba(9,9,11,.88);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
        }
        .nav-mark {
          font-family: var(--serif);
          font-size: 17px;
          color: var(--tx);
        }
        .nav-mark span {
          color: var(--acc);
          font-style: italic;
        }
        .nav-r {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-skip {
          font: 400 12px var(--sans);
          color: var(--tx3);
          cursor: pointer;
          background: none;
          border: none;
          transition: color .15s;
        }
        .btn-skip:hover {
          color: var(--tx2);
        }

        .page {
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 24px 120px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .header-label {
          font: 500 9px/1 var(--mono);
          color: var(--acc);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 16px;
        }
        .header-h {
          font-family: var(--serif);
          font-size: 28px;
          font-weight: 400;
          color: var(--tx);
          margin-bottom: 6px;
        }
        .header-sub {
          font: 300 14px var(--sans);
          color: var(--tx3);
        }

        .context-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 9px;
          margin-bottom: 28px;
        }
        .context-sat {
          width: 40px;
          height: 40px;
          border-radius: 7px;
          background: var(--s2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .context-info {
          flex: 1;
        }
        .context-name {
          font: 500 12px var(--sans);
          color: var(--tx);
        }
        .context-addr {
          font: 400 11px var(--sans);
          color: var(--tx3);
        }

        .progress-bar {
          margin-bottom: 28px;
        }
        .progress-bg {
          height: 4px;
          background: var(--s3);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width .6s ease;
        }
        .progress-fill.working {
          background: var(--acc);
        }
        .progress-fill.done {
          background: var(--grn);
        }
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .progress-label span {
          font: 400 10px var(--sans);
          color: var(--tx3);
        }

        .file-card {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        .file-top {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .file-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .file-icon.pdf {
          background: rgba(248,113,113,.1);
          border: 1px solid rgba(248,113,113,.2);
        }
        .file-icon.xlsx {
          background: rgba(52,211,153,.1);
          border: 1px solid rgba(52,211,153,.2);
        }
        .file-icon.img {
          background: rgba(124,106,240,.1);
          border: 1px solid rgba(124,106,240,.2);
        }
        .file-info {
          flex: 1;
          min-width: 0;
        }
        .file-name {
          font: 500 13px var(--sans);
          color: var(--tx);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-meta {
          font: 400 11px var(--sans);
          color: var(--tx3);
          margin-top: 1px;
        }
        .file-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font: 500 10px/1 var(--mono);
          padding: 4px 8px;
          border-radius: 5px;
          letter-spacing: .3px;
          white-space: nowrap;
        }
        .file-status.uploading {
          background: var(--s2);
          color: var(--tx3);
          border: 1px solid var(--bdr);
        }
        .file-status.extracting {
          background: var(--acc-lt);
          color: var(--acc);
          border: 1px solid var(--acc-bdr);
        }
        .file-status.done {
          background: var(--grn-lt);
          color: var(--grn);
          border: 1px solid var(--grn-bdr);
        }
        .file-status.error {
          background: var(--red-lt);
          color: var(--red);
          border: 1px solid var(--red-bdr);
        }
        .spinner {
          width: 10px;
          height: 10px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin .6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .file-extract {
          padding: 0 16px 14px;
          border-top: 1px solid var(--bdr-lt);
        }
        .extract-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
        }
        .extract-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .extract-dot.found {
          background: var(--grn);
        }
        .extract-dot.warn {
          background: var(--amb);
        }
        .extract-text {
          font: 400 11px var(--sans);
          color: var(--tx2);
        }
        .extract-text strong {
          font-weight: 500;
          color: var(--tx);
        }

        .summary {
          background: var(--s1);
          border: 1px solid var(--acc-bdr);
          border-radius: 12px;
          padding: 24px;
          margin-top: 28px;
        }
        .summary-h {
          font: 600 14px var(--sans);
          color: var(--tx);
          margin-bottom: 4px;
        }
        .summary-sub {
          font: 300 12px var(--sans);
          color: var(--tx3);
          margin-bottom: 16px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--bdr);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .summary-cell {
          background: var(--s1);
          padding: 14px;
          text-align: center;
        }
        .summary-val {
          font-family: var(--serif);
          font-size: 20px;
          color: var(--tx);
          letter-spacing: -.02em;
        }
        .summary-label {
          font: 400 9px/1 var(--mono);
          color: var(--tx3);
          text-transform: uppercase;
          letter-spacing: .6px;
          margin-top: 4px;
        }

        .summary-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font: 400 12px var(--sans);
          color: var(--tx2);
        }
        .summary-item-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .summary-item-dot.lease {
          background: var(--acc);
        }
        .summary-item-dot.insurance {
          background: var(--amb);
        }
        .summary-item-dot.energy {
          background: var(--grn);
        }
        .summary-item-dot.other {
          background: var(--tx3);
        }

        .bottom-cta {
          display: flex;
          gap: 10px;
          margin-top: 28px;
        }
        .btn-primary {
          flex: 1;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--acc);
          color: #fff;
          border: none;
          border-radius: 10px;
          font: 600 14px/1 var(--sans);
          cursor: pointer;
          transition: all .15s;
        }
        .btn-primary:hover {
          background: #6d5ce0;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(124,106,240,.25);
        }
        .btn-secondary {
          height: 46px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--tx2);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          font: 500 14px/1 var(--sans);
          cursor: pointer;
          transition: all .15s;
        }
        .btn-secondary:hover {
          border-color: var(--tx3);
          color: var(--tx);
        }

        .add-more {
          text-align: center;
          margin-top: 16px;
        }
        .add-more a {
          font: 400 12px var(--sans);
          color: var(--tx3);
          transition: color .15s;
        }
        .add-more a:hover {
          color: var(--acc);
        }

        @keyframes enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .a1 { animation: enter .4s ease both; }
        .a2 { animation: enter .4s ease both .07s; }
        .a3 { animation: enter .4s ease both .14s; }
        .a4 { animation: enter .4s ease both .21s; }

        @media(max-width: 600px) {
          .page { padding: 40px 20px 100px; }
          .summary-grid { grid-template-columns: 1fr; }
          .bottom-cta { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

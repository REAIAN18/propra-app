"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  sqft: number;
  tenantCount: number;
}

interface ParseResult {
  properties: Property[];
  totalTenants: number;
  filename: string;
  fileSize: number;
}

type State = "upload" | "parsing" | "confirm";

export default function UploadSchedulePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<State>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [parseProgress, setParseProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  async function handleFile(selectedFile: File) {
    setFile(selectedFile);
    setState("parsing");

    // Simulate parsing progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 100) progress = 100;
      setParseProgress(progress);
    }, 300);

    // Parse file with API
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/parse/schedule", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        setParseResult(data);
        setSelectedPropertyIds(new Set(data.properties.map((p: Property) => p.id)));
        setState("confirm");
      } else {
        // TODO: Show error state
        console.error("Parse failed");
        setState("upload");
      }
    } catch (err) {
      clearInterval(interval);
      console.error("Parse error:", err);
      setState("upload");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }

  function toggleProperty(id: string) {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function enrichProperties() {
    if (!parseResult) return;

    const selectedProps = parseResult.properties.filter(p => selectedPropertyIds.has(p.id));

    // TODO: Call bulk enrichment API
    // For now, redirect to dashboard
    router.push(`/dashboard?enriched=${selectedProps.length}`);
  }

  const totalSqft = parseResult
    ? parseResult.properties
        .filter(p => selectedPropertyIds.has(p.id))
        .reduce((sum, p) => sum + p.sqft, 0)
    : 0;

  const selectedTenantCount = parseResult
    ? parseResult.properties
        .filter(p => selectedPropertyIds.has(p.id))
        .reduce((sum, p) => sum + p.tenantCount, 0)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-mark"><span>R</span>ealHQ</div>
        <Link href="/properties/add" className="nav-back">
          ← Back to add property
        </Link>
      </nav>

      <div className="page">
        {/* STATE 1: Upload zone */}
        {state === "upload" && (
          <div className="state-upload">
            <div className="step-label a1">Add properties</div>
            <h1 className="step-h a2">Upload your portfolio schedule</h1>
            <p className="step-sub a3">
              Drop a rent roll, schedule of assets, or any property list. RealHQ reads the file, extracts every property, and enriches them all automatically.
            </p>

            <div
              className={`upload-zone a3 ${dragging ? "drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.pdf,.docx"
                style={{ display: "none" }}
                onChange={onFileInputChange}
              />
              <div className="upload-icon">📄</div>
              <div className="upload-cta">Drag your file here or click to browse</div>
              <div className="upload-hint">We read rent rolls, asset schedules, portfolio summaries, and property lists</div>
              <div className="upload-types">
                <span className="upload-type">XLSX</span>
                <span className="upload-type">CSV</span>
                <span className="upload-type">PDF</span>
                <span className="upload-type">DOCX</span>
              </div>
            </div>

            <div className="hint a4">
              <div className="hint-dot" />
              We use AI to read any format — no need to match a template. Column headers, free-text property lists, even scanned PDFs.
            </div>
          </div>
        )}

        {/* STATE 2: Parsing file */}
        {state === "parsing" && file && (
          <div className="state-parsing">
            <div className="step-label">Extracting properties</div>
            <h2 className="step-h" style={{ fontSize: "28px", marginBottom: "8px" }}>
              Reading your schedule
            </h2>
            <p className="step-sub" style={{ marginBottom: "28px" }}>
              RealHQ is extracting property addresses, types, sizes, and tenants from your file.
            </p>

            <div className="file-card">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">{(file.size / 1024).toFixed(0)} KB · Uploaded just now</div>
              </div>
              <div className="file-status parsing">Parsing...</div>
            </div>

            <div className="extract-section">
              <div className="extract-bar-bg">
                <div className="extract-bar-fill" style={{ width: `${parseProgress}%` }} />
              </div>
              <div className="extract-label">
                Reading rows... {Math.floor(parseProgress / 20)} properties found so far
              </div>
            </div>
          </div>
        )}

        {/* STATE 3: Properties extracted — confirm */}
        {state === "confirm" && parseResult && (
          <div className="state-confirm">
            <div className="step-label">Confirm properties</div>
            <h2 className="step-h" style={{ fontSize: "28px", marginBottom: "8px" }}>
              We found {parseResult.properties.length} {parseResult.properties.length === 1 ? "property" : "properties"}
            </h2>
            <p className="step-sub" style={{ marginBottom: "24px" }}>
              Check the ones you want to add. We'll enrich them all with market data, satellite imagery, and initial findings.
            </p>

            <div className="file-card" style={{ marginBottom: "24px" }}>
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{parseResult.filename}</div>
                <div className="file-meta">
                  {(parseResult.fileSize / 1024).toFixed(0)} KB · {parseResult.properties.length} properties extracted · {parseResult.totalTenants} tenants found
                </div>
              </div>
              <div className="file-status done">✓ Parsed</div>
            </div>

            <div className="prop-list">
              {parseResult.properties.map(prop => {
                const isChecked = selectedPropertyIds.has(prop.id);
                return (
                  <div key={prop.id} className="prop-item">
                    <div
                      className={`prop-check ${isChecked ? "checked" : ""}`}
                      onClick={() => toggleProperty(prop.id)}
                    >
                      {isChecked && "✓"}
                    </div>
                    <div>
                      <div className="prop-name">{prop.name}</div>
                      <div className="prop-addr">{prop.address} · {prop.sqft.toLocaleString()} sqft</div>
                    </div>
                    <div className="prop-type">{prop.type}</div>
                    <div className="prop-val">{prop.tenantCount} {prop.tenantCount === 1 ? "tenant" : "tenants"}</div>
                  </div>
                );
              })}

              {selectedPropertyIds.size > 0 && (
                <div className="prop-summary">
                  <div className="prop-summary-l">
                    <span>{selectedPropertyIds.size}</span> {selectedPropertyIds.size === 1 ? "property" : "properties"} selected · <span>{selectedTenantCount}</span> tenants found
                  </div>
                  <div className="prop-summary-r">{totalSqft.toLocaleString()} sqft total</div>
                </div>
              )}
            </div>

            <div className="hint">
              <div className="hint-dot" />
              Tenant data was extracted from the schedule. RealHQ will create lease records and begin health scoring automatically.
            </div>

            {selectedPropertyIds.size > 0 && (
              <div className="bottom-cta">
                <button className="btn-primary" onClick={enrichProperties}>
                  Enrich all {selectedPropertyIds.size} {selectedPropertyIds.size === 1 ? "property" : "properties"} →
                </button>
                <button className="btn-secondary" onClick={() => setState("upload")}>
                  Edit list
                </button>
              </div>
            )}
          </div>
        )}
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
        .nav-back {
          font: 400 12px var(--sans);
          color: var(--tx3);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color .15s;
        }
        .nav-back:hover {
          color: var(--tx2);
        }

        .page {
          max-width: 720px;
          margin: 0 auto;
          padding: 60px 24px 120px;
        }

        .step-label {
          font: 500 9px/1 var(--mono);
          color: var(--acc);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 20px;
        }
        .step-h {
          font-family: var(--serif);
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -.03em;
          color: var(--tx);
          margin-bottom: 8px;
        }
        .step-sub {
          font: 300 15px/1.6 var(--sans);
          color: var(--tx3);
          margin-bottom: 36px;
          max-width: 520px;
        }

        .upload-zone {
          border: 2px dashed var(--bdr);
          border-radius: 14px;
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: all .2s;
          background: var(--s1);
          margin-bottom: 20px;
        }
        .upload-zone:hover,
        .upload-zone.drag-over {
          border-color: var(--acc-bdr);
          background: var(--acc-dim);
        }
        .upload-icon {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: .6;
        }
        .upload-cta {
          font: 600 15px var(--sans);
          color: var(--tx);
          margin-bottom: 4px;
        }
        .upload-hint {
          font: 300 13px var(--sans);
          color: var(--tx3);
        }
        .upload-types {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
        }
        .upload-type {
          font: 500 9px/1 var(--mono);
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx3);
          border: 1px solid var(--bdr);
          letter-spacing: .3px;
        }

        .file-card {
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }
        .file-icon {
          width: 40px;
          height: 40px;
          border-radius: 9px;
          background: var(--acc-lt);
          border: 1px solid var(--acc-bdr);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
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
          font: 500 10px/1 var(--mono);
          padding: 4px 8px;
          border-radius: 5px;
          letter-spacing: .3px;
          white-space: nowrap;
        }
        .file-status.parsing {
          background: var(--acc-lt);
          color: var(--acc);
          border: 1px solid var(--acc-bdr);
        }
        .file-status.done {
          background: var(--grn-lt);
          color: var(--grn);
          border: 1px solid var(--grn-bdr);
        }

        .extract-section {
          margin: 28px 0;
        }
        .extract-bar-bg {
          height: 4px;
          background: var(--s3);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .extract-bar-fill {
          height: 100%;
          background: var(--acc);
          border-radius: 2px;
          transition: width .4s ease;
        }
        .extract-label {
          font: 400 10px var(--sans);
          color: var(--tx3);
          text-align: center;
        }

        .prop-list {
          margin: 24px 0;
        }
        .prop-item {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 9px;
          margin-bottom: 6px;
          transition: all .12s;
        }
        .prop-item:hover {
          border-color: var(--acc-bdr);
          background: var(--s2);
        }
        .prop-check {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid var(--bdr);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .12s;
          background: var(--s1);
          flex-shrink: 0;
        }
        .prop-check.checked {
          background: var(--acc);
          border-color: var(--acc);
          color: #fff;
          font-size: 10px;
        }
        .prop-name {
          font: 500 13px var(--sans);
          color: var(--tx);
        }
        .prop-addr {
          font: 400 11px var(--sans);
          color: var(--tx3);
          margin-top: 1px;
        }
        .prop-type {
          font: 500 9px/1 var(--mono);
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx3);
          border: 1px solid var(--bdr);
          letter-spacing: .3px;
        }
        .prop-val {
          font: 500 12px var(--mono);
          color: var(--tx);
          text-align: right;
        }

        .prop-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--s1);
          border: 1px solid var(--acc-bdr);
          border-radius: 9px;
          margin-top: 14px;
        }
        .prop-summary-l {
          font: 500 12px var(--sans);
          color: var(--tx);
        }
        .prop-summary-l span {
          color: var(--acc);
        }
        .prop-summary-r {
          font: 400 11px var(--sans);
          color: var(--tx3);
        }

        .bottom-cta {
          display: flex;
          gap: 10px;
          margin-top: 32px;
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

        .hint {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--s1);
          border: 1px solid var(--bdr);
          border-radius: 8px;
          font: 400 12px var(--sans);
          color: var(--tx3);
        }
        .hint-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--grn);
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }

        @keyframes enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .35; }
        }

        .a1 { animation: enter .4s ease both; }
        .a2 { animation: enter .4s ease both .07s; }
        .a3 { animation: enter .4s ease both .14s; }
        .a4 { animation: enter .4s ease both .21s; }

        @media(max-width: 600px) {
          .page { padding: 40px 20px 100px; }
          .bottom-cta { flex-direction: column; }
          .prop-item { grid-template-columns: auto 1fr auto; }
        }
      `}</style>
    </div>
  );
}

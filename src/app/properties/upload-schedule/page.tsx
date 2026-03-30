"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

interface ParsedProperty {
  address: string;
  confidence: "high" | "medium" | "low";
  additionalInfo?: Record<string, unknown>;
}

export default function UploadSchedulePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedProperties, setParsedProperties] = useState<ParsedProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setParsedProperties([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/properties/upload-schedule", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setParsedProperties(data.properties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleBulkCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/user/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: parsedProperties }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create properties");
      }

      // Redirect to dashboard after successful creation
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create properties");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <TopBar title="Upload Schedule" />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--bg)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 120px" }}>

          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--acc)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 20 }}>
            Add properties
          </div>

          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--tx)", marginBottom: 8 }}>
            Upload your portfolio schedule
          </h1>

          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: "var(--tx3)", marginBottom: 36, maxWidth: 520 }}>
            Drop a rent roll, schedule of assets, or any property list. RealHQ reads the file, extracts every property, and enriches them all automatically.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.docx"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <div
            style={{
              border: `2px dashed ${dragActive ? "var(--acc)" : "var(--bdr)"}`,
              borderRadius: 14,
              padding: "48px 32px",
              textAlign: "center",
              cursor: uploading ? "wait" : "pointer",
              transition: "all 0.2s",
              backgroundColor: dragActive ? "var(--acc-dim)" : "var(--s1)",
              marginBottom: 20
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⏳</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>
                  Processing document...
                </div>
                <div style={{ fontSize: 13, fontWeight: 300, color: "var(--tx3)" }}>
                  Extracting property addresses
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>
                  Drop your file here or click to browse
                </div>
                <div style={{ fontSize: 13, fontWeight: 300, color: "var(--tx3)" }}>
                  We&apos;ll extract property addresses automatically
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>XLSX</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>CSV</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>PDF</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>DOCX</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 20, padding: "12px 16px", backgroundColor: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, fontSize: 13, color: "var(--red)" }}>
              {error}
            </div>
          )}

          {parsedProperties.length > 0 && (
            <div style={{ marginTop: 20, padding: "16px", backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", marginBottom: 12 }}>
                Found {parsedProperties.length} {parsedProperties.length === 1 ? "property" : "properties"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {parsedProperties.map((prop, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--bdr)",
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  >
                    <div style={{ color: "var(--tx)", marginBottom: 4 }}>{prop.address}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                      Confidence: {prop.confidence}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleBulkCreate}
                disabled={creating}
                style={{
                  marginTop: 16,
                  padding: "10px 20px",
                  backgroundColor: creating ? "var(--tx3)" : "var(--acc)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creating ? "wait" : "pointer",
                  width: "100%",
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? "Adding properties..." : "Add all properties →"}
              </button>
            </div>
          )}

        </div>
      </main>
    </AppShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";

type InputMethod = "address" | "pdf" | "text" | "link";

interface PropertyData {
  id: string;
  address: string;
  assetType: string;
  region: string | null;
  satelliteImageUrl: string | null;
  sqft: number | null;
  askingPrice: number | null;
  epcRating: string | null;
  yearBuilt: number | null;
  buildingSizeSqft: number | null;
  ownerCompanyId: string | null;
  currentRentPsf: number | null;
  marketRentPsf: number | null;
  occupancyPct: number | null;
  enrichedAt: Date | null;
  dataSources: unknown;
}

interface EnrichResponse {
  success: boolean;
  property: PropertyData;
  inputMethod: string;
  latency: number;
}

interface RecentProperty {
  id: string;
  address: string;
  analyzedAt: number;
}

function PropertyInputTabs({
  onAnalyze,
  isLoading,
}: {
  onAnalyze: (method: InputMethod, value: string) => void;
  isLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<InputMethod>("address");
  const [addressInput, setAddressInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleAnalyze = () => {
    if (activeTab === "address" && addressInput) {
      onAnalyze("address", addressInput);
    } else if (activeTab === "text" && textInput) {
      onAnalyze("text", textInput);
    } else if (activeTab === "link" && linkInput) {
      onAnalyze("link", linkInput);
    } else if (activeTab === "pdf" && pdfFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) onAnalyze("pdf", base64);
      };
      reader.readAsDataURL(pdfFile);
    }
  };

  const canAnalyze =
    !isLoading &&
    ((activeTab === "address" && addressInput) ||
      (activeTab === "text" && textInput) ||
      (activeTab === "link" && linkInput) ||
      (activeTab === "pdf" && pdfFile));

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--s2)", marginBottom: "24px" }}>
        {[
          { key: "address", label: "Address" },
          { key: "pdf", label: "PDF Upload" },
          { key: "text", label: "Text Paste" },
          { key: "link", label: "Link Paste" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as InputMethod)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.key ? "var(--s1)" : "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--acc)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--tx)" : "#888",
              fontSize: "14px",
              fontWeight: activeTab === tab.key ? "600" : "400",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "24px" }}>
        {activeTab === "address" && (
          <div>
            <input
              type="text"
              placeholder="Enter property address..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
              style={{
                width: "100%",
                padding: "16px",
                background: "var(--s1)",
                border: "1px solid var(--s2)",
                borderRadius: "8px",
                color: "var(--tx)",
                fontSize: "16px",
                outline: "none",
              }}
            />
            <p style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
              Example: 123 Main Street, London SW1A 1AA
            </p>
          </div>
        )}

        {activeTab === "pdf" && (
          <div>
            <label
              style={{
                display: "block",
                width: "100%",
                padding: "48px",
                background: "var(--s1)",
                border: "2px dashed var(--s2)",
                borderRadius: "8px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--acc)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--s2)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--s2)";
                const file = e.dataTransfer.files[0];
                if (file && file.type === "application/pdf") {
                  setPdfFile(file);
                }
              }}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
              <div style={{ color: "var(--tx)", fontSize: "16px", marginBottom: "8px" }}>
                {pdfFile ? pdfFile.name : "Drop PDF here or click to upload"}
              </div>
              <div style={{ fontSize: "13px", color: "#888" }}>
                Property brochure, listing, or investment memo
              </div>
            </label>
          </div>
        )}

        {activeTab === "text" && (
          <div>
            <textarea
              placeholder="Paste property details, listing copy, or investment memo..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              style={{
                width: "100%",
                minHeight: "200px",
                padding: "16px",
                background: "var(--s1)",
                border: "1px solid var(--s2)",
                borderRadius: "8px",
                color: "var(--tx)",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}

        {activeTab === "link" && (
          <div>
            <input
              type="url"
              placeholder="Paste property listing URL..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
              style={{
                width: "100%",
                padding: "16px",
                background: "var(--s1)",
                border: "1px solid var(--s2)",
                borderRadius: "8px",
                color: "var(--tx)",
                fontSize: "16px",
                outline: "none",
              }}
            />
            <p style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
              RightMove, Zoopla, LoopNet, or other listing sites
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        style={{
          width: "100%",
          padding: "16px",
          background: canAnalyze ? "var(--acc)" : "var(--s2)",
          border: "none",
          borderRadius: "8px",
          color: canAnalyze ? "#fff" : "#666",
          fontSize: "16px",
          fontWeight: "600",
          cursor: canAnalyze ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze Property"}
      </button>
    </div>
  );
}

function HeadlineCard({
  property,
  onDeepDive,
  onDismiss,
  onSave,
}: {
  property: PropertyData;
  onDeepDive: () => void;
  onDismiss: () => void;
  onSave: () => void;
}) {
  const narrative = generateNarrative(property);
  const risks = identifyRisks(property);

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        background: "var(--s1)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--s2)",
      }}
    >
      {property.satelliteImageUrl && (
        <div style={{ width: "100%", height: "250px", background: `url(\${property.satelliteImageUrl}) center/cover` }} />
      )}

      <div style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px", color: "var(--tx)" }}>
          {property.address}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {property.askingPrice && (
            <MetricBox label="Valuation" value={`£\${(property.askingPrice / 1_000_000).toFixed(1)}M`} />
          )}
          {property.buildingSizeSqft && (
            <MetricBox label="Size" value={`\${property.buildingSizeSqft.toLocaleString()} sqft`} />
          )}
          {property.region && (
            <MetricBox label="Tenure" value={property.region === "se_uk" ? "Freehold" : "Fee Simple"} />
          )}
          {property.epcRating && <MetricBox label="Energy" value={property.epcRating} />}
        </div>

        {risks.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#888" }}>Key Risks</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {risks.map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    background: risk.severity === "high" ? "rgba(248, 113, 113, 0.1)" : "rgba(251, 191, 36, 0.1)",
                    borderLeft: `3px solid \${risk.severity === "high" ? "var(--red)" : "var(--amb)"}`,
                    borderRadius: "4px",
                    fontSize: "14px",
                    color: "var(--tx)",
                  }}
                >
                  {risk.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "16px", background: "var(--bg)", borderRadius: "8px", marginBottom: "24px" }}>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--tx)" }}>{narrative}</p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onDeepDive}
            style={{
              flex: 1,
              padding: "14px",
              background: "var(--acc)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Deep Dive
          </button>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: "14px",
              background: "var(--grn)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Save to Pipeline
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: "14px 24px",
              background: "transparent",
              border: "1px solid var(--s2)",
              borderRadius: "8px",
              color: "#888",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px", background: "var(--bg)", borderRadius: "8px" }}>
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--tx)" }}>{value}</div>
    </div>
  );
}

function RecentPropertiesSidebar({
  properties,
  onSelect,
}: {
  properties: RecentProperty[];
  onSelect: (id: string) => void;
}) {
  if (properties.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "24px",
        top: "120px",
        width: "280px",
        background: "var(--s1)",
        border: "1px solid var(--s2)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "var(--tx)" }}>
        Recent Properties
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {properties.map((prop) => (
          <button
            key={prop.id}
            onClick={() => onSelect(prop.id)}
            style={{
              padding: "12px",
              background: "var(--bg)",
              border: "1px solid var(--s2)",
              borderRadius: "6px",
              textAlign: "left",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--tx)", marginBottom: "4px" }}>{prop.address}</div>
            <div style={{ fontSize: "11px", color: "#888" }}>
              {new Date(prop.analyzedAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function generateNarrative(property: PropertyData): string {
  const parts: string[] = [];

  parts.push(`\${property.address} is a \${property.assetType || "commercial"} property`);

  if (property.buildingSizeSqft) {
    parts.push(`spanning \${property.buildingSizeSqft.toLocaleString()} square feet`);
  }

  if (property.region === "se_uk") {
    parts.push("in Southeast England");
  } else if (property.region === "fl_us") {
    parts.push("in Florida");
  }

  if (property.askingPrice) {
    parts.push(`with an asking price of £\${(property.askingPrice / 1_000_000).toFixed(1)}M`);
  }

  if (property.yearBuilt) {
    const age = new Date().getFullYear() - property.yearBuilt;
    parts.push(`Built \${age} years ago`);
  }

  if (property.occupancyPct !== null) {
    parts.push(`currently \${property.occupancyPct}% occupied`);
  }

  return parts.join(", ") + ".";
}

function identifyRisks(property: PropertyData): Array<{ text: string; severity: "high" | "medium" }> {
  const risks: Array<{ text: string; severity: "high" | "medium" }> = [];

  if (property.occupancyPct !== null && property.occupancyPct < 80) {
    risks.push({
      text: `Low occupancy at \${property.occupancyPct}% — income risk`,
      severity: property.occupancyPct < 50 ? "high" : "medium",
    });
  }

  if (property.epcRating && ["F", "G"].includes(property.epcRating)) {
    risks.push({
      text: `Poor EPC rating (\${property.epcRating}) — regulatory risk`,
      severity: "high",
    });
  }

  if (property.currentRentPsf && property.marketRentPsf && property.currentRentPsf < property.marketRentPsf * 0.8) {
    risks.push({
      text: "Current rent significantly below market — lease event risk",
      severity: "medium",
    });
  }

  return risks;
}

export default function DealScopePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProperty, setCurrentProperty] = useState<PropertyData | null>(null);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("dealscope_recent");
    if (stored) {
      try {
        setRecentProperties(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent properties:", e);
      }
    }
  }, []);

  const handleAnalyze = async (method: InputMethod, value: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentProperty(null);

    try {
      const payload: Record<string, string> = {};
      if (method === "address") payload.address = value;
      else if (method === "text") payload.text = value;
      else if (method === "link") payload.url = value;
      else if (method === "pdf") payload.file = value;

      const res = await fetch("/api/dealscope/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: EnrichResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error((data as unknown as { error: string }).error || "Failed to analyze property");
      }

      setCurrentProperty(data.property);

      const recent: RecentProperty = {
        id: data.property.id,
        address: data.property.address,
        analyzedAt: Date.now(),
      };
      const updated = [recent, ...recentProperties.filter((p) => p.id !== recent.id)].slice(0, 5);
      setRecentProperties(updated);
      localStorage.setItem("dealscope_recent", JSON.stringify(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepDive = () => {
    if (currentProperty) {
      window.location.href = `/dealscope/\${currentProperty.id}`;
    }
  };

  const handleSave = async () => {
    if (!currentProperty) return;

    try {
      await fetch(`/api/dealscope/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: currentProperty.id,
          stage: "quick_review",
        }),
      });

      alert("Property saved to pipeline");
      setCurrentProperty(null);
    } catch (err) {
      console.error("Failed to save to pipeline:", err);
      alert("Failed to save to pipeline");
    }
  };

  const handleDismiss = () => {
    setCurrentProperty(null);
  };

  const handleSelectRecent = async (id: string) => {
    try {
      const res = await fetch(`/api/dealscope/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: recentProperties.find((p) => p.id === id)?.address || "" }),
      });
      const data = await res.json();
      if (data.property) {
        setCurrentProperty(data.property);
      }
    } catch (err) {
      console.error("Failed to load recent property:", err);
    }
  };

  return (
    <AppShell>
      <div style={{ padding: "40px 24px", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "700",
              marginBottom: "12px",
              color: "var(--tx)",
              fontFamily: "Instrument Serif, serif",
            }}
          >
            DealScope
          </h1>
          <p style={{ fontSize: "18px", color: "#888" }}>
            5-second property analysis. Four ways to input. One clear decision.
          </p>
        </div>

        {error && (
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto 24px",
              padding: "16px",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid var(--red)",
              borderRadius: "8px",
              color: "var(--red)",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {!currentProperty ? (
          <PropertyInputTabs onAnalyze={handleAnalyze} isLoading={isLoading} />
        ) : (
          <HeadlineCard
            property={currentProperty}
            onDeepDive={handleDeepDive}
            onDismiss={handleDismiss}
            onSave={handleSave}
          />
        )}

        {!currentProperty && <RecentPropertiesSidebar properties={recentProperties} onSelect={handleSelectRecent} />}

        {!currentProperty && !isLoading && (
          <div style={{ maxWidth: "800px", margin: "48px auto 0" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#888" }}>
              Try an example
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmin(200px, 1fr))", gap: "12px" }}>
              {[
                "1 Canada Square, London E14 5AB",
                "30 St Mary Axe, London EC3A 8EP",
                "123 Main Street, Miami, FL 33101",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => handleAnalyze("address", example)}
                  style={{
                    padding: "12px",
                    background: "var(--s1)",
                    border: "1px solid var(--s2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--tx)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.2s",
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

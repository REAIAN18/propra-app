"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useNav } from "@/components/layout/NavContext";

// ── Template definitions ───────────────────────────────────────────────────────
type TemplateId = "investment_memo" | "teaser" | "lender_pack" | "valuer_brief" | "brochure" | "insurance_submission" | "management_accounts";

interface Template {
  id: TemplateId;
  icon: string;
  name: string;
  desc: string;
  pages: string;
  apiType: "brochure" | "investment_memo";
}

const TEMPLATES: Template[] = [
  {
    id: "investment_memo",
    icon: "📊",
    name: "Investment Memorandum",
    desc: "Full IM: property overview, market, tenants, DCF, capital stack, recommendation. For investors.",
    pages: "8–10 pages",
    apiType: "investment_memo",
  },
  {
    id: "teaser",
    icon: "⚡",
    name: "2-Page Teaser",
    desc: "Hero image, headline numbers, investment thesis, contact. For initial interest.",
    pages: "2 pages",
    apiType: "brochure",
  },
  {
    id: "lender_pack",
    icon: "🏦",
    name: "Lender Pack",
    desc: "Compliance status, financial summary, lease schedule, debt metrics. For loan applications.",
    pages: "6–8 pages",
    apiType: "investment_memo",
  },
  {
    id: "valuer_brief",
    icon: "📋",
    name: "Valuer Brief",
    desc: "Property data, comparables, lease schedule, planning context. For valuers/appraisers.",
    pages: "4–6 pages",
    apiType: "brochure",
  },
  {
    id: "brochure",
    icon: "🏠",
    name: "Marketing Brochure",
    desc: "Property highlights, photos, location, key metrics. For disposal marketing.",
    pages: "4 pages",
    apiType: "brochure",
  },
  {
    id: "insurance_submission",
    icon: "🛡️",
    name: "Insurance Submission",
    desc: "Property data, rebuild cost, risk profile, claims history. For insurance applications.",
    pages: "3–4 pages",
    apiType: "brochure",
  },
  {
    id: "management_accounts",
    icon: "📈",
    name: "Management Accounts",
    desc: "Monthly P&L, budget variance, rent collection, capex summary. For ongoing reporting.",
    pages: "4–6 pages",
    apiType: "investment_memo",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { portfolioId } = useNav();
  const { portfolio } = usePortfolio(portfolioId);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("investment_memo");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<"preview" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setIsAuthenticated(true); })
      .catch(() => {});
  }, []);

  // Pre-select first two assets when portfolio loads
  useEffect(() => {
    if (portfolio.assets.length > 0 && selectedAssets.size === 0) {
      const first = portfolio.assets.slice(0, 2).map(a => a.id);
      setSelectedAssets(new Set(first));
    }
  }, [portfolio.assets, selectedAssets.size]);

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const targetAssetId = [...selectedAssets][0] ?? portfolio.assets[0]?.id;

  const handlePreview = async () => {
    if (!isAuthenticated || !targetAssetId) return;
    setLoading("preview");
    setError(null);
    try {
      const res = await fetch(`/api/user/assets/${targetAssetId}/brochure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTemplate.apiType, includeFinancials: true, includeLeaseSchedule: true }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data: { htmlPreview?: string } = await res.json();
      setPreviewHtml(data.htmlPreview ?? null);
    } catch {
      setError("Failed to generate preview. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated || !targetAssetId) return;
    setLoading("pdf");
    setError(null);
    try {
      const res = await fetch(`/api/user/assets/${targetAssetId}/brochure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTemplate.apiType, includeFinancials: true, includeLeaseSchedule: true }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data: { pdfUrl?: string } = await res.json();
      if (data.pdfUrl) {
        const a = document.createElement("a");
        a.href = data.pdfUrl;
        a.download = `${activeTemplate.name.replace(/\s+/g, "_")}.pdf`;
        a.click();
      }
    } catch {
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
      {/* Header */}
      <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--tx)", marginBottom: 4 }}>
        Generate Report
      </div>
      <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)", marginBottom: 28 }}>
        Choose a template. RealHQ auto-populates from your property data. Preview before downloading or sharing.
      </div>

      {/* Templates */}
      <div style={{ font: "600 10px var(--mono)", color: "var(--tx3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Templates
      </div>

      <div style={{ marginBottom: 24 }}>
        {TEMPLATES.map(t => {
          const sel = selectedTemplate === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 14,
                alignItems: "center",
                background: sel ? "var(--acc-lt)" : "var(--s2)",
                border: `1px solid ${sel ? "var(--acc)" : "var(--bdr)"}`,
                borderRadius: "var(--r, 8px)",
                padding: "14px 16px",
                marginBottom: 8,
                cursor: "pointer",
                transition: "border-color .12s, background .12s",
              }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--acc-bdr)"; }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--bdr)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, background: "var(--s1)", border: "1px solid var(--bdr)",
                flexShrink: 0,
              }}>
                {t.icon}
              </div>
              <div>
                <div style={{ font: "500 13px var(--sans)", color: "var(--tx)", marginBottom: 2 }}>{t.name}</div>
                <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>{t.desc}</div>
              </div>
              <div style={{ font: "500 10px var(--mono)", color: "var(--tx3)", whiteSpace: "nowrap" }}>{t.pages}</div>
            </div>
          );
        })}
      </div>

      {/* Property selector */}
      <div style={{ font: "600 10px var(--mono)", color: "var(--tx3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Include Properties
      </div>

      <div style={{
        background: "var(--s2)", border: "1px solid var(--bdr)",
        borderRadius: "var(--r, 8px)", padding: "4px 0", marginBottom: 24,
      }}>
        {portfolio.assets.length === 0 ? (
          <div style={{ padding: "12px 16px", font: "300 12px var(--sans)", color: "var(--tx3)" }}>
            No properties in portfolio
          </div>
        ) : portfolio.assets.map(a => {
          const checked = selectedAssets.has(a.id);
          return (
            <div
              key={a.id}
              onClick={() => toggleAsset(a.id)}
              style={{
                display: "grid", gridTemplateColumns: "auto 1fr",
                gap: 10, alignItems: "center",
                padding: "10px 16px", cursor: "pointer",
                borderBottom: "1px solid var(--bdr)",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                background: checked ? "var(--acc)" : "transparent",
                border: checked ? "none" : "1.5px solid var(--bdr)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: "#fff", fontWeight: 700,
              }}>
                {checked && "✓"}
              </div>
              <div style={{ font: "400 12px var(--sans)", color: checked ? "var(--tx)" : "var(--tx3)" }}>
                {a.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auth CTA for demo users */}
      {!isAuthenticated && (
        <div style={{
          background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)",
          borderRadius: "var(--r, 8px)", padding: "14px 16px",
          marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)", marginBottom: 2 }}>Sign in to generate reports</div>
            <div style={{ font: "300 11px var(--sans)", color: "var(--tx3)" }}>Connect your portfolio to auto-populate report data</div>
          </div>
          <a
            href="/signin"
            style={{
              background: "var(--acc)", color: "#fff",
              font: "500 12px var(--sans)", padding: "7px 14px",
              borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            Sign in →
          </a>
        </div>
      )}

      {error && (
        <div style={{
          font: "400 12px var(--sans)", color: "var(--red)",
          background: "var(--red-lt)", border: "1px solid var(--red)",
          borderRadius: 6, padding: "10px 14px", marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button
          onClick={handlePreview}
          disabled={!isAuthenticated || loading !== null}
          style={{
            flex: 1, padding: "10px 0",
            background: isAuthenticated ? "var(--acc)" : "var(--s2)",
            color: isAuthenticated ? "#fff" : "var(--tx3)",
            border: "none", borderRadius: 6,
            font: "500 13px var(--sans)", cursor: isAuthenticated ? "pointer" : "not-allowed",
            opacity: loading === "preview" ? 0.6 : 1,
          }}
        >
          {loading === "preview" ? "Generating…" : "Preview report →"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!isAuthenticated || loading !== null}
          style={{
            flex: 1, padding: "10px 0",
            background: isAuthenticated ? "#34d399" : "var(--s2)",
            color: isAuthenticated ? "#0a0a0a" : "var(--tx3)",
            border: "none", borderRadius: 6,
            font: "500 13px var(--sans)", cursor: isAuthenticated ? "pointer" : "not-allowed",
            opacity: loading === "pdf" ? 0.6 : 1,
          }}
        >
          {loading === "pdf" ? "Generating…" : "Download PDF"}
        </button>
      </div>

      <button
        disabled={!isAuthenticated}
        style={{
          width: "100%", padding: "10px 0",
          background: "transparent",
          color: isAuthenticated ? "var(--tx2)" : "var(--tx3)",
          border: "1px solid var(--bdr)", borderRadius: 6,
          font: "400 13px var(--sans)", cursor: isAuthenticated ? "pointer" : "not-allowed",
        }}
      >
        Share via portal →
      </button>

      {/* Preview panel */}
      {previewHtml && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ font: "600 10px var(--mono)", color: "var(--tx3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Preview
            </div>
            <button
              onClick={() => setPreviewHtml(null)}
              style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", font: "400 12px var(--sans)" }}
            >
              Close ×
            </button>
          </div>
          <div style={{ border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden", height: 640 }}>
            <iframe
              srcDoc={previewHtml}
              title="Report preview"
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

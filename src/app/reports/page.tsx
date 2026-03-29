"use client";

import { useState, useEffect } from "react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  pages: string;
  type: string;
}

interface Property {
  id: string;
  name: string;
}

const TEMPLATES: Template[] = [
  {
    id: "investment_memo",
    name: "Investment Memorandum",
    description: "Full IM: property overview, market, tenants, DCF, capital stack, recommendation. For investors.",
    icon: "📊",
    pages: "8–10 pages",
    type: "investment_memo",
  },
  {
    id: "teaser",
    name: "2-Page Teaser",
    description: "Hero image, headline numbers, investment thesis, contact. For initial interest.",
    icon: "⚡",
    pages: "2 pages",
    type: "teaser",
  },
  {
    id: "lender_pack",
    name: "Lender Pack",
    description: "Compliance status, financial summary, lease schedule, debt metrics. For loan applications.",
    icon: "🏦",
    pages: "6–8 pages",
    type: "lender_pack",
  },
  {
    id: "valuer_brief",
    name: "Valuer Brief",
    description: "Property data, comparables, lease schedule, planning context. For valuers/appraisers.",
    icon: "📋",
    pages: "4–6 pages",
    type: "valuer_brief",
  },
  {
    id: "brochure",
    name: "Marketing Brochure",
    description: "Property highlights, photos, location, key metrics. For disposal marketing.",
    icon: "🏠",
    pages: "4 pages",
    type: "brochure",
  },
  {
    id: "insurance_submission",
    name: "Insurance Submission",
    description: "Property data, rebuild cost, risk profile, claims history. For insurance applications.",
    icon: "🛡️",
    pages: "3–4 pages",
    type: "insurance_submission",
  },
  {
    id: "management_accounts",
    name: "Management Accounts",
    description: "Monthly P&L, budget variance, rent collection, capex summary. For ongoing reporting.",
    icon: "📈",
    pages: "4–6 pages",
    type: "management_accounts",
  },
];

export default function ReportGeneratorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("investment_memo");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/user/assets")
      .then((res) => res.json())
      .then((data) => {
        const props = data.map((asset: any) => ({
          id: asset.id,
          name: asset.propertyName || asset.address,
        }));
        setProperties(props);
        if (props.length > 0) {
          setSelectedProperties(new Set([props[0].id]));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const toggleProperty = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const handlePreview = () => {
    alert("Preview functionality coming soon");
  };

  const handleDownload = async () => {
    if (selectedProperties.size === 0) {
      alert("Please select at least one property");
      return;
    }

    setGenerating(true);
    try {
      const propertyIds = Array.from(selectedProperties);
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedTemplate,
          propertyIds,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedTemplate}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to generate report");
      }
    } catch (error) {
      alert("Error generating report");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = () => {
    alert("Share via portal functionality coming soon");
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "28px 32px 80px" }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "4px" }}>
        Generate Report
      </div>
      <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)", marginBottom: "24px" }}>
        Choose a template. RealHQ auto-populates from your property data. Preview before downloading or sharing.
      </div>

      {/* TEMPLATE SELECTOR */}
      <div className="sec">Templates</div>

      {TEMPLATES.map((template) => (
        <div
          key={template.id}
          className={`template-card ${selectedTemplate === template.id ? "selected" : ""}`}
          onClick={() => setSelectedTemplate(template.id)}
        >
          <div className="template-icon">{template.icon}</div>
          <div>
            <div className="template-name">{template.name}</div>
            <div className="template-desc">{template.description}</div>
          </div>
          <div className="template-pages">{template.pages}</div>
        </div>
      ))}

      {/* PROPERTY SELECTOR */}
      <div className="sec" style={{ marginTop: "24px" }}>
        Include Properties
      </div>
      {loading ? (
        <div style={{ font: "400 13px var(--sans)", color: "var(--tx3)", padding: "20px", textAlign: "center" }}>
          Loading properties...
        </div>
      ) : properties.length === 0 ? (
        <div style={{ font: "400 13px var(--sans)", color: "var(--tx3)", padding: "20px", textAlign: "center" }}>
          No properties found
        </div>
      ) : (
        <div className="card">
          {properties.map((property) => {
            const isSelected = selectedProperties.has(property.id);
            return (
              <div
                key={property.id}
                className="row"
                style={{ gridTemplateColumns: "auto 1fr", cursor: "pointer" }}
                onClick={() => toggleProperty(property.id)}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    background: isSelected ? "var(--acc)" : "transparent",
                    border: isSelected ? "none" : "1.5px solid var(--bdr)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    color: "#fff",
                  }}
                >
                  {isSelected && "✓"}
                </div>
                <div className="row-name" style={{ color: isSelected ? "var(--tx)" : "var(--tx3)" }}>
                  {property.name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIONS */}
      <div className="btn-row" style={{ marginTop: "24px" }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={handlePreview}>
          Preview report →
        </button>
        <button
          className="btn-primary green"
          style={{ flex: 1 }}
          onClick={handleDownload}
          disabled={generating || selectedProperties.size === 0}
        >
          {generating ? "Generating..." : "Download PDF"}
        </button>
      </div>
      <button className="btn-secondary" onClick={handleShare}>
        Share via portal →
      </button>
    </div>
  );
}

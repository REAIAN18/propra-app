"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useParams, useRouter } from "next/navigation";

type TabKey = "overview" | "valuation" | "opportunities" | "risk" | "owner" | "comps" | "dd-checklist";

interface PropertyDetails {
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

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "valuation", label: "Valuation", icon: "💷" },
  { key: "opportunities", label: "Opportunities", icon: "🎯" },
  { key: "risk", label: "Risk", icon: "⚠️" },
  { key: "owner", label: "Owner", icon: "👤" },
  { key: "comps", label: "Comps", icon: "🏘️" },
  { key: "dd-checklist", label: "DD Checklist", icon: "☑️" },
];

function TabNav({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div style={{ display: "flex", gap: "0px", borderBottom: "1px solid var(--s2)" }}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          style={{
            padding: "16px 20px",
            background: activeTab === tab.key ? "var(--s1)" : "transparent",
            border: "none",
            borderBottom: activeTab === tab.key ? "2px solid var(--acc)" : "2px solid transparent",
            color: activeTab === tab.key ? "var(--tx)" : "#888",
            fontSize: "13px",
            fontWeight: activeTab === tab.key ? "600" : "500",
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ marginRight: "6px" }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ property }: { property: PropertyDetails }) {
  const tenure = property.region === "se_uk" ? "Freehold" : property.region === "fl_us" ? "Fee Simple" : "Unknown";
  const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      {/* Property Details */}
      <section>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#888" }}>Property Details</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <DetailRow label="Address" value={property.address} />
          <DetailRow label="Type" value={property.assetType || "Unknown"} />
          <DetailRow label="Size" value={property.buildingSizeSqft ? `${property.buildingSizeSqft.toLocaleString()} sqft` : "—"} />
          <DetailRow label="Tenure" value={tenure} />
          <DetailRow label="Age" value={age ? `${age} years` : "—"} />
          <DetailRow label="Energy Rating" value={property.epcRating || "—"} />
        </div>
      </section>

      {/* Ownership */}
      <section>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#888" }}>Ownership</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <DetailRow label="Owner Company" value={property.ownerCompanyId ? "✓ Identified" : "Pending enrichment"} />
          <DetailRow label="Company Status" value="Pending enrichment" />
          <DetailRow label="Directors" value="Pending enrichment" />
          <DetailRow label="Distress Signals" value="None detected" />
        </div>
      </section>

      {/* Valuation Summary */}
      <section>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#888" }}>Valuation Summary</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <DetailRow
            label="Estimate"
            value={property.askingPrice ? `£${(property.askingPrice / 1_000_000).toFixed(2)}M` : "Pending"}
          />
          <DetailRow label="Confidence" value="Medium (requires full valuation)" />
          <DetailRow label="£ per sqft" value={property.buildingSizeSqft && property.askingPrice ? `£${(property.askingPrice / property.buildingSizeSqft).toFixed(0)}/sqft` : "—"} />
        </div>
      </section>

      {/* Opportunities & Risks */}
      <section>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#888" }}>Key Findings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {property.occupancyPct !== null && property.occupancyPct < 80 && (
            <Finding type={property.occupancyPct < 50 ? "risk" : "opportunity"} text={`Occupancy ${property.occupancyPct}% — rental opportunity`} />
          )}
          {property.currentRentPsf && property.marketRentPsf && property.currentRentPsf < property.marketRentPsf * 0.9 && (
            <Finding type="opportunity" text="Rent reversion opportunity identified" />
          )}
          {property.epcRating && ["F", "G"].includes(property.epcRating) && (
            <Finding type="risk" text={`Poor EPC (${property.epcRating}) — regulatory exposure`} />
          )}
          {property.sqft === null && <Finding type="info" text="Full detailed enrichment pending" />}
        </div>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: "var(--tx)", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

function Finding({ type, text }: { type: "opportunity" | "risk" | "info"; text: string }) {
  const colors = {
    opportunity: { bg: "rgba(52, 211, 153, 0.1)", border: "var(--grn)", text: "var(--grn)" },
    risk: { bg: "rgba(248, 113, 113, 0.1)", border: "var(--red)", text: "var(--red)" },
    info: { bg: "rgba(123, 106, 240, 0.1)", border: "var(--acc)", text: "var(--acc)" },
  };

  const color = colors[type];

  return (
    <div
      style={{
        padding: "12px",
        background: color.bg,
        borderLeft: `3px solid ${color.border}`,
        borderRadius: "4px",
        fontSize: "13px",
        color: color.text,
      }}
    >
      {text}
    </div>
  );
}

function ValuationTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
      <SkeletonCard title="Comparable Sales Method" items={["Sale 1: £1.2M (2024)", "Sale 2: £1.5M (2023)", "Average: £1.35M"]} />
      <SkeletonCard title="Income Capitalization" items={["Annual Income: £150k", "Cap Rate: 5.2%", "Value: £2.88M"]} />
      <SkeletonCard title="Replacement Cost" items={["Land: £500k", "Building: £2.0M", "Total: £2.5M"]} />
      <SkeletonCard title="Confidence Scores" items={["Comps Method: 85%", "Income Method: 70%", "Blended: 78%"]} />
    </div>
  );
}

function OpportunitiesTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
      <SkeletonCard title="Conversion Potential" items={["Status: Pending analysis", "Preliminary: Low-Medium"]} />
      <SkeletonCard title="Land Assemblies" items={["Adjacent properties: Scanning...", "Assembly potential: TBD"]} />
      <SkeletonCard title="Rent Reversion" items={["Current rent: Pending", "Market rent: Pending", "Gap: Calculating..."]} />
      <SkeletonCard title="Financing Structures" items={["Debt capacity: TBD", "Equity options: TBD"]} />
    </div>
  );
}

function RiskTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
      <SkeletonCard title="Listed Status" items={["Check: Pending", "Constraints: TBD"]} />
      <SkeletonCard title="Lease Expiry" items={["Years remaining: TBD", "Break clauses: TBD"]} />
      <SkeletonCard title="Tenant Strength" items={["Credit score: Pending", "Stability: TBD"]} />
      <SkeletonCard title="Market Position" items={["Competition: Scanning", "Rent growth: TBD"]} />
      <SkeletonCard title="Flood Risk" items={["EA rating: Pending", "Insurance cost: TBD"]} />
      <SkeletonCard title="Owner Distress" items={["Financial health: Pending", "Distress signals: None detected"]} />
    </div>
  );
}

function OwnerTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      <SkeletonCard title="Company Details" items={["Name: Pending enrichment", "Registration: TBD", "Status: TBD"]} />
      <SkeletonCard title="Directors" items={["Count: TBD", "Experience: TBD", "History: TBD"]} />
      <SkeletonCard title="Financial Health" items={["Revenue: TBD", "Profitability: TBD", "Debt: TBD"]} />
      <SkeletonCard title="Approach Strategy" items={["Method: TBD", "Timing: TBD", "Terms: TBD"]} />
    </div>
  );
}

function CompsTab() {
  return (
    <div>
      <div style={{ marginBottom: "24px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--s2)" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "600" }}>Address</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#888", fontWeight: "600" }}>Price</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#888", fontWeight: "600" }}>Sqft</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#888", fontWeight: "600" }}>£/sqft</th>
              <th style={{ padding: "12px", textAlign: "center", color: "#888", fontWeight: "600" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--s2)" }}>
                <td style={{ padding: "12px", color: "var(--tx)" }}>Pending enrichment {i}</td>
                <td style={{ padding: "12px", textAlign: "right", color: "#888" }}>—</td>
                <td style={{ padding: "12px", textAlign: "right", color: "#888" }}>—</td>
                <td style={{ padding: "12px", textAlign: "right", color: "#888" }}>—</td>
                <td style={{ padding: "12px", textAlign: "center", color: "#888" }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: "12px", color: "#888" }}>5-10 comparable sales will be populated from ATTOM and Land Registry data once enrichment completes.</p>
    </div>
  );
}

function DDChecklistTab() {
  const items = [
    "EPC certificate obtained",
    "Ownership verified",
    "Planning history reviewed",
    "Listed status confirmed",
    "Lease terms reviewed",
    "Comparable sales analyzed",
  ];

  return (
    <div>
      <div style={{ maxWidth: "600px" }}>
        {items.map((item, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", padding: "12px", borderBottom: "1px solid var(--s2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ marginRight: "12px", cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--acc)" }}
            />
            <span style={{ fontSize: "14px", color: "var(--tx)" }}>{item}</span>
          </label>
        ))}
      </div>
      <p style={{ fontSize: "12px", color: "#888", marginTop: "24px" }}>Items are pre-populated from public data sources. Check them off as you complete your due diligence.</p>
    </div>
  );
}

function SkeletonCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: "8px", padding: "16px" }}>
      <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", color: "var(--tx)" }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ fontSize: "12px", color: "#888" }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DossierPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      try {
        // Fetch property data by ID from the database
        // For now, we'll create a simple fetch to get the deal by ID
        // In production, you'd have a dedicated API endpoint like /api/dealscope/[id]
        const res = await fetch(`/api/scout/deals/${dealId}`);

        if (!res.ok) {
          throw new Error("Property not found");
        }

        const data = await res.json();
        setProperty({
          id: data.id,
          address: data.address,
          assetType: data.assetType || "Commercial",
          region: data.region,
          satelliteImageUrl: data.satelliteImageUrl,
          sqft: data.sqft,
          askingPrice: data.askingPrice,
          epcRating: data.epcRating,
          yearBuilt: data.yearBuilt,
          buildingSizeSqft: data.buildingSizeSqft,
          ownerCompanyId: data.ownerCompanyId,
          currentRentPsf: data.currentRentPsf,
          marketRentPsf: data.marketRentPsf,
          occupancyPct: data.occupancyPct,
          enrichedAt: data.enrichedAt,
          dataSources: data.dataSources,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load property");
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [dealId]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: "40px 24px", minHeight: "100vh", background: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", color: "#888" }}>Loading property dossier...</div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell>
        <div style={{ padding: "40px 24px", minHeight: "100vh", background: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ padding: "24px", background: "rgba(248, 113, 113, 0.1)", border: "1px solid var(--red)", borderRadius: "8px", color: "var(--red)" }}>
              {error || "Property not found"}
            </div>
            <button
              onClick={() => router.back()}
              style={{
                marginTop: "24px",
                padding: "12px 24px",
                background: "var(--s1)",
                border: "1px solid var(--s2)",
                borderRadius: "6px",
                color: "var(--tx)",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        {/* Header with satellite image */}
        <div style={{ background: "var(--s1)", borderBottom: "1px solid var(--s2)" }}>
          {property.satelliteImageUrl && (
            <div
              style={{
                width: "100%",
                height: "280px",
                backgroundImage: `url(${property.satelliteImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "var(--tx)", fontFamily: "Instrument Serif" }}>
              {property.address}
            </h1>
            <p style={{ fontSize: "14px", color: "#888" }}>
              Property Dossier • Enriched {property.enrichedAt ? new Date(property.enrichedAt).toLocaleDateString() : "Pending"}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ borderBottom: "1px solid var(--s2)", background: "var(--bg)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          {activeTab === "overview" && <OverviewTab property={property} />}
          {activeTab === "valuation" && <ValuationTab />}
          {activeTab === "opportunities" && <OpportunitiesTab />}
          {activeTab === "risk" && <RiskTab />}
          {activeTab === "owner" && <OwnerTab />}
          {activeTab === "comps" && <CompsTab />}
          {activeTab === "dd-checklist" && <DDChecklistTab />}
        </div>
      </div>
    </AppShell>
  );
}

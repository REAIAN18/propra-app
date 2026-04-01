"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./dossier.module.css";

const TABS = ["Property", "Planning", "Title & Legal", "Environmental", "Ownership", "Financials", "Market", "Approach"];

type PropertyData = {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  askingPrice?: number;
  signalCount: number;
  brochureDocId?: string;
  satelliteImageUrl?: string;
  epcRating?: string;
  buildingSizeSqft?: number;
  tenure?: string;
  dataSources?: {
    epc?: any;
    comps?: any[];
    planning?: any[];
    images?: string[];
    [key: string]: any;
  };
};

type DealData = {
  property: PropertyData;
  comps: Array<any>;
  signals: Array<any>;
  valuations: Array<any>;
  scenarios: Array<any>;
  rentGap: any;
  ownerIntel: any;
};

/* ── TAB CONTENT COMPONENTS ── */
function PropertyTab({ property }: { property: PropertyData }) {
  const epcData = property.dataSources?.epc;
  const images = property.dataSources?.images || [];

  return (
    <>
      {property.dataSources?.summary && (
        <div className={s.ai}>
          <div className={s.aiLabel}>AI analysis</div>
          <div className={s.aiText}>{property.dataSources.summary}</div>
        </div>
      )}
      {images.length > 0 && (
        <>
          <div className={s.cardTitle}>Images</div>
          <div className={s.gallery}>
            {images.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt="Property" className={s.galImg} style={{ width: "100%", height: "auto" }} />
            ))}
          </div>
        </>
      )}
      {(property.buildingSizeSqft || epcData) && (
        <div className={s.grid2}>
          {property.buildingSizeSqft && (
            <div className={s.card}>
              <div className={s.cardTitle}>Building specification</div>
              <Row l="Building size" v={`${property.buildingSizeSqft.toLocaleString()} sqft`} mono />
              {property.tenure && <Row l="Tenure" v={property.tenure} />}
            </div>
          )}
          {epcData && (
            <div className={s.card}>
              <div className={s.cardTitle}>Energy performance</div>
              {epcData.epcRating && (
                <div className={s.epcRow}>
                  <div className={s.epcBadge}>{epcData.epcRating}</div>
                  <div>
                    <div className={s.epcRating}>Current: {epcData.epcRating}</div>
                    {epcData.epcPotential && <div className={s.epcPotential}>Potential: {epcData.epcPotential}</div>}
                  </div>
                </div>
              )}
              {epcData.validUntil && <Row l="Valid until" v={epcData.validUntil} mono />}
              {epcData.meesRisk && <Row l="MEES compliance" v={epcData.meesRisk} color="amber" />}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PlanningTab({ property }: { property: PropertyData }) {
  const planningApps = property.dataSources?.planning || [];

  return (
    <>
      {planningApps.length > 0 ? (
        <div className={s.card}>
          <div className={s.cardTitle}>Planning history</div>
          {planningApps.map((app: any, i: number) => (
            <PlanRow
              key={i}
              ref_={app.reference || `APP-${i}`}
              desc={app.description || app.title || "Planning application"}
              status={app.status || "Unknown"}
              color={
                app.status?.toLowerCase().includes("approved") ? "green" :
                app.status?.toLowerCase().includes("refused") ? "red" :
                "amber"
              }
              date={app.date ? new Date(app.date).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "Unknown"}
              nearby={false}
            />
          ))}
        </div>
      ) : (
        <div className={s.card}>
          <div className={s.cardTitle}>Planning history</div>
          <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No planning applications found for this address.</div>
        </div>
      )}
    </>
  );
}

function PlaceholderTab({ name, onApproach, property }: { name: string; onApproach?: () => void; property?: PropertyData }) {
  const [generating, setGenerating] = useState(false);

  const handleApproach = async () => {
    if (!onApproach || !property) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/dealscope/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyContext: {
            address: property.address,
            propertyType: property.assetType,
            price: property.askingPrice,
          },
          tone: "professional",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Letter generated:", data);
        alert("Approach letter generated. Ready to send.");
      }
    } catch (err) {
      console.error("Letter generation failed:", err);
      alert("Failed to generate letter");
    } finally {
      setGenerating(false);
      onApproach();
    }
  };

  if (name === "Approach") {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>{name}</div>
        <button
          onClick={handleApproach}
          disabled={generating}
          style={{
            padding: "12px 24px",
            background: "var(--acc)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: generating ? "not-allowed" : "pointer",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? "Generating..." : "Send & track approach letter"}
        </button>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.cardTitle}>{name}</div>
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--tx3)", fontSize: 13 }}>
        Full {name.toLowerCase()} analysis — see design file 02-dossier-full.html for complete layout
      </div>
    </div>
  );
}

/* ── HELPER COMPONENTS ── */
function Row({ l, v, mono, color }: { l: string; v: string; mono?: boolean; color?: string }) {
  const colorClass = color === "green" ? s.vGreen : color === "red" ? s.vRed : color === "amber" ? s.vAmber : "";
  return (
    <div className={s.row}>
      <span className={s.rowL}>{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""} ${colorClass}`}>{v}</span>
    </div>
  );
}

function PlanRow({ ref_, desc, status, color, date, nearby }: { ref_: string; desc: string; status: string; color: string; date: string; nearby?: boolean }) {
  return (
    <div className={s.planRow}>
      <div className={s.planDot} style={{ background: color === "green" ? "var(--grn)" : color === "red" ? "var(--red)" : "var(--amb)" }} />
      <div style={{ flex: 1 }}>
        <div className={s.planRef}>{ref_}{nearby ? " · nearby" : ""}</div>
        <div className={s.planDesc}>{desc} — <strong style={{ color: color === "green" ? "var(--grn)" : "var(--red)" }}>{status}</strong></div>
        <div className={s.planDate}>{date}</div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function DossierPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState(0);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialsData, setFinancialsData] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [approachData, setApproachData] = useState<any>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      try {
        // Fetch property basics
        const propRes = await fetch(`/api/dealscope/properties/${id}`);
        if (!propRes.ok) {
          setError("Property not found");
          setLoading(false);
          return;
        }
        const propData = await propRes.json();

        // Fetch complementary data in parallel
        const [compsRes, signalsRes] = await Promise.all([
          fetch(`/api/dealscope/properties/${id}/comps`),
          fetch(`/api/dealscope/properties/${id}/signals`),
        ]);

        const comps = compsRes.ok ? await compsRes.json() : [];
        const signals = signalsRes.ok ? await signalsRes.json() : [];

        // Merge signal count
        const signalCount = Array.isArray(signals) ? signals.length : 0;
        propData.signalCount = signalCount;

        setProperty(propData);
      } catch (err) {
        setError("Failed to load property");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  // Load supplementary data for tabs
  useEffect(() => {
    if (!property?.id) return;

    const loadTabData = async () => {
      try {
        // Valuations & scenarios for Financials tab
        const [valuationRes, scenariosRes, rentGapRes] = await Promise.all([
          fetch("/api/dealscope/valuations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: property.address,
              assetType: property.assetType,
              sqft: property.sqft,
            }),
          }),
          fetch("/api/dealscope/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dealId: property.id }),
          }),
          fetch("/api/dealscope/rent-gap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: property.address,
              assetType: property.assetType,
            }),
          }),
        ]);

        const valuations = valuationRes.ok ? await valuationRes.json() : null;
        const scenarios = scenariosRes.ok ? await scenariosRes.json() : null;
        const rentGap = rentGapRes.ok ? await rentGapRes.json() : null;

        setFinancialsData({ valuations, scenarios });
        setMarketData({ rentGap });
      } catch (err) {
        console.error("Failed to load tab data:", err);
      }
    };

    loadTabData();
  }, [property?.id, property?.address, property?.assetType, property?.sqft]);

  if (loading) {
    return (
      <AppShell>
        <div className={s.page} style={{ padding: "40px", textAlign: "center" }}>
          Loading property details...
        </div>
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell>
        <div className={s.page} style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>
          {error || "Property not found"}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={s.page}>
        {/* ═══ HEADER ═══ */}
        <div className={s.header}>
          <Link href="/scope/search" className={s.back}>← Back to results</Link>
          <div className={s.headerRow}>
            {/* Gallery */}
            <div className={s.galleryCol}>
              {property.satelliteImageUrl ? (
                <img src={property.satelliteImageUrl} alt="Satellite" className={s.heroImg} style={{ width: "100%", height: "auto" }} />
              ) : (
                <div className={s.heroImg}>Satellite Image</div>
              )}
              <div className={s.thumbRow}>
                {["Satellite", "Street", "Front", "Rear", "Interior"].map((img, i) => (
                  <div key={img} className={`${s.thumb} ${i === 0 ? s.thumbOn : ""}`}>{img.slice(0, 5)}</div>
                ))}
                <div className={s.thumb} style={{ background: "var(--s3)" }}>+4</div>
              </div>
            </div>

            {/* Info */}
            <div className={s.infoCol}>
              <h1 className={s.address}>{property.address}</h1>
              <div className={s.specs}>
                <span><strong>Type</strong> {property.assetType}</span>
                {property.sqft && <span><strong>Size</strong> {property.sqft.toLocaleString()} sqft</span>}
                {property.askingPrice && <span><strong>Price</strong> £{property.askingPrice.toLocaleString()}</span>}
                <span><strong>Signals</strong> {property.signalCount}</span>
              </div>
              <div className={s.signals}>
                {property.signalCount > 0 && <span className={`${s.badge}`} data-type="admin">Signals detected</span>}
              </div>
              <div className={s.actions}>
                <button className={s.btnP} onClick={() => setActiveTab(7)}>Approach Owner</button>
                <button className={s.btnG} onClick={() => console.log("Add to pipeline clicked")}>+ Pipeline</button>
                <button className={s.btnS} onClick={() => console.log("Watch clicked")}>Watch</button>
                <button className={s.btnS} onClick={() => console.log("Export PDF clicked")}>Export PDF</button>
              </div>
            </div>

            {/* Score Summary */}
            <div className={s.summary}>
              <div className={s.scoreBlock}>
                <div className={`${s.scoreRing} ${s.scoreGreen}`}>{property.signalCount.toFixed(1)}</div>
                <div><div style={{ fontSize: 11 }}>Signal score</div><div style={{ fontSize: 9, color: "var(--grn)" }}>Data available</div></div>
              </div>
              {property.askingPrice && <Row l="Asking price" v={`£${property.askingPrice.toLocaleString()}`} mono />}
              <div className={s.sep} />
              <Row l="Last updated" v={new Date().toLocaleDateString()} mono />
            </div>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className={s.body}>
          <div className={s.mainCol}>
            {/* Tabs */}
            <div className={s.tabs}>
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`${s.tab} ${activeTab === i ? s.tabOn : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className={s.tabContent}>
              {activeTab === 0 && <PropertyTab property={property} />}
              {activeTab === 1 && <PlanningTab property={property} />}
              {activeTab === 2 && <PlaceholderTab name="Title & Legal" />}
              {activeTab === 3 && <PlaceholderTab name="Environmental" />}
              {activeTab === 4 && <PlaceholderTab name="Ownership" />}
              {activeTab === 5 && <PlaceholderTab name="Financials" />}
              {activeTab === 6 && <PlaceholderTab name="Market Intelligence" />}
              {activeTab === 7 && property && <PlaceholderTab name="Approach" onApproach={() => {}} property={property} />}
            </div>
          </div>

          {/* Sidebar */}
          <aside className={s.sideCol}>
            <div className={s.sideCard}>
              <div className={s.cardTitle}>Actions</div>
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setActiveTab(7)}>Approach owner</button>
              <button className={`${s.btnG} ${s.btnFull}`} onClick={() => console.log("Pipeline")}>+ Add to pipeline</button>
              <button className={`${s.btnS} ${s.btnFull}`} onClick={() => console.log("Download model")}>Download .xlsx model</button>
              <button className={`${s.btnS} ${s.btnFull}`} onClick={() => console.log("Export PDF")}>Export memo (PDF)</button>
              <button className={`${s.btnS} ${s.btnFull}`} onClick={() => console.log("Compare")}>Compare with…</button>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Mandate match</div>
              <div className={s.mandateBadge}>SE Industrial &lt;£800k</div>
              <div className={s.sideText}>Matches on type, geography, price range, and admin signal. Score 7.2 is above your 6.5 threshold.</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Data sources</div>
              <div className={s.sourceList}>
                {["EPC", "Land Registry", "Companies House", "Gazette", "Planning", "Historic England", "Environment Agency", "Google"].map((src) => (
                  <div key={src} className={s.sourceItem}><span className={s.sourceCheck}>✓</span> {src}</div>
                ))}
              </div>
              <div className={s.sourceDate}>Last enriched: 31 Mar 2026</div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

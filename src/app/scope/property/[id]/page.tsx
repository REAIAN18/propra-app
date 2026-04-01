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
};

/* ── TAB CONTENT COMPONENTS ── */
function PropertyTab({ property }: { property: PropertyData }) {
  return (
    <>
      <div className={s.ai}>
        <div className={s.aiLabel}>AI analysis</div>
        <div className={s.aiText}>Industrial unit in Rochester entered administration 14 Mar 2026. Vacant, freehold, 8,200 sqft, steel frame with profile cladding. MEES upgrade from D to B creates £80k value uplift at £35k cost. Administration sale is speed-critical — target 25–35% below market value. Clean title, no tenancy complications.</div>
      </div>
      <div className={s.cardTitle}>Images & documents</div>
      <div className={s.gallery}>
        {["Satellite", "Street", "Front", "Rear"].map((img) => (
          <div key={img} className={s.galImg}>{img}</div>
        ))}
      </div>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Building specification</div>
          <Row l="Construction" v="Steel portal frame" />
          <Row l="Cladding" v="Insulated profile sheet" />
          <Row l="Eaves height" v="6.2m" mono />
          <Row l="Loading doors" v="2× roller shutter" />
          <Row l="Office content" v="~800 sqft mezzanine" />
          <Row l="Parking" v="8 dedicated spaces" mono />
          <Row l="Utilities" v="3-phase, gas, mains" />
          <Row l="Broadband" v="FTTC (80Mbps)" />
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Energy performance</div>
          <div className={s.epcRow}>
            <div className={s.epcBadge}>D</div>
            <div><div className={s.epcRating}>Current: D (72)</div><div className={s.epcPotential}>Potential: B (42)</div></div>
          </div>
          <Row l="Valid until" v="Aug 2033" mono />
          <Row l="MEES compliance" v="At risk" color="amber" />
          <Row l="Deadline" v="1 Apr 2027" color="amber" mono />
          <div className={s.sep} />
          <div className={s.cardTitle}>Upgrade path</div>
          <Row l="LED lighting" v="£8,000 · saves £2,400/yr" mono />
          <Row l="Roof insulation" v="£15,000 · saves £3,100/yr" mono />
          <Row l="BMS controls" v="£12,000 · saves £1,800/yr" mono />
          <div className={s.sep} />
          <Row l="Total cost" v="£35,000" mono />
          <Row l="Annual savings" v="£7,300/yr" color="green" mono />
          <Row l="Value uplift" v="+£80,000" color="green" mono />
        </div>
      </div>
    </>
  );
}

function PlanningTab() {
  return (
    <>
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Planning zone & use class</div>
          <Row l="Local authority" v="Medway Council" />
          <Row l="Current use" v="B2 / B8" />
          <Row l="Allocation" v="Protected employment land" />
          <div className={s.sep} />
          <div className={s.cardTitle}>Permitted development</div>
          <Row l="Class MA (to resi)" v="Eligible" color="green" />
          <Row l="Class E (commercial)" v="Available" color="green" />
          <Row l="Article 4" v="None in force" color="green" />
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Restrictions</div>
          <Row l="Conservation area" v="No" color="green" />
          <Row l="Listed building" v="Not listed" color="green" />
          <Row l="Green belt" v="No" color="green" />
          <Row l="TPO" v="None" color="green" />
          <Row l="SSSI" v="2.4km (no impact)" color="green" />
          <div className={s.sep} />
          <Row l="CIL rate" v="£0 (exempt)" />
          <Row l="S106" v="None recorded" color="green" />
        </div>
      </div>
      <div className={s.card}>
        <div className={s.cardTitle}>Planning history</div>
        <PlanRow ref_="MC/24/1847" desc="Change of use B2 to B8" status="Approved" color="green" date="Sep 2024" />
        <PlanRow ref_="MC/22/0435" desc="New roller shutter door" status="Approved" color="green" date="Mar 2022" />
        <PlanRow ref_="MC/20/1102" desc="Conversion to 8 residential flats" status="Refused" color="red" date="Nov 2020" />
        <PlanRow ref_="MC/23/2201" desc="New logistics warehouse (adjacent)" status="Approved" color="green" date="Jun 2023" nearby />
      </div>
    </>
  );
}

function PlaceholderTab({ name }: { name: string }) {
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

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      try {
        const response = await fetch(`/api/scope/property/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data);
        } else {
          setError("Property not found");
        }
      } catch (err) {
        setError("Failed to load property");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

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
              <div className={s.heroImg}>Satellite Image</div>
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
                <button className={s.btnG}>+ Pipeline</button>
                <button className={s.btnS}>Watch</button>
                <button className={s.btnS}>Export PDF</button>
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
              {activeTab === 1 && <PlanningTab />}
              {activeTab === 2 && <PlaceholderTab name="Title & Legal" />}
              {activeTab === 3 && <PlaceholderTab name="Environmental" />}
              {activeTab === 4 && <PlaceholderTab name="Ownership" />}
              {activeTab === 5 && <PlaceholderTab name="Financials" />}
              {activeTab === 6 && <PlaceholderTab name="Market Intelligence" />}
              {activeTab === 7 && <PlaceholderTab name="Approach" />}
            </div>
          </div>

          {/* Sidebar */}
          <aside className={s.sideCol}>
            <div className={s.sideCard}>
              <div className={s.cardTitle}>Actions</div>
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setActiveTab(7)}>Approach owner</button>
              <button className={`${s.btnG} ${s.btnFull}`}>+ Add to pipeline</button>
              <button className={`${s.btnS} ${s.btnFull}`}>Download .xlsx model</button>
              <button className={`${s.btnS} ${s.btnFull}`}>Export memo (PDF)</button>
              <button className={`${s.btnS} ${s.btnFull}`}>Compare with…</button>
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

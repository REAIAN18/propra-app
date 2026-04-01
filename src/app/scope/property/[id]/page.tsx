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
  guidePrice?: number;
  capRate?: number;
  brokerName?: string;
  daysOnMarket?: number;
  sourceTag?: string;
  sourceUrl?: string;
  hasLisPendens?: boolean;
  hasInsolvency?: boolean;
  lastSaleYear?: number;
  hasPlanningApplication?: boolean;
  solarIncomeEstimate?: number;
  inFloodZone?: boolean;
  auctionDate?: string;
  ownerName?: string;
  satelliteImageUrl?: string;
  signalCount: number;
  epcRating?: string;
  yearBuilt?: number;
  buildingSizeSqft?: number;
  tenure?: string;
  ownerCompanyId?: string;
  currentRentPsf?: number;
  marketRentPsf?: number;
  occupancyPct?: number;
  leaseLengthYears?: number;
  tenantCovenantStrength?: string;
  brochureDocId?: string;
  enrichedAt?: string;
  dealScore?: number;
  temperature?: string;
  signals?: string[];
  dataSources?: {
    epc?: any;
    comps?: any[];
    planning?: any[];
    images?: string[];
    company?: any;
    gazette?: any[];
    geocode?: any;
    valuations?: any;
    scenarios?: any;
    listing?: {
      images?: string[];
      floorplans?: string[];
      features?: string[];
      description?: string;
      tenure?: string;
      accommodation?: string;
      lotNumber?: string;
      auctionDate?: string;
      agentContact?: { name?: string; phone?: string; email?: string };
      legalPackUrl?: string;
      streetView?: string;
    };
    [key: string]: any;
  };
};

/* ── TAB CONTENT COMPONENTS ── */
function PropertyTab({ property }: { property: PropertyData }) {
  const epcData = property.dataSources?.epc;
  const listing = property.dataSources?.listing;
  const images = property.dataSources?.images || [];
  const features = listing?.features || [];
  const description = listing?.description || property.dataSources?.summary;
  const accommodation = listing?.accommodation;

  return (
    <>
      {description && (
        <div className={s.card}>
          <div className={s.cardTitle}>Description</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{description}</div>
        </div>
      )}
      {features.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Key features</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--tx2)", lineHeight: 2 }}>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {accommodation && (
        <div className={s.card}>
          <div className={s.cardTitle}>Accommodation</div>
          <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{accommodation}</div>
        </div>
      )}
      {images.length > 0 && (
        <>
          <div className={s.cardTitle}>Images</div>
          <div className={s.gallery}>
            {images.slice(0, 8).map((img, i) => (
              <img key={i} src={img} alt="Property" className={s.galImg} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
            ))}
          </div>
        </>
      )}
      {listing?.floorplans && listing.floorplans.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Floorplans</div>
          {listing.floorplans.map((fp, i) => (
            <a key={i} href={fp} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: "#a899ff", marginBottom: 6 }}>
              Floorplan {i + 1} (PDF)
            </a>
          ))}
        </div>
      )}
      {(property.buildingSizeSqft || epcData) && (
        <div className={s.grid2}>
          {property.buildingSizeSqft && (
            <div className={s.card}>
              <div className={s.cardTitle}>Building specification</div>
              <Row l="Building size" v={`${property.buildingSizeSqft.toLocaleString()} sqft`} mono />
              {(property.tenure || listing?.tenure) && <Row l="Tenure" v={property.tenure || listing?.tenure || ""} />}
              {property.yearBuilt && <Row l="Year built" v={String(property.yearBuilt)} mono />}
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
      {listing?.agentContact && (
        <div className={s.card}>
          <div className={s.cardTitle}>Agent contact</div>
          {listing.agentContact.name && <Row l="Name" v={listing.agentContact.name} />}
          {listing.agentContact.phone && <Row l="Phone" v={listing.agentContact.phone} />}
          {listing.agentContact.email && <Row l="Email" v={listing.agentContact.email} />}
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

function TitleLegalTab({ property }: { property: PropertyData }) {
  const gazette = property.dataSources?.gazette || [];
  const listing = property.dataSources?.listing;
  const tenure = property.tenure || listing?.tenure;
  const hasAnyData = tenure || property.lastSaleYear || property.hasLisPendens || property.hasInsolvency || gazette.length > 0 || listing?.lotNumber || listing?.auctionDate || listing?.legalPackUrl;

  if (!hasAnyData) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Title &amp; Legal</div>
        <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No title or legal data available for this property.</div>
      </div>
    );
  }

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Title information</div>
        {tenure && <Row l="Tenure" v={tenure} />}
        {property.lastSaleYear && <Row l="Last sale year" v={String(property.lastSaleYear)} mono />}
        {property.sourceTag && <Row l="Source" v={property.sourceTag} />}
        {listing?.lotNumber && <Row l="Lot number" v={listing.lotNumber} mono />}
        {listing?.auctionDate && <Row l="Auction date" v={new Date(listing.auctionDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} mono />}
        {property.sourceUrl && (
          <div className={s.row}>
            <span className={s.rowL}>Listing URL</span>
            <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a899ff" }}>View listing</a>
          </div>
        )}
      </div>
      {listing?.legalPackUrl && (
        <div className={s.card}>
          <div className={s.cardTitle}>Legal pack</div>
          <a href={listing.legalPackUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a899ff" }}>
            Download legal pack (PDF)
          </a>
        </div>
      )}
      {(property.hasLisPendens || property.hasInsolvency) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Legal flags</div>
          {property.hasLisPendens && (
            <div className={s.warningBox}>Lis pendens detected — active litigation may affect title</div>
          )}
          {property.hasInsolvency && (
            <div className={s.warningBox} style={{ marginTop: 6 }}>Insolvency notice found — owner or associated company in administration</div>
          )}
        </div>
      )}
      {gazette.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Gazette notices</div>
          {gazette.map((g: any, i: number) => (
            <div key={i} className={s.gazetteRow}>
              <div className={s.gazDot} style={{ background: "var(--amb)" }} />
              <div>
                <div className={s.gazRef}>{g.reference || `Notice ${i + 1}`}</div>
                <div className={s.gazDesc}>{g.description || g.title || "Gazette notice"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EnvironmentalTab({ property }: { property: PropertyData }) {
  const epcData = property.dataSources?.epc;
  const hasAnyData = property.inFloodZone !== undefined || epcData || property.solarIncomeEstimate || property.epcRating;

  if (!hasAnyData) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Environmental</div>
        <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No environmental data available for this property.</div>
      </div>
    );
  }

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Environmental risk</div>
        <div className={s.riskRow}>
          <div className={s.riskLabel}>Flood zone</div>
          <div className={s.riskBar}>
            <div className={s.riskFill} style={{ width: property.inFloodZone ? "80%" : "10%", background: property.inFloodZone ? "var(--red)" : "var(--grn)" }} />
          </div>
          <span style={{ fontSize: 10, color: property.inFloodZone ? "var(--red)" : "var(--grn)" }}>{property.inFloodZone ? "Yes" : "No"}</span>
        </div>
        {property.inFloodZone && (
          <div className={s.warningBox}>Property is located in a flood risk zone</div>
        )}
      </div>
      {(epcData || property.epcRating) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Energy performance</div>
          {(epcData?.epcRating || property.epcRating) && (
            <div className={s.epcRow}>
              <div className={s.epcBadge}>{epcData?.epcRating || property.epcRating}</div>
              <div>
                <div className={s.epcRating}>Current: {epcData?.epcRating || property.epcRating}</div>
                {epcData?.epcPotential && <div className={s.epcPotential}>Potential: {epcData.epcPotential}</div>}
              </div>
            </div>
          )}
          {epcData?.validUntil && <Row l="Valid until" v={epcData.validUntil} mono />}
          {epcData?.meesRisk && <Row l="MEES compliance" v={epcData.meesRisk} color="amber" />}
          {epcData?.co2Emissions && <Row l="CO₂ emissions" v={epcData.co2Emissions} />}
          {epcData?.floorAreaSqft && <Row l="Floor area" v={`${epcData.floorAreaSqft.toLocaleString()} sqft`} mono />}
        </div>
      )}
      {property.solarIncomeEstimate && (
        <div className={s.card}>
          <div className={s.cardTitle}>Solar potential</div>
          <Row l="Estimated annual income" v={`£${property.solarIncomeEstimate.toLocaleString()}`} mono color="green" />
        </div>
      )}
    </>
  );
}

function OwnershipTab({ property }: { property: PropertyData }) {
  const company = property.dataSources?.company;
  const hasAnyData = property.ownerName || company;

  if (!hasAnyData) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Ownership</div>
        <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No ownership data available for this property.</div>
      </div>
    );
  }

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Owner details</div>
        {property.ownerName && <Row l="Owner" v={property.ownerName} />}
        {property.ownerCompanyId && <Row l="Company ID" v={property.ownerCompanyId} mono />}
        {company?.companyName && <Row l="Company name" v={company.companyName} />}
        {company?.companyNumber && <Row l="Company number" v={company.companyNumber} mono />}
        {company?.companyStatus && <Row l="Status" v={company.companyStatus} color={company.companyStatus.toLowerCase() === "active" ? "green" : "red"} />}
        {company?.incorporatedDate && <Row l="Incorporated" v={new Date(company.incorporatedDate).toLocaleDateString()} mono />}
      </div>
      {company?.directors && company.directors.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Directors</div>
          {company.directors.map((d: any, i: number) => (
            <div key={i} className={s.directorCard}>
              <div className={s.dirName}>{d.name || `Director ${i + 1}`}</div>
              {d.role && <div style={{ fontSize: 10, color: "var(--tx3)" }}>{d.role}</div>}
              {d.appointedDate && <div style={{ fontSize: 10, color: "var(--tx3)" }}>Appointed: {new Date(d.appointedDate).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      )}
      {company?.charges && company.charges.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Charges &amp; mortgages</div>
          {company.charges.map((c: any, i: number) => (
            <div key={i} className={s.chargeCard}>
              <div style={{ fontSize: 11, color: "var(--tx)" }}>{c.description || `Charge ${i + 1}`}</div>
              {c.status && <div style={{ fontSize: 10, color: c.status.toLowerCase() === "satisfied" ? "var(--grn)" : "var(--amb)" }}>{c.status}</div>}
              {c.createdDate && <div style={{ fontSize: 9, color: "var(--tx3)" }}>Created: {new Date(c.createdDate).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      )}
      {property.hasInsolvency && (
        <div className={s.warningBox}>Insolvency notice detected for this owner</div>
      )}
    </>
  );
}

function FinancialsTab({ property, financialsData }: { property: PropertyData; financialsData: any }) {
  const valuations = financialsData?.valuations;
  const scenarios = financialsData?.scenarios;
  const dsValuations = property.dataSources?.valuations;
  const dsScenarios = property.dataSources?.scenarios;
  const hasAnyData = property.askingPrice || property.capRate || property.currentRentPsf || valuations || dsValuations;

  if (!hasAnyData) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Financials</div>
        <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No financial data available for this property.</div>
      </div>
    );
  }

  return (
    <>
      <div className={s.statRow}>
        {property.askingPrice && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Asking price</div>
            <div className={s.statVal}>£{property.askingPrice.toLocaleString()}</div>
          </div>
        )}
        {property.guidePrice && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Guide price</div>
            <div className={s.statVal}>£{property.guidePrice.toLocaleString()}</div>
          </div>
        )}
        {property.capRate && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Cap rate</div>
            <div className={s.statVal}>{property.capRate.toFixed(1)}%</div>
          </div>
        )}
      </div>
      {(property.currentRentPsf || property.marketRentPsf || property.occupancyPct !== undefined) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Income profile</div>
          {property.currentRentPsf && <Row l="Current rent (psf)" v={`£${property.currentRentPsf.toFixed(2)}`} mono />}
          {property.marketRentPsf && <Row l="Market rent (psf)" v={`£${property.marketRentPsf.toFixed(2)}`} mono />}
          {property.currentRentPsf && property.marketRentPsf && (
            <Row
              l="Rent gap"
              v={`${((property.marketRentPsf - property.currentRentPsf) / property.currentRentPsf * 100).toFixed(1)}%`}
              mono
              color={property.marketRentPsf > property.currentRentPsf ? "green" : "red"}
            />
          )}
          {property.occupancyPct !== undefined && <Row l="Occupancy" v={`${property.occupancyPct}%`} mono />}
          {property.leaseLengthYears && <Row l="Lease length" v={`${property.leaseLengthYears} years`} mono />}
          {property.tenantCovenantStrength && <Row l="Tenant covenant" v={property.tenantCovenantStrength} color={property.tenantCovenantStrength === "strong" ? "green" : property.tenantCovenantStrength === "weak" ? "red" : "amber"} />}
        </div>
      )}
      {(valuations || dsValuations) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Valuations</div>
          {(() => {
            const vals = valuations?.valuations || dsValuations;
            if (!vals) return null;
            if (Array.isArray(vals)) {
              return vals.map((v: any, i: number) => (
                <Row key={i} l={v.method || v.label || `Valuation ${i + 1}`} v={v.value ? `£${Number(v.value).toLocaleString()}` : "N/A"} mono />
              ));
            }
            if (typeof vals === "object") {
              return Object.entries(vals).map(([key, val]: [string, any]) => (
                <Row key={key} l={key} v={typeof val === "number" ? `£${val.toLocaleString()}` : String(val || "N/A")} mono />
              ));
            }
            return null;
          })()}
        </div>
      )}
      {(scenarios || dsScenarios) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Scenarios</div>
          {(() => {
            const scens = scenarios?.scenarios || dsScenarios;
            if (!scens || !Array.isArray(scens)) return <div style={{ padding: "10px", color: "var(--tx3)", fontSize: 12 }}>No scenario data</div>;
            return scens.map((sc: any, i: number) => (
              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--s2)" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)", marginBottom: 4 }}>{sc.name || sc.label || `Scenario ${i + 1}`}</div>
                {sc.irr && <Row l="IRR" v={`${sc.irr}%`} mono color="green" />}
                {sc.exitValue && <Row l="Exit value" v={`£${Number(sc.exitValue).toLocaleString()}`} mono />}
                {sc.profit && <Row l="Profit" v={`£${Number(sc.profit).toLocaleString()}`} mono color="green" />}
              </div>
            ));
          })()}
        </div>
      )}
    </>
  );
}

function MarketTab({ property, marketData }: { property: PropertyData; marketData: any }) {
  const comps = property.dataSources?.comps || [];
  const rentGap = marketData?.rentGap;
  const hasAnyData = comps.length > 0 || rentGap || property.daysOnMarket;

  if (!hasAnyData) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Market intelligence</div>
        <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No market data available for this property.</div>
      </div>
    );
  }

  return (
    <>
      {property.daysOnMarket !== undefined && (
        <div className={s.statRow}>
          <div className={s.statBox}>
            <div className={s.statLabel}>Days on market</div>
            <div className={s.statVal}>{property.daysOnMarket}</div>
          </div>
          {property.brokerName && (
            <div className={s.statBox}>
              <div className={s.statLabel}>Listing broker</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx)" }}>{property.brokerName}</div>
            </div>
          )}
        </div>
      )}
      {comps.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Comparable sales</div>
          <table className={s.tbl}>
            <thead>
              <tr>
                <th>Address</th>
                <th>Price</th>
                <th>Size</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.address || c.title || `Comp ${i + 1}`}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.price ? `£${Number(c.price).toLocaleString()}` : "N/A"}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.sqft ? `${Number(c.sqft).toLocaleString()} sqft` : "N/A"}</td>
                  <td>{c.date ? new Date(c.date).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rentGap && (
        <div className={s.card}>
          <div className={s.cardTitle}>Rent gap analysis</div>
          {rentGap.currentRent && <Row l="Current rent" v={`£${Number(rentGap.currentRent).toLocaleString()}`} mono />}
          {rentGap.marketRent && <Row l="Market rent" v={`£${Number(rentGap.marketRent).toLocaleString()}`} mono />}
          {rentGap.gap && <Row l="Gap" v={`${rentGap.gap}%`} mono color={Number(rentGap.gap) > 0 ? "green" : "red"} />}
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
  const [heroIdx, setHeroIdx] = useState(0);

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

  // Build gallery images from all available sources
  const galleryImages: { url: string; label: string }[] = [];
  const listingImages = property.dataSources?.listing?.images || [];
  const allImages = property.dataSources?.images || [];
  const streetViewUrl = property.dataSources?.listing?.streetView;

  // Add listing images first
  listingImages.forEach((img, i) => galleryImages.push({ url: img, label: `Photo ${i + 1}` }));

  // Add satellite if not already in listing images
  if (property.satelliteImageUrl && !listingImages.includes(property.satelliteImageUrl)) {
    galleryImages.push({ url: property.satelliteImageUrl, label: "Satellite" });
  }

  // Add street view if available
  if (streetViewUrl && !listingImages.includes(streetViewUrl)) {
    galleryImages.push({ url: streetViewUrl, label: "Street" });
  }

  // Fallback: add any images from dataSources.images not already included
  allImages.forEach((img) => {
    if (!galleryImages.some((g) => g.url === img)) {
      galleryImages.push({ url: img, label: "Image" });
    }
  });

  const heroImage = galleryImages[heroIdx] || null;

  return (
    <AppShell>
      <div className={s.page}>
        {/* ═══ HEADER ═══ */}
        <div className={s.header}>
          <Link href="/scope/search" className={s.back}>← Back to results</Link>
          <div className={s.headerRow}>
            {/* Gallery */}
            <div className={s.galleryCol}>
              {heroImage ? (
                <img src={heroImage.url} alt={heroImage.label} className={s.heroImg} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
              ) : property.satelliteImageUrl ? (
                <img src={property.satelliteImageUrl} alt="Satellite" className={s.heroImg} style={{ width: "100%", height: "auto" }} />
              ) : (
                <div className={s.heroImg}>No image available</div>
              )}
              <div className={s.thumbRow}>
                {galleryImages.length > 0 ? (
                  <>
                    {galleryImages.slice(0, 5).map((img, i) => (
                      <div
                        key={i}
                        className={`${s.thumb} ${heroIdx === i ? s.thumbOn : ""}`}
                        onClick={() => setHeroIdx(i)}
                        style={img.url ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                      >
                        {!img.url && img.label.slice(0, 5)}
                      </div>
                    ))}
                    {galleryImages.length > 5 && (
                      <div className={s.thumb} style={{ background: "var(--s3)" }} onClick={() => setActiveTab(0)}>+{galleryImages.length - 5}</div>
                    )}
                  </>
                ) : (
                  <>
                    {["Satellite", "Street", "Front", "Rear", "Interior"].map((img, i) => (
                      <div key={img} className={`${s.thumb} ${i === 0 ? s.thumbOn : ""}`}>{img.slice(0, 5)}</div>
                    ))}
                  </>
                )}
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
                <div className={`${s.scoreRing} ${property.temperature === "hot" ? s.scoreGreen : property.temperature === "warm" ? s.scoreAmber : s.scoreRed}`}>
                  {property.dealScore || property.signalCount}
                </div>
                <div><div style={{ fontSize: 11 }}>Deal score</div><div style={{ fontSize: 9, color: property.temperature === "hot" ? "var(--grn)" : property.temperature === "warm" ? "var(--amb)" : "var(--tx3)" }}>{property.temperature || "N/A"}</div></div>
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
              {activeTab === 2 && <TitleLegalTab property={property} />}
              {activeTab === 3 && <EnvironmentalTab property={property} />}
              {activeTab === 4 && <OwnershipTab property={property} />}
              {activeTab === 5 && <FinancialsTab property={property} financialsData={financialsData} />}
              {activeTab === 6 && <MarketTab property={property} marketData={marketData} />}
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
            {property.dealScore && (
              <div className={s.card}>
                <div className={s.cardTitle}>Deal score</div>
                <div className={s.scoreBlock}>
                  <div className={`${s.scoreRing} ${property.temperature === "hot" ? s.scoreGreen : property.temperature === "warm" ? s.scoreAmber : s.scoreRed}`}>
                    {property.dealScore}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "capitalize" }}>{property.temperature}</div>
                    {property.signals && property.signals.length > 0 && (
                      <div style={{ fontSize: 9, color: "var(--tx3)" }}>{property.signals.join(", ")}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className={s.card}>
              <div className={s.cardTitle}>Data sources</div>
              <div className={s.sourceList}>
                {(() => {
                  const ds = property.dataSources || {};
                  const sources: { name: string; available: boolean }[] = [
                    { name: "EPC", available: !!ds.epc },
                    { name: "Planning", available: Array.isArray(ds.planning) && ds.planning.length > 0 },
                    { name: "Comparables", available: Array.isArray(ds.comps) && ds.comps.length > 0 },
                    { name: "Companies House", available: !!ds.company },
                    { name: "Gazette", available: Array.isArray(ds.gazette) && ds.gazette.length > 0 },
                    { name: "Geocode", available: !!ds.geocode },
                    { name: "Images", available: Array.isArray(ds.images) && ds.images.length > 0 },
                  ];
                  return sources.map((src) => (
                    <div key={src.name} style={{ opacity: src.available ? 1 : 0.4 }}>
                      <span className={s.sourceCheck}>{src.available ? "✓" : "—"}</span> {src.name}
                    </div>
                  ));
                })()}
              </div>
              {property.enrichedAt && (
                <div className={s.sourceDate}>Last enriched: {new Date(property.enrichedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

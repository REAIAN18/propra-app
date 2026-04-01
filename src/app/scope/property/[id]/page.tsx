"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  dataSources?: Record<string, any>;
};

/* ── Source type classification ── */
type SourceType = "listing" | "government" | "estimated" | "user";

function classifySource(source?: string): SourceType {
  if (!source) return "estimated";
  const lower = source.toLowerCase();
  if (lower === "user") return "user";
  if (["data", "listing", "listing passing rent"].includes(lower)) return "listing";
  if (["epc register", "environment agency", "planning", "companies house", "flood"].includes(lower)) return "government";
  return "estimated";
}

function SourceDot({ source }: { source?: string }) {
  const type = classifySource(source);
  const colors: Record<SourceType, string> = { listing: "var(--acc)", government: "var(--grn)", estimated: "var(--amb)", user: "#5599f0" };
  const labels: Record<SourceType, string> = { listing: "From listing", government: "Government API", estimated: "Estimated", user: "User provided" };
  return <span className={s.srcDot} style={{ background: colors[type] }} title={labels[type]} />;
}

function sourceLabel(source?: string): { text: string; className: string } | null {
  const type = classifySource(source);
  if (type === "estimated") return { text: "(estimated)", className: s.labelEst };
  if (type === "user") return { text: "(user)", className: s.labelUser };
  return null;
}

/* ── HELPERS ── */
function Row({ l, v, mono, color, est, source }: { l: string; v: string; mono?: boolean; color?: string; est?: boolean; source?: string }) {
  const colorClass = color === "green" ? s.vGreen : color === "red" ? s.vRed : color === "amber" ? s.vAmber : "";
  const label = source ? sourceLabel(source) : est ? { text: "(estimated)", className: s.labelEst } : null;
  return (
    <div className={s.row}>
      <span className={s.rowL}><SourceDot source={source || (est ? "estimated" : "data")} />{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""} ${colorClass}`} style={label?.className === s.labelEst ? { fontStyle: "italic", opacity: 0.7 } : undefined}>
        {v}{label && <span className={label.className}> {label.text}</span>}
      </span>
    </div>
  );
}

function EstRow({ l, v, source, mono, color }: { l: string; v: string; source?: string; mono?: boolean; color?: string }) {
  return <Row l={l} v={v} mono={mono} color={color} source={source} />;
}

/* ── Editable Row: pencil icon on estimated fields, click to edit ── */
function EditableRow({
  l, v, source, mono, color, fieldKey, propertyId, type, onSaved,
}: {
  l: string; v: string; source?: string; mono?: boolean; color?: string;
  fieldKey: string; propertyId: string; type?: "number" | "text";
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(v);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditable = classifySource(source) === "estimated";

  const handleSave = useCallback(async () => {
    if (inputVal === v) { setEditing(false); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      payload[fieldKey] = type === "number" ? parseFloat(inputVal.replace(/[^0-9.]/g, "")) : inputVal;
      await fetch(`/api/dealscope/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [inputVal, v, fieldKey, propertyId, type, onSaved]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const label = sourceLabel(source);
  const colorClass = color === "green" ? s.vGreen : color === "red" ? s.vRed : color === "amber" ? s.vAmber : "";

  if (editing) {
    return (
      <div className={s.row}>
        <span className={s.rowL}><SourceDot source={source} />{l}</span>
        <span className={s.rowV}>
          <input
            ref={inputRef}
            className={s.inlineInput}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            disabled={saving}
          />
        </span>
      </div>
    );
  }

  return (
    <div className={`${s.row} ${isEditable ? s.editableRow : ""}`}>
      <span className={s.rowL}><SourceDot source={source} />{l}</span>
      <span className={`${s.rowV} ${mono ? s.mono : ""} ${colorClass}`} style={label?.className === s.labelEst ? { fontStyle: "italic", opacity: 0.7 } : undefined}>
        {v}{label && <span className={label.className}> {label.text}</span>}
        {isEditable && <button className={s.editBtn} onClick={() => { setInputVal(v.replace(/[^0-9.]/g, "")); setEditing(true); }} title="Edit value">&#9998;</button>}
      </span>
    </div>
  );
}

/* ── Add Information Modal ── */
function AddInfoModal({ propertyId, onClose, onSaved }: { propertyId: string; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState("");
  const [tenure, setTenure] = useState("");
  const [size, setSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [rent, setRent] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = {};
    if (notes.trim()) payload.notes = notes.trim();
    if (tenure) payload.tenure = tenure;
    if (size) payload.buildingSizeSqft = parseInt(size, 10);
    if (yearBuilt) payload.yearBuilt = parseInt(yearBuilt, 10);
    if (rent) payload.passingRent = parseFloat(rent);

    try {
      await fetch(`/api/dealscope/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.document?.id) {
          await fetch(`/api/dealscope/properties/${propertyId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ additionalDocId: data.document.id }),
          });
          onSaved();
        }
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>Add information</h3>
          <button className={s.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label>Notes</label>
            <textarea className={s.textarea} rows={3} placeholder="Add observations, survey findings, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label>Tenure</label>
              <select className={s.input} value={tenure} onChange={(e) => setTenure(e.target.value)}>
                <option value="">—</option>
                <option value="Freehold">Freehold</option>
                <option value="Leasehold">Leasehold</option>
                <option value="Virtual Freehold">Virtual Freehold</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label>Size (sqft)</label>
              <input className={s.input} type="number" placeholder="e.g. 3500" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label>Year built</label>
              <input className={s.input} type="number" placeholder="e.g. 1995" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label>Passing rent (annual)</label>
              <input className={s.input} type="number" placeholder="e.g. 45000" value={rent} onChange={(e) => setRent(e.target.value)} />
            </div>
          </div>
          <div className={s.formGroup}>
            <label>Upload document</label>
            <div
              className={s.uploadArea}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Click to upload survey, report, or document"}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </div>
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnS} onClick={onClose}>Cancel</button>
          <button className={s.btnP} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function PlanRow({ ref_, desc, status, color, date }: { ref_: string; desc: string; status: string; color: string; date: string }) {
  return (
    <div className={s.planRow}>
      <div className={s.planDot} style={{ background: color === "green" ? "var(--grn)" : color === "red" ? "var(--red)" : "var(--amb)" }} />
      <div style={{ flex: 1 }}>
        <div className={s.planRef}>{ref_}</div>
        <div className={s.planDesc}>{desc} — <strong style={{ color: color === "green" ? "var(--grn)" : "var(--red)" }}>{status}</strong></div>
        <div className={s.planDate}>{date}</div>
      </div>
    </div>
  );
}

function NoData({ label }: { label: string }) {
  return <div style={{ padding: "20px", color: "var(--tx3)", fontSize: 13 }}>No {label} data available for this property.</div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 0: PROPERTY
   ══════════════════════════════════════════════════════════════════════════ */
function PropertyTab({ p, onRefresh }: { p: PropertyData; onRefresh: () => void }) {
  const ds = p.dataSources || {};
  const listing = ds.listing;
  const ai = ds.ai;
  const epcData = ds.epc;
  const assumptions = ds.assumptions;
  const features = ai?.keyFeatures || listing?.features || [];
  const description = listing?.description || null;
  const accommodation = ai?.accommodation || null;
  const images = ds.images || [];

  return (
    <>
      {description && (
        <div className={s.card}>
          <div className={s.cardTitle}>Description</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-line", maxHeight: 300, overflow: "auto" }}>{description}</div>
        </div>
      )}
      {features.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Key features</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--tx2)", lineHeight: 2 }}>
            {features.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardTitle}>Building specification</div>
          {assumptions?.sqft && <EditableRow l="Size" v={`${assumptions.sqft.value.toLocaleString()} sqft`} source={assumptions.sqft.source} mono fieldKey="buildingSizeSqft" propertyId={p.id} type="number" onSaved={onRefresh} />}
          {(p.tenure || listing?.tenure || ai?.tenure) && <Row l="Tenure" v={p.tenure || listing?.tenure || ai?.tenure} source="listing" />}
          {(p.yearBuilt || assumptions?.yearBuilt) && <EditableRow l="Year built" v={String(p.yearBuilt || assumptions?.yearBuilt?.value)} source={assumptions?.yearBuilt?.source} mono fieldKey="yearBuilt" propertyId={p.id} type="number" onSaved={onRefresh} />}
          {ai?.condition && <Row l="Condition" v={ai.condition} source="listing" />}
          {ai?.numberOfUnits && <Row l="Units" v={String(ai.numberOfUnits)} mono source="listing" />}
          {ai?.vacancy && <Row l="Vacancy" v={ai.vacancy} source="listing" />}
        </div>
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
      {accommodation && Array.isArray(accommodation) && accommodation.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Accommodation schedule</div>
          <table className={s.tbl}>
            <thead><tr><th>Unit</th><th>Size</th><th>Rent</th><th>Tenant</th></tr></thead>
            <tbody>
              {accommodation.map((a: any, i: number) => (
                <tr key={i}>
                  <td>{a.unit || `Unit ${i + 1}`}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{a.size_sqft ? `${a.size_sqft.toLocaleString()} sqft` : "—"}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{a.rent ? `£${a.rent.toLocaleString()}` : "—"}</td>
                  <td>{a.tenant || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {listing?.floorplans && listing.floorplans.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Floorplans</div>
          {listing.floorplans.map((fp: string, i: number) => (
            <a key={i} href={fp} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: "#a899ff", marginBottom: 6 }}>
              Floorplan {i + 1} (PDF)
            </a>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <>
          <div className={s.cardTitle}>Gallery</div>
          <div className={s.gallery}>
            {images.slice(0, 8).map((img: string, i: number) => (
              <img key={i} src={img} alt="Property" className={s.galImg} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
            ))}
          </div>
        </>
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

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1: PLANNING
   ══════════════════════════════════════════════════════════════════════════ */
function PlanningTab({ p }: { p: PropertyData }) {
  const planningApps = p.dataSources?.planning || [];
  return (
    <div className={s.card}>
      <div className={s.cardTitle}>Planning history</div>
      {planningApps.length > 0 ? planningApps.map((app: any, i: number) => (
        <PlanRow
          key={i}
          ref_={app.reference || `APP-${i}`}
          desc={app.description || app.title || "Planning application"}
          status={app.status || "Unknown"}
          color={app.status?.toLowerCase().includes("approved") ? "green" : app.status?.toLowerCase().includes("refused") ? "red" : "amber"}
          date={app.date ? new Date(app.date).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "Unknown"}
        />
      )) : <NoData label="planning" />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2: TITLE & LEGAL
   ══════════════════════════════════════════════════════════════════════════ */
function TitleLegalTab({ p }: { p: PropertyData }) {
  const listing = p.dataSources?.listing;
  const ai = p.dataSources?.ai;
  const gazette = p.dataSources?.gazette || [];
  const tenure = p.tenure || listing?.tenure || ai?.tenure;

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Title information</div>
        {tenure ? <Row l="Tenure" v={tenure} /> : <Row l="Tenure" v="Unknown" est />}
        {p.lastSaleYear && <Row l="Last sale year" v={String(p.lastSaleYear)} mono />}
        {p.sourceTag && <Row l="Source" v={p.sourceTag} />}
        {(listing?.lotNumber || ai?.lotNumber) && <Row l="Lot number" v={listing?.lotNumber || ai?.lotNumber} mono />}
        {(listing?.auctionDate || ai?.auctionDate) && <Row l="Auction date" v={new Date(listing?.auctionDate || ai?.auctionDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} mono />}
        {ai?.completionPeriod && <Row l="Completion" v={ai.completionPeriod} />}
        {ai?.serviceCharge && <Row l="Service charge" v={`£${ai.serviceCharge.toLocaleString()} p.a.`} mono />}
        {ai?.groundRent && <Row l="Ground rent" v={`£${ai.groundRent.toLocaleString()} p.a.`} mono />}
        {p.sourceUrl && (
          <div className={s.row}>
            <span className={s.rowL}>Listing URL</span>
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a899ff" }}>View listing</a>
          </div>
        )}
      </div>
      {listing?.legalPackUrl && (
        <div className={s.card}>
          <div className={s.cardTitle}>Legal pack</div>
          <a href={listing.legalPackUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a899ff" }}>Download legal pack (PDF)</a>
        </div>
      )}
      {(p.hasLisPendens || p.hasInsolvency) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Legal flags</div>
          {p.hasLisPendens && <div className={s.warningBox}>Lis pendens detected — active litigation may affect title</div>}
          {p.hasInsolvency && <div className={s.warningBox} style={{ marginTop: 6 }}>Insolvency notice found</div>}
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

/* ══════════════════════════════════════════════════════════════════════════
   TAB 3: ENVIRONMENTAL
   ══════════════════════════════════════════════════════════════════════════ */
function EnvironmentalTab({ p }: { p: PropertyData }) {
  const ds = p.dataSources || {};
  const epcData = ds.epc;
  const flood = ds.flood;
  const ai = ds.ai;
  const assumptions = ds.assumptions;
  const yearBuilt = p.yearBuilt || assumptions?.yearBuilt?.value;
  const isIndustrial = /industrial|warehouse|factory/i.test(p.assetType);
  const contaminationRisk = isIndustrial && yearBuilt && yearBuilt < 2000;

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Flood risk</div>
        {flood ? (
          <>
            <div className={s.riskRow}>
              <div className={s.riskLabel}>Flood zone</div>
              <div className={s.riskBar}>
                <div className={s.riskFill} style={{ width: flood.inFloodZone ? "70%" : "10%", background: flood.inFloodZone ? "var(--red)" : "var(--grn)" }} />
              </div>
              <span style={{ fontSize: 10, color: flood.inFloodZone ? "var(--red)" : "var(--grn)" }}>{flood.riskLevel || (flood.inFloodZone ? "At risk" : "Low")}</span>
            </div>
            {flood.inFloodZone && <div className={s.warningBox}>Property is in a flood risk zone (Environment Agency data)</div>}
            {flood.zones?.map((z: any, i: number) => (
              <div key={i} style={{ fontSize: 11, color: "var(--tx3)", padding: "4px 0" }}>{z.label}{z.description ? ` — ${z.description}` : ""}</div>
            ))}
          </>
        ) : (
          <>
            <Row l="Flood zone" v={p.inFloodZone ? "Yes" : "No data"} color={p.inFloodZone ? "red" : undefined} />
            {!p.inFloodZone && <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>Environment Agency data not available — geocoding may not have resolved</div>}
          </>
        )}
      </div>
      {contaminationRisk && (
        <div className={s.card}>
          <div className={s.cardTitle}>Contamination risk</div>
          <div className={s.amberBox}>Potential contamination risk: industrial property built before 2000. Phase 1 environmental report recommended.</div>
        </div>
      )}
      {(epcData || p.epcRating) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Energy performance</div>
          {(epcData?.epcRating || p.epcRating) && (
            <div className={s.epcRow}>
              <div className={s.epcBadge}>{epcData?.epcRating || p.epcRating}</div>
              <div>
                <div className={s.epcRating}>Current: {epcData?.epcRating || p.epcRating}</div>
                {epcData?.epcPotential && <div className={s.epcPotential}>Potential: {epcData.epcPotential}</div>}
              </div>
            </div>
          )}
          {epcData?.validUntil && <Row l="Valid until" v={epcData.validUntil} mono />}
          {epcData?.meesRisk && <Row l="MEES compliance" v={epcData.meesRisk} color="amber" />}
          {epcData?.co2Emissions && <Row l="CO₂ emissions" v={epcData.co2Emissions} />}
          {epcData?.floorAreaSqft && <Row l="Floor area (EPC)" v={`${epcData.floorAreaSqft.toLocaleString()} sqft`} mono />}
          {epcData?.constructionAgeBand && <Row l="Construction age" v={epcData.constructionAgeBand} />}
          {epcData?.mainHeating && <Row l="Main heating" v={epcData.mainHeating} />}
        </div>
      )}
      {p.solarIncomeEstimate && (
        <div className={s.card}>
          <div className={s.cardTitle}>Solar potential</div>
          <Row l="Estimated annual income" v={`£${p.solarIncomeEstimate.toLocaleString()}`} mono color="green" />
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 4: OWNERSHIP
   ══════════════════════════════════════════════════════════════════════════ */
function OwnershipTab({ p }: { p: PropertyData }) {
  const ds = p.dataSources || {};
  const company = ds.company;
  const ai = ds.ai;

  return (
    <>
      <div className={s.card}>
        <div className={s.cardTitle}>Owner details</div>
        {p.ownerName ? <Row l="Owner" v={p.ownerName} /> : <Row l="Owner" v="Not identified" est />}
        {p.ownerCompanyId && <Row l="Company ID" v={p.ownerCompanyId} mono />}
        {company?.companyName && <Row l="Company name" v={company.companyName} />}
        {company?.companyNumber && <Row l="Company number" v={company.companyNumber} mono />}
        {company?.companyStatus && <Row l="Status" v={company.companyStatus} color={company.companyStatus.toLowerCase() === "active" ? "green" : "red"} />}
      </div>
      {ai?.tenantNames && ai.tenantNames.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Tenants</div>
          {ai.tenantNames.map((t: string, i: number) => <Row key={i} l={`Tenant ${i + 1}`} v={t} />)}
          {ai.leaseExpiry && <Row l="Lease expiry" v={new Date(ai.leaseExpiry).toLocaleDateString("en-GB")} mono />}
          {ai.breakDates?.map((bd: string, i: number) => <Row key={i} l={`Break date ${i + 1}`} v={new Date(bd).toLocaleDateString("en-GB")} mono />)}
        </div>
      )}
      {company?.directors && company.directors.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Directors</div>
          {company.directors.map((d: any, i: number) => (
            <div key={i} className={s.directorCard}>
              <div className={s.dirName}>{d.name || `Director ${i + 1}`}</div>
              {d.role && <div style={{ fontSize: 10, color: "var(--tx3)" }}>{d.role}</div>}
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
            </div>
          ))}
        </div>
      )}
      {p.hasInsolvency && <div className={s.warningBox} style={{ margin: "14px 0" }}>Insolvency notice detected for this owner</div>}
      {ai?.risks && ai.risks.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>AI-identified risks</div>
          {ai.risks.map((r: string, i: number) => <div key={i} style={{ fontSize: 12, color: "var(--red)", padding: "3px 0" }}>• {r}</div>)}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 5: FINANCIALS
   ══════════════════════════════════════════════════════════════════════════ */
function FinancialsTab({ p, onRefresh }: { p: PropertyData; onRefresh: () => void }) {
  const ds = p.dataSources || {};
  const valuations = ds.valuations;
  const returns = ds.returns;
  const scenarios = ds.scenarios;
  const rentGap = ds.rentGap;
  const assumptions = ds.assumptions;
  const market = ds.market;

  return (
    <>
      {/* Price + key metrics */}
      <div className={s.statRow}>
        {p.askingPrice && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Asking price</div>
            <div className={s.statVal}>£{p.askingPrice.toLocaleString()}</div>
          </div>
        )}
        {returns?.noi && (
          <div className={s.statBox}>
            <div className={s.statLabel}>NOI</div>
            <div className={s.statVal}>£{returns.noi.toLocaleString()}</div>
            {assumptions?.noi && <div className={s.statSub}>{assumptions.noi.source}</div>}
          </div>
        )}
        {returns?.capRate && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Cap rate</div>
            <div className={s.statVal}>{typeof returns.capRate === "number" ? returns.capRate.toFixed(1) : returns.capRate}%</div>
          </div>
        )}
        {returns?.equityNeeded && (
          <div className={s.statBox}>
            <div className={s.statLabel}>Equity needed</div>
            <div className={s.statVal}>£{returns.equityNeeded.toLocaleString()}</div>
            <div className={s.statSub}>65% LTV</div>
          </div>
        )}
      </div>

      {/* Income profile */}
      {(rentGap || p.currentRentPsf || p.marketRentPsf) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Income profile</div>
          {rentGap?.passingRent && <EditableRow l="Passing rent" v={`£${rentGap.passingRent.toLocaleString()} p.a.`} source={rentGap.passingRentSource} mono fieldKey="passingRent" propertyId={p.id} type="number" onSaved={onRefresh} />}
          {rentGap?.marketERV && <EditableRow l="Market ERV" v={`£${rentGap.marketERV.toLocaleString()} p.a.`} source={rentGap.ervSource} mono fieldKey="erv" propertyId={p.id} type="number" onSaved={onRefresh} />}
          {rentGap?.gapPct !== undefined && (
            <Row l="Rent gap" v={`${rentGap.gapPct > 0 ? "+" : ""}${rentGap.gapPct}% (${rentGap.direction})`} mono color={rentGap.gapPct > 0 ? "green" : rentGap.gapPct < 0 ? "red" : undefined} />
          )}
          {p.occupancyPct != null && <Row l="Occupancy" v={`${p.occupancyPct}%`} mono />}
          {p.leaseLengthYears != null && <Row l="Lease remaining" v={`${p.leaseLengthYears} years`} mono />}
          {p.tenantCovenantStrength && <Row l="Tenant covenant" v={p.tenantCovenantStrength} color={p.tenantCovenantStrength === "strong" ? "green" : p.tenantCovenantStrength === "weak" ? "red" : "amber"} />}
        </div>
      )}

      {/* Valuations */}
      {valuations && (
        <div className={s.card}>
          <div className={s.cardTitle}>Valuations</div>
          <div className={s.grid3}>
            {valuations.incomeCap && (
              <div className={s.valCard}>
                <div className={s.cardTitle}>Income cap</div>
                <div className={s.valNum}>£{valuations.incomeCap.value.toLocaleString()}</div>
                <div className={s.valSub}>Cap rate: {(valuations.incomeCap.capRate * 100).toFixed(1)}%</div>
              </div>
            )}
            {valuations.psf && (
              <div className={s.valCard}>
                <div className={s.cardTitle}>Price/sqft</div>
                <div className={s.valNum}>£{valuations.psf.value.toLocaleString()}</div>
                {valuations.psf.low && valuations.psf.high && (
                  <div className={s.valSub}>£{valuations.psf.low.toLocaleString()} – £{valuations.psf.high.toLocaleString()}</div>
                )}
              </div>
            )}
            {valuations.blended?.value && (
              <div className={s.valCard}>
                <div className={s.cardTitle}>Blended AVM</div>
                <div className={s.valNum}>£{valuations.blended.value.toLocaleString()}</div>
                <div className={s.valSub}>{valuations.blended.method}</div>
              </div>
            )}
          </div>
          {valuations.discount && (
            <div className={s.elevateCard}>
              <div className={s.elevateTitle}>Potential discount</div>
              <div className={s.elevateText}>Asking price is {valuations.discount}% below income capitalisation value — potential value opportunity.</div>
            </div>
          )}
        </div>
      )}

      {/* Returns */}
      {returns && (returns.irr5yr || returns.cashOnCash || returns.equityMultiple) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Returns (5-year hold)</div>
          <div className={s.statRow}>
            {returns.irr5yr && (
              <div className={s.statBox}>
                <div className={s.statLabel}>IRR</div>
                <div className={s.statVal} style={{ color: returns.irr5yr >= 12 ? "var(--grn)" : returns.irr5yr >= 8 ? "var(--amb)" : "var(--red)" }}>{returns.irr5yr.toFixed(1)}%</div>
              </div>
            )}
            {returns.cashOnCash && (
              <div className={s.statBox}>
                <div className={s.statLabel}>Cash-on-cash</div>
                <div className={s.statVal}>{returns.cashOnCash.toFixed(1)}%</div>
              </div>
            )}
            {returns.equityMultiple && (
              <div className={s.statBox}>
                <div className={s.statLabel}>Equity multiple</div>
                <div className={s.statVal}>{returns.equityMultiple.toFixed(2)}×</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DSCR */}
      {market?.dscr && (
        <div className={s.card}>
          <div className={s.cardTitle}>Debt service</div>
          <Row l="Annual debt service" v={`£${market.annualDebtService.toLocaleString()}`} mono />
          <Row l="DSCR" v={`${market.dscr}×`} mono color={market.dscr >= 1.25 ? "green" : market.dscr >= 1.0 ? "amber" : "red"} />
          <Row l="LTV" v={`${(market.financing.ltvPct * 100).toFixed(0)}%`} mono />
          <Row l="Rate" v={`${(market.financing.annualRate * 100).toFixed(1)}%`} mono />
        </div>
      )}

      {/* Scenarios */}
      {scenarios && Array.isArray(scenarios) && scenarios.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Hold scenarios (5-year)</div>
          <table className={s.tbl}>
            <thead><tr><th>Scenario</th><th>IRR</th><th>Multiple</th><th>Cash yield</th><th>NPV</th></tr></thead>
            <tbody>
              {scenarios.map((sc: any, i: number) => (
                <tr key={i}>
                  <td>{sc.name}</td>
                  <td style={{ fontFamily: "var(--mono)", color: Number(sc.irr) >= 12 ? "var(--grn)" : Number(sc.irr) >= 8 ? "var(--amb)" : "var(--red)" }}>{sc.irr}%</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{sc.equityMultiple}×</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{sc.cashYield}%</td>
                  <td style={{ fontFamily: "var(--mono)" }}>£{Number(sc.npv).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 6: MARKET
   ══════════════════════════════════════════════════════════════════════════ */
function MarketTab({ p }: { p: PropertyData }) {
  const ds = p.dataSources || {};
  const comps = ds.comps || [];
  const market = ds.market;

  return (
    <>
      {market && (
        <div className={s.card}>
          <div className={s.cardTitle}>Market benchmarks — {market.region} / {market.assetType}</div>
          <div className={s.grid3}>
            <div className={s.miCard}>
              <div className={s.miVal}>{(market.capRate * 100).toFixed(1)}%</div>
              <div className={s.miLabel}>Market cap rate</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>£{market.ervPsf.toFixed(2)}</div>
              <div className={s.miLabel}>Market ERV (£/sqft/yr)</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>{(market.financing.annualRate * 100).toFixed(1)}%</div>
              <div className={s.miLabel}>Lending rate</div>
            </div>
          </div>
          <div className={s.sep} />
          <Row l="LTV assumption" v={`${(market.financing.ltvPct * 100).toFixed(0)}%`} mono />
          <Row l="Loan term" v={`${market.financing.termYears} years`} mono />
          {market.dscr && <Row l="DSCR" v={`${market.dscr}×`} mono color={market.dscr >= 1.25 ? "green" : "amber"} />}
        </div>
      )}
      {comps.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Comparable sales ({comps.length})</div>
          <table className={s.tbl}>
            <thead><tr><th>Address</th><th>Price</th><th>Size</th><th>£/sqft</th><th>Date</th></tr></thead>
            <tbody>
              {comps.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.address || `Comp ${i + 1}`}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.price ? `£${Number(c.price).toLocaleString()}` : "—"}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.sqft ? `${Number(c.sqft).toLocaleString()}` : "—"}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.pricePerSqft ? `£${Number(c.pricePerSqft).toFixed(0)}` : "—"}</td>
                  <td>{c.date ? new Date(c.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {p.daysOnMarket !== undefined && (
        <div className={s.card}>
          <div className={s.cardTitle}>Listing activity</div>
          <Row l="Days on market" v={String(p.daysOnMarket)} mono />
          {p.brokerName && <Row l="Broker" v={p.brokerName} />}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 7: APPROACH
   ══════════════════════════════════════════════════════════════════════════ */
function ApproachTab({ p }: { p: PropertyData }) {
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const listing = p.dataSources?.listing;
  const ai = p.dataSources?.ai;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/dealscope/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyContext: {
            address: p.address,
            propertyType: p.assetType,
            price: p.askingPrice,
            features: ai?.keyFeatures || listing?.features,
          },
          tone: "professional",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLetter(data.letter || data.content || "Letter generated successfully.");
      }
    } catch (err) {
      console.error("Letter generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Best contact: agent from listing, or administrator from gazette
  const bestContact = listing?.agentContact || (ai?.agentName ? { name: ai.agentName, phone: ai.agentContact } : null);

  return (
    <>
      {bestContact && (
        <div className={s.card}>
          <div className={s.cardTitle}>Best contact</div>
          {bestContact.name && <Row l="Name" v={bestContact.name} />}
          {bestContact.phone && <Row l="Phone" v={bestContact.phone} />}
          {bestContact.email && <Row l="Email" v={bestContact.email} />}
        </div>
      )}
      <div className={s.card}>
        <div className={s.cardTitle}>Approach letter</div>
        {letter ? (
          <>
            <div className={s.letterView}>{letter}</div>
            <div className={s.letterActions}>
              <button className={s.btnP} onClick={() => navigator.clipboard.writeText(letter)}>Copy</button>
              <button className={s.btnS} onClick={() => setLetter(null)}>Regenerate</button>
            </div>
          </>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={s.btnP}
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating..." : "Generate approach letter"}
          </button>
        )}
      </div>
      {ai?.opportunities && ai.opportunities.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Negotiation leverage</div>
          <div className={s.levBuy}>
            <div className={s.levTitle}>Buyer leverage</div>
            {ai.opportunities.map((o: string, i: number) => <div key={i} className={s.levItem}>• {o}</div>)}
          </div>
          {ai.risks && ai.risks.length > 0 && (
            <div className={s.levSell}>
              <div className={s.levTitle}>Seller leverage</div>
              {ai.risks.map((r: string, i: number) => <div key={i} className={s.levItem}>• {r}</div>)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function DossierPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState(0);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [watched, setWatched] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [showAddInfo, setShowAddInfo] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const handleExportPDF = useCallback(async () => {
    if (!id) return;
    setExporting("pdf");
    try {
      const res = await fetch(`/api/dealscope/export/memo?id=${id}`);
      if (!res.ok) throw new Error("Export failed");
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `memo-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // HTML fallback — open in new tab for print
        const html = await res.text();
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); }
      }
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(null);
    }
  }, [id]);

  const handleExportXlsx = useCallback(async () => {
    if (!id) return;
    setExporting("xlsx");
    try {
      const res = await fetch(`/api/dealscope/export/model?id=${id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `model-${id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("XLSX export failed:", e);
    } finally {
      setExporting(null);
    }
  }, [id]);

  const fetchProperty = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/dealscope/properties/${id}`);
      if (!res.ok) { setError("Property not found"); setLoading(false); return; }
      const data = await res.json();
      data.signalCount = data.signalCount || data.dataSources?.score?.signalCount || 0;
      setProperty(data);
    } catch (err) {
      setError("Failed to load property");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  // Check if property is on watchlist
  useEffect(() => {
    if (!id) return;
    fetch("/api/dealscope/watchlist")
      .then((r) => r.json())
      .then((list: any[]) => {
        if (Array.isArray(list)) setWatched(list.some((w) => w.propertyId === id));
      })
      .catch(() => {});
  }, [id]);

  const handleWatch = async () => {
    if (!id) return;
    setWatchLoading(true);
    try {
      if (watched) {
        // Find watchlist entry and remove
        const res = await fetch("/api/dealscope/watchlist");
        const list = await res.json();
        const entry = Array.isArray(list) ? list.find((w: any) => w.propertyId === id) : null;
        if (entry) {
          await fetch(`/api/dealscope/watchlist/${entry.id}`, { method: "DELETE" });
        }
        setWatched(false);
      } else {
        await fetch("/api/dealscope/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: id }),
        });
        setWatched(true);
      }
    } catch (e) {
      console.error("Watchlist error:", e);
    } finally {
      setWatchLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchProperty();
  }, [fetchProperty]);

  if (loading) return <AppShell><div className={s.page} style={{ padding: "40px", textAlign: "center" }}>Loading property details...</div></AppShell>;
  if (error || !property) return <AppShell><div className={s.page} style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>{error || "Property not found"}</div></AppShell>;

  const ds = property.dataSources || {};
  const score = ds.score;
  const listingImages = ds.listing?.images || [];
  const allImages = ds.images || [];
  const streetViewUrl = ds.listing?.streetView;

  // Build gallery
  const gallery: { url: string; label: string }[] = [];
  listingImages.forEach((img: string, i: number) => gallery.push({ url: img, label: `Photo ${i + 1}` }));
  if (property.satelliteImageUrl && !listingImages.includes(property.satelliteImageUrl)) gallery.push({ url: property.satelliteImageUrl, label: "Satellite" });
  if (streetViewUrl && !listingImages.includes(streetViewUrl)) gallery.push({ url: streetViewUrl, label: "Street" });
  allImages.forEach((img: string) => { if (!gallery.some((g) => g.url === img)) gallery.push({ url: img, label: "Image" }); });

  const heroImage = gallery[heroIdx] || null;
  const scoreColor = score?.confidenceLevel === "high" ? s.scoreGreen : score?.confidenceLevel === "medium" ? s.scoreAmber : s.scoreRed;

  return (
    <AppShell>
      <div className={s.page}>
        {/* ═══ ADD INFO MODAL ═══ */}
        {showAddInfo && <AddInfoModal propertyId={id} onClose={() => setShowAddInfo(false)} onSaved={handleRefresh} />}

        {/* ═══ SOURCE LEGEND ═══ */}
        <div className={`${s.legendBar} ${s.anim} ${s.a1}`}>
          <span className={s.legendItem}><span className={s.srcDot} style={{ background: "var(--acc)" }} /> Listing</span>
          <span className={s.legendItem}><span className={s.srcDot} style={{ background: "var(--grn)" }} /> Government API</span>
          <span className={s.legendItem}><span className={s.srcDot} style={{ background: "var(--amb)" }} /> Estimated</span>
          <span className={s.legendItem}><span className={s.srcDot} style={{ background: "#5599f0" }} /> User provided</span>
        </div>

        {/* ═══ HEADER ═══ */}
        <div className={`${s.header} ${s.anim} ${s.a2}`}>
          <Link href="/scope/search" className={s.back}>← Back to results</Link>
          <div className={s.headerRow}>
            <div className={s.galleryCol}>
              {heroImage ? (
                <img src={heroImage.url} alt={heroImage.label} className={s.heroImg} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
              ) : (
                <div className={s.heroImg}>No image available</div>
              )}
              <div className={s.thumbRow}>
                {gallery.slice(0, 5).map((img, i) => (
                  <div
                    key={i}
                    className={`${s.thumb} ${heroIdx === i ? s.thumbOn : ""}`}
                    onClick={() => setHeroIdx(i)}
                    style={img.url ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  />
                ))}
                {gallery.length > 5 && <div className={s.thumb} style={{ background: "var(--s3)" }} onClick={() => setActiveTab(0)}>+{gallery.length - 5}</div>}
              </div>
            </div>

            <div className={s.infoCol}>
              <h1 className={s.address}>{property.address}</h1>
              <div className={s.specs}>
                <span><strong>Type</strong> {property.assetType}</span>
                {property.buildingSizeSqft && <span><strong>Size</strong> {property.buildingSizeSqft.toLocaleString()} sqft</span>}
                {property.askingPrice && <span><strong>Price</strong> £{property.askingPrice.toLocaleString()}</span>}
                {property.tenure && <span><strong>Tenure</strong> {property.tenure}</span>}
              </div>
              <div className={s.signals}>
                {score?.signals?.map((sig: any, i: number) => (
                  <span key={i} className={s.badge} data-type={sig.type === "distress" ? "admin" : sig.type === "opportunity" ? "mees" : "charges"}>{sig.name}</span>
                ))}
              </div>
              <div className={s.actions}>
                <button className={s.btnP} onClick={() => setActiveTab(7)}>Approach Owner</button>
                <button className={s.btnG}>+ Pipeline</button>
                <button className={`${s.btnS} ${watched ? s.btnWatched : ""}`} onClick={handleWatch} disabled={watchLoading}>
                  {watchLoading ? "..." : watched ? "Watching" : "Watch"}
                </button>
                <button className={s.btnS} onClick={handleExportPDF} disabled={exporting === "pdf"}>{exporting === "pdf" ? "Exporting..." : "Export PDF"}</button>
              </div>
            </div>

            <div className={s.summary}>
              <div className={s.scoreBlock}>
                <div className={`${s.scoreRing} ${scoreColor}`}>{score?.total ?? property.signalCount}</div>
                <div>
                  <div style={{ fontSize: 11 }}>Deal score</div>
                  <div style={{ fontSize: 9, color: score?.confidenceLevel === "high" ? "var(--grn)" : score?.confidenceLevel === "medium" ? "var(--amb)" : "var(--tx3)" }}>
                    {score ? `${score.confidenceLevel} confidence (${score.signalCount} signals)` : "N/A"}
                  </div>
                </div>
              </div>
              {score?.opportunity && (
                <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 6 }}>{score.opportunity.summary}</div>
              )}
              {property.askingPrice && <Row l="Asking price" v={`£${property.askingPrice.toLocaleString()}`} mono />}
              <div className={s.sep} />
              {property.enrichedAt && <Row l="Enriched" v={new Date(property.enrichedAt).toLocaleDateString("en-GB")} mono />}
            </div>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className={`${s.body} ${s.anim} ${s.a4}`}>
          <div className={s.mainCol}>
            <div className={s.tabs}>
              {TABS.map((tab, i) => (
                <button key={tab} className={`${s.tab} ${activeTab === i ? s.tabOn : ""}`} onClick={() => setActiveTab(i)}>{tab}</button>
              ))}
            </div>
            <div className={s.tabContent} key={activeTab}>
              {activeTab === 0 ? <PropertyTab p={property} onRefresh={handleRefresh} />
               : activeTab === 1 ? <PlanningTab p={property} />
               : activeTab === 2 ? <TitleLegalTab p={property} />
               : activeTab === 3 ? <EnvironmentalTab p={property} />
               : activeTab === 4 ? <OwnershipTab p={property} />
               : activeTab === 5 ? <FinancialsTab p={property} onRefresh={handleRefresh} />
               : activeTab === 6 ? <MarketTab p={property} />
               : activeTab === 7 ? <ApproachTab p={property} />
               : null}
            </div>
          </div>

          <aside className={s.sideCol}>
            <div className={s.sideCard}>
              <div className={s.cardTitle}>Actions</div>
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setActiveTab(7)}>Approach owner</button>
              <button className={`${s.btnG} ${s.btnFull}`}>+ Add to pipeline</button>
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setShowAddInfo(true)}>+ Add information</button>
              <button className={`${s.btnS} ${s.btnFull}`} onClick={handleExportPDF} disabled={exporting === "pdf"}>{exporting === "pdf" ? "Exporting..." : "Export memo (PDF)"}</button>
              <button className={`${s.btnS} ${s.btnFull}`} onClick={handleExportXlsx} disabled={exporting === "xlsx"}>{exporting === "xlsx" ? "Exporting..." : "Download .xlsx model"}</button>
            </div>
            {score && (
              <div className={s.card}>
                <div className={s.cardTitle}>Scoring breakdown</div>
                {score.signals?.map((sig: any, i: number) => (
                  <div key={i} className={s.riskRow}>
                    <div className={s.riskLabel} style={{ width: "auto", flex: 1 }}>{sig.name}</div>
                    <div className={s.riskBar} style={{ flex: 0, width: 60 }}>
                      <div className={s.riskFill} style={{ width: `${sig.weight * 10}%`, background: sig.type === "distress" ? "var(--red)" : sig.type === "opportunity" ? "var(--amb)" : "var(--acc)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={s.card}>
              <div className={s.cardTitle}>Data sources</div>
              <div className={s.sourceList}>
                {[
                  { name: "EPC Register", available: !!ds.epc },
                  { name: "Planning", available: Array.isArray(ds.planning) && ds.planning.length > 0 },
                  { name: "Comparables", available: Array.isArray(ds.comps) && ds.comps.length > 0 },
                  { name: "Companies House", available: !!ds.company },
                  { name: "Flood (EA)", available: !!ds.flood },
                  { name: "AI extraction", available: !!ds.ai },
                  { name: "Listing scrape", available: !!ds.listing },
                  { name: "Geocode", available: !!ds.geocode },
                  { name: "Valuations", available: !!ds.valuations },
                  { name: "Scenarios", available: !!ds.scenarios },
                ].map((src) => (
                  <div key={src.name} style={{ opacity: src.available ? 1 : 0.4 }}>
                    <span className={s.sourceCheck}>{src.available ? "✓" : "—"}</span> {src.name}
                  </div>
                ))}
              </div>
              {property.enrichedAt && (
                <div className={s.sourceDate}>Last enriched: {new Date(property.enrichedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              )}
            </div>
            {ds.assumptions && (
              <div className={s.card}>
                <div className={s.cardTitle}>Assumptions</div>
                {Object.entries(ds.assumptions).filter(([, v]) => v !== null).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ fontSize: 10, color: "var(--tx3)", padding: "2px 0" }}>
                    <strong>{key}:</strong> {typeof val === "object" ? `${val.value?.toLocaleString?.() || val.value} — ${val.source}` : String(val)}
                  </div>
                ))}
              </div>
            )}
            {/* User notes */}
            {ds.userNotes && (
              <div className={s.card}>
                <div className={s.cardTitle}>Notes</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{ds.userNotes}</div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

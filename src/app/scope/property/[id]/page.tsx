"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPanel } from "@/components/dealscope/HeroPanel";
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
          // Link doc to deal
          await fetch(`/api/dealscope/properties/${propertyId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ additionalDocId: data.document.id }),
          });
          // Auto-extract lease terms in background
          fetch(`/api/documents/${data.document.id}/extract`, { method: "POST" }).catch(() => {});
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
              <img key={i} src={img} alt="Property" className={s.galImg} style={{ width: "100%", height: "auto", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
  const dev = p.dataSources?.devPotential;

  // Separate planning apps: this property vs nearby
  const addr = (p.address || "").toLowerCase();
  const thisProperty: any[] = [];
  const nearby: any[] = [];
  planningApps.forEach((app: any) => {
    const siteAddr = (app["site-address"] || app.address || app.description || "").toLowerCase();
    if (siteAddr && addr && (siteAddr.includes(addr.split(",")[0]?.trim()) || addr.includes(siteAddr.split(",")[0]?.trim()))) {
      thisProperty.push(app);
    } else {
      nearby.push(app);
    }
  });

  return (
    <>
      {dev && (
        <div className={s.card}>
          <div className={s.cardTitle}>Development potential</div>
          {dev.siteCoveragePct != null && <Row l="Site coverage" v={`${dev.siteCoveragePct}%`} mono />}
          <Row l="PD rights" v={dev.pdRights || "Unknown"} color={dev.pdRights === "Yes" ? "green" : dev.pdRights === "Possibly" ? "amber" : undefined} />
          {dev.pdRightsDetail && <div style={{ fontSize: 11, color: "var(--tx3)", padding: "2px 0 6px 0" }}>{dev.pdRightsDetail}</div>}
          <Row l="Change of use" v={dev.changeOfUsePotential || "Unknown"} color={dev.changeOfUsePotential === "High" ? "green" : dev.changeOfUsePotential === "Medium" ? "amber" : undefined} />
          {dev.changeOfUseDetail && <div style={{ fontSize: 11, color: "var(--tx3)", padding: "2px 0 6px 0" }}>{dev.changeOfUseDetail}</div>}
          <Row l="Air rights" v={dev.airRightsPotential || "Unknown"} color={dev.airRightsPotential === "High" ? "green" : dev.airRightsPotential === "Medium" ? "amber" : undefined} />
          {dev.airRightsDetail && <div style={{ fontSize: 11, color: "var(--tx3)", padding: "2px 0 6px 0" }}>{dev.airRightsDetail}</div>}
        </div>
      )}
      {thisProperty.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Planning history — this property ({thisProperty.length})</div>
          {thisProperty.map((app: any, i: number) => (
            <PlanRow
              key={i}
              ref_={app.reference || `APP-${i}`}
              desc={app.description || app.title || "Planning application"}
              status={app.status || "Unknown"}
              color={app.status?.toLowerCase().includes("approved") ? "green" : app.status?.toLowerCase().includes("refused") ? "red" : "amber"}
              date={app.date || app["start-date"] ? new Date(app.date || app["start-date"]).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "Unknown"}
            />
          ))}
        </div>
      )}
      <div className={s.card}>
        <div className={s.cardTitle}>Nearby planning applications ({nearby.length || planningApps.length})</div>
        {(nearby.length > 0 ? nearby : planningApps).length > 0 ? (nearby.length > 0 ? nearby : planningApps).map((app: any, i: number) => (
          <PlanRow
            key={i}
            ref_={app.reference || `APP-${i}`}
            desc={`${app["site-address"] ? app["site-address"] + " — " : ""}${app.description || app.title || "Planning application"}`}
            status={app.status || "Unknown"}
            color={app.status?.toLowerCase().includes("approved") ? "green" : app.status?.toLowerCase().includes("refused") ? "red" : "amber"}
            date={app.date || app["start-date"] ? new Date(app.date || app["start-date"]).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "Unknown"}
          />
        )) : <NoData label="nearby planning" />}
      </div>
    </>
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
  const owner = p.dataSources?.companyOwner;
  const portfolio = p.dataSources?.ownerPortfolio;

  return (
    <>
      {owner && (
        <div className={s.card}>
          <div className={s.cardTitle}>Registered owner (Land Registry)</div>
          <Row l="Company" v={owner.companyName || "Unknown"} />
          {owner.companyNumber && <Row l="Company number" v={owner.companyNumber} mono />}
          {portfolio && portfolio.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: "var(--tx3)", margin: "10px 0 6px" }}>Other properties held by this owner ({portfolio.length})</div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {portfolio.slice(0, 20).map((prop: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--tx)", padding: "3px 0", borderBottom: "1px solid var(--s2)" }}>
                    {prop.propertyAddress || prop.address || `Property ${i + 1}`}
                    {prop.tenure && <span style={{ marginLeft: 8, color: "var(--tx3)", fontSize: 10 }}>{prop.tenure}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
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
  const covenant = ds.covenant;

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
      {covenant && (
        <div className={s.card}>
          <div className={s.cardTitle}>Tenant covenant strength</div>
          <Row l="Grade" v={covenant.grade || "Unrated"} color={covenant.grade === "A" || covenant.grade === "B" ? "green" : covenant.grade === "C" ? "amber" : "red"} />
          {covenant.score != null && <Row l="Score" v={`${covenant.score}/100`} mono />}
          {covenant.companyName && <Row l="Tenant company" v={covenant.companyName} />}
          {covenant.companyNo && <Row l="Company no." v={covenant.companyNo} mono />}
          {covenant.companyStatus && <Row l="Company status" v={covenant.companyStatus} color={covenant.companyStatus.toLowerCase() === "active" ? "green" : "red"} />}
          {covenant.lastAccountsDate && <Row l="Last accounts" v={new Date(covenant.lastAccountsDate).toLocaleDateString("en-GB")} mono />}
        </div>
      )}
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
  const da = ds.dealAnalysis;
  const ra = ds.ricsAnalysis; // New RICS analysis

  // Use RICS data when available, fall back to old dealAnalysis
  const verdict = ra?.verdict || da?.verdict;
  const rics = ra?.returns;
  const rLet = ra?.lettingAnalysis;
  const rAcq = ra?.acquisitionCost;
  const rCapex = ra?.capex;
  const rDcf = ra?.dcf;
  const rSens = ra?.sensitivity;
  const rVal = ra?.valuations;

  const verdictColor = (r: string) => r === "strong_buy" || r === "buy" || r === "good" ? "var(--grn)" : r === "marginal" ? "var(--amb)" : "var(--red)";
  const verdictBg = (r: string) => r === "strong_buy" || r === "buy" || r === "good" ? "rgba(52,211,153,.06)" : r === "marginal" ? "rgba(251,191,36,.06)" : "rgba(248,113,113,.06)";
  const verdictBorder = (r: string) => r === "strong_buy" || r === "buy" || r === "good" ? "rgba(52,211,153,.2)" : r === "marginal" ? "rgba(251,191,36,.2)" : "rgba(248,113,113,.2)";
  const verdictLabel = (r: string) => r === "strong_buy" ? "Strong buy" : r === "buy" ? "Buy" : r === "marginal" ? "Marginal" : r === "good" ? "Good deal" : r === "bad" ? "Below threshold" : "Avoid";

  return (
    <>
      {/* ── DEAL VERDICT ── */}
      {verdict && (
        <div className={s.card} style={{ background: verdictBg(verdict.rating), borderColor: verdictBorder(verdict.rating) }}>
          <div className={s.cardTitle} style={{ color: verdictColor(verdict.rating) }}>
            Deal verdict — {verdictLabel(verdict.rating)}
          </div>
          <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.7 }}>{verdict.summary}</div>
          {(ra?.verdict as any)?.play && (
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 8, fontStyle: "italic" }}>
              <strong>The play:</strong> {(ra?.verdict as any).play}
            </div>
          )}
          {(ra?.confidence || da?.confidence) && (
            <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 6 }}>
              Confidence: {ra?.confidence || da?.confidence} ({(ra?.estimatedFields || da?.estimatedFields)?.length ? `${(ra?.estimatedFields || da?.estimatedFields).join(", ")} estimated` : "all inputs from data"})
            </div>
          )}
          {(ra?.verdict as any)?.targetOfferRange && (
            <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4 }}>
              Suggested offer range: £{(ra.verdict as any).targetOfferRange.low.toLocaleString()} – £{(ra.verdict as any).targetOfferRange.high.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Key metrics */}
      <div className={s.statRow}>
        <div className={s.statBox}>
          <div className={s.statLabel}>Asking price</div>
          <div className={s.statVal}>{p.askingPrice ? `£${p.askingPrice.toLocaleString()}` : "POA"}</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>NIY</div>
          <div className={s.statVal}>{rics?.netInitialYield ? `${rics.netInitialYield.toFixed(1)}%` : returns?.capRate ? `${typeof returns.capRate === "number" ? returns.capRate.toFixed(1) : returns.capRate}%` : "—"}</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>Stabilised yield</div>
          <div className={s.statVal} style={{ color: (rics?.stabilisedYield || da?.stabilisedYield?.pct || 0) >= 7 ? "var(--grn)" : (rics?.stabilisedYield || da?.stabilisedYield?.pct || 0) >= 5 ? "var(--amb)" : "var(--red)" }}>
            {rics?.stabilisedYield ? `${rics.stabilisedYield.toFixed(1)}%` : da?.stabilisedYield ? `${da.stabilisedYield.pct.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>IRR (10yr)</div>
          <div className={s.statVal} style={{ color: (rics?.irr10yr || returns?.irr5yr || 0) >= 12 ? "var(--grn)" : (rics?.irr10yr || returns?.irr5yr || 0) >= 8 ? "var(--amb)" : "var(--red)" }}>
            {rics?.irr10yr ? `${rics.irr10yr.toFixed(1)}%` : returns?.irr5yr ? `${returns.irr5yr.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>DSCR</div>
          <div className={s.statVal} style={{ color: (rics?.dscr || da?.debtCoverage?.dscr || 0) >= 1.25 ? "var(--grn)" : (rics?.dscr || da?.debtCoverage?.dscr || 0) >= 1.0 ? "var(--amb)" : "var(--red)" }}>
            {rics?.dscr ? `${rics.dscr.toFixed(2)}×` : da?.debtCoverage ? `${da.debtCoverage.dscr}×` : "—"}
          </div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>Equity multiple</div>
          <div className={s.statVal}>{rics?.equityMultiple ? `${rics.equityMultiple.toFixed(2)}×` : returns?.equityMultiple ? `${returns.equityMultiple.toFixed(2)}×` : "—"}</div>
        </div>
      </div>

      {/* ── RICS VALUATIONS ── */}
      {rVal && (
        <div className={s.card}>
          <div className={s.cardTitle}>Valuations (RICS-aligned)</div>
          {/* Current market value — comps-based if available */}
          <div className={s.statRow} style={{ marginBottom: 10 }}>
            {rVal.market ? (
              <>
                <div className={s.statBox}><div className={s.statLabel}>Comps low</div><div className={s.statVal}>£{rVal.market.valueLow.toLocaleString()}</div></div>
                <div className={s.statBox} style={{ borderColor: "var(--acc)" }}><div className={s.statLabel}>Market value</div><div className={s.statVal} style={{ color: "var(--acc)" }}>£{rVal.market.valueMid.toLocaleString()}</div></div>
                <div className={s.statBox}><div className={s.statLabel}>Comps high</div><div className={s.statVal}>£{rVal.market.valueHigh.toLocaleString()}</div></div>
              </>
            ) : (
              <>
                <div className={s.statBox}><div className={s.statLabel}>Income cap</div><div className={s.statVal}>£{rVal.income.capitalisation.incomeCapValue.toLocaleString()}</div></div>
                <div className={s.statBox} style={{ borderColor: "var(--acc)" }}><div className={s.statLabel}>Current value</div><div className={s.statVal} style={{ color: "var(--acc)" }}>£{rVal.income.capitalisation.incomeCapValue.toLocaleString()}</div></div>
                <div className={s.statBox}><div className={s.statLabel}>DCF</div><div className={s.statVal}>£{rVal.income.dcfValue.toLocaleString()}</div></div>
              </>
            )}
          </div>
          {rVal.market && <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 4 }}>Based on {rVal.market.comps.length} comparable sales ({rVal.market.confidence} confidence)</div>}
          {/* Reconciled range across all methods — for reference */}
          {rVal.reconciled.variance > 10 && (
            <div style={{ fontSize: 10, color: "var(--amb)", marginBottom: 4 }}>
              All methods range: £{rVal.reconciled.low.toLocaleString()} – £{rVal.reconciled.high.toLocaleString()} ({rVal.reconciled.variance.toFixed(0)}% variance)
            </div>
          )}
          <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 8 }}>{rVal.reconciled.opinion}</div>

          {/* Market approach — comps table */}
          {rVal.market && rVal.market.comps.length > 0 && (
            <>
              <div className={s.cardTitle} style={{ marginTop: 12 }}>Market approach — Comparable sales</div>
              <table className={s.tbl}>
                <thead><tr><th>Address</th><th>Price</th><th>£/sqft</th><th>Date</th><th>Adj</th><th>Adj £/sqft</th></tr></thead>
                <tbody>
                  {rVal.market.comps.slice(0, 8).map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontSize: 9 }}>{c.address?.slice(0, 35)}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>£{c.price?.toLocaleString()}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>£{c.psf}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{c.date}</td>
                      <td style={{ fontFamily: "var(--mono)", color: c.totalAdj > 0 ? "var(--grn)" : c.totalAdj < 0 ? "var(--red)" : "var(--tx3)" }}>{c.totalAdj > 0 ? "+" : ""}{c.totalAdj}%</td>
                      <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>£{c.adjustedPsf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 9, color: "var(--tx3)" }}>
                Avg £{rVal.market.adjustedAvgPsf}/sqft adjusted · Value range: £{rVal.market.valueLow.toLocaleString()} – £{rVal.market.valueHigh.toLocaleString()} · Confidence: {rVal.market.confidence}
              </div>
            </>
          )}

          {/* Income approach */}
          <div className={s.cardTitle} style={{ marginTop: 12 }}>Income approach</div>
          <Row l="Income cap value" v={`£${rVal.income.capitalisation.incomeCapValue.toLocaleString()}`} source={rVal.income.capitalisation.method} mono />
          {rVal.income.termReversion && (
            <>
              <Row l="Term & reversion" v={`£${rVal.income.termReversion.totalValue.toLocaleString()}`} source={rVal.income.termReversion.method} mono />
            </>
          )}
          <Row l="DCF value" v={`£${rVal.income.dcfValue.toLocaleString()}`} source={`IRR ${rVal.income.dcfIRR.toFixed(1)}%`} mono />

          {/* Residual */}
          {rVal.residual && (
            <>
              <div className={s.cardTitle} style={{ marginTop: 12 }}>Residual method (development)</div>
              <Row l="GDV" v={`£${rVal.residual.gdv.toLocaleString()}`} mono />
              <Row l="Total development costs" v={`£${rVal.residual.totalCosts.toLocaleString()}`} mono />
              <Row l="Residual land value" v={`£${rVal.residual.residualLandValue.toLocaleString()}`} mono color={rVal.residual.residualLandValue > (p.askingPrice || 0) ? "green" : "red"} />
              <div style={{ fontSize: 9, color: "var(--tx3)" }}>{rVal.residual.method}</div>
            </>
          )}
        </div>
      )}

      {/* Fallback to old valuations if no RICS */}
      {!rVal && valuations && (
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
              </div>
            )}
            {valuations.blended?.value && (
              <div className={s.valCard}>
                <div className={s.cardTitle}>Blended AVM</div>
                <div className={s.valNum}>£{valuations.blended.value.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Income profile */}
      <div className={s.card}>
        <div className={s.cardTitle}>Income profile</div>
        <EditableRow l="Passing rent" v={rentGap?.passingRent != null ? `£${rentGap.passingRent.toLocaleString()} p.a.` : assumptions?.passingRent ? `£${assumptions.passingRent.value.toLocaleString()} p.a.` : "£0 (vacant)"} source={rentGap?.passingRentSource || assumptions?.passingRent?.source} mono fieldKey="passingRent" propertyId={p.id} type="number" onSaved={onRefresh} />
        <EditableRow l="Market ERV" v={rentGap?.marketERV != null ? `£${rentGap.marketERV.toLocaleString()} p.a.` : assumptions?.erv ? `£${assumptions.erv.value.toLocaleString()} p.a.` : "—"} source={rentGap?.ervSource || assumptions?.erv?.source} mono fieldKey="erv" propertyId={p.id} type="number" onSaved={onRefresh} />
        {rentGap?.gapPct !== undefined && (
          <Row l="Rent gap" v={`${rentGap.gapPct > 0 ? "+" : ""}${rentGap.gapPct}% (${rentGap.direction})`} mono color={rentGap.gapPct > 0 ? "green" : rentGap.gapPct < 0 ? "red" : undefined} />
        )}
        <Row l="Occupancy" v={assumptions?.occupancy ? `${assumptions.occupancy.value}%` : p.occupancyPct != null ? `${p.occupancyPct}%` : "0% (assumed vacant)"} source={assumptions?.occupancy?.source || "estimated"} mono />
        {p.leaseLengthYears != null && <Row l="Lease remaining" v={`${p.leaseLengthYears} years`} mono />}
      </div>

      {/* ── LETTING ANALYSIS (RICS) ── */}
      {rLet && (
        <div className={s.card}>
          <div className={s.cardTitle}>Letting analysis</div>
          <Row l="Market rent (mid)" v={`£${rLet.marketRent.mid.toLocaleString()} p.a. (£${rLet.marketRent.psfMid}/sqft)`} source={rLet.marketRent.source} mono />
          <Row l="Rent range" v={`£${rLet.marketRent.low.toLocaleString()} – £${rLet.marketRent.high.toLocaleString()} p.a.`} mono />
          <Row l="Void period" v={`${rLet.voidPeriod.months} months`} source={rLet.voidPeriod.reasoning} mono />
          <Row l="Rent free" v={`${rLet.rentFreeMonths} months`} mono />
          {rLet.fittingOutContribution > 0 && <Row l="Fitting out" v={`£${rLet.fittingOutContribution.toLocaleString()}`} mono />}
          <Row l="Agent fee" v={`£${rLet.agentFee.toLocaleString()}`} mono />
          <div className={s.sep} />
          <Row l="Expected tenant" v={rLet.tenantProfile.type} source={`${rLet.tenantProfile.leaseLength}, ${rLet.tenantProfile.breakClause}`} />
          <Row l="Time to stabilise" v={`${rLet.totalMonthsToStabilise} months`} mono color="amber" />
          <div className={s.sep} />
          <div className={s.cardTitle} style={{ marginTop: 8 }}>Carry costs during void</div>
          <Row l="Monthly carry" v={`£${rLet.monthlyCarryCost.toLocaleString()}/month`} mono />
          <Row l="Total carry cost" v={`£${rLet.totalCarryCost.toLocaleString()}`} mono color="red" />
          <div style={{ fontSize: 9, color: "var(--tx3)" }}>
            Debt £{rLet.carryCostBreakdown.debtService.toLocaleString()} + Rates £{rLet.carryCostBreakdown.rates.toLocaleString()} + Insurance £{rLet.carryCostBreakdown.insurance.toLocaleString()} + Other £{(rLet.carryCostBreakdown.security + rLet.carryCostBreakdown.utilities).toLocaleString()} /month
          </div>
        </div>
      )}
      {/* Fallback to old letting scenario */}
      {!rLet && da?.lettingScenario && (
        <div className={s.card}>
          <div className={s.cardTitle}>Letting scenario</div>
          <Row l="Market rent" v={`£${da.lettingScenario.marketRent.toLocaleString()} p.a.`} source={da.lettingScenario.marketRentSource} mono />
          <Row l="Void period" v={`${da.lettingScenario.voidMonths} months`} source={da.lettingScenario.voidReasoning} mono />
          <Row l="Time to stabilise" v={`${da.lettingScenario.timeToStabilise} months`} mono color="amber" />
        </div>
      )}

      {/* ── ACQUISITION COST ── */}
      {rAcq && (
        <div className={s.card}>
          <div className={s.cardTitle}>Total acquisition cost</div>
          <Row l="Purchase price" v={`£${rAcq.purchasePrice.toLocaleString()}`} mono />
          <Row l="SDLT" v={`£${rAcq.sdlt.toLocaleString()}`} mono />
          <Row l="Legal fees" v={`£${rAcq.legal.toLocaleString()}`} mono />
          <Row l="Survey" v={`£${rAcq.survey.toLocaleString()}`} mono />
          <Row l="Finance arrangement" v={`£${rAcq.financeArrangement.toLocaleString()}`} mono />
          {rAcq.capex > 0 && <Row l="CAPEX" v={`£${rAcq.capex.toLocaleString()}`} mono />}
          {rAcq.carryCosts > 0 && <Row l="Void carry costs" v={`£${rAcq.carryCosts.toLocaleString()}`} mono />}
          {rAcq.lettingCosts > 0 && <Row l="Letting costs" v={`£${rAcq.lettingCosts.toLocaleString()}`} mono />}
          <div className={s.sep} />
          <Row l="TOTAL COST IN" v={`£${rAcq.totalCostIn.toLocaleString()}`} mono color="amber" />
        </div>
      )}
      {!rAcq && da?.totalAcquisitionCost && (
        <div className={s.card}>
          <div className={s.cardTitle}>Total acquisition cost</div>
          <Row l="Purchase price" v={`£${da.totalAcquisitionCost.purchasePrice.toLocaleString()}`} mono />
          <Row l="SDLT" v={`£${da.totalAcquisitionCost.sdlt.toLocaleString()}`} mono />
          <Row l="Legal fees" v={`£${da.totalAcquisitionCost.legals.toLocaleString()}`} mono />
          <div className={s.sep} />
          <Row l="Total all-in cost" v={`£${da.totalAcquisitionCost.total.toLocaleString()}`} mono color="amber" />
        </div>
      )}

      {/* ── CAPEX DETAIL ── */}
      {rCapex && rCapex.total > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>CAPEX breakdown</div>
          {rCapex.epcUpgrade.cost > 0 && <Row l={`EPC upgrade (${rCapex.epcUpgrade.currentRating}→${rCapex.epcUpgrade.targetRating})`} v={`£${rCapex.epcUpgrade.cost.toLocaleString()}`} mono />}
          <Row l={`Refurbishment (£${rCapex.refurb.psfRate}/sqft)`} v={`£${rCapex.refurb.cost.toLocaleString()}`} source={rCapex.refurb.scope} mono />
          <Row l={`Contingency (${rCapex.contingency.pct}%)`} v={`£${rCapex.contingency.cost.toLocaleString()}`} mono />
          <Row l={`Professional fees (${rCapex.professionalFees.pct}%)`} v={`£${rCapex.professionalFees.cost.toLocaleString()}`} mono />
          {rCapex.asbestos.applicable && <Row l="Asbestos" v={`£${rCapex.asbestos.cost.toLocaleString()}`} source={rCapex.asbestos.reasoning} mono />}
          <div className={s.sep} />
          <Row l="Total CAPEX" v={`£${rCapex.total.toLocaleString()}`} mono />

          {/* EPC measures detail */}
          {rCapex.epcUpgrade.measures.length > 0 && (
            <>
              <div className={s.cardTitle} style={{ marginTop: 10 }}>EPC upgrade measures</div>
              <table className={s.tbl}>
                <thead><tr><th>Measure</th><th>Cost</th><th>Saving/yr</th><th>Payback</th></tr></thead>
                <tbody>
                  {rCapex.epcUpgrade.measures.map((m: any, i: number) => (
                    <tr key={i}>
                      <td>{m.measure}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>£{m.cost.toLocaleString()}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>£{m.annualSaving.toLocaleString()}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{m.paybackYears} yrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ── RETURNS ── */}
      {rics && (
        <div className={s.card}>
          <div className={s.cardTitle}>Returns analysis</div>
          <div className={s.statRow}>
            <div className={s.statBox}><div className={s.statLabel}>NIY</div><div className={s.statVal}>{rics.netInitialYield.toFixed(1)}%</div></div>
            <div className={s.statBox}><div className={s.statLabel}>Stab. Yield</div><div className={s.statVal} style={{ color: rics.stabilisedYield >= 7 ? "var(--grn)" : "var(--amb)" }}>{rics.stabilisedYield.toFixed(1)}%</div></div>
            <div className={s.statBox}><div className={s.statLabel}>Yield on Cost</div><div className={s.statVal}>{rics.yieldOnCost.toFixed(1)}%</div></div>
            <div className={s.statBox}><div className={s.statLabel}>CoC (Yr1)</div><div className={s.statVal}>{rics.cashOnCashYear1.toFixed(1)}%</div></div>
            <div className={s.statBox}><div className={s.statLabel}>CoC (Stab)</div><div className={s.statVal}>{rics.cashOnCashStabilised.toFixed(1)}%</div></div>
            <div className={s.statBox}><div className={s.statLabel}>Debt Yield</div><div className={s.statVal}>{rics.debtYield.toFixed(1)}%</div></div>
          </div>
        </div>
      )}

      {/* ── 10-YEAR DCF ── */}
      {rDcf && rDcf.years.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>10-Year DCF</div>
          <table className={s.tbl}>
            <thead><tr><th>Year</th><th>Gross Income</th><th>Costs</th><th>NOI</th><th>Debt Service</th><th>Cash Flow</th><th>Cumulative</th></tr></thead>
            <tbody>
              {rDcf.years.map((yr: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--mono)" }}>{yr.year}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>£{yr.grossIncome.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>£{(yr.voidProvision + yr.managementFee + yr.insurance + yr.maintenance).toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>£{yr.netIncome.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>£{yr.debtService.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--mono)", color: yr.cashFlow >= 0 ? "var(--grn)" : "var(--red)" }}>£{yr.cashFlow.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--mono)", color: yr.cumulative >= 0 ? "var(--grn)" : "var(--red)" }}>£{yr.cumulative.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 9, color: "var(--tx3)" }}>
            Terminal value: £{rDcf.terminalValue.toLocaleString()} at {rDcf.exitYield}% exit yield · NPV: £{rDcf.npv.toLocaleString()} · IRR: {rDcf.irr.toFixed(1)}% · Equity multiple: {rDcf.equityMultiple.toFixed(2)}×
          </div>
        </div>
      )}

      {/* ── SENSITIVITY ── */}
      {rSens && rSens.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Sensitivity analysis</div>
          <table className={s.tbl}>
            <thead><tr><th>Scenario</th><th>Void</th><th>Rent</th><th>CAPEX</th><th>IRR</th><th>Verdict</th></tr></thead>
            <tbody>
              {rSens.map((row: any, i: number) => (
                <tr key={i}>
                  <td>{row.scenario}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{row.voidMonths}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{row.rent}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{row.capex}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{row.irr}</td>
                  <td style={{ color: row.verdict.includes("Strong") || row.verdict.includes("Buy") ? "var(--grn)" : row.verdict.includes("Avoid") ? "var(--red)" : "var(--amb)", fontWeight: 600 }}>{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Fallback old sensitivity */}
      {!rSens && da?.sensitivity && da.sensitivity.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Sensitivity analysis</div>
          <table className={s.tbl}>
            <thead><tr><th>Scenario</th><th>Yield</th><th>Verdict</th></tr></thead>
            <tbody>
              {da.sensitivity.map((row: any, i: number) => (
                <tr key={i}>
                  <td>{row.scenario}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{row.yield}</td>
                  <td style={{ color: row.verdict === "Still works" ? "var(--grn)" : row.verdict === "Breaks" ? "var(--red)" : "var(--amb)" }}>{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Debt service */}
      {market?.dscr && !rics && (
        <div className={s.card}>
          <div className={s.cardTitle}>Debt service</div>
          <Row l="Annual debt service" v={`£${market.annualDebtService.toLocaleString()}`} mono />
          <Row l="DSCR" v={`${market.dscr}×`} mono color={market.dscr >= 1.25 ? "green" : market.dscr >= 1.0 ? "amber" : "red"} />
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
  const ra = ds.ricsAnalysis;
  const rLet = ra?.lettingAnalysis;
  const rVal = ra?.valuations;
  const assumptions = ds.assumptions;
  const planning = ds.planning || [];
  const returns = ra?.returns;

  // Derive implied yield for each comp using market ERV
  const mktErvPsf = market?.ervPsf || 0;

  return (
    <>
      {/* ── AI DEAL SUMMARY ── */}
      {ra?.verdict && (
        <div className={s.card}>
          <div className={s.ai}>
            <div className={s.aiLabel}>AI deal summary</div>
            <div className={s.aiText}>{ra.verdict.reasoning}</div>
          </div>
          {ra.confidence && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 6 }}>Analysis confidence: {ra.confidence} | Methods: {ra.methodology?.join(", ")}</div>}
        </div>
      )}

      {/* ── MARKET BENCHMARKS ── */}
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

      {/* ── YIELD ANALYSIS ── */}
      {returns && (
        <div className={s.card}>
          <div className={s.cardTitle}>Yield analysis</div>
          <div className={s.grid3}>
            <div className={s.miCard}>
              <div className={s.miVal}>{returns.netInitialYield?.toFixed(1)}%</div>
              <div className={s.miLabel}>Net initial yield</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>{returns.stabilisedYield?.toFixed(1)}%</div>
              <div className={s.miLabel}>Stabilised yield</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>{returns.yieldOnCost?.toFixed(1)}%</div>
              <div className={s.miLabel}>Yield on cost</div>
            </div>
          </div>
          <div className={s.sep} />
          {returns.irr5yr != null && <Row l="5yr IRR" v={`${returns.irr5yr.toFixed(1)}%`} mono color={returns.irr5yr >= 15 ? "green" : returns.irr5yr >= 8 ? "amber" : "red"} />}
          {returns.irr10yr != null && <Row l="10yr IRR" v={`${returns.irr10yr.toFixed(1)}%`} mono />}
          {returns.equityMultiple != null && <Row l="Equity multiple" v={`${returns.equityMultiple.toFixed(2)}×`} mono />}
          {returns.dscr != null && <Row l="DSCR" v={`${returns.dscr.toFixed(2)}×`} mono color={returns.dscr >= 1.25 ? "green" : "amber"} />}
        </div>
      )}

      {/* ── RENTAL ANALYSIS ── */}
      {rLet && (
        <div className={s.card}>
          <div className={s.cardTitle}>Rental analysis</div>
          <div className={s.grid3}>
            <div className={s.miCard}>
              <div className={s.miVal}>£{rLet.marketRent.psfMid.toFixed(2)}</div>
              <div className={s.miLabel}>Market rent (£/sqft/yr)</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>£{Math.round(rLet.marketRent.mid).toLocaleString()}</div>
              <div className={s.miLabel}>Annual market rent</div>
            </div>
            <div className={s.miCard}>
              <div className={s.miVal}>{rLet.voidPeriod.months} mo</div>
              <div className={s.miLabel}>Expected void</div>
            </div>
          </div>
          <div className={s.sep} />
          <Row l="Rent range (p.a.)" v={`£${Math.round(rLet.marketRent.low).toLocaleString()} – £${Math.round(rLet.marketRent.high).toLocaleString()}`} mono />
          <Row l="Rent PSF range" v={`£${rLet.marketRent.psfLow.toFixed(2)} – £${rLet.marketRent.psfHigh.toFixed(2)}`} mono />
          {assumptions?.passingRent && <Row l="Current passing rent" v={`£${Math.round(assumptions.passingRent.value).toLocaleString()} p.a.`} mono source={assumptions.passingRent.source} />}
          {assumptions?.erv && <Row l="Estimated ERV" v={`£${Math.round(assumptions.erv.value).toLocaleString()} p.a.`} mono source={assumptions.erv.source} />}
          <Row l="Void reasoning" v={rLet.voidPeriod.reasoning} />
          {rLet.rentFreeMonths > 0 && <Row l="Rent free period" v={`${rLet.rentFreeMonths} months`} mono />}
          {rLet.totalCarryCost > 0 && <Row l="Void carry cost" v={`£${Math.round(rLet.totalCarryCost).toLocaleString()}`} mono color="red" />}
          {rLet.totalMonthsToStabilise > 0 && <Row l="Months to stabilise" v={`${rLet.totalMonthsToStabilise} months`} mono />}
        </div>
      )}

      {/* ── COMPARABLE SALES (Price) ── */}
      {comps.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Price comparables ({comps.length})</div>
          <div style={{ overflowX: "auto" }}>
            <table className={s.tbl}>
              <thead><tr><th>Address</th><th>Price</th><th>Size</th><th>£/sqft</th><th>Implied yield</th><th>Date</th></tr></thead>
              <tbody>
                {comps.map((c: any, i: number) => {
                  const sqft = c.sqft || c.floorArea;
                  const psf = c.pricePerSqft || (c.price && sqft ? c.price / sqft : null);
                  const impliedYield = psf && mktErvPsf > 0 ? ((mktErvPsf / psf) * 100) : null;
                  return (
                    <tr key={i}>
                      <td>{c.address || `Comp ${i + 1}`}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{c.price ? `£${Number(c.price).toLocaleString()}` : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{sqft ? `${Number(sqft).toLocaleString()}` : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{psf ? `£${Number(psf).toFixed(0)}` : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)", color: impliedYield && impliedYield >= (market?.capRate || 0) * 100 ? "var(--grn)" : "var(--tx2)" }}>{impliedYield ? `${impliedYield.toFixed(1)}%` : "—"}</td>
                      <td>{c.date ? new Date(c.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rVal?.market && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--s2)", borderRadius: 6, fontSize: 11 }}>
              <Row l="Avg £/sqft (adjusted)" v={`£${rVal.market.adjustedAvgPsf.toFixed(0)}`} mono />
              <Row l="Comp valuation range" v={`£${rVal.market.valueLow.toLocaleString()} – £${rVal.market.valueHigh.toLocaleString()}`} mono color="green" />
            </div>
          )}
        </div>
      )}

      {/* ── RICS ADJUSTED COMPS ── */}
      {rVal?.market?.comps && rVal.market.comps.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>RICS adjusted comparables</div>
          <div style={{ overflowX: "auto" }}>
            <table className={s.tbl}>
              <thead><tr><th>Address</th><th>Price</th><th>£/sqft</th><th>Size adj</th><th>Date adj</th><th>Loc adj</th><th>Adj £/sqft</th></tr></thead>
              <tbody>
                {rVal.market.comps.map((c: any, i: number) => (
                  <tr key={i}>
                    <td>{c.address}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>£{Number(c.price).toLocaleString()}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>£{Number(c.psf).toFixed(0)}</td>
                    <td style={{ fontFamily: "var(--mono)", color: c.sizeAdj > 0 ? "var(--grn)" : c.sizeAdj < 0 ? "var(--red)" : "var(--tx3)" }}>{c.sizeAdj > 0 ? "+" : ""}{c.sizeAdj}%</td>
                    <td style={{ fontFamily: "var(--mono)", color: c.dateAdj > 0 ? "var(--grn)" : c.dateAdj < 0 ? "var(--red)" : "var(--tx3)" }}>{c.dateAdj > 0 ? "+" : ""}{c.dateAdj}%</td>
                    <td style={{ fontFamily: "var(--mono)", color: c.locationAdj > 0 ? "var(--grn)" : c.locationAdj < 0 ? "var(--red)" : "var(--tx3)" }}>{c.locationAdj > 0 ? "+" : ""}{c.locationAdj}%</td>
                    <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>£{Number(c.adjustedPsf).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LOCAL PLANNING ── */}
      {planning.length > 0 && (
        <div className={s.card}>
          <div className={s.cardTitle}>Local planning activity ({planning.length})</div>
          {planning.slice(0, 5).map((app: any, i: number) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: i < Math.min(planning.length, 5) - 1 ? "1px solid var(--s2)" : "none" }}>
              <div style={{ fontSize: 11, color: "var(--tx)" }}>{app.description || app.title || "Planning application"}</div>
              <div style={{ fontSize: 10, color: "var(--tx3)", display: "flex", gap: 12 }}>
                <span>{app.reference}</span>
                <span style={{ color: app.status?.toLowerCase().includes("approved") ? "var(--grn)" : app.status?.toLowerCase().includes("refused") ? "var(--red)" : "var(--amb)" }}>{app.status}</span>
                {app.date && <span>{new Date(app.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LISTING ACTIVITY ── */}
      {(p.daysOnMarket !== undefined || p.brokerName) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Listing activity</div>
          {p.daysOnMarket !== undefined && <Row l="Days on market" v={String(p.daysOnMarket)} mono />}
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        alert(err.error || "Export failed");
        return;
      }
      const html = await res.text();
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
    } catch (e) {
      console.error("Export failed:", e);
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

  // Build gallery — reliable sources (Google Maps) first, then listing images
  const gallery: { url: string; label: string }[] = [];
  if (property.satelliteImageUrl) gallery.push({ url: property.satelliteImageUrl, label: "Satellite" });
  if (streetViewUrl) gallery.push({ url: streetViewUrl, label: "Street" });
  listingImages.forEach((img: string, i: number) => {
    if (!gallery.some((g) => g.url === img)) gallery.push({ url: img, label: `Photo ${i + 1}` });
  });
  allImages.forEach((img: string) => { if (!gallery.some((g) => g.url === img)) gallery.push({ url: img, label: "Image" }); });

  const heroImage = gallery[heroIdx] || null;
  const effectiveScore = score?.total || property.dealScore || 0;
  const scoreColor = score?.confidenceLevel === "high" || effectiveScore >= 70 ? s.scoreGreen : score?.confidenceLevel === "medium" || effectiveScore >= 40 ? s.scoreAmber : s.scoreRed;

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
                <img
                  src={heroImage.url}
                  alt={heroImage.label}
                  className={s.heroImg}
                  style={{ width: "100%", height: "auto", objectFit: "cover" }}
                  onError={(e) => {
                    const next = gallery.findIndex((g, i) => i > heroIdx && g.url !== heroImage.url);
                    if (next >= 0) { setHeroIdx(next); }
                    else { (e.target as HTMLImageElement).style.display = "none"; }
                  }}
                />
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
                {(property.askingPrice || property.guidePrice) && <span><strong>Price</strong> £{(property.askingPrice || property.guidePrice)!.toLocaleString()}</span>}
                {property.tenure && <span><strong>Tenure</strong> {property.tenure}</span>}
              </div>
              <div className={s.signals}>
                {score?.signals?.map((sig: any, i: number) => (
                  <span key={i} className={s.badge} data-type={sig.type === "distress" ? "admin" : sig.type === "opportunity" ? "mees" : "charges"}>{sig.name}</span>
                ))}
              </div>
              <div className={s.actions}>
                <button className={s.btnP} onClick={() => setActiveTab(7)}>{ds.listing?.agentContact || property.brokerName ? "Contact Agent" : "Approach Owner"}</button>
                <button className={s.btnG}>+ Pipeline</button>
                <button className={`${s.btnS} ${watched ? s.btnWatched : ""}`} onClick={handleWatch} disabled={watchLoading}>
                  {watchLoading ? "..." : watched ? "Watching" : "Watch"}
                </button>
                <button className={s.btnS} onClick={handleExportPDF} disabled={exporting === "pdf"}>{exporting === "pdf" ? "Exporting..." : "Export PDF"}</button>
              </div>
            </div>

            <div className={s.summary}>
              <div className={s.scoreBlock}>
                <div className={`${s.scoreRing} ${scoreColor}`}>{score?.total || property.dealScore || property.signalCount}</div>
                <div>
                  <div style={{ fontSize: 11 }}>Deal score</div>
                  <div style={{ fontSize: 9, color: score?.confidenceLevel === "high" ? "var(--grn)" : score?.confidenceLevel === "medium" ? "var(--amb)" : "var(--tx3)" }}>
                    {score?.confidenceLevel ? `${score.confidenceLevel} confidence (${score.signalCount} signals)` : property.dealScore ? `${property.temperature || "watch"} — run full enrichment for detail` : "N/A"}
                  </div>
                </div>
              </div>
              {ds.ricsAnalysis?.verdict?.reasoning && (
                <div className={s.ai} style={{ marginBottom: 8 }}>
                  <div className={s.aiLabel}>AI summary</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.5 }}>{ds.ricsAnalysis.verdict.reasoning}</div>
                </div>
              )}
              {!ds.ricsAnalysis?.verdict?.reasoning && score?.opportunity && (
                <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 6 }}>{score.opportunity.summary}</div>
              )}
              {(property.askingPrice || property.guidePrice) && <Row l={property.askingPrice ? "Asking price" : "Guide price"} v={`£${(property.askingPrice || property.guidePrice)!.toLocaleString()}`} mono />}
              <div className={s.sep} />
              {property.enrichedAt && <Row l="Enriched" v={new Date(property.enrichedAt).toLocaleDateString("en-GB")} mono />}
            </div>
          </div>
        </div>

        {/* ═══ HERO PANEL (verdict + metrics + AI summary, sticky) ═══ */}
        <HeroPanel
          property={property}
          watched={watched}
          exporting={exporting}
          onExportMemo={handleExportPDF}
          onAddToPipeline={() => {}}
          onWatch={handleWatch}
          onContact={() => setActiveTab(7)}
          onAddInfo={() => setShowAddInfo(true)}
        />

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
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setActiveTab(7)}>{ds.listing?.agentContact || property.brokerName ? "Contact agent" : "Approach owner"}</button>
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

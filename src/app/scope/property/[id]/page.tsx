"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./dossier.module.css";

const TABS = ["Property", "Analysis", "Planning", "Title & Legal", "Environmental", "Ownership", "Financials", "Market", "Approach"];

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
function PropertyTab({ p, onRefresh, onLightbox }: { p: PropertyData; onRefresh: () => void; onLightbox?: (idx: number) => void }) {
  const ds = p.dataSources || {};
  const listing = ds.listing;
  const ai = ds.ai;
  const epcData = ds.epc;
  const assumptions = ds.assumptions;
  const features = ai?.keyFeatures || listing?.features || [];
  const description = listing?.description || null;
  const accommodation = ai?.accommodation || null;
  const images = ds.images || [];
  const satelliteUrl = p.satelliteImageUrl;
  const streetViewUrl = ds.listing?.streetView;

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
          {(p.tenure || listing?.tenure || ai?.tenure) && <Row l="Tenure" v={ai?.tenureDetail || p.tenure || listing?.tenure || ai?.tenure} source="listing" />}
          {(p.yearBuilt || assumptions?.yearBuilt) && <EditableRow l="Year built" v={String(p.yearBuilt || assumptions?.yearBuilt?.value)} source={assumptions?.yearBuilt?.source} mono fieldKey="yearBuilt" propertyId={p.id} type="number" onSaved={onRefresh} />}
          {ai?.constructionType && <Row l="Construction" v={ai.constructionType} source="listing" />}
          {ai?.condition && <Row l="Condition" v={ai.conditionDetail || ai.condition} source="listing" />}
          {ai?.numberOfUnits && <Row l="Units" v={String(ai.numberOfUnits)} mono source="listing" />}
          {ai?.vacancy && <Row l="Vacancy" v={ai.vacancy} source="listing" />}
          {ai?.occupancyPct != null && <Row l="Occupancy" v={`${ai.occupancyPct}%`} mono source="listing" />}
          {ai?.refurbishment && <Row l="Refurbishment" v={ai.refurbishment} source="listing" />}
          {ai?.refurbishmentCost && <Row l="Refurb cost" v={`£${ai.refurbishmentCost.toLocaleString()}`} mono source="listing" />}
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
      {accommodation && Array.isArray(accommodation) && accommodation.length > 0 && (() => {
        const totalRent = accommodation.reduce((sum: number, a: any) => sum + (a.rent || 0), 0);
        const totalSqft = accommodation.reduce((sum: number, a: any) => sum + (a.size_sqft || 0), 0);
        const hasLeaseData = accommodation.some((a: any) => a.leaseEnd || a.breakDate || a.rentReview);
        return (
          <div className={s.card}>
            <div className={s.cardTitle}>Tenancy schedule</div>
            {totalRent > 0 && (
              <div style={{ display: "flex", gap: 24, marginBottom: 12, fontSize: 12, color: "var(--tx2)" }}>
                <span>Total passing rent: <strong style={{ fontFamily: "var(--mono)", color: "var(--grn)" }}>£{totalRent.toLocaleString()}</strong> p.a.</span>
                {totalSqft > 0 && <span>Occupied: <strong style={{ fontFamily: "var(--mono)" }}>{totalSqft.toLocaleString()} sqft</strong></span>}
                {p.buildingSizeSqft && totalSqft > 0 && <span>Occupancy: <strong style={{ fontFamily: "var(--mono)", color: (totalSqft / p.buildingSizeSqft) >= 0.8 ? "var(--grn)" : "var(--amb)" }}>{Math.round((totalSqft / p.buildingSizeSqft) * 100)}%</strong></span>}
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table className={s.tbl}>
                <thead>
                  <tr>
                    <th>Unit</th><th>Tenant</th><th>Size</th><th>Rent (p.a.)</th>
                    {hasLeaseData && <><th>Lease end</th><th>Break</th><th>Review</th></>}
                  </tr>
                </thead>
                <tbody>
                  {accommodation.map((a: any, i: number) => (
                    <tr key={i}>
                      <td>{a.unit || `Unit ${i + 1}`}</td>
                      <td>{a.tenant || "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{a.size_sqft ? `${a.size_sqft.toLocaleString()} sqft` : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{a.rent ? `£${a.rent.toLocaleString()}` : "—"}</td>
                      {hasLeaseData && (
                        <>
                          <td style={{ fontFamily: "var(--mono)", color: a.leaseEnd && new Date(a.leaseEnd) < new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) ? "var(--red)" : undefined }}>{a.leaseEnd || "—"}</td>
                          <td style={{ fontFamily: "var(--mono)", color: a.breakDate && new Date(a.breakDate) < new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) ? "var(--amb)" : undefined }}>{a.breakDate || "—"}</td>
                          <td style={{ fontSize: 11 }}>{a.rentReviewType || a.rentReview || "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
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
      {/* ── LOCATION ── */}
      {(satelliteUrl || streetViewUrl) && (
        <>
          <div className={s.cardTitle}>Location</div>
          <div className={s.locationGrid}>
            {satelliteUrl && (
              <div className={s.locationCard}>
                <img src={satelliteUrl} alt="Satellite view" className={s.locationImg} onClick={() => onLightbox?.(0)} />
                <div className={s.locationLabel}>Satellite view</div>
              </div>
            )}
            {streetViewUrl && (
              <div className={s.locationCard}>
                <img src={streetViewUrl} alt="Street view" className={s.locationImg} onClick={() => onLightbox?.(1)} />
                <div className={s.locationLabel}>Street view</div>
              </div>
            )}
          </div>
        </>
      )}
      {/* ── GALLERY ── */}
      {images.length > 0 && (
        <>
          <div className={s.cardTitle}>Gallery ({images.length} images)</div>
          <div className={s.gallery}>
            {images.slice(0, 12).map((img: string, i: number) => (
              <img key={i} src={img} alt={`Property ${i + 1}`} className={s.galImg} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 7 }} onClick={() => onLightbox?.(i)} />
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
   TAB 1: ANALYSIS (Pillar Summaries + Red Flags + Data Confidence)
   ══════════════════════════════════════════════════════════════════════════ */
function AnalysisTab({ p }: { p: PropertyData }) {
  const ds = p.dataSources || {};
  const pa = ds.pillarAnalysis;

  if (!pa) {
    return (
      <div className={s.card}>
        <div className={s.cardTitle}>Deal analysis</div>
        <div style={{ fontSize: 12, color: "var(--tx3)", padding: "20px 0", textAlign: "center" }}>
          Pillar analysis not yet generated. Re-enrich this property to generate full analysis.
        </div>
      </div>
    );
  }

  const tempColor = pa.dealTemperature === "hot" ? "var(--red)" : pa.dealTemperature === "warm" ? "var(--amb)" : pa.dealTemperature === "watch" ? "#5599f0" : "var(--tx3)";

  return (
    <>
      {/* ── OVERALL SCORE + TEMPERATURE ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 42, fontWeight: 700, color: pa.overallScore >= 65 ? "var(--grn)" : pa.overallScore >= 45 ? "var(--amb)" : "var(--red)" }}>
            {pa.overallScore}
          </div>
          <div style={{ fontSize: 10, color: "var(--tx3)" }}>Overall score</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: tempColor, textTransform: "uppercase", letterSpacing: 2 }}>
            {pa.dealTemperature}
          </div>
          <div style={{ fontSize: 10, color: "var(--tx3)" }}>Temperature</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--tx3)" }}>
            Data confidence: <strong style={{ color: pa.overallDataCompleteness >= 70 ? "var(--grn)" : pa.overallDataCompleteness >= 45 ? "var(--amb)" : "var(--red)" }}>{pa.overallDataCompleteness}%</strong>
          </div>
          <div style={{ fontSize: 11, color: "var(--tx3)" }}>
            {pa.totalRedFlags} flag{pa.totalRedFlags !== 1 ? "s" : ""} detected
          </div>
        </div>
      </div>

      {/* ── PILLAR CARDS ── */}
      {pa.pillars.map((pillar: any) => {
        const scoreColor = pillar.score >= 70 ? "var(--grn)" : pillar.score >= 45 ? "var(--amb)" : "var(--red)";
        const compColor = pillar.dataCompleteness >= 75 ? "var(--grn)" : pillar.dataCompleteness >= 50 ? "var(--amb)" : "var(--red)";

        return (
          <div key={pillar.pillarKey} className={s.card}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className={s.cardTitle} style={{ marginBottom: 0 }}>{pillar.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Score */}
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: scoreColor }}>{pillar.score}</span>
                  <span style={{ fontSize: 10, color: "var(--tx3)" }}>/100</span>
                </div>
                {/* Data completeness bar */}
                <div style={{ width: 120 }}>
                  <div style={{ fontSize: 9, color: "var(--tx3)", marginBottom: 3 }}>Data: {pillar.dataCompleteness}%</div>
                  <div style={{ height: 5, background: "var(--s3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pillar.dataCompleteness}%`, background: compColor, borderRadius: 3, transition: "width .6s ease" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.7, paddingBottom: 10, borderBottom: "1px solid var(--s2)", marginBottom: 10 }}>
              {pillar.narrative}
            </div>

            {/* Red flags */}
            {pillar.redFlags.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Flags</div>
                {pillar.redFlags.map((flag: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                      background: flag.severity === "red" ? "var(--red)" : flag.severity === "amber" ? "var(--amb)" : "var(--tx3)",
                    }} />
                    <div>
                      <div style={{ fontSize: 11, color: flag.severity === "red" ? "var(--red)" : flag.severity === "amber" ? "var(--amb)" : "var(--tx2)" }}>
                        {flag.text}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.4 }}>
                        {flag.evidence}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data fields */}
            {pillar.dataFields && pillar.dataFields.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Data confidence</div>
                {pillar.dataFields.map((field: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11 }}>
                    <span style={{ color: "var(--tx3)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 10,
                        color: field.source === "verified" ? "var(--grn)" : field.source === "estimated" ? "var(--amb)" : "var(--tx3)",
                      }}>
                        {field.source === "verified" ? "✓" : field.source === "estimated" ? "⚠" : "✗"}
                      </span>
                      {field.name}
                    </span>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--tx2)", fontSize: 11 }}>
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── METADATA ── */}
      <div style={{ fontSize: 10, color: "var(--tx3)", textAlign: "right", paddingTop: 8, borderTop: "1px solid var(--s2)" }}>
        Analysis generated {new Date(pa.generatedAt).toLocaleString("en-GB")}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2: PLANNING
   ══════════════════════════════════════════════════════════════════════════ */
/* ── Shared helper components ── */
function ConfidenceBadge({ label, score }: { label: string; score?: number }) {
  const color = label === "HIGH" ? "var(--grn)" : label === "MEDIUM" ? "var(--amb)" : "var(--red)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color, padding: "2px 8px", borderRadius: 4, background: label === "HIGH" ? "rgba(52,211,153,.08)" : label === "MEDIUM" ? "rgba(251,191,36,.08)" : "rgba(248,113,113,.08)" }}>
      {score != null && <span style={{ fontFamily: "var(--mono)" }}>{score}/10</span>}
      {label}
    </span>
  );
}

function MethodologyBox({ m }: { m: Record<string, string> }) {
  return (
    <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(124,106,240,.04)", borderRadius: 6, border: "1px solid rgba(124,106,240,.1)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Data source &amp; methodology</div>
      {Object.entries(m).map(([k, v]) => (
        <div key={k} style={{ fontSize: 10, color: "var(--tx3)", padding: "1px 0" }}>
          <span style={{ color: "var(--tx2)" }}>{k}:</span> {v}
        </div>
      ))}
    </div>
  );
}

function PlanningTab({ p }: { p: PropertyData }) {
  const ds = p.dataSources || {};
  const planningApps = ds.planning || [];
  const pa = ds.planningAnalysis;

  const activeApps = planningApps.filter((a: any) => /pending|submitted|under review/i.test(a.status || ""));
  const approvedApps = planningApps.filter((a: any) => /approved|granted|permitted/i.test(a.status || ""));
  const otherApps = planningApps.filter((a: any) => !activeApps.includes(a) && !approvedApps.includes(a));

  return (
    <>
      {/* ── PLANNING RISK SUMMARY ── */}
      {pa && (
        <div className={s.card} style={{
          background: pa.riskLevel === "low" ? "rgba(52,211,153,.04)" : "rgba(251,191,36,.04)",
          borderColor: pa.riskLevel === "low" ? "rgba(52,211,153,.15)" : "rgba(251,191,36,.15)",
        }}>
          <div className={s.cardTitle} style={{ color: pa.riskLevel === "low" ? "var(--grn)" : "var(--amb)" }}>
            Planning risk: {pa.riskLevel.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.6 }}>{pa.riskSummary}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "var(--tx3)" }}>
            <span>Use class: <strong>{pa.useClass}</strong></span>
            {pa.isConservation && <span style={{ color: "var(--amb)" }}>Conservation area</span>}
            {pa.isListed && <span style={{ color: "var(--amb)" }}>Listed building</span>}
          </div>
        </div>
      )}

      {/* ── ACTIVE APPLICATIONS ── */}
      <div className={s.card}>
        <div className={s.cardTitle}>
          {activeApps.length > 0 ? `Active applications (${activeApps.length})` : "Planning applications"}
        </div>
        {activeApps.length > 0 ? activeApps.map((app: any, i: number) => (
          <div key={`a-${i}`} style={{ padding: "10px 0", borderBottom: "1px solid rgba(228,228,236,.06)" }}>
            <PlanRow
              ref_={app.reference || `APP-${i}`}
              desc={app.description || app.title || "Planning application"}
              status={app.status || "Pending"}
              color="amber"
              date={app.date ? new Date(app.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "Unknown"}
            />
            {app.proposal && <div style={{ fontSize: 10, color: "var(--tx3)", marginLeft: 20, marginTop: 4 }}>Proposal: {app.proposal}</div>}
            {app.impact && (
              <div style={{ fontSize: 10, color: "var(--amb)", marginLeft: 20, marginTop: 2 }}>Impact on subject: {app.impact}</div>
            )}
          </div>
        )) : (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "8px 0" }}>No active planning applications nearby.</div>
        )}

        {/* Approved applications */}
        {approvedApps.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>Approved applications (last 2 years)</div>
            {approvedApps.map((app: any, i: number) => (
              <PlanRow
                key={`ap-${i}`}
                ref_={app.reference || `APP-${i}`}
                desc={app.description || app.title || "Planning application"}
                status={app.status || "Approved"}
                color="green"
                date={app.date ? new Date(app.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "Unknown"}
              />
            ))}
          </>
        )}

        {/* Other (refused/withdrawn) */}
        {otherApps.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>Other decisions</div>
            {otherApps.map((app: any, i: number) => (
              <PlanRow
                key={`o-${i}`}
                ref_={app.reference || `APP-${i}`}
                desc={app.description || app.title || "Planning application"}
                status={app.status || "Unknown"}
                color={app.status?.toLowerCase().includes("refused") ? "red" : "amber"}
                date={app.date ? new Date(app.date).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "Unknown"}
              />
            ))}
          </>
        )}

        {planningApps.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--tx3)", padding: "8px 0" }}>No planning applications found in search radius.</div>
        )}

        {pa?.methodology && <MethodologyBox m={pa.methodology} />}
      </div>

      {/* ── PERMITTED DEVELOPMENT RIGHTS ── */}
      {pa?.pdRights && (
        <div className={s.card}>
          <div className={s.cardTitle}>Permitted development rights</div>
          <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 10 }}>
            What can be done {pa.isConservation ? "(conservation area restrictions apply)" : "without planning permission"}:
          </div>

          <div style={{ marginBottom: 10 }}>
            {pa.pdRights.allowed.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: 11, color: "var(--grn)", padding: "2px 0" }}>&#10003; {r}</div>
            ))}
          </div>
          <div>
            {pa.pdRights.restricted.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: 11, color: "var(--red)", padding: "2px 0" }}>&#10007; {r}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── REGULATORY COMPLIANCE ── */}
      {pa?.regulatory && (
        <div className={s.card}>
          <div className={s.cardTitle}>Regulatory compliance</div>

          {/* MEES */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Energy &amp; MEES</div>
            <div style={{ fontSize: 11, color: pa.regulatory.meesRisk === "compliant" ? "var(--grn)" : pa.regulatory.meesRisk === "at-risk" ? "var(--amb)" : "var(--red)", padding: "2px 0" }}>
              {pa.regulatory.meesCompliant ? "&#10003;" : "&#9888;"} EPC: {pa.regulatory.epcRating || "Unknown"} — MEES: {pa.regulatory.meesRisk}
            </div>
            {pa.regulatory.meesRisk === "non-compliant" && (
              <div style={{ fontSize: 10, color: "var(--red)", marginTop: 2 }}>Cannot grant new leases until EPC improved to minimum E rating</div>
            )}
          </div>

          {/* Fire & safety */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Building &amp; fire safety</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", padding: "2px 0" }}>{pa.regulatory.fireRegulations}</div>
          </div>

          {/* Accessibility */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Accessibility</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", padding: "2px 0" }}>{pa.regulatory.accessibility}</div>
          </div>

          {/* Environmental */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Environmental</div>
            <div style={{ fontSize: 11, color: pa.regulatory.environmental.includes("Flood") ? "var(--amb)" : "var(--tx2)", padding: "2px 0" }}>{pa.regulatory.environmental}</div>
          </div>
        </div>
      )}

      {/* Fallback if no planning analysis */}
      {!pa && planningApps.length === 0 && <NoData label="planning" />}
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
          {/* Reconciled */}
          <div className={s.statRow} style={{ marginBottom: 10 }}>
            <div className={s.statBox}><div className={s.statLabel}>Low</div><div className={s.statVal}>£{rVal.reconciled.low.toLocaleString()}</div></div>
            <div className={s.statBox} style={{ borderColor: "var(--acc)" }}><div className={s.statLabel}>Mid (Reconciled)</div><div className={s.statVal} style={{ color: "var(--acc)" }}>£{rVal.reconciled.mid.toLocaleString()}</div></div>
            <div className={s.statBox}><div className={s.statLabel}>High</div><div className={s.statVal}>£{rVal.reconciled.high.toLocaleString()}</div></div>
          </div>
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

      {/* ── YIELD ASSUMPTIONS TRANSPARENCY ── */}
      {ds.yieldAssumptions && (() => {
        const ya = ds.yieldAssumptions;
        return (
          <div className={s.card}>
            <div className={s.cardTitle}>Yield assumptions</div>
            <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 10 }}>
              What underpins the yield — every assumption made explicit.
            </div>

            {/* Alerts */}
            {ya.alerts && ya.alerts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {ya.alerts.map((a: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, padding: "4px 8px", marginBottom: 4, borderRadius: 4, color: a.type === "error" ? "var(--red)" : a.type === "warn" ? "var(--amb)" : "var(--tx2)", background: a.type === "error" ? "rgba(248,113,113,.06)" : a.type === "warn" ? "rgba(251,191,36,.06)" : "rgba(124,106,240,.04)" }}>
                    {a.type === "error" ? "ERROR" : a.type === "warn" ? "WARN" : "INFO"}: {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Current vs Stabilised yield */}
            <div className={s.statRow} style={{ marginBottom: 10 }}>
              <div className={s.statBox}>
                <div className={s.statLabel}>Current yield</div>
                <div className={s.statVal} style={{ color: ya.currentYield >= 5 ? "var(--grn)" : ya.currentYield >= 2 ? "var(--amb)" : "var(--red)" }}>{ya.currentYield}%</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statLabel}>Stabilised yield</div>
                <div className={s.statVal} style={{ color: (ya.stabilizedYield || 0) >= 5 ? "var(--grn)" : (ya.stabilizedYield || 0) >= 3 ? "var(--amb)" : "var(--red)" }}>{ya.stabilizedYield ? `${ya.stabilizedYield}%` : "—"}</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statLabel}>Gap</div>
                <div className={s.statVal}>{ya.stabilizedYield ? `${(ya.stabilizedYield - ya.currentYield).toFixed(1)}%` : "—"}</div>
              </div>
            </div>

            {/* Rental status */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, marginTop: 8 }}>Rental status</div>
            <Row l="Current rent" v={`£${ya.rentalStatus.currentRent.toLocaleString()} p.a.`} source={ya.rentalStatus.dataSource} mono />
            <Row l="Market ERV" v={`£${ya.rentalStatus.marketERV.toLocaleString()} p.a.`} mono />
            <Row l="Rental gap" v={`${ya.rentalStatus.gap > 0 ? "+" : ""}${ya.rentalStatus.gap}%`} mono color={ya.rentalStatus.status === "under-rented" ? "green" : ya.rentalStatus.status === "over-rented" ? "red" : undefined} />
            <Row l="Status" v={ya.rentalStatus.status} color={ya.rentalStatus.status === "under-rented" ? "green" : ya.rentalStatus.status === "over-rented" ? "red" : undefined} />

            {/* Building condition */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, marginTop: 12 }}>Building condition</div>
            <Row l="Condition" v={ya.buildingCondition.rating} />
            <Row l="EPC rating" v={ya.buildingCondition.epcRating || "Unknown"} />
            <Row l="Est. void period" v={`${ya.buildingCondition.estimatedVoidPeriod} months`} mono />
            {ya.buildingCondition.conditionDetail && <Row l="Detail" v={ya.buildingCondition.conditionDetail} />}
            {ya.buildingCondition.recentCapex && <Row l="Recent investment" v={ya.buildingCondition.capexDetail || "Yes"} color="green" />}

            {/* Lease analysis */}
            {ya.leaseAnalysis.hasLeaseData && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, marginTop: 12 }}>Lease analysis</div>
                <Row l="Tenant count" v={String(ya.leaseAnalysis.tenantCount)} mono />
                <Row l="Weighted avg lease" v={`${ya.leaseAnalysis.weightedAverageLeaseLength} years`} mono />
                <Row l="Income expiring (12mo)" v={`${ya.leaseAnalysis.expiryIn12mo}%`} mono color={ya.leaseAnalysis.expiryIn12mo > 40 ? "red" : ya.leaseAnalysis.expiryIn12mo > 20 ? "amber" : undefined} />
                <Row l="Income expiring (24mo)" v={`${ya.leaseAnalysis.expiryIn24mo}%`} mono />
                {ya.leaseAnalysis.hasLeaseCliff && <div style={{ fontSize: 11, color: "var(--red)", padding: "4px 0", fontWeight: 600 }}>Lease cliff detected — significant income at risk</div>}
              </>
            )}

            {/* Reletting risk */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, marginTop: 12 }}>Reletting risk</div>
            <Row l="Rating" v={ya.reletRisk.rating.toUpperCase()} color={ya.reletRisk.rating === "low" ? "green" : ya.reletRisk.rating === "medium" ? "amber" : "red"} />
            <Row l="Score" v={`${ya.reletRisk.score}/100`} mono />
            <Row l="Est. reletting time" v={`${ya.reletRisk.estimatedRelettingTime} months`} mono />
            <Row l="Probability of ERV" v={`${Math.round(ya.reletRisk.probabilityOfAchievingERV * 100)}%`} mono />
          </div>
        );
      })()}

      {/* ── FINANCING ASSUMPTIONS (explicit) ── */}
      {market?.financing && (
        <div className={s.card}>
          <div className={s.cardTitle}>Financing assumptions</div>
          <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 8 }}>These assumptions drive all return calculations. Override by editing individual fields above.</div>
          <EstRow l="LTV" v={`${(market.financing.ltvPct * 100).toFixed(0)}%`} source="market benchmark" mono />
          <EstRow l="Interest rate" v={`${(market.financing.interestRate * 100).toFixed(2)}%`} source="SONIA + margin estimate" mono />
          <EstRow l="Loan term" v={`${market.financing.termYears} years`} source="market benchmark" mono />
          <EstRow l="Amortisation" v={`${market.financing.amortisationYears} years`} source="market benchmark" mono />
          {p.askingPrice && <EstRow l="Loan amount" v={`£${Math.round(p.askingPrice * market.financing.ltvPct).toLocaleString()}`} source="asking price × LTV" mono />}
          {p.askingPrice && <EstRow l="Equity required" v={`£${Math.round(p.askingPrice * (1 - market.financing.ltvPct)).toLocaleString()}`} source="asking price × (1 - LTV)" mono />}
          {market.annualDebtService && <EstRow l="Annual debt service" v={`£${market.annualDebtService.toLocaleString()}`} source="calculated from loan terms" mono />}
          <div className={s.sep} />
          <div style={{ fontSize: 10, color: "var(--tx3)" }}>
            Cap rate: <strong>{(market.capRate * 100).toFixed(1)}%</strong> · ERV: <strong>£{market.ervPsf}/sqft</strong> · Region: <strong>{market.region}</strong> · Asset: <strong>{market.assetType}</strong>
          </div>
        </div>
      )}

      {/* ── ASSUMPTIONS AUDIT TRAIL ── */}
      {assumptions && (
        <div className={s.card}>
          <div className={s.cardTitle}>Data sources & assumptions</div>
          <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 8 }}>Every calculation input and its source. Estimated values are highlighted.</div>
          {Object.entries(assumptions).map(([key, val]: [string, any]) => (
            <EstRow key={key} l={key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())} v={typeof val?.value === "number" ? (key.includes("Rate") || key === "occupancy" ? `${(val.value * (key.includes("capRate") ? 100 : 1)).toFixed(key.includes("capRate") ? 1 : 0)}${key.includes("capRate") || key === "occupancy" ? "%" : ""}` : val.value.toLocaleString()) : String(val?.value ?? "—")} source={val?.source} mono />
          ))}
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
  const rentGap = ds.rentGap;
  const assumptions = ds.assumptions;
  const ra = ds.ricsAnalysis;
  const rLet = ra?.lettingAnalysis;
  const ca = ds.compsAnalytics;

  const askingPrice = p.askingPrice || p.guidePrice;
  const sqft = p.buildingSizeSqft || assumptions?.sqft?.value;
  const askingPsf = askingPrice && sqft ? askingPrice / sqft : null;
  const regionLabel = market?.region?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Unknown";

  return (
    <>
      {/* ══ 1A: PRICE COMPARABLES ══ */}
      <div className={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={s.cardTitle}>Comparable sales (price benchmarking)</div>
          {ca?.priceComps?.confidence && <ConfidenceBadge label={ca.priceComps.confidence.label} score={ca.priceComps.confidence.score} />}
        </div>

        {/* Subject context */}
        {(askingPrice || sqft) && (
          <div style={{ padding: "8px 12px", background: "rgba(124,106,240,.04)", borderRadius: 6, marginBottom: 10, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
            <strong>Subject property:</strong> {p.address} | {sqft ? `${sqft.toLocaleString()} sqft` : "—"} | {p.assetType} | {askingPrice ? `£${askingPrice.toLocaleString()}` : "POA"}
            {askingPsf && <> | Price: <strong style={{ fontFamily: "var(--mono)" }}>£{askingPsf.toFixed(0)}/sqft</strong></>}
          </div>
        )}

        {comps.length > 0 ? (
          <>
            <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 6 }}>Comparable transactions ({comps.length} found)</div>
            <div style={{ overflowX: "auto" }}>
              <table className={s.tbl}>
                <thead><tr><th>Property</th><th>Address</th><th>Size</th><th>Sold</th><th>Price</th><th>£/sqft</th><th>Dist.</th></tr></thead>
                <tbody>
                  {comps.map((c: any, i: number) => {
                    const cPrice = c.price || c.pricePaid;
                    const cSize = c.size_sqft || c.floorArea;
                    const cPsf = cPrice && cSize ? Number(cPrice) / Number(cSize) : null;
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 10, color: "var(--grn)" }}>&#10003;</td>
                        <td style={{ fontSize: 10 }}>{c.address || c.fullAddress || `Comp ${i + 1}`}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{cSize ? `${Number(cSize).toLocaleString()}` : "—"}</td>
                        <td style={{ fontSize: 10 }}>{c.date || c.dateSold ? new Date(c.date || c.dateSold).toLocaleDateString("en-GB", { year: "numeric", month: "short" }) : "—"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{cPrice ? `£${Number(cPrice).toLocaleString()}` : "—"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>{cPsf ? `£${cPsf.toFixed(0)}` : "—"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 9 }}>{c.distance ? `${c.distance}mi` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistical summary */}
            {ca?.priceComps && (
              <>
                <div className={s.sep} />
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Statistical summary</div>
                <div className={s.statRow}>
                  <div className={s.statBox}><div className={s.statVal}>£{ca.priceComps.avgPsf}</div><div className={s.statSub}>Average £/sqft</div></div>
                  <div className={s.statBox}><div className={s.statVal}>£{ca.priceComps.medianPsf}</div><div className={s.statSub}>Median £/sqft</div></div>
                  <div className={s.statBox}><div className={s.statVal}>£{ca.priceComps.minPsf}–{ca.priceComps.maxPsf}</div><div className={s.statSub}>Range</div></div>
                  <div className={s.statBox}><div className={s.statVal}>±£{ca.priceComps.stdDev}</div><div className={s.statSub}>Std deviation</div></div>
                </div>
                {ca.priceComps.subjectPsf != null && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
                    <strong>Subject price:</strong> £{ca.priceComps.subjectPsf}/sqft
                    {ca.priceComps.vsAvgPct != null && (
                      <> | vs average: <strong style={{ color: ca.priceComps.vsAvgPct > 10 ? "var(--amb)" : ca.priceComps.vsAvgPct < -10 ? "var(--grn)" : "var(--tx)" }}>
                        {ca.priceComps.vsAvgPct > 0 ? "+" : ""}{ca.priceComps.vsAvgPct}%
                      </strong>
                        {ca.priceComps.vsAvgPct > 15 ? " (above market — premium or overpriced?)" : ca.priceComps.vsAvgPct < -15 ? " (below market — potential value)" : " (in line with market)"}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {ca?.priceComps?.methodology && (
              <MethodologyBox m={ca.priceComps.methodology} />
            )}
          </>
        ) : (
          <div style={{ padding: "16px 0", fontSize: 12, color: "var(--tx3)", textAlign: "center" }}>
            No comparable sales found. Agent comp report recommended for price benchmarking.
          </div>
        )}
      </div>

      {/* ══ 1B: RENTAL COMPARABLES ══ */}
      <div className={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={s.cardTitle}>Rental analysis (market ERV benchmarking)</div>
          {ca?.rentalAnalysis?.confidence && <ConfidenceBadge label={ca.rentalAnalysis.confidence.label} />}
        </div>

        {ca?.rentalAnalysis ? (
          <>
            {/* Subject ERV estimate */}
            <div style={{ padding: "8px 12px", background: "rgba(52,211,153,.04)", borderRadius: 6, marginBottom: 10, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
              <strong>Subject property ERV estimate:</strong>{" "}
              {sqft && ca.rentalAnalysis.ervPsf ? (
                <>{sqft.toLocaleString()} sqft × £{ca.rentalAnalysis.ervPsf}/sqft = <strong style={{ fontFamily: "var(--mono)", color: "var(--grn)" }}>£{ca.rentalAnalysis.ervTotal?.toLocaleString()} p.a.</strong></>
              ) : (
                <>£{ca.rentalAnalysis.ervPsf}/sqft (market benchmark)</>
              )}
            </div>

            <div className={s.statRow}>
              <div className={s.statBox}>
                <div className={s.statVal}>£{ca.rentalAnalysis.ervPsf}</div>
                <div className={s.statSub}>Market ERV (£/sqft/yr)</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.rentalAnalysis.passingRentPsf ? `£${ca.rentalAnalysis.passingRentPsf}` : "—"}</div>
                <div className={s.statSub}>Passing rent (£/sqft/yr)</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal} style={{ color: ca.rentalAnalysis.rentGapPct && ca.rentalAnalysis.rentGapPct > 0 ? "var(--grn)" : ca.rentalAnalysis.rentGapPct && ca.rentalAnalysis.rentGapPct < -15 ? "var(--red)" : "var(--amb)" }}>
                  {ca.rentalAnalysis.rentGapPct != null ? `${ca.rentalAnalysis.rentGapPct > 0 ? "+" : ""}${ca.rentalAnalysis.rentGapPct}%` : "—"}
                </div>
                <div className={s.statSub}>{ca.rentalAnalysis.rentDirection || "Gap"}</div>
              </div>
            </div>

            {rentGap?.gapPct != null && Math.abs(rentGap.gapPct) > 15 && (
              <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 8, lineHeight: 1.5, padding: "6px 0" }}>
                {rentGap.gapPct > 15
                  ? `Passing rent is ${rentGap.gapPct}% above market ERV — verify tenant quality and lease terms. Over-rented properties face void risk at expiry.`
                  : `Rent is ${Math.abs(rentGap.gapPct)}% below market ERV — significant reversionary potential if rent brought to market level.`}
              </div>
            )}

            <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 6, fontStyle: "italic" }}>
              Source: {ca.rentalAnalysis.confidence.reason || "Market benchmark estimate"}. Individual lettings not yet available — verify with agent comparable report.
            </div>

            {ca.rentalAnalysis.methodology && <MethodologyBox m={ca.rentalAnalysis.methodology} />}
          </>
        ) : (
          <>
            {market && (
              <div className={s.statRow}>
                <div className={s.statBox}><div className={s.statVal}>£{market.ervPsf?.toFixed(2)}</div><div className={s.statSub}>Market ERV (£/sqft/yr)</div></div>
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--tx3)", padding: "8px 0" }}>Rental benchmark data only. No individual comparable lettings available.</div>
          </>
        )}
      </div>

      {/* ══ 1C: YIELD COMPARABLES ══ */}
      <div className={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={s.cardTitle}>Yield analysis (cap rate benchmarking)</div>
          {ca?.yieldAnalysis?.confidence && <ConfidenceBadge label={ca.yieldAnalysis.confidence.label} />}
        </div>

        {ca?.yieldAnalysis ? (
          <>
            <div style={{ padding: "8px 12px", background: "rgba(124,106,240,.04)", borderRadius: 6, marginBottom: 10, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
              <strong>Subject property estimated yield:</strong> Cap rate: <strong style={{ fontFamily: "var(--mono)" }}>{ca.yieldAnalysis.marketCapRate}%</strong> ({regionLabel} {ca.yieldAnalysis.methodology?.assetType})
            </div>

            <div className={s.statRow}>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.yieldAnalysis.marketCapRate}%</div>
                <div className={s.statSub}>Market cap rate</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.yieldAnalysis.subjectNIY ? `${typeof ca.yieldAnalysis.subjectNIY === "number" ? ca.yieldAnalysis.subjectNIY.toFixed(1) : ca.yieldAnalysis.subjectNIY}%` : "—"}</div>
                <div className={s.statSub}>Subject NIY</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.yieldAnalysis.subjectStabilised ? `${ca.yieldAnalysis.subjectStabilised.toFixed(1)}%` : "—"}</div>
                <div className={s.statSub}>Stabilised yield</div>
              </div>
              {ca.yieldAnalysis.vsMarket != null && (
                <div className={s.statBox}>
                  <div className={s.statVal} style={{ color: ca.yieldAnalysis.vsMarket > 0 ? "var(--grn)" : ca.yieldAnalysis.vsMarket < -1 ? "var(--red)" : "var(--tx)" }}>
                    {ca.yieldAnalysis.vsMarket > 0 ? "+" : ""}{ca.yieldAnalysis.vsMarket}%
                  </div>
                  <div className={s.statSub}>vs market</div>
                </div>
              )}
            </div>

            {ca.yieldAnalysis.methodology && <MethodologyBox m={ca.yieldAnalysis.methodology} />}
          </>
        ) : market ? (
          <>
            <div className={s.statRow}>
              <div className={s.statBox}><div className={s.statVal}>{(market.capRate * 100).toFixed(1)}%</div><div className={s.statSub}>Market cap rate</div></div>
            </div>
            <div style={{ fontSize: 11, color: "var(--tx3)", padding: "8px 0" }}>Market benchmark only. Transaction-level yield data not yet available.</div>
          </>
        ) : <NoData label="yield" />}
      </div>

      {/* ══ 1D: OCCUPANCY & VOID ANALYSIS ══ */}
      <div className={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={s.cardTitle}>Occupancy &amp; void analysis</div>
          {ca?.occupancyAnalysis?.confidence && <ConfidenceBadge label={ca.occupancyAnalysis.confidence.label} />}
        </div>

        {ca?.occupancyAnalysis ? (
          <>
            <div style={{ padding: "8px 12px", background: ca.occupancyAnalysis.currentOccupancy === 0 ? "rgba(248,113,113,.04)" : "rgba(52,211,153,.04)", borderRadius: 6, marginBottom: 10, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
              <strong>Current occupancy:</strong> {ca.occupancyAnalysis.currentOccupancy}%
              {ca.occupancyAnalysis.currentOccupancy === 0 && " (vacant)"}
              {" | "}<strong>Estimated void:</strong> {ca.occupancyAnalysis.estimatedVoidMonths} months
            </div>

            <div className={s.statRow}>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.occupancyAnalysis.currentOccupancy}%</div>
                <div className={s.statSub}>Occupancy</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal}>{ca.occupancyAnalysis.estimatedVoidMonths}mo</div>
                <div className={s.statSub}>Expected void</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statVal} style={{ fontSize: 12 }}>{ca.occupancyAnalysis.condition || "—"}</div>
                <div className={s.statSub}>Condition</div>
              </div>
            </div>

            {ca.occupancyAnalysis.voidReasoning && (
              <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 6, fontStyle: "italic" }}>
                Basis: {ca.occupancyAnalysis.voidReasoning}
              </div>
            )}
          </>
        ) : (
          <>
            <Row l="Occupancy" v={assumptions?.occupancy ? `${assumptions.occupancy.value}%` : "0% (assumed vacant)"} source={assumptions?.occupancy?.source} mono />
            <Row l="Void period" v={assumptions?.voidPeriod ? `${assumptions.voidPeriod.value} months` : "—"} source={assumptions?.voidPeriod?.source} mono />
          </>
        )}
      </div>

      {/* ══ MARKET BENCHMARKS ══ */}
      {market && (
        <div className={s.card}>
          <div className={s.cardTitle}>Market benchmarks — {regionLabel}</div>
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
          {market.annualDebtService && <Row l="Annual debt service" v={`£${Number(market.annualDebtService).toLocaleString()}`} mono />}
        </div>
      )}

      {/* ── TENANT PROFILE ── */}
      {rLet?.tenantProfile && (
        <div className={s.card}>
          <div className={s.cardTitle}>Expected tenant profile</div>
          <Row l="Tenant type" v={rLet.tenantProfile.type} />
          <Row l="Typical lease" v={rLet.tenantProfile.leaseLength} />
          <Row l="Break clause" v={rLet.tenantProfile.breakClause} />
          {rLet.voidPeriod && <Row l="Expected void" v={`${rLet.voidPeriod.months} months`} source={rLet.voidPeriod.reasoning} mono />}
        </div>
      )}

      {/* ── LISTING ACTIVITY ── */}
      {(p.daysOnMarket !== undefined || p.brokerName) && (
        <div className={s.card}>
          <div className={s.cardTitle}>Listing activity</div>
          {p.daysOnMarket !== undefined && <Row l="Days on market" v={String(p.daysOnMarket)} mono />}
          {p.brokerName && <Row l="Broker" v={p.brokerName} />}
          {p.sourceUrl && (
            <div className={s.row}>
              <span className={s.rowL}>Listing</span>
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a899ff" }}>View original</a>
            </div>
          )}
        </div>
      )}

      {/* ── DATA GAPS ── */}
      {(() => {
        const gaps: string[] = [];
        if (!comps.length) gaps.push("No comparable sales found — agent comp report recommended");
        if (!rentGap) gaps.push("No rental evidence — passing rent not verified");
        if (!ds.epc) gaps.push("No EPC data — may indicate new build or address mismatch");
        if (!ds.flood) gaps.push("Flood data unavailable — check Environment Agency manually");
        if (!ca?.rentalAnalysis) gaps.push("No individual rental lettings — verify ERV with agent comparable report");
        if (gaps.length === 0) return null;
        return (
          <div className={s.card}>
            <div className={s.cardTitle}>Data gaps &amp; recommendations</div>
            {gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--amb)", padding: "3px 0" }}>&#9888; {g}</div>
            ))}
            <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 8 }}>These gaps should be filled before making an acquisition decision. Independent broker appraisal advised.</div>
          </div>
        );
      })()}
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
  const isAgentListed = ai?.isAgentListed || !!listing?.agentContact || !!ai?.agentName;
  const agentType = ai?.agentType;
  const marketingStatus = ai?.marketingStatus;

  return (
    <>
      {/* ── Agent warning ── */}
      {isAgentListed && (
        <div className={s.card} style={{ background: "rgba(251,191,36,.06)", borderColor: "rgba(251,191,36,.2)" }}>
          <div className={s.cardTitle} style={{ color: "var(--amb)" }}>Agent-listed property</div>
          <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.7 }}>
            This property is marketed via an agent. Direct approach to the owner may breach sole agency terms.
            {agentType && <> Agency type: <strong>{agentType}</strong>.</>}
            {marketingStatus && <> Status: <strong>{marketingStatus}</strong>.</>}
          </div>
        </div>
      )}
      {bestContact && (
        <div className={s.card}>
          <div className={s.cardTitle}>{isAgentListed ? "Agent contact" : "Best contact"}</div>
          {bestContact.name && <Row l="Name" v={bestContact.name} />}
          {bestContact.phone && <Row l="Phone" v={bestContact.phone} />}
          {bestContact.email && <Row l="Email" v={bestContact.email} />}
          {agentType && <Row l="Agency type" v={agentType} />}
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
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
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

  // Build gallery — filter out empty/null URLs
  const gallery: { url: string; label: string }[] = [];
  listingImages.forEach((img: string, i: number) => { if (img && typeof img === "string" && img.length > 5) gallery.push({ url: img, label: `Photo ${i + 1}` }); });
  if (property.satelliteImageUrl && !listingImages.includes(property.satelliteImageUrl)) gallery.push({ url: property.satelliteImageUrl, label: "Satellite" });
  if (streetViewUrl && !listingImages.includes(streetViewUrl)) gallery.push({ url: streetViewUrl, label: "Street" });
  allImages.forEach((img: string) => { if (img && typeof img === "string" && img.length > 5 && !gallery.some((g) => g.url === img)) gallery.push({ url: img, label: "Image" }); });

  const heroImage = gallery[heroIdx] || gallery[0] || null;
  const scoreColor = score?.confidenceLevel === "high" ? s.scoreGreen : score?.confidenceLevel === "medium" ? s.scoreAmber : s.scoreRed;

  return (
    <AppShell>
      <div className={s.page}>
        {/* ═══ ADD INFO MODAL ═══ */}
        {showAddInfo && <AddInfoModal propertyId={id} onClose={() => setShowAddInfo(false)} onSaved={handleRefresh} />}

        {/* ═══ LIGHTBOX ═══ */}
        {lightboxIdx !== null && gallery.length > 0 && (
          <div className={s.lightbox} onClick={() => setLightboxIdx(null)}>
            <button className={s.lightboxClose} onClick={() => setLightboxIdx(null)}>×</button>
            {lightboxIdx > 0 && (
              <button className={`${s.lightboxNav} ${s.lightboxPrev}`} onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}>‹</button>
            )}
            <img
              src={gallery[lightboxIdx]?.url}
              alt={gallery[lightboxIdx]?.label}
              className={s.lightboxImg}
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxIdx < gallery.length - 1 && (
              <button className={`${s.lightboxNav} ${s.lightboxNext}`} onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}>›</button>
            )}
            <div className={s.lightboxCaption}>{gallery[lightboxIdx]?.label} — {lightboxIdx + 1} of {gallery.length}</div>
          </div>
        )}

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
                  style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10, cursor: "pointer" }}
                  onClick={() => setLightboxIdx(heroIdx)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement?.querySelector(".heroFallback")?.removeAttribute("style"); }}
                />
              ) : null}
              {!heroImage && <div className={s.heroImg}>No image available</div>}
              <div className={s.thumbRow}>
                {gallery.slice(0, 5).map((img, i) => (
                  <div
                    key={i}
                    className={`${s.thumb} ${heroIdx === i ? s.thumbOn : ""}`}
                    onClick={() => setHeroIdx(i)}
                    style={img.url ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {!img.url && img.label.slice(0, 3)}
                  </div>
                ))}
                {gallery.length > 5 && <div className={`${s.thumb} ${s.thumbMore}`} onClick={() => setLightboxIdx(5)}>+{gallery.length - 5}</div>}
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
              {/* Signals omitted from header — shown in dedicated section below */}
              <div className={s.actions}>
                <button className={s.btnP} onClick={() => setActiveTab(8)}>{ds.ai?.isAgentListed || ds.listing?.agentContact || ds.ai?.agentName ? "Contact Agent" : "Approach Owner"}</button>
                <button className={s.btnG}>+ Pipeline</button>
                <button className={`${s.btnS} ${watched ? s.btnWatched : ""}`} onClick={handleWatch} disabled={watchLoading}>
                  {watchLoading ? "..." : watched ? "Watching" : "Watch"}
                </button>
              </div>
              <div className={s.actions} style={{ marginTop: 6 }}>
                <button className={s.btnS} onClick={handleExportPDF} disabled={exporting === "pdf"}>{exporting === "pdf" ? "Exporting..." : "Export Memo"}</button>
                <button className={s.btnS} onClick={handleExportXlsx} disabled={exporting === "xlsx"}>{exporting === "xlsx" ? "Exporting..." : "Download Model"}</button>
                <button className={s.btnS} onClick={() => setShowAddInfo(true)}>+ Add Info</button>
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

        {/* ═══ QUICK FACTS BAR ═══ */}
        {(() => {
          const ra2 = ds.ricsAnalysis;
          const facts = [
            { label: "Price", value: property.askingPrice ? `£${property.askingPrice.toLocaleString()}` : "POA" },
            { label: "Size", value: property.buildingSizeSqft ? `${property.buildingSizeSqft.toLocaleString()} sqft` : "—" },
            { label: "Yield", value: ra2?.returns?.netInitialYield ? `${ra2.returns.netInitialYield.toFixed(1)}%` : ds.returns?.capRate ? `${ds.returns.capRate}%` : "—" },
            { label: "Cap rate", value: ds.market?.capRate ? `${(ds.market.capRate * 100).toFixed(1)}%` : "—" },
            { label: "Tenure", value: property.tenure || ds.ai?.tenure || "—" },
            { label: "EPC", value: property.epcRating ? `Grade ${property.epcRating}` : "—" },
            { label: "Void period", value: ra2?.lettingAnalysis?.voidPeriod?.months != null ? `${ra2.lettingAnalysis.voidPeriod.months} months` : "—" },
            { label: "Occupancy", value: property.occupancyPct != null ? `${property.occupancyPct}%` : ds.assumptions?.occupancy?.value != null ? `${ds.assumptions.occupancy.value}%` : "—" },
          ];
          return (
            <div className={`${s.anim} ${s.a3}`} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--s1)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
              {facts.map((f, i) => (
                <div key={i} style={{ background: "var(--s2)", padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>{f.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--tx)" }}>{f.value}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ═══ SIGNALS — SPLIT OPPORTUNITIES vs RISKS ═══ */}
        {score?.signals && score.signals.length > 0 && (() => {
          const opportunities = score.signals.filter((s: any) => s.type === "opportunity");
          const risks = score.signals.filter((s: any) => s.type !== "opportunity");
          return (
            <div className={`${s.anim} ${s.a3}`} style={{ background: "var(--s2)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Key signals ({score.signals.length} detected)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--grn)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Opportunities ({opportunities.length})</div>
                  {opportunities.length === 0 && <div style={{ fontSize: 11, color: "var(--tx3)" }}>No opportunities identified</div>}
                  {opportunities.map((sig: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 2 }}>
                      <span style={{ color: "var(--grn)" }}>✓</span> {sig.name}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Risks ({risks.length})</div>
                  {risks.length === 0 && <div style={{ fontSize: 11, color: "var(--tx3)" }}>No risks identified</div>}
                  {risks.map((sig: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 2 }}>
                      <span style={{ color: "var(--red)" }}>⚠</span> {sig.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ VERDICT BOX (above tabs) ═══ */}
        {(() => {
          const ds2 = property.dataSources || {};
          const ra2 = ds2.ricsAnalysis;
          const da2 = ds2.dealAnalysis;
          const v2 = ra2?.verdict || da2?.verdict;
          if (!v2) return null;
          const vColor = v2.rating === "strong_buy" || v2.rating === "buy" || v2.rating === "good" ? "var(--grn)" : v2.rating === "marginal" ? "var(--amb)" : "var(--red)";
          const vBg = v2.rating === "strong_buy" || v2.rating === "buy" || v2.rating === "good" ? "rgba(52,211,153,.06)" : v2.rating === "marginal" ? "rgba(251,191,36,.06)" : "rgba(248,113,113,.06)";
          const vBorder = v2.rating === "strong_buy" || v2.rating === "buy" || v2.rating === "good" ? "rgba(52,211,153,.25)" : v2.rating === "marginal" ? "rgba(251,191,36,.25)" : "rgba(248,113,113,.25)";
          const vLabel = v2.rating === "strong_buy" ? "STRONG BUY" : v2.rating === "buy" ? "BUY" : v2.rating === "marginal" ? "MARGINAL" : v2.rating === "good" ? "GOOD DEAL" : v2.rating === "bad" ? "BELOW THRESHOLD" : "AVOID";
          const metrics = ra2?.returns || da2;
          return (
            <div className={`${s.anim} ${s.a3}`} style={{ background: vBg, border: `1px solid ${vBorder}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ background: vColor, color: "#000", fontWeight: 700, fontSize: 11, padding: "3px 10px", borderRadius: 4, letterSpacing: 1 }}>{vLabel}</span>
                {(ra2?.verdict as any)?.play && <span style={{ fontSize: 12, color: "var(--tx2)" }}>{(ra2.verdict as any).play}</span>}
              </div>
              <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6, marginBottom: 10 }}>{v2.summary}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12 }}>
                {metrics?.niy != null && <span style={{ color: "var(--tx2)" }}>NIY <strong style={{ color: "var(--tx)" }}>{(metrics.niy * 100).toFixed(1)}%</strong></span>}
                {metrics?.irr != null && <span style={{ color: "var(--tx2)" }}>IRR <strong style={{ color: "var(--tx)" }}>{(metrics.irr * 100).toFixed(1)}%</strong></span>}
                {metrics?.equityMultiple != null && <span style={{ color: "var(--tx2)" }}>Equity ×<strong style={{ color: "var(--tx)" }}>{metrics.equityMultiple.toFixed(2)}</strong></span>}
                {metrics?.dscr != null && <span style={{ color: "var(--tx2)" }}>DSCR <strong style={{ color: "var(--tx)" }}>{metrics.dscr.toFixed(2)}</strong></span>}
                {(ra2?.verdict as any)?.targetOfferRange && (
                  <span style={{ color: "var(--tx2)" }}>Target offer: <strong style={{ color: vColor }}>£{(ra2.verdict as any).targetOfferRange.low.toLocaleString()} – £{(ra2.verdict as any).targetOfferRange.high.toLocaleString()}</strong></span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══ BODY ═══ */}
        <div className={`${s.body} ${s.anim} ${s.a4}`}>
          <div className={s.mainCol}>
            <div className={s.tabs}>
              {TABS.map((tab, i) => (
                <button key={tab} className={`${s.tab} ${activeTab === i ? s.tabOn : ""}`} onClick={() => setActiveTab(i)}>{tab}</button>
              ))}
            </div>
            <div className={s.tabContent} key={activeTab}>
              {activeTab === 0 ? <PropertyTab p={property} onRefresh={handleRefresh} onLightbox={(i) => setLightboxIdx(i)} />
               : activeTab === 1 ? <AnalysisTab p={property} />
               : activeTab === 2 ? <PlanningTab p={property} />
               : activeTab === 3 ? <TitleLegalTab p={property} />
               : activeTab === 4 ? <EnvironmentalTab p={property} />
               : activeTab === 5 ? <OwnershipTab p={property} />
               : activeTab === 6 ? <FinancialsTab p={property} onRefresh={handleRefresh} />
               : activeTab === 7 ? <MarketTab p={property} />
               : activeTab === 8 ? <ApproachTab p={property} />
               : null}
            </div>
          </div>

          <aside className={s.sideCol}>
            <div className={s.sideCard}>
              <div className={s.cardTitle}>Actions</div>
              <button className={`${s.btnP} ${s.btnFull}`} onClick={() => setActiveTab(8)}>{ds.ai?.isAgentListed || ds.listing?.agentContact || ds.ai?.agentName ? "Contact agent" : "Approach owner"}</button>
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

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./scope.module.css";

type HomeData = {
  sources: Array<{ key: string; label: string; count: number; live: boolean }>;
  mandates: Array<any>;
  alerts: Array<any>;
};

const DEFAULT_MANDATES = [
  {
    id: "m1",
    name: "SE Industrial <£800k",
    desc: "Industrial · South East · £200k–£800k",
    matches: 23,
    newCount: 3,
    pipeline: 5,
  },
  {
    id: "m2",
    name: "London Office MEES",
    desc: "Office · London · £1M–£5M · EPC F/G",
    client: "Harrow Capital",
    matches: 8,
    newCount: 1,
    pipeline: 0,
  },
];

export default function ScopePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [liveMandates, setLiveMandates] = useState<any[]>([]);
  const [showCreateMandate, setShowCreateMandate] = useState(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await fetch("/api/scope/home");
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
        }
      } catch (error) {
        console.error("Failed to fetch home data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Fetch mandates from API
  useEffect(() => {
    fetch("/api/dealscope/mandates")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLiveMandates(data); })
      .catch(() => {});
  }, []);

  // Fetch watchlist
  useEffect(() => {
    fetch("/api/dealscope/watchlist")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWatchlist(data); })
      .catch(() => {});
  }, []);

  const sources = homeData?.sources || [];
  const mandates = liveMandates.length > 0
    ? liveMandates.map((m) => ({ id: m.id, name: m.name, desc: m.clientName ? `${m.clientName} — ` : "" + JSON.stringify(m.criteria || {}).slice(0, 60), client: m.clientName, matches: m.matches || 0, newCount: 0, pipeline: 0 }))
    : homeData?.mandates || DEFAULT_MANDATES;
  const alerts = homeData?.alerts || [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const v = input.trim();
      const isUrl = v.startsWith("http");

      // Route to quick-assess page with address or URL
      const params = new URLSearchParams();
      if (isUrl) {
        params.set("url", v);
      } else {
        params.set("address", v);
      }
      router.push(`/scope/property/assess?${params.toString()}`);
    } catch (err) {
      console.error("Search error:", err);
      alert("Search failed. Please try again");
      setLoading(false);
    }
  };

  const handlePDFUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      alert("Please upload a PDF file");
      return;
    }

    setUploadingPDF(true);
    try {
      // Step 1: Upload via /api/documents/upload
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        alert(err.error || "Failed to upload PDF");
        return;
      }

      const uploadData = await uploadRes.json();
      const docId = uploadData.document?.id;

      // Step 2: Extract address from document text via dealscope-text-parser
      const extractRes = await fetch("/api/dealscope/extract-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId }),
      });

      let address: string | null = null;
      if (extractRes.ok) {
        const extractData = await extractRes.json();
        address = extractData.address || null;
      }

      // Step 3: Redirect to assess page
      const params = new URLSearchParams();
      if (address) params.set("address", address);
      if (docId) params.set("docId", docId);

      if (!address) {
        alert("Could not extract address from PDF. Please enter the address manually.");
        return;
      }

      router.push(`/scope/property/assess?${params.toString()}`);
    } catch (err) {
      console.error("PDF upload error:", err);
      alert("Failed to upload PDF. Please try again.");
    } finally {
      setUploadingPDF(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePDFUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.includes("pdf")) {
      handlePDFUpload(file);
    } else {
      alert("Please drop a PDF file");
    }
  };

  return (
    <AppShell>
      <div className={styles.page}>
        {/* ═══ HERO ═══ */}
        <div className={styles.hero}>
          <h1 className={`${styles.title} ${styles.anim}`}>
            Deal<span className={styles.titleAccent}>Scope</span>
          </h1>
          <p className={`${styles.subtitle} ${styles.anim} ${styles.a1}`}>
            Search any address. Analyse any property. Find every opportunity.
          </p>

          <form
            onSubmit={handleSearch}
            className={`${styles.inputBar} ${styles.anim} ${styles.a2}`}
          >
            <input
              type="text"
              placeholder="Address, postcode, company name, or listing URL…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.inputField}
            />
            <button
              type="submit"
              disabled={loading}
              className={styles.inputBtn}
            >
              {loading ? "…" : "Go"}
            </button>
          </form>

          <div className={`${styles.hints} ${styles.anim} ${styles.a3}`}>
            <button
              className={styles.hint}
              onClick={() => {
                setInput("Meridian Business Park, ME2 4LR");
              }}
            >
              Meridian Business Park, ME2 4LR
            </button>
            <button
              className={styles.hint}
              onClick={() => {
                setInput("179 Harrow Road, W2 6NB");
              }}
            >
              179 Harrow Road, W2 6NB
            </button>
            <span className={styles.hintOr}>or</span>
            <button
              className={styles.hint}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPDF}
            >
              {uploadingPDF ? "Uploading..." : "Upload PDF"}
            </button>
            <span className={styles.hintOr}>or</span>
            <Link href="/scope/search-company" className={styles.hint}>
              Search by company
            </Link>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div
            className={`${styles.dropZone} ${styles.anim} ${styles.a4} ${dragActive ? styles.dropActive : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploadingPDF ? "Processing PDF..." : "Drop a brochure, auction catalogue, or agent listing"}
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className={styles.content}>
          {/* LIVE SOURCES */}
          <section className={`${styles.section} ${styles.anim} ${styles.a4}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Live Sources</h2>
              <Link href="/scope/search" className={styles.sectionLink}>
                Advanced search →
              </Link>
            </div>
            <div className={styles.sourceGrid}>
              {sources.map((s) => (
                <Link
                  key={s.key}
                  href={`/scope/search?source=${s.key}`}
                  className={styles.sourceCard}
                >
                  {s.live && <div className={styles.liveDot} />}
                  <span className={styles.sourceCount}>{s.count}</span>
                  <span className={styles.sourceLabel}>{s.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* MANDATES */}
          <section className={`${styles.section} ${styles.anim} ${styles.a5}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Mandates</h2>
              <button className={styles.sectionLink} onClick={() => setShowCreateMandate(true)}>+ New mandate</button>
            </div>
            <div className={styles.mandateGrid}>
              {mandates.map((m) => (
                <Link
                  key={m.id}
                  href={`/scope/search?mandate=${m.id}`}
                  className={styles.mandateCard}
                >
                  {m.newCount > 0 && (
                    <div className={styles.mandateBadge}>{m.newCount} new</div>
                  )}
                  {m.client && (
                    <div className={styles.mandateClient}>{m.client}</div>
                  )}
                  <div className={styles.mandateName}>{m.name}</div>
                  <div className={styles.mandateDesc}>{m.desc}</div>
                  <div className={styles.mandateStats}>
                    <span>
                      <strong>{m.matches}</strong> matches
                    </span>
                    {m.newCount > 0 && (
                      <span>
                        <strong>{m.newCount}</strong> new
                      </span>
                    )}
                    {m.pipeline > 0 && (
                      <span>
                        <strong>{m.pipeline}</strong> pipeline
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              <button className={styles.mandateCreate} onClick={() => setShowCreateMandate(true)}>+ Create mandate</button>
            </div>
          </section>

          {/* WATCHLIST */}
          {watchlist.length > 0 && (
            <section className={`${styles.section} ${styles.anim} ${styles.a5}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Watchlist</h2>
              </div>
              <div className={styles.mandateGrid}>
                {watchlist.map((w) => (
                  <Link key={w.id} href={`/scope/property/${w.propertyId}`} className={styles.mandateCard}>
                    <div className={styles.mandateName}>{w.property?.address || "Property"}</div>
                    <div className={styles.mandateDesc}>
                      {w.property?.assetType}{w.property?.askingPrice ? ` · £${Number(w.property.askingPrice).toLocaleString()}` : ""}
                    </div>
                    <div className={styles.mandateStats}>
                      {w.property?.sourceTag && <span>{w.property.sourceTag}</span>}
                      {w.property?.epcRating && <span>EPC {w.property.epcRating}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ALERTS */}
          <section className={`${styles.section} ${styles.anim} ${styles.a6}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Latest Alerts</h2>
              <Link href="/scope/alerts" className={styles.sectionLink}>
                View all →
              </Link>
            </div>
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`${styles.alertItem} ${a.unread ? styles.alertUnread : ""}`}
              >
                <div
                  className={styles.alertIcon}
                  data-type={a.type}
                >
                  {a.type === "admin" ? "!" : a.type === "price" ? "↓" : "⏱"}
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertTitle}>{a.title}</div>
                  <div className={styles.alertDesc}>{a.desc}</div>
                  <div className={styles.alertMeta}>
                    <span
                      className={styles.badge}
                      data-type={a.type}
                    >
                      {a.type === "admin"
                        ? "Admin"
                        : a.type === "price"
                          ? "Price drop"
                          : "Deadline"}
                    </span>
                    {a.score && (
                      <span className={styles.score}>{a.score}</span>
                    )}
                    <span>{a.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* CREATE MANDATE MODAL */}
        {showCreateMandate && (
          <CreateMandateModal
            onClose={() => setShowCreateMandate(false)}
            onCreated={(m) => {
              setLiveMandates((prev) => [m, ...prev]);
              setShowCreateMandate(false);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ── Create Mandate Modal ── */
function CreateMandateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: any) => void }) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [locations, setLocations] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [epcFilter, setEpcFilter] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleAsset = (a: string) => setAssetClasses((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  const toggleEpc = (e: string) => setEpcFilter((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const criteria: Record<string, any> = {};
      if (assetClasses.length) criteria.assetClasses = assetClasses;
      if (locations.trim()) criteria.locations = locations.split(",").map((l) => l.trim());
      if (priceMin) criteria.priceMin = parseInt(priceMin, 10);
      if (priceMax) criteria.priceMax = parseInt(priceMax, 10);
      if (epcFilter.length) criteria.epcFilter = epcFilter;

      const res = await fetch("/api/dealscope/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), clientName: clientName.trim() || undefined, criteria }),
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data);
      }
    } catch (e) {
      console.error("Create mandate failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 16, width: "90%", maxWidth: 480, padding: 0, boxShadow: "0 24px 80px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--s2)" }}>
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--tx)", fontWeight: 400 }}>Create mandate</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--tx3)", cursor: "pointer" }}>&times;</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Name *</label>
            <input style={{ width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} placeholder="e.g. SE Industrial <£800k" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Client (optional)</label>
            <input style={{ width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} placeholder="e.g. Harrow Capital" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Asset types</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["industrial", "office", "retail", "residential", "mixed"].map((a) => (
                <button key={a} onClick={() => toggleAsset(a)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${assetClasses.includes(a) ? "var(--acc)" : "var(--s3)"}`, background: assetClasses.includes(a) ? "rgba(124,106,240,.08)" : "transparent", color: assetClasses.includes(a) ? "#a899ff" : "var(--tx3)", fontFamily: "var(--sans)", fontSize: 11, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Price min</label>
              <input style={{ width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} type="number" placeholder="200000" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Price max</label>
              <input style={{ width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} type="number" placeholder="800000" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>Locations (comma-separated)</label>
            <input style={{ width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} placeholder="London, South East" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>EPC filter</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["A", "B", "C", "D", "E", "F", "G"].map((e) => (
                <button key={e} onClick={() => toggleEpc(e)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${epcFilter.includes(e) ? "var(--acc)" : "var(--s3)"}`, background: epcFilter.includes(e) ? "rgba(124,106,240,.08)" : "transparent", color: epcFilter.includes(e) ? "#a899ff" : "var(--tx3)", fontFamily: "var(--mono)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>{e}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--s2)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--s3)", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: "var(--s2)", color: "var(--tx2)" }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: "var(--acc)", color: "#fff", opacity: saving || !name.trim() ? 0.6 : 1 }}>{saving ? "Creating..." : "Create mandate"}</button>
        </div>
      </div>
    </div>
  );
}

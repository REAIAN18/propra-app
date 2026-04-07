"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./settings.module.css";

type SettingsTab = "criteria" | "alerts" | "portfolio" | "profile" | "mandates";

const ASSET_CLASSES = ["Industrial", "Warehouse", "Office", "Retail", "Mixed", "Residential", "Development land"];
const LOCATIONS = ["South East", "London", "Midlands", "North West", "North East", "South West", "East", "Scotland", "Wales"];
const SIGNAL_TYPES = ["Administration", "Auction", "MEES risk", "Absent owner", "Probate", "Dissolved", "Price drop", "Planning"];
const EXCLUSIONS = ["Listed buildings", "Flood zone 3", "Residential only", "Leasehold <50yr"];

interface PortfolioItem {
  id: string;
  name: string;
  type: string;
  location: string;
  value: string;
  acquired: string;
}

interface Mandate {
  id: string;
  name: string;
  clientName?: string | null;
  criteria?: Record<string, unknown>;
  alertDigest?: string;
  matches?: number;
}

function CreateMandateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: Mandate) => void }) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [locations, setLocations] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleAsset = (a: string) => setAssetClasses((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const criteria: Record<string, unknown> = {};
      if (assetClasses.length) criteria.assetClasses = assetClasses;
      if (locations.trim()) criteria.locations = locations.split(",").map((l) => l.trim());
      if (priceMin) criteria.priceMin = parseInt(priceMin, 10);
      if (priceMax) criteria.priceMax = parseInt(priceMax, 10);

      const res = await fetch("/api/dealscope/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), clientName: clientName.trim() || undefined, criteria }),
      });
      if (res.ok) onCreated(await res.json());
    } catch (e) {
      console.error("Create mandate failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--s3)", borderRadius: 8, color: "var(--tx)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600 as const, color: "var(--tx3)", textTransform: "uppercase" as const, letterSpacing: ".5px", display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--s2)", borderRadius: 16, width: "90%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--s2)" }}>
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--tx)", fontWeight: 400 }}>Create mandate</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--tx3)", cursor: "pointer" }}>&times;</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} placeholder="e.g. SE Industrial <£800k" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Client (optional)</label>
            <input style={inputStyle} placeholder="e.g. Harrow Capital" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Asset types</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["industrial", "office", "retail", "warehouse", "mixed"].map((a) => (
                <button key={a} onClick={() => toggleAsset(a)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${assetClasses.includes(a) ? "var(--acc)" : "var(--s3)"}`, background: assetClasses.includes(a) ? "rgba(124,106,240,.08)" : "transparent", color: assetClasses.includes(a) ? "#a899ff" : "var(--tx3)", fontFamily: "var(--sans)", fontSize: 11, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Price min</label>
              <input style={inputStyle} type="number" placeholder="200000" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Price max</label>
              <input style={inputStyle} type="number" placeholder="800000" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Locations (comma-separated)</label>
            <input style={inputStyle} placeholder="e.g. London, South East" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--s2)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--s3)", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: "var(--s2)", color: "var(--tx2)" }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, background: "var(--acc)", color: "#fff", opacity: saving || !name.trim() ? 0.6 : 1 }}>{saving ? "Creating…" : "Create mandate"}</button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("criteria");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [mandatesLoading, setMandatesLoading] = useState(false);
  const [showCreateMandate, setShowCreateMandate] = useState(false);

  useEffect(() => {
    fetch("/api/dealscope/pipeline")
      .then(r => r.json())
      .then(data => {
        const entries = (data.entries ?? []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: (e.propertyId as string) ?? "Property",
          type: "Commercial",
          location: "—",
          value: "—",
          acquired: e.addedAt ? new Date(e.addedAt as string).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—",
        }));
        setPortfolioItems(entries);
      })
      .catch(() => setPortfolioItems([]));
  }, []);

  useEffect(() => {
    if (activeTab !== "mandates") return;
    setMandatesLoading(true);
    fetch("/api/dealscope/mandates")
      .then(r => r.json())
      .then((data: Mandate[]) => setMandates(Array.isArray(data) ? data : []))
      .catch(() => setMandates([]))
      .finally(() => setMandatesLoading(false));
  }, [activeTab]);
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>(["Industrial", "Warehouse"]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["South East", "London"]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>(["Administration", "Auction", "MEES risk", "Absent owner"]);
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>(["Listed buildings"]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(2000);
  const [emailDigest, setEmailDigest] = useState("daily");
  const [minScore, setMinScore] = useState(6);
  const [priceDropThreshold, setPriceDropThreshold] = useState(10);

  const toggleAssetClass = (cls: string) => {
    setSelectedAssetClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const toggleSignal = (sig: string) => {
    setSelectedSignals(prev =>
      prev.includes(sig) ? prev.filter(s => s !== sig) : [...prev, sig]
    );
  };

  const toggleExclusion = (exc: string) => {
    setSelectedExclusions(prev =>
      prev.includes(exc) ? prev.filter(e => e !== exc) : [...prev, exc]
    );
  };

  return (
    <AppShell>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <h1 className={styles.title}>Settings</h1>

          <div className={styles.navTabs}>
            {[
              { id: "criteria", label: "Default criteria" },
              { id: "alerts", label: "Alert preferences" },
              { id: "portfolio", label: "Portfolio" },
              { id: "profile", label: "Profile" },
              { id: "mandates", label: "Manage mandates" },
            ].map(tab => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ""}`}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* DEFAULT CRITERIA */}
          {activeTab === "criteria" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Default asset classes</h3>
                <p className={styles.cardDesc}>Applied when you open the search page. You can always override per search.</p>
                <div className={styles.chipGroup}>
                  {ASSET_CLASSES.map(cls => (
                    <button
                      key={cls}
                      className={`${styles.chip} ${selectedAssetClasses.includes(cls) ? styles.active : ""}`}
                      onClick={() => toggleAssetClass(cls)}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Default locations</h3>
                <div className={styles.chipGroup}>
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc}
                      className={`${styles.chip} ${selectedLocations.includes(loc) ? styles.active : ""}`}
                      onClick={() => toggleLocation(loc)}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Default signals</h3>
                <div className={styles.chipGroup}>
                  {SIGNAL_TYPES.map(sig => (
                    <button
                      key={sig}
                      className={`${styles.chip} ${selectedSignals.includes(sig) ? styles.active : ""}`}
                      onClick={() => toggleSignal(sig)}
                    >
                      {sig}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Exclude from results</h3>
                <p className={styles.cardDesc}>Properties matching these criteria will never appear in your search results or alerts.</p>
                <div className={styles.chipGroup}>
                  {EXCLUSIONS.map(exc => (
                    <button
                      key={exc}
                      className={`${styles.chip} ${styles.exclusion} ${selectedExclusions.includes(exc) ? styles.active : ""}`}
                      onClick={() => toggleExclusion(exc)}
                    >
                      {exc}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Default price range</h3>
                <div className={styles.priceLabels}>
                  <span>£0</span>
                  <span>£10M+</span>
                </div>
                <div className={styles.rangeInputs}>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                  />
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                  />
                </div>
                <div className={styles.priceDisplay}>
                  £{priceMin === 0 ? "0" : (priceMin / 1000).toFixed(1)}M — £{(priceMax / 1000).toFixed(1)}M
                </div>
              </div>
            </div>
          )}

          {/* ALERT PREFERENCES */}
          {activeTab === "alerts" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Notification channels</h3>
                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel}>In-app notifications</div>
                    <div className={styles.rowDesc}>Show alerts in the Alerts tab and home page feed</div>
                  </div>
                  <label className={styles.toggle}>
                    <input type="checkbox" defaultChecked />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>
                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel}>Email digest</div>
                    <div className={styles.rowDesc}>Summary of new alerts delivered to your inbox</div>
                  </div>
                  <div className={styles.chipSmall}>
                    {["Daily", "Weekly", "Off"].map(freq => (
                      <button
                        key={freq}
                        className={`${styles.chip} ${emailDigest === freq.toLowerCase() ? styles.active : ""}`}
                        onClick={() => setEmailDigest(freq.toLowerCase())}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel}>Urgent alerts (email)</div>
                    <div className={styles.rowDesc}>Immediate email for auction deadlines &lt;48h and new administration filings</div>
                  </div>
                  <label className={styles.toggle}>
                    <input type="checkbox" defaultChecked />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Alert thresholds</h3>
                <div className={styles.row}>
                  <div className={styles.rowLabel}>Minimum score</div>
                  <div className={styles.rangeControl}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      style={{ width: "120px" }}
                    />
                    <span className={styles.rangeValue}>{minScore.toFixed(1)}+</span>
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowLabel}>Price drop threshold</div>
                  <div className={styles.rangeControl}>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={priceDropThreshold}
                      onChange={(e) => setPriceDropThreshold(Number(e.target.value))}
                      style={{ width: "120px" }}
                    />
                    <span className={styles.rangeValue}>{priceDropThreshold}%+</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PORTFOLIO */}
          {activeTab === "portfolio" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Your portfolio</h3>
                <p className={styles.cardDesc}>Your existing properties. Used for portfolio context in scoring, diversification alerts, and Elevate integration.</p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Value</th>
                      <th>Acquired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioItems.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", padding: "20px", fontSize: "12px" }}>No properties added yet. Add properties to your pipeline to see them here.</td></tr>
                    ) : portfolioItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td>{item.location}</td>
                        <td>{item.value}</td>
                        <td>{item.acquired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href="/scope/property/new" className={styles.primaryButton} style={{ display: "inline-block", textDecoration: "none" }}>+ Add property</Link>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Profile information</h3>
                <div className={styles.formGroup}>
                  <label>Company / Name</label>
                  <input type="text" placeholder="Your name or company" />
                </div>
                <div className={styles.formGroup}>
                  <label>Email address</label>
                  <input type="email" placeholder="your@email.com" />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone number</label>
                  <input type="tel" placeholder="+44 20 XXXX XXXX" />
                </div>
                <button className={styles.primaryButton}>Save changes</button>
              </div>
            </div>
          )}

          {/* MANAGE MANDATES */}
          {activeTab === "mandates" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Saved searches (mandates)</h3>
                <p className={styles.cardDesc}>Create mandates to get alerts on properties matching your criteria.</p>
                {mandatesLoading ? (
                  <div style={{ padding: "16px 0", color: "var(--tx3)", fontSize: 13 }}>Loading mandates…</div>
                ) : mandates.length === 0 ? (
                  <div style={{ padding: "16px 0", color: "var(--tx3)", fontSize: 13 }}>No mandates saved yet. Create one to start receiving targeted alerts.</div>
                ) : (
                  <div className={styles.mandateList}>
                    {mandates.map(m => {
                      const criteria = m.criteria ?? {};
                      const classes = (criteria.assetClasses as string[] | undefined)?.join(", ") ?? "";
                      const locs = (criteria.locations as string[] | undefined)?.join(", ") ?? "";
                      const desc = [classes, locs, m.alertDigest ? `Alerts: ${m.alertDigest}` : ""].filter(Boolean).join(" · ");
                      return (
                        <div key={m.id} className={styles.mandateItem}>
                          <div>
                            <div className={styles.mandateName}>{m.name}</div>
                            {desc && <div className={styles.mandateDesc}>{desc}</div>}
                            {m.matches != null && m.matches > 0 && (
                              <div className={styles.mandateDesc}>{m.matches} current match{m.matches !== 1 ? "es" : ""}</div>
                            )}
                          </div>
                          <button className={styles.secondaryButton}>Edit</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button className={styles.primaryButton} onClick={() => setShowCreateMandate(true)}>+ Create mandate</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showCreateMandate && (
        <CreateMandateModal
          onClose={() => setShowCreateMandate(false)}
          onCreated={(m) => {
            setMandates((prev) => [m, ...prev]);
            setShowCreateMandate(false);
          }}
        />
      )}
    </AppShell>
  );
}

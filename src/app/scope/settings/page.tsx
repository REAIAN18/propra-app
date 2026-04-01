"use client";

import { useState } from "react";
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

const DEMO_PORTFOLIO: PortfolioItem[] = [
  {
    id: "1",
    name: "Meridian Business Park, Unit 7",
    type: "Industrial",
    location: "Kent",
    value: "£480k",
    acquired: "Sep 2025",
  },
  {
    id: "2",
    name: "Redfield Manor",
    type: "Industrial",
    location: "Surrey",
    value: "£720k",
    acquired: "Dec 2025",
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("criteria");
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
                    {DEMO_PORTFOLIO.map(item => (
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
                <button className={styles.primaryButton}>+ Add property</button>
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
                <div className={styles.mandateList}>
                  <div className={styles.mandateItem}>
                    <div>
                      <div className={styles.mandateName}>SE Industrial &lt;£800k</div>
                      <div className={styles.mandateDesc}>Industrial properties in South East, under £800,000. Alerts: daily digest</div>
                    </div>
                    <button className={styles.secondaryButton}>Edit</button>
                  </div>
                  <div className={styles.mandateItem}>
                    <div>
                      <div className={styles.mandateName}>London Office (admin)</div>
                      <div className={styles.mandateDesc}>Office properties in Greater London with administration signals. Alerts: immediate</div>
                    </div>
                    <button className={styles.secondaryButton}>Edit</button>
                  </div>
                </div>
                <button className={styles.primaryButton}>+ Create mandate</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

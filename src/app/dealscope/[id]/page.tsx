"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import styles from "./dossier.module.css";

interface Property {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  yearBuilt?: number;
  askingPrice?: number;
  guidePrice?: number;
  capRate?: number;
  dealScore: number;
  temperature: "hot" | "warm" | "watch" | "cold";
  signals: string[];
  ownerName?: string;
  currentRentPsf?: number;
  marketRentPsf?: number;
  occupancyPct?: number;
  epcRating?: string;
  currency: string;
}

interface Signal {
  type: string;
  title: string;
  description: string;
  date: string;
  severity: "info" | "high" | "critical";
}

interface Comparable {
  id: string;
  address: string;
  saleAmount?: number;
  saleDate?: string;
  pricePerSqft?: number;
}

export default function PropertyDossierPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [comps, setComps] = useState<Comparable[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/dealscope/properties/${propertyId}`).then((r) => r.json()),
      fetch(`/api/dealscope/properties/${propertyId}/signals`).then((r) => r.json()),
      fetch(`/api/dealscope/properties/${propertyId}/comps`).then((r) => r.json()),
    ])
      .then(([propData, signalData, compData]) => {
        setProperty(propData);
        setSignals(signalData.signals || []);
        setComps(compData || []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading || !property) return <AppShell><div>Loading...</div></AppShell>;

  const getTempColor = (temp: string) => {
    if (temp === "hot") return "#f87171";
    if (temp === "warm") return "#fbbf24";
    if (temp === "watch") return "#60a5fa";
    return "#6b7280";
  };

  return (
    <AppShell>
      <div className={styles.container}>
        {/* Header with Property Photo and Info */}
        <div className={styles.dossierHeader}>
          <div className={styles.propertyPhoto}></div>
          <div className={styles.propertyInfo}>
            <h1 className={styles.propertyAddress}>{property.address}</h1>
            <div className={styles.propertySpecs}>
              <div className={styles.propertySpec}>
                <div className={styles.specLabel}>Type</div>
                <div className={styles.specValue}>{property.assetType}</div>
              </div>
              {property.sqft && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>Size</div>
                  <div className={styles.specValue}>{property.sqft.toLocaleString()} sqft</div>
                </div>
              )}
              {property.yearBuilt && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>Year Built</div>
                  <div className={styles.specValue}>{property.yearBuilt}</div>
                </div>
              )}
              {property.capRate && (
                <div className={styles.propertySpec}>
                  <div className={styles.specLabel}>Cap Rate</div>
                  <div className={styles.specValue}>{property.capRate.toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.signalBadges}>
            <div
              className={styles.temperatureBadge}
              style={{ borderColor: getTempColor(property.temperature) }}
            >
              {property.temperature.toUpperCase()}
            </div>
            <div className={styles.scoreBadge}>{property.dealScore}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {["overview", "valuation", "opportunity", "risk", "owner", "comps"].map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div className={styles.tabPane}>
              <h2>Overview</h2>
              <div className={styles.grid}>
                {property.askingPrice && (
                  <div className={styles.card}>
                    <div className={styles.cardLabel}>Asking Price</div>
                    <div className={styles.cardValue}>
                      {property.currency} {property.askingPrice.toLocaleString()}
                    </div>
                  </div>
                )}
                {property.currentRentPsf && (
                  <div className={styles.card}>
                    <div className={styles.cardLabel}>Current Rent/sqft</div>
                    <div className={styles.cardValue}>{property.currentRentPsf.toFixed(2)}</div>
                  </div>
                )}
                {property.marketRentPsf && (
                  <div className={styles.card}>
                    <div className={styles.cardLabel}>Market Rent/sqft</div>
                    <div className={styles.cardValue}>{property.marketRentPsf.toFixed(2)}</div>
                  </div>
                )}
                {property.occupancyPct && (
                  <div className={styles.card}>
                    <div className={styles.cardLabel}>Occupancy</div>
                    <div className={styles.cardValue}>{property.occupancyPct.toFixed(1)}%</div>
                  </div>
                )}
              </div>
              {signals.length > 0 && (
                <div className={styles.timeline}>
                  <h3>Signal Timeline</h3>
                  {signals.map((signal, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineMarker}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineDate}>
                          {new Date(signal.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{signal.title}</div>
                        <div className={styles.timelineDetail}>{signal.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "valuation" && (
            <div className={styles.tabPane}>
              <h2>Valuation</h2>
              <div className={styles.valuationGrid}>
                <div className={styles.valuationMethod}>
                  <div className={styles.methodTitle}>Asking Price</div>
                  <div className={styles.methodValue}>
                    {property.currency} {property.askingPrice?.toLocaleString() || "TBD"}
                  </div>
                </div>
                <div className={styles.valuationMethod}>
                  <div className={styles.methodTitle}>Guide Price</div>
                  <div className={styles.methodValue}>
                    {property.currency} {property.guidePrice?.toLocaleString() || "TBD"}
                  </div>
                </div>
                <div className={styles.valuationMethod}>
                  <div className={styles.methodTitle}>Cap Rate</div>
                  <div className={styles.methodValue}>{property.capRate?.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "opportunity" && (
            <div className={styles.tabPane}>
              <h2>Opportunity</h2>
              <p>Rent gap, development potential, and income opportunities.</p>
            </div>
          )}

          {activeTab === "risk" && (
            <div className={styles.tabPane}>
              <h2>Risk Assessment</h2>
              <div className={styles.riskMatrix}>
                <div className={styles.riskItem}>
                  <div className={styles.riskLabel}>Flood Risk</div>
                  <div>-</div>
                </div>
                <div className={styles.riskItem}>
                  <div className={styles.riskLabel}>EPC Rating</div>
                  <div>{property.epcRating || "N/A"}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "owner" && (
            <div className={styles.tabPane}>
              <h2>Owner Profile</h2>
              <div className={styles.ownerInfo}>
                <p>
                  <strong>Name:</strong> {property.ownerName || "Unknown"}
                </p>
                <Link href={`/dealscope/owners/${property.id}`} className={styles.link}>
                  View full owner profile →
                </Link>
              </div>
            </div>
          )}

          {activeTab === "comps" && (
            <div className={styles.tabPane}>
              <h2>Comparable Transactions</h2>
              {comps.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Sale Amount</th>
                      <th>Sale Date</th>
                      <th>Price/sqft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((comp) => (
                      <tr key={comp.id}>
                        <td>{comp.address}</td>
                        <td>{property.currency} {comp.saleAmount?.toLocaleString() || "-"}</td>
                        <td>{comp.saleDate || "-"}</td>
                        <td>{comp.pricePerSqft?.toFixed(2) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No comparable transactions available.</p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href={`/dealscope/${propertyId}/approach`} className={styles.btn}>
            Generate Approach Letter
          </Link>
          <Link href={`/dealscope/${propertyId}/negotiate`} className={styles.btn}>
            Negotiation Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

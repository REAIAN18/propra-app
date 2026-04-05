"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import styles from "./owner.module.css";

interface OwnerProfile {
  id: string;
  name: string;
  properties: Array<{
    id: string;
    address: string;
    temperature: string;
    score: number;
    value?: number;
  }>;
  portfolio: {
    count: number;
    totalValue: number;
  };
  outreach: {
    lastContact?: string;
    status: string;
  };
}

export default function OwnerProfilePage() {
  const params = useParams();
  const ownerId = params.id as string;
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOwner = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/dealscope/owners/${ownerId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load owner (${res.status})`);
        return res.json();
      })
      .then((data: OwnerProfile) => { setOwner(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message || "Failed to load owner"); setLoading(false); });
  };

  useEffect(() => { loadOwner(); }, [ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <AppShell>
        <div className={styles.errorPage}>
          <div className={styles.errorIcon}>⚠</div>
          <p className={styles.errorTitle}>Could not load owner</p>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryBtn} onClick={loadOwner}>Retry</button>
        </div>
      </AppShell>
    );
  }

  if (loading || !owner) {
    return (
      <AppShell>
        <div className={styles.skeletonPage}>
          <div>
            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeleton} ${styles.skeletonSub}`} />
          </div>
          <div className={styles.skeletonSection}>
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.skeletonItem}>
                  <div className={`${styles.skeleton} ${styles.skeletonLabel}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.skeletonSection}>
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.skeletonItem}>
                  <div className={`${styles.skeleton} ${styles.skeletonLabel}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{owner.name}</h1>
            <p className={styles.subtitle}>Owner Profile & Portfolio Analysis</p>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.profileSection}>
            <h2 className={styles.sectionTitle}>Company Details</h2>
            <div className={styles.details}>
              <div className={styles.detail}>
                <span className={styles.label}>Company Name</span>
                <span className={styles.value}>{owner.name}</span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Total Properties</span>
                <span className={styles.value}>{owner.portfolio.count}</span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Portfolio Value</span>
                <span className={styles.value}>
                  {owner.portfolio.totalValue > 0
                    ? `£${(owner.portfolio.totalValue / 1000000).toFixed(1)}M`
                    : "N/A"}
                </span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Outreach Status</span>
                <span className={styles.value}>{owner.outreach.status}</span>
              </div>
            </div>
          </div>

          <div className={styles.portfolioSection}>
            <h2 className={styles.sectionTitle}>Portfolio Map ({owner.properties.length} Properties)</h2>
            <div className={styles.mapPlaceholder}>📍 Portfolio map visualization</div>
          </div>

          <div className={styles.healthSection}>
            <h2 className={styles.sectionTitle}>Financial Health Indicators</h2>
            <div className={styles.indicators}>
              <div className={styles.indicator}>
                <span className={styles.indicatorLabel}>Liquidity Risk</span>
                <div className={styles.indicatorBar}>
                  <div className={styles.barFill} style={{ width: "35%" }}></div>
                </div>
                <span className={styles.indicatorValue}>Low</span>
              </div>
              <div className={styles.indicator}>
                <span className={styles.indicatorLabel}>Market Risk</span>
                <div className={styles.indicatorBar}>
                  <div className={styles.barFill} style={{ width: "55%" }}></div>
                </div>
                <span className={styles.indicatorValue}>Moderate</span>
              </div>
              <div className={styles.indicator}>
                <span className={styles.indicatorLabel}>Leverage</span>
                <div className={styles.indicatorBar}>
                  <div className={styles.barFill} style={{ width: "70%" }}></div>
                </div>
                <span className={styles.indicatorValue}>Moderate-High</span>
              </div>
            </div>
          </div>

          <div className={styles.propertiesSection}>
            <h2 className={styles.sectionTitle}>Property Holdings</h2>
            <div className={styles.propertyGrid}>
              {owner.properties.map((prop) => (
                <Link key={prop.id} href={`/dealscope/${prop.id}`}>
                  <div className={styles.propertyCard}>
                    <div className={styles.propHeader}>
                      <div className={styles.propTemp}>{prop.temperature}</div>
                      <div className={styles.propScore}>{prop.score}</div>
                    </div>
                    <h3 className={styles.propAddress}>{prop.address}</h3>
                    {prop.value && (
                      <div className={styles.propValue}>£{(prop.value / 1000).toFixed(0)}k</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.outreachSection}>
            <h2 className={styles.sectionTitle}>Outreach History</h2>
            <p className={styles.placeholder}>No outreach history yet.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

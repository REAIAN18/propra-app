"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./pipeline.module.css";

const STAGES = ["identified", "researched", "approached", "negotiating", "under_offer", "completing"];

export default function PipelinePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load pipeline deals
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const response = await fetch("/api/scope/pipeline");
        if (response.ok) {
          const data = await response.json();
          setDeals(data.deals || []);
        }
      } catch (err) {
        console.error("Error loading pipeline:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDeals();
  }, []);

  const dealsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    },
    {} as Record<string, any[]>
  );

  if (loading) {
    return (
      <AppShell>
        <div className={styles.container}>
          <div className={styles.loading}>Loading pipeline...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Pipeline</h1>
          <p>Track your acquisition deals through the pipeline</p>
        </header>

        <div className={styles.kanban}>
          {STAGES.map((stage) => (
            <div key={stage} className={styles.column}>
              <div className={styles.columnHeader}>
                <h2>{stage.replace("_", " ").charAt(0).toUpperCase() + stage.replace("_", " ").slice(1)}</h2>
                <span className={styles.count}>{dealsByStage[stage].length}</span>
              </div>

              <div className={styles.cards}>
                {dealsByStage[stage].length === 0 ? (
                  <div className={styles.emptyColumn}>No deals</div>
                ) : (
                  dealsByStage[stage].map((deal) => (
                    <Link key={deal.id} href={`/scope/property/${deal.propertyId}`}>
                      <div className={styles.card}>
                        <h3>{deal.address}</h3>
                        <div className={styles.cardMeta}>
                          <span>{deal.assetType}</span>
                          {deal.askingPrice && (
                            <span className={styles.price}>${deal.askingPrice.toLocaleString()}</span>
                          )}
                        </div>
                        {deal.followUpDate && (
                          <div className={styles.followUp}>
                            Follow up:{" "}
                            {new Date(deal.followUpDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {deals.length === 0 && (
          <div className={styles.emptyState}>
            <p>No deals in pipeline yet.</p>
            <p>Add properties to your pipeline from the search results.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

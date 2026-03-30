"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./pipeline.module.css";

interface Deal {
  id: string;
  address: string;
  dealScore: number;
  temperature: string;
  signals: string[];
}

interface PipelineData {
  stages: string[];
  data: Record<string, Deal[]>;
  summary: Record<string, number>;
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dealscope/pipeline")
      .then((res) => res.json())
      .then((data) => {
        setPipeline(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching pipeline:", err);
        setLoading(false);
      });
  }, []);

  const stageLabels: Record<string, string> = {
    identified: "Identified",
    researched: "Researched",
    approached: "Approached",
    negotiating: "Negotiating",
    under_offer: "Under Offer",
    completing: "Completing",
  };

  if (loading || !pipeline) {
    return <AppShell><div>Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Deal Pipeline — Kanban Board</h1>
          <div className={styles.summary}>
            {pipeline.stages.map((stage) => (
              <div key={stage} className={styles.summaryCard}>
                <div className={styles.stageName}>{stageLabels[stage]}</div>
                <div className={styles.count}>{pipeline.summary[stage] || 0}</div>
              </div>
            ))}
          </div>
        </header>

        <div className={styles.kanban}>
          {pipeline.stages.map((stage) => (
            <div key={stage} className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>{stageLabels[stage]}</h2>
                <span className={styles.columnCount}>{pipeline.data[stage]?.length || 0}</span>
              </div>
              <div className={styles.cards}>
                {(pipeline.data[stage] || []).map((deal) => (
                  <Link key={deal.id} href={`/dealscope/${deal.id}`}>
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.temperature}>{deal.temperature.toUpperCase()}</div>
                        <div className={styles.score}>{deal.dealScore}</div>
                      </div>
                      <h3 className={styles.address}>{deal.address}</h3>
                      <div className={styles.signals}>
                        {deal.signals.slice(0, 2).map((sig) => (
                          <span key={sig} className={styles.signal}>
                            {sig.substring(0, 3)}
                          </span>
                        ))}
                        {deal.signals.length > 2 && (
                          <span className={styles.signal}>+{deal.signals.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

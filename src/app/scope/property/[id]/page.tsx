"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { HeadlineCard } from "@/components/dealscope/HeadlineCard";
import styles from "./property.module.css";

interface PropertyData {
  id: string;
  address: string;
  assetType: string;
  sqft?: number;
  yearBuilt?: number;
  epcRating?: string;
  askingPrice?: number;
  guidePrice?: number;
  capRate?: number;
  satelliteImageUrl?: string;
  ownerName?: string;
  signals?: any[];
  currency?: string;
}

export default function PropertyPage() {
  const params = useParams();
  const id = params.id as string;

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`/api/dealscope/properties/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch property");
        }
        const data = await response.json();
        setProperty(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <TopBar />
        <div className={styles.container}>
          <div className={styles.loading}>Loading property details...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell>
        <TopBar />
        <div className={styles.container}>
          <div className={styles.error}>
            {error || "Property not found"}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar />
      <div className={styles.container}>
        <HeadlineCard
          address={property.address}
          assetType={property.assetType}
          sqft={property.sqft}
          yearBuilt={property.yearBuilt}
          epcRating={property.epcRating}
          askingPrice={property.askingPrice}
          guidePrice={property.guidePrice}
          capRate={property.capRate}
          satelliteImageUrl={property.satelliteImageUrl}
          ownerName={property.ownerName}
          signals={property.signals}
          currency={property.currency}
        />

        {/* Tabs Section */}
        <div className={styles.tabs}>
          <div className={styles.tab}>Overview</div>
          <div className={styles.tab}>Valuation</div>
          <div className={styles.tab}>Opportunity</div>
          <div className={styles.tab}>Risk</div>
          <div className={styles.tab}>Owner</div>
          <div className={styles.tab}>Comps</div>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          {/* Placeholder for tab content */}
          <div className={styles.tabPane}>
            <p>Tab content goes here</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

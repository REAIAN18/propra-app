"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./dossier.module.css";

type Tab = "property" | "planning" | "legal" | "environmental" | "ownership" | "financials" | "market" | "approach";

const TABS: { id: Tab; label: string }[] = [
  { id: "property", label: "Property" },
  { id: "planning", label: "Planning" },
  { id: "legal", label: "Title & Legal" },
  { id: "environmental", label: "Environmental" },
  { id: "ownership", label: "Ownership" },
  { id: "financials", label: "Financials" },
  { id: "market", label: "Market" },
  { id: "approach", label: "Approach" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PropertyDossierPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("property");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;
      try {
        const response = await fetch(`/api/scope/property/${id}`);
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = await response.json() as any;
          setProperty(data);
        }
      } catch (err) {
        console.error("Error loading property:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProperty();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className={styles.container}>
          <div className={styles.skeleton}>Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (!property) {
    return (
      <AppShell>
        <div className={styles.container}>
          <div className={styles.error}>Property not found</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1>{property.address}</h1>
            <p className={styles.type}>{property.assetType} • {property.sqft?.toLocaleString()} sqft</p>
          </div>
          <div className={styles.scoreRing}>
            <div className={styles.score}>{property.signalCount || 0}</div>
            <p>signals</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === "property" && (
            <PropertyTab property={property} />
          )}
          {activeTab === "planning" && (
            <PlanningTab property={property} />
          )}
          {activeTab === "legal" && (
            <LegalTab property={property} />
          )}
          {activeTab === "environmental" && (
            <EnvironmentalTab property={property} />
          )}
          {activeTab === "ownership" && (
            <OwnershipTab property={property} />
          )}
          {activeTab === "financials" && (
            <FinancialsTab property={property} />
          )}
          {activeTab === "market" && (
            <MarketTab property={property} />
          )}
          {activeTab === "approach" && (
            <ApproachTab property={property} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Tab Components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PropertyTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Property Details</h2>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>Address</label>
          <div className={styles.value}>{property.address}</div>
        </div>
        <div className={styles.field}>
          <label>Asset Type</label>
          <div className={styles.value}>{property.assetType}</div>
        </div>
        <div className={styles.field}>
          <label>Size</label>
          <div className={styles.value}>{property.sqft?.toLocaleString()} sqft</div>
        </div>
        <div className={styles.field}>
          <label>Asking Price</label>
          <div className={styles.value}>{property.currency} {property.askingPrice?.toLocaleString()}</div>
        </div>
        {property.epcRating && (
          <div className={styles.field}>
            <label>EPC Rating</label>
            <div className={styles.value}>{property.epcRating}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanningTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Planning Information</h2>
      <p className={styles.placeholder}>Planning data loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LegalTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Title & Legal</h2>
      <p className={styles.placeholder}>Title and legal information loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnvironmentalTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Environmental</h2>
      <p className={styles.placeholder}>Environmental data loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OwnershipTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Ownership & Company</h2>
      <p className={styles.placeholder}>Ownership information loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FinancialsTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Financials</h2>
      <p className={styles.placeholder}>Financial analysis loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Market Intelligence</h2>
      <p className={styles.placeholder}>Market data loading...</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ApproachTab({ property }: { property: any }) {
  return (
    <div className={styles.tabPanel}>
      <h2>Approach Strategy</h2>
      <p className={styles.placeholder}>Approach planning loading...</p>
    </div>
  );
}

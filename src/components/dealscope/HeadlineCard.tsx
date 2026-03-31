"use client";

import React from "react";
import styles from "./HeadlineCard.module.css";

export interface PropertySignal {
  type: string;
  name: string;
  confidence: number;
}

export interface HeadlineCardProps {
  address: string;
  assetType: string;
  sqft?: number;
  yearBuilt?: number;
  epcRating?: string;
  lastSaleYear?: number;
  askingPrice?: number;
  guidePrice?: number;
  capRate?: number;
  satelliteImageUrl?: string;
  ownerName?: string;
  signals?: PropertySignal[];
  valuationRange?: {
    low: number;
    high: number;
  };
  keyRisks?: string[];
  narrative?: string;
  currency?: string;
}

export function HeadlineCard({
  address,
  assetType,
  sqft,
  yearBuilt,
  epcRating,
  lastSaleYear,
  askingPrice,
  guidePrice,
  capRate,
  satelliteImageUrl,
  ownerName,
  signals = [],
  valuationRange,
  keyRisks = [],
  narrative,
  currency = "GBP",
}: HeadlineCardProps) {
  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "—";
    if (currency === "GBP") {
      return `£${(amount / 1000).toFixed(0)}k`;
    }
    return `$${(amount / 1000).toFixed(0)}k`;
  };

  // Get signal badges (show top 3 by confidence)
  const topSignals = signals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <div className={styles.container}>
      {/* Property Photo */}
      <div className={styles.propertyPhoto}>
        {satelliteImageUrl ? (
          <img
            src={satelliteImageUrl}
            alt={address}
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>Satellite View</span>
            <span className={styles.hint}>Map source image</span>
          </div>
        )}
      </div>

      {/* Property Info */}
      <div className={styles.propertyInfo}>
        <h2 className={styles.propertyAddress}>{address}</h2>

        <div className={styles.propertySpecs}>
          {assetType && (
            <div className={styles.propertySpec}>
              <div className={styles.specLabel}>Type</div>
              <div className={styles.specValue}>
                {assetType.charAt(0).toUpperCase() + assetType.slice(1)}
              </div>
            </div>
          )}

          {sqft && (
            <div className={styles.propertySpec}>
              <div className={styles.specLabel}>Size</div>
              <div className={styles.specValue}>{sqft.toLocaleString()} sqft</div>
            </div>
          )}

          {yearBuilt && (
            <div className={styles.propertySpec}>
              <div className={styles.specLabel}>Built</div>
              <div className={styles.specValue}>{yearBuilt}</div>
            </div>
          )}

          {epcRating && (
            <div className={styles.propertySpec}>
              <div className={styles.specLabel}>EPC</div>
              <div className={styles.specValue}>{epcRating}</div>
            </div>
          )}

          {guidePrice && (
            <div className={styles.propertySpec}>
              <div className={styles.specLabel}>Guide</div>
              <div className={styles.specValue}>{formatCurrency(guidePrice)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Signal Badges */}
      {topSignals.length > 0 && (
        <div className={styles.signalBadges}>
          {topSignals.map((signal, idx) => (
            <div
              key={idx}
              className={`${styles.signalBadge} ${styles[`confidence-${Math.round(signal.confidence / 33)}`]}`}
              title={`${signal.name} - ${signal.confidence}% confidence`}
            >
              {signal.name.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import s from "./PropertyImageGallery.module.css";

interface ThumbItem {
  label: string;
  url: string | null;
}

interface PropertyImageGalleryProps {
  satelliteUrl?: string | null;
  streetViewUrl?: string | null;
  listingImages?: string[];
}

function buildThumbs(
  satelliteUrl: string | null | undefined,
  streetViewUrl: string | null | undefined,
  listingImages: string[],
): ThumbItem[] {
  const thumbs: ThumbItem[] = [];

  if (satelliteUrl) thumbs.push({ label: "Satellite", url: satelliteUrl });
  if (streetViewUrl) thumbs.push({ label: "Street", url: streetViewUrl });

  listingImages.slice(0, 4).forEach((url, i) => {
    thumbs.push({ label: `Photo ${i + 1}`, url });
  });

  // Always show placeholder slots for Floor plan, EPC, Title if not filled
  const slots = [
    { label: "Floor plan", url: null },
    { label: "EPC", url: null },
    { label: "Title", url: null },
  ];
  let slotsNeeded = Math.max(0, 5 - thumbs.length);
  for (let i = 0; i < slotsNeeded && i < slots.length; i++) {
    thumbs.push(slots[i]);
  }

  return thumbs;
}

export function PropertyImageGallery({
  satelliteUrl,
  streetViewUrl,
  listingImages = [],
}: PropertyImageGalleryProps) {
  const thumbs = buildThumbs(satelliteUrl, streetViewUrl, listingImages);
  const [activeIdx, setActiveIdx] = useState(0);

  const heroThumb = thumbs[activeIdx] ?? thumbs[0];
  const heroUrl = heroThumb?.url ?? null;

  const VISIBLE = 5;
  const visibleThumbs = thumbs.slice(0, VISIBLE);
  const extra = thumbs.length - VISIBLE;

  const isSatellite = heroThumb?.label === "Satellite";

  return (
    <div className={s.gallery}>
      {/* Hero image */}
      <div className={s.hero}>
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt={heroThumb?.label ?? "Property image"} className={s.heroImg} />
        ) : (
          <div className={s.heroPlaceholder}>
            <span>{heroThumb?.label ?? "No image"}</span>
          </div>
        )}
        {isSatellite && (
          <div className={s.heroLabel}>Google Maps</div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className={s.thumbs}>
        {visibleThumbs.map((t, i) => (
          <button
            key={i}
            className={`${s.thumb} ${i === activeIdx ? s.thumbOn : ""} ${!t.url ? s.thumbEmpty : ""}`}
            onClick={() => t.url && setActiveIdx(i)}
            title={t.label}
            aria-label={t.label}
          >
            {t.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.url} alt={t.label} className={s.thumbImg} />
            ) : (
              <span className={s.thumbLabel}>{t.label.slice(0, 5)}</span>
            )}
          </button>
        ))}
        {extra > 0 && (
          <div className={`${s.thumb} ${s.thumbMore}`}>+{extra}</div>
        )}
      </div>
    </div>
  );
}

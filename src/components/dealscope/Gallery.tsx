"use client";

import { useState } from "react";

export interface GalleryItem {
  label: string;
  source: string;
  url?: string;
  downloadUrl?: string;
}

interface GalleryProps {
  items: GalleryItem[];
  title?: string;
}

export function Gallery({ items, title = "Images & documents" }: GalleryProps) {
  if (!items.length) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3,#555566)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 5, marginBottom: 12 }}>
        {items.map((item, i) => (
          <GalleryCell key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function GalleryCell({ item }: { item: GalleryItem }) {
  const [hovered, setHovered] = useState(false);

  const bg = item.url
    ? `url(${item.url}) center/cover no-repeat`
    : "linear-gradient(135deg,var(--s2,#15151e),var(--s3,#1f1f2c))";

  return (
    <div
      style={{
        height: 78,
        background: bg,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tx3,#555566)",
        fontSize: 9,
        cursor: "pointer",
        border: `1.5px solid ${hovered ? "var(--acc,#7c6af0)" : "transparent"}`,
        position: "relative",
        overflow: "hidden",
        transition: ".2s",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,.3)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!item.url && <span>{item.label}</span>}
      <span style={{ position: "absolute", bottom: 2, left: 2, fontSize: 7, background: "rgba(0,0,0,.7)", color: "#fff", padding: "1px 4px", borderRadius: 2 }}>
        {item.source}
      </span>
      {item.downloadUrl && (
        <a
          href={item.downloadUrl}
          download
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: 2, right: 2, fontSize: 7, background: "var(--acc,#7c6af0)", color: "#fff", padding: "1px 4px", borderRadius: 2, cursor: "pointer", opacity: hovered ? 1 : 0, transition: ".2s", textDecoration: "none" }}
        >
          ↓
        </a>
      )}
    </div>
  );
}

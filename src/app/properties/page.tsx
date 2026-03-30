"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

interface Asset {
  id: string;
  name: string;
  address: string;
  postcode: string;
  country: string;
  epcRating: string | null;
  epcExpiry: string | null;
  latitude: number;
  longitude: number;
  satelliteUrl: string;
  createdAt: string;
}

export default function PropertiesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await fetch("/api/user/assets");
        const data = await res.json();
        setAssets(data.assets || []);
      } catch (err) {
        console.error("Failed to load assets:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAssets();
  }, []);

  const countryName = (code: string) => (code === "GB" || code === "UK" ? "United Kingdom" : "United States");

  return (
    <AppShell>
      <TopBar />
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 32px 80px" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--tx)", marginBottom: "4px" }}>Properties</h1>
          <p style={{ fontSize: "14px", color: "var(--tx2)" }}>
            {loading ? "Loading..." : assets.length === 0 ? "No properties yet" : `${assets.length} propert${assets.length === 1 ? "y" : "ies"}`}
          </p>
        </div>

        {/* Add Property Button */}
        {!loading && assets.length > 0 && (
          <Link
            href="/properties/add"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              background: "var(--acc)",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "24px",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Add property
          </Link>
        )}

        {/* Properties List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--tx3)" }}>
            Loading properties...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ background: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: "10px", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "var(--tx2)", marginBottom: "16px" }}>No properties added yet</p>
            <Link
              href="/properties/add"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                background: "var(--acc)",
                color: "#fff",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Add your first property
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1px",
              background: "var(--bdr)",
              border: "1px solid var(--bdr)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {assets.map((asset) => (
              <Link
                key={asset.id}
                href={`/properties/${asset.id}`}
                style={{
                  background: "var(--s1)",
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  alignItems: "center",
                  gap: "16px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.1s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--s1)")}
              >
                {/* Name & Address */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--tx)", marginBottom: "4px" }}>{asset.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--tx3)" }}>{asset.address}</div>
                </div>

                {/* Country */}
                <div style={{ fontSize: "12px", color: "var(--tx2)", textAlign: "right" }}>
                  {countryName(asset.country)}
                </div>

                {/* EPC/Energy Rating (if UK) */}
                {asset.country === "GB" || asset.country === "UK" ? (
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx)", textAlign: "right", minWidth: "40px" }}>
                    {asset.epcRating ? `EPC ${asset.epcRating}` : "—"}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--tx3)", textAlign: "right" }}>—</div>
                )}

                {/* Arrow */}
                <div style={{ fontSize: "12px", color: "var(--tx3)" }}>→</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

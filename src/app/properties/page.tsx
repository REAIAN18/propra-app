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
      <TopBar title="Properties" />
      <main className="flex-1 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--tx)" }}>Properties</h1>
          <p className="text-sm" style={{ color: "var(--tx2)" }}>
            {loading ? "Loading..." : assets.length === 0 ? "No properties yet" : `${assets.length} propert${assets.length === 1 ? "y" : "ies"}`}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--tx3)" }}>
            Loading properties...
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            <p className="mb-4" style={{ color: "var(--tx2)" }}>No properties added yet</p>
            <Link
              href="/properties/add"
              className="inline-block px-4 py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--acc)", color: "#fff" }}
            >
              Add your first property
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--s1)", border: "1px solid var(--bdr)" }}>
            {/* Header row */}
            <div className="hidden lg:grid px-5 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ gridTemplateColumns: "2fr 1fr 1fr auto", color: "var(--tx3)", borderBottom: "1px solid var(--bdr)", backgroundColor: "var(--s2)" }}>
              <span>Property</span>
              <span>Country</span>
              <span>EPC</span>
              <span className="text-right">Action</span>
            </div>

            {/* Asset rows */}
            <div style={{ borderColor: "var(--bdr)" }}>
              {assets.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/properties/${asset.id}`}
                  className="px-5 py-4 lg:grid transition-colors hover:bg-[var(--s2)] block"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "center", borderBottom: "1px solid var(--bdr-lt)", textDecoration: "none" }}
                >
                  {/* Name & Address */}
                  <div className="mb-2 lg:mb-0">
                    <div className="font-semibold text-sm" style={{ color: "var(--tx)" }}>
                      {asset.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                      {asset.address}
                    </div>
                  </div>

                  {/* Country */}
                  <div className="text-xs lg:block" style={{ color: "var(--tx2)" }}>
                    {countryName(asset.country)}
                  </div>

                  {/* EPC/Energy Rating (if UK) */}
                  <div className="text-xs lg:block" style={{ color: asset.epcRating ? "var(--tx)" : "var(--tx3)" }}>
                    {asset.country === "GB" || asset.country === "UK" ? (asset.epcRating ? `EPC ${asset.epcRating}` : "—") : "—"}
                  </div>

                  {/* Arrow */}
                  <div className="text-right text-xs" style={{ color: "var(--tx3)" }}>→</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

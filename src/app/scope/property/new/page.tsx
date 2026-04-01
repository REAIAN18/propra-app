"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import s from "../dossier.module.css";

type ExtractedData = {
  address?: string;
  price?: number;
  currency?: string;
  images: string[];
  raw?: Record<string, unknown>;
};

export default function NewPropertyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    address: "",
    assetType: "Industrial",
    price: 0,
    source: "",
  });

  useEffect(() => {
    if (!url) return;

    const fetchExtracted = async () => {
      try {
        const response = await fetch("/api/scope/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to extract URL");
          setExtracted(data.extracted || null);
        } else {
          const data = await response.json();
          setExtracted(data);
          setFormData({
            address: data.address || "",
            assetType: "Industrial",
            price: data.price || 0,
            source: data.source || "",
          });
        }
      } catch (err) {
        setError(`Failed to extract URL: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchExtracted();
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.address.trim()) {
      setError("Address is required");
      return;
    }

    try {
      // Create new property in database
      const response = await fetch("/api/scope/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formData.address,
          assetType: formData.assetType,
          askingPrice: formData.price,
          sourceTag: formData.source || "URL",
          sourceUrl: url,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create property");
      }

      const created = await response.json();
      router.push(`/scope/property/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create property");
    }
  };

  return (
    <AppShell>
      <div className={s.container}>
        <div className={s.header}>
          <Link href="/scope" className={s.back}>
            ← Back
          </Link>
          <h1>Add Property from URL</h1>
        </div>

        {loading && <div className={s.loading}>Extracting property data...</div>}

        {error && (
          <div className={s.error}>
            <p>{error}</p>
            {extracted && <p className={s.hint}>Review the extracted data below and fill in any missing details.</p>}
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSubmit} className={s.form}>
            <div className={s.formGroup}>
              <label htmlFor="address">Address *</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Property address"
                className={s.input}
                required
              />
            </div>

            <div className={s.formGroup}>
              <label htmlFor="assetType">Asset Type</label>
              <select
                id="assetType"
                value={formData.assetType}
                onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                className={s.input}
              >
                <option>Industrial</option>
                <option>Office</option>
                <option>Retail</option>
                <option>Mixed Use</option>
                <option>Other</option>
              </select>
            </div>

            <div className={s.formGroup}>
              <label htmlFor="price">Asking Price (£)</label>
              <input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className={s.input}
              />
            </div>

            <div className={s.formGroup}>
              <label htmlFor="source">Source</label>
              <input
                id="source"
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Auction.com"
                className={s.input}
              />
            </div>

            {url && (
              <div className={s.formGroup}>
                <label>Source URL</label>
                <p className={s.urlDisplay}>{url}</p>
              </div>
            )}

            {extracted?.images && extracted.images.length > 0 && (
              <div className={s.formGroup}>
                <label>Images ({extracted.images.length})</label>
                <div className={s.imagePreview}>
                  {extracted.images.slice(0, 4).map((img, idx) => (
                    <img key={idx} src={img} alt={`Preview ${idx + 1}`} className={s.previewImg} />
                  ))}
                </div>
              </div>
            )}

            <div className={s.formActions}>
              <button type="submit" className={s.submitBtn}>
                Create Property
              </button>
              <Link href="/scope" className={s.cancelBtn}>
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

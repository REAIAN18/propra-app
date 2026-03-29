"use client";

import { useState, useEffect } from "react";

type AcquisitionStrategy = {
  id: string;
  name: string | null;
  targetTypes: string[];
  targetGeography: string[];
  minYield: number | null;
  maxYield: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  currency: string;
};

type StrategyEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  strategy: AcquisitionStrategy | null;
  onSave: () => void;
};

const ASSET_TYPES = [
  "industrial",
  "warehouse",
  "office",
  "retail",
  "flex",
  "mixed",
];

const GEOGRAPHIES = [
  { value: "FL", label: "Florida" },
  { value: "SE_UK", label: "SE England" },
  { value: "London", label: "London" },
  { value: "Tampa", label: "Tampa" },
  { value: "Orlando", label: "Orlando" },
  { value: "Jacksonville", label: "Jacksonville" },
  { value: "Miami", label: "Miami" },
];

export function StrategyEditorModal({
  isOpen,
  onClose,
  strategy,
  onSave,
}: StrategyEditorModalProps) {
  const [name, setName] = useState("");
  const [targetTypes, setTargetTypes] = useState<string[]>([]);
  const [targetGeography, setTargetGeography] = useState<string[]>([]);
  const [minYield, setMinYield] = useState("");
  const [maxYield, setMaxYield] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [maxSqft, setMaxSqft] = useState("");
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const [saving, setSaving] = useState(false);

  // Load strategy data when modal opens
  useEffect(() => {
    if (isOpen && strategy) {
      setName(strategy.name || "");
      setTargetTypes(strategy.targetTypes || []);
      setTargetGeography(strategy.targetGeography || []);
      setMinYield(strategy.minYield?.toString() || "");
      setMaxYield(strategy.maxYield?.toString() || "");
      setMinPrice(strategy.minPrice?.toString() || "");
      setMaxPrice(strategy.maxPrice?.toString() || "");
      setMinSqft(strategy.minSqft?.toString() || "");
      setMaxSqft(strategy.maxSqft?.toString() || "");
      setCurrency(strategy.currency as "USD" | "GBP");
    } else if (isOpen && !strategy) {
      // Reset for new strategy
      setName("");
      setTargetTypes([]);
      setTargetGeography([]);
      setMinYield("6");
      setMaxYield("");
      setMinPrice("1000000");
      setMaxPrice("12000000");
      setMinSqft("5000");
      setMaxSqft("50000");
      setCurrency("USD");
    }
  }, [isOpen, strategy]);

  const toggleType = (type: string) => {
    setTargetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleGeography = (geo: string) => {
    setTargetGeography((prev) =>
      prev.includes(geo) ? prev.filter((g) => g !== geo) : [...prev, geo]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/acquisition-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          targetTypes,
          targetGeography,
          minYield: minYield ? parseFloat(minYield) : null,
          maxYield: maxYield ? parseFloat(maxYield) : null,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          minSqft: minSqft ? parseInt(minSqft) : null,
          maxSqft: maxSqft ? parseInt(maxSqft) : null,
          currency,
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        alert("Failed to save strategy");
      }
    } catch (error) {
      console.error("Error saving strategy:", error);
      alert("Failed to save strategy");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg)] border border-[var(--bdr)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="border-b border-[var(--bdr)] p-5 flex items-center justify-between sticky top-0 bg-[var(--bg)] z-10">
          <div>
            <h2 className="text-[18px] font-serif font-normal text-[var(--tx)] mb-1">
              Define Acquisition Strategy
            </h2>
            <p className="text-[12px] text-[var(--tx3)]">
              Set your target criteria to filter and score deals
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--tx3)] hover:text-[var(--tx)] text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Strategy Name */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
              Strategy Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., FL Industrial"
              className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
            />
          </div>

          {/* Asset Types */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--tx2)] mb-3">
              Target Asset Types
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    targetTypes.includes(type)
                      ? "bg-[var(--acc)] text-white"
                      : "bg-[var(--s1)] text-[var(--tx2)] border border-[var(--bdr)] hover:border-[var(--tx3)]"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Geography */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--tx2)] mb-3">
              Target Geography
            </label>
            <div className="flex flex-wrap gap-2">
              {GEOGRAPHIES.map((geo) => (
                <button
                  key={geo.value}
                  onClick={() => toggleGeography(geo.value)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    targetGeography.includes(geo.value)
                      ? "bg-[var(--acc)] text-white"
                      : "bg-[var(--s1)] text-[var(--tx2)] border border-[var(--bdr)] hover:border-[var(--tx3)]"
                  }`}
                >
                  {geo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
              Currency
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency("USD")}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  currency === "USD"
                    ? "bg-[var(--acc)] text-white"
                    : "bg-[var(--s1)] text-[var(--tx2)] border border-[var(--bdr)] hover:border-[var(--tx3)]"
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency("GBP")}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  currency === "GBP"
                    ? "bg-[var(--acc)] text-white"
                    : "bg-[var(--s1)] text-[var(--tx2)] border border-[var(--bdr)] hover:border-[var(--tx3)]"
                }`}
              >
                GBP (£)
              </button>
            </div>
          </div>

          {/* Yield Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Min Yield (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={minYield}
                onChange={(e) => setMinYield(e.target.value)}
                placeholder="e.g., 6.0"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Max Yield (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={maxYield}
                onChange={(e) => setMaxYield(e.target.value)}
                placeholder="e.g., 10.0"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Min Price
              </label>
              <input
                type="number"
                step="100000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g., 1000000"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Max Price
              </label>
              <input
                type="number"
                step="100000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g., 12000000"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
          </div>

          {/* Sqft Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Min Sqft
              </label>
              <input
                type="number"
                step="1000"
                value={minSqft}
                onChange={(e) => setMinSqft(e.target.value)}
                placeholder="e.g., 5000"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--tx2)] mb-2">
                Max Sqft
              </label>
              <input
                type="number"
                step="1000"
                value={maxSqft}
                onChange={(e) => setMaxSqft(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-4 py-2.5 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[14px] text-[var(--tx)] outline-none focus:border-[var(--acc-bdr)]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--bdr)] p-5 flex items-center justify-end gap-3 sticky bottom-0 bg-[var(--bg)]">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[var(--acc)] text-white border-none rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}

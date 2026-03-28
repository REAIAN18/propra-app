"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

interface Asset {
  id: string;
  name: string;
  assetType: string;
  location: string;
  address: string | null;
  postcode: string | null;
  country: string | null;
  sqft: number | null;
  grossIncome: number | null;
  netIncome: number | null;
  passingRent: number | null;
  marketERV: number | null;
  insurancePremium: number | null;
  energyCost: number | null;
  occupancy: number | null;
}

interface Props {
  asset: Asset;
}

function parseCurrency(v: string): number | null {
  const cleaned = v.replace(/[$£,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

function parseFloat2(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function CurrencyInput({
  label,
  value,
  onChange,
  sym,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sym: string;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "var(--tx3)" }}>
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "var(--tx2)" }}
        >
          {sym}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1"
          style={{
            backgroundColor: "#132030",
            border: "1px solid #1E3448",
            color: "var(--s2)",
          }}
          placeholder="0"
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "var(--tx3)" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1"
        style={{
          backgroundColor: "#132030",
          border: "1px solid #1E3448",
          color: "var(--s2)",
        }}
      />
    </div>
  );
}

export function AssetEditForm({ asset }: Props) {
  const router = useRouter();
  const sym = asset.country === "US" ? "$" : "£";

  const [name, setName] = useState(asset.name);
  const [assetType, setAssetType] = useState(asset.assetType);
  const [location, setLocation] = useState(asset.location);
  const [address, setAddress] = useState(asset.address ?? "");
  const [postcode, setPostcode] = useState(asset.postcode ?? "");
  const [sqft, setSqft] = useState(asset.sqft?.toString() ?? "");
  const [grossIncome, setGrossIncome] = useState(
    asset.grossIncome?.toString() ?? ""
  );
  const [netIncome, setNetIncome] = useState(
    asset.netIncome?.toString() ?? ""
  );
  const [passingRent, setPassingRent] = useState(
    asset.passingRent?.toString() ?? ""
  );
  const [marketERV, setMarketERV] = useState(
    asset.marketERV?.toString() ?? ""
  );
  const [insurancePremium, setInsurancePremium] = useState(
    asset.insurancePremium?.toString() ?? ""
  );
  const [energyCost, setEnergyCost] = useState(
    asset.energyCost?.toString() ?? ""
  );
  const [occupancy, setOccupancy] = useState(
    asset.occupancy?.toString() ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: name.trim() || asset.name,
      assetType: assetType.trim() || asset.assetType,
      location: location.trim() || asset.location,
    };
    if (address.trim()) payload.address = address.trim();
    if (postcode.trim()) payload.postcode = postcode.trim();

    const sqftN = parseInt(sqft.replace(/,/g, ""), 10);
    if (!isNaN(sqftN)) payload.sqft = sqftN;

    const gi = parseCurrency(grossIncome);
    if (gi !== null) payload.grossIncome = gi;
    const ni = parseCurrency(netIncome);
    if (ni !== null) payload.netIncome = ni;
    const pr = parseCurrency(passingRent);
    if (pr !== null) payload.passingRent = pr;
    const merv = parseCurrency(marketERV);
    if (merv !== null) payload.marketERV = merv;
    const ins = parseCurrency(insurancePremium);
    if (ins !== null) payload.insurancePremium = ins;
    const ec = parseCurrency(energyCost);
    if (ec !== null) payload.energyCost = ec;
    const occ = parseFloat2(occupancy);
    if (occ !== null) payload.occupancy = Math.min(100, Math.max(0, occ));

    try {
      const res = await fetch(`/api/user/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Failed to save");
        setSaving(false);
        return;
      }

      router.push(`/assets/${asset.id}`);
    } catch {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  const sectionCard = "rounded-xl p-5 space-y-4";
  const sectionStyle = { backgroundColor: "#0F1E2E", border: "1px solid #1E3448" };

  return (
    <AppShell>
      <TopBar title="Edit Property" />
      <main className="flex-1 p-4 lg:p-6 space-y-4 max-w-2xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tx3)" }}>
          <Link href="/dashboard" className="hover:opacity-70">Dashboard</Link>
          <span>›</span>
          <Link href={`/assets/${asset.id}`} className="hover:opacity-70">{asset.name}</Link>
          <span>›</span>
          <span style={{ color: "var(--s2)" }}>Edit</span>
        </div>

        {/* Property Info */}
        <div className={sectionCard} style={sectionStyle}>
          <div className="text-sm font-medium mb-1" style={{ color: "var(--s2)" }}>
            Property info
          </div>
          <TextInput label="Name" value={name} onChange={setName} placeholder={asset.name} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--tx3)" }}>
                Asset type
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "#132030",
                  border: "1px solid #1E3448",
                  color: "var(--s2)",
                }}
              >
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="industrial">Industrial</option>
                <option value="mixed_use">Mixed Use</option>
                <option value="residential">Residential</option>
              </select>
            </div>
            <TextInput label="Location / City" value={location} onChange={setLocation} />
          </div>
          <TextInput label="Full address" value={address} onChange={setAddress} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Postcode" value={postcode} onChange={setPostcode} />
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--tx3)" }}>Floor area (sqft)</label>
              <input
                type="text"
                inputMode="numeric"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "#132030",
                  border: "1px solid #1E3448",
                  color: "var(--s2)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Income */}
        <div className={sectionCard} style={sectionStyle}>
          <div className="text-sm font-medium mb-1" style={{ color: "var(--s2)" }}>
            Income
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Gross income / yr" value={grossIncome} onChange={setGrossIncome} sym={sym} />
            <CurrencyInput label="Net income / yr" value={netIncome} onChange={setNetIncome} sym={sym} />
            <CurrencyInput label="Passing rent / yr" value={passingRent} onChange={setPassingRent} sym={sym} />
            <CurrencyInput label="Market ERV / yr" value={marketERV} onChange={setMarketERV} sym={sym} />
          </div>
        </div>

        {/* Costs */}
        <div className={sectionCard} style={sectionStyle}>
          <div className="text-sm font-medium mb-1" style={{ color: "var(--s2)" }}>
            Costs
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Insurance premium / yr" value={insurancePremium} onChange={setInsurancePremium} sym={sym} />
            <CurrencyInput label="Energy cost / yr" value={energyCost} onChange={setEnergyCost} sym={sym} />
          </div>
        </div>

        {/* Occupancy */}
        <div className={sectionCard} style={sectionStyle}>
          <div className="text-sm font-medium mb-1" style={{ color: "var(--s2)" }}>
            Occupancy
          </div>
          <div className="max-w-[160px]">
            <label className="block text-xs mb-1.5" style={{ color: "var(--tx3)" }}>Occupancy %</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={occupancy}
                onChange={(e) => setOccupancy(e.target.value)}
                placeholder="0–100"
                className="w-full pl-3 pr-7 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "#132030",
                  border: "1px solid #1E3448",
                  color: "var(--s2)",
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--tx2)" }}>%</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "#3B0A0A", border: "1px solid #7F1D1D", color: "#FCA5A5" }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#7c6af0", color: "#fff" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/assets/${asset.id}`}
            className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-70"
            style={{ backgroundColor: "#132030", color: "var(--tx3)", border: "1px solid #1E3448" }}
          >
            Cancel
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

type AssetForm = {
  name: string;
  address: string;
  type: string;
  sqft: string;
  valuation: string;
  occupancy: string;
  annualRent: string;
  insurancePremium: string;
  energyCost: string;
};

const BLANK_ASSET: AssetForm = {
  name: "",
  address: "",
  type: "office",
  sqft: "",
  valuation: "",
  occupancy: "95",
  annualRent: "",
  insurancePremium: "",
  energyCost: "",
};

const ASSET_TYPES = [
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "industrial", label: "Industrial" },
  { value: "warehouse", label: "Warehouse" },
  { value: "mixed", label: "Mixed Use" },
  { value: "flex", label: "Flex / Tech" },
];

const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all";
const inputStyle = { backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" };

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"basics" | "assets" | "submitting">("basics");
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");

  useEffect(() => {
    const c = searchParams.get("company");
    if (c) setCompanyName(c);
    if (searchParams.get("currency") === "GBP") setCurrency("GBP");
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [assets, setAssets] = useState<AssetForm[]>([{ ...BLANK_ASSET }]);
  const [error, setError] = useState("");

  const sym = currency === "GBP" ? "£" : "$";

  function updateAsset(idx: number, field: keyof AssetForm, value: string) {
    setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }

  function addAsset() {
    setAssets((prev) => [...prev, { ...BLANK_ASSET }]);
  }

  function removeAsset(idx: number) {
    if (assets.length <= 1) return;
    setAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError("");
    if (!companyName.trim()) { setError("Company name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (assets.some((a) => !a.address.trim())) { setError("Each asset needs an address."); return; }

    setStep("submitting");

    const payload = {
      companyName: companyName.trim(),
      currency,
      email: email.trim(),
      assets: assets.map((a) => ({
        name: a.name || a.address.split(",")[0],
        address: a.address,
        type: a.type,
        sqft: parseInt(a.sqft || "5000", 10),
        valuation: parseInt(a.valuation || "0", 10),
        occupancy: parseInt(a.occupancy || "95", 10),
        annualRent: parseInt(a.annualRent || "0", 10),
        insurancePremium: parseInt(a.insurancePremium || "0", 10),
        energyCost: parseInt(a.energyCost || "0", 10),
      })),
    };

    const res = await fetch("/api/portfolios/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const { urlKey } = await res.json();
      router.push(`/dashboard?portfolio=${urlKey}&welcome=1&company=${encodeURIComponent(companyName)}`);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Something went wrong.");
      setStep("assets");
    }
  }

  if (step === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#0B1622" }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1647E8", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "#5a7a96" }}>Building your portfolio…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 flex flex-col items-center" style={{ backgroundColor: "#0B1622" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#e8eef5", letterSpacing: "0.12em" }}>
            Arca
          </span>
        </div>

        {step === "basics" && (
          <div>
            <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
              Set up your portfolio
            </h1>
            <p className="text-sm mb-8" style={{ color: "#5a7a96" }}>
              Enter your details and Arca will analyse your portfolio — insurance savings, energy costs, income opportunities, and more.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#8ba0b8" }}>Company / Portfolio name</label>
                <input
                  type="text"
                  placeholder="Acme Holdings Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#8ba0b8" }}>Your email</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#8ba0b8" }}>Portfolio currency</label>
                <div className="flex gap-2">
                  {[{ value: "USD", label: "USD — US portfolios ($)" }, { value: "GBP", label: "GBP — UK portfolios (£)" }].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCurrency(c.value as "USD" | "GBP")}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: currency === c.value ? "#1647E822" : "#0d1825",
                        border: `1px solid ${currency === c.value ? "#1647E8" : "#1a2d45"}`,
                        color: currency === c.value ? "#1647E8" : "#8ba0b8",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs" style={{ color: "#f06040" }}>{error}</p>}

              <button
                onClick={() => {
                  if (!companyName.trim()) { setError("Company name is required."); return; }
                  if (!email.trim()) { setError("Email is required."); return; }
                  setError("");
                  setStep("assets");
                }}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#1647E8", color: "#fff" }}
              >
                Continue — add your assets →
              </button>

              <p className="text-xs text-center" style={{ color: "#3d5a72" }}>
                Already have a link?{" "}
                <Link href="/dashboard" style={{ color: "#5a7a96" }}>Go to dashboard →</Link>
              </p>
            </div>
          </div>
        )}

        {step === "assets" && (
          <div>
            <button
              onClick={() => setStep("basics")}
              className="text-xs mb-4 hover:opacity-70"
              style={{ color: "#5a7a96" }}
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
              Your assets
            </h1>
            <p className="text-sm mb-6" style={{ color: "#5a7a96" }}>
              Add your properties. Even rough figures are fine — Arca will benchmark them against market rates.
            </p>

            <div className="space-y-4">
              {assets.map((asset, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-5"
                  style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                      Asset {idx + 1}
                    </span>
                    {assets.length > 1 && (
                      <button
                        onClick={() => removeAsset(idx)}
                        className="text-xs hover:opacity-70"
                        style={{ color: "#f06040" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Asset name (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. HQ Office Building"
                        value={asset.name}
                        onChange={(e) => updateAsset(idx, "name", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Address *</label>
                      <input
                        type="text"
                        placeholder="123 High Street, London"
                        value={asset.address}
                        onChange={(e) => updateAsset(idx, "address", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Asset type</label>
                      <select
                        value={asset.type}
                        onChange={(e) => updateAsset(idx, "type", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      >
                        {ASSET_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Size (sq ft / sq m)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10000"
                        value={asset.sqft}
                        onChange={(e) => updateAsset(idx, "sqft", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Approx. valuation ({sym})</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000000"
                        value={asset.valuation}
                        onChange={(e) => updateAsset(idx, "valuation", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Annual rent / income ({sym})</label>
                      <input
                        type="number"
                        placeholder="e.g. 250000"
                        value={asset.annualRent}
                        onChange={(e) => updateAsset(idx, "annualRent", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Annual insurance premium ({sym})</label>
                      <input
                        type="number"
                        placeholder="e.g. 45000"
                        value={asset.insurancePremium}
                        onChange={(e) => updateAsset(idx, "insurancePremium", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: "#5a7a96" }}>Annual energy cost ({sym})</label>
                      <input
                        type="number"
                        placeholder="e.g. 32000"
                        value={asset.energyCost}
                        onChange={(e) => updateAsset(idx, "energyCost", e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addAsset}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: "#0d1825", border: "1px dashed #1a2d45", color: "#5a7a96" }}
              >
                + Add another asset
              </button>

              {error && <p className="text-xs" style={{ color: "#f06040" }}>{error}</p>}

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Build my portfolio analysis →
              </button>

              <p className="text-xs text-center" style={{ color: "#3d5a72" }}>
                Your data is private. Arca uses it to benchmark your costs against market rates and identify savings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0B1622" }}>
        <div className="text-sm" style={{ color: "#5a7a96" }}>Loading…</div>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}

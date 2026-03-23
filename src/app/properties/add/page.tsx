"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prediction {
  description: string;
  placeId: string;
}

interface AssessorData {
  propertyType: string | null;
  buildingClass: string | null;
  buildingSqft: number | null;
  landSqft: number | null;
  yearBuilt: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  assessedValueLand: number | null;
  assessedValueImprovement: number | null;
  assessedValueTotal: number | null;
  ownerName: string | null;
  numUnits: number | null;
  numBuildings: number | null;
}

interface GeoCandidate {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

interface LookupResult {
  lat: number | null;
  lng: number | null;
  isUK: boolean;
  epcRating: string | null;
  floorAreaSqm: number | null;
  floorAreaSqft: number | null;
  hasSatellite: boolean;
  boundaryPolygon: { lat: number; lng: number }[] | null;
  assessorData: AssessorData | null;
  candidates: GeoCandidate[];
}

type FlowState = "address" | "loading" | "confirm" | "email" | "type" | "saving" | "documents";

// ─── Document upload card types ───────────────────────────────────────────────

type UploadCardState = "idle" | "reading" | "fetching" | "done" | "error" | "skipped" | "manual";

interface InsuranceQuote {
  carrier: string;
  policyType: string;
  annualPremium: number;
  annualSaving: number;
  notes: string;
}

interface InsuranceResult {
  currentPremium: number;
  insurer: string | null;
  renewalDate: string | null;
  currency: string;
  quotes: InsuranceQuote[];
}

interface EnergyResult {
  supplier: string | null;
  annualSpend: number;
  unitRate: number | null;
  currency: string;
  bestRateLabel: string;
  annualSaving: number;
}

interface LeaseResult {
  tenantName: string | null;
  monthlyRent: number;
  currency: string;
  leaseEnd: string | null;
  leverageScore: number; // 0–10
  estimatedERV: number;
}

type CardResult = InsuranceResult | EnergyResult | LeaseResult;

interface DocCard {
  id: "insurance" | "energy" | "lease" | "other";
  uploadState: UploadCardState;
  result: CardResult | null;
  error: string;
  // manual entry fields
  manualPremium: string;
  manualSpend: string;
  manualRent: string;
}

type PropertyType = "Commercial" | "Residential" | "Mixed-Use";

// ─── Loading phases ───────────────────────────────────────────────────────────

const LOADING_PHASES = [
  { id: "geocoding",  label: "Geocoding address",        detail: "Resolving coordinates from address string" },
  { id: "boundary",   label: "Drawing property boundary", detail: "Fetching parcel polygon from cadastral data" },
  { id: "satellite",  label: "Loading satellite imagery", detail: "Fetching roof-view with boundary overlay" },
  { id: "assessor",   label: "County assessor lookup",    detail: "Fetching sale history, assessed value, building class" },
  { id: "epc",        label: "Fetching EPC / energy data", detail: "Checking energy performance certificate" },
  { id: "planning",   label: "Checking planning records", detail: "Searching permitted development history" },
];
const PHASE_DELAYS = [0, 600, 1200, 1800, 2400, 3000];

// ─── Property type config ─────────────────────────────────────────────────────

const PROPERTY_TYPES: { type: PropertyType; icon: string; description: string }[] = [
  { type: "Commercial",  icon: "🏢", description: "Office, retail, industrial" },
  { type: "Residential", icon: "🏠", description: "House, flat, HMO" },
  { type: "Mixed-Use",   icon: "🏗️", description: "Residential + commercial" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_CARDS: DocCard[] = [
  { id: "lease",     uploadState: "idle", result: null, error: "", manualPremium: "", manualSpend: "", manualRent: "" },
  { id: "insurance", uploadState: "idle", result: null, error: "", manualPremium: "", manualSpend: "", manualRent: "" },
  { id: "other",     uploadState: "idle", result: null, error: "", manualPremium: "", manualSpend: "", manualRent: "" },
];

export default function AddPropertyPage() {
  const router = useRouter();
  const { setPortfolioId } = useNav();
  const { data: session } = useSession();

  // Address input
  const [address, setAddress] = useState("");

  // Email capture step
  const [emailInput, setEmailInput] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flow state
  const [flow, setFlow] = useState<FlowState>("address");
  const [loadingPhase, setLoadingPhase] = useState<number>(0);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Result
  const [result, setResult] = useState<LookupResult | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [error, setError] = useState("");

  // Fetch error type (to differentiate timeout vs not-found)
  const [fetchErrorType, setFetchErrorType] = useState<"timeout" | "notfound" | null>(null);

  // Candidate picker (multiple geocoding results)
  const [showCandidatePicker, setShowCandidatePicker] = useState(false);

  // LoopNet listing enrichment (shown on confirm screen)
  const [loopnetListing, setLoopnetListing] = useState<{
    sourceLabel: string;
    brokerName: string | null;
    brokerFirm: string | null;
    listingUrl: string | null;
    listingType: string;
  } | null>(null);
  const [loopnetChecked, setLoopnetChecked] = useState(false);

  // Document upload cards
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [savedIsUK, setSavedIsUK] = useState(false);
  const [cards, setCards] = useState<DocCard[]>(INITIAL_CARDS);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { document.title = "Add Property — RealHQ"; }, []);

  // Fetch LoopNet listing when confirm screen appears
  useEffect(() => {
    if (flow !== "confirm" || !result || loopnetChecked) return;
    setLoopnetChecked(true);
    const params = new URLSearchParams();
    if (address) params.set("address", address);
    if (result.lat !== null) params.set("lat", String(result.lat));
    if (result.lng !== null) params.set("lng", String(result.lng));
    fetch(`/api/property/loopnet-listing?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) setLoopnetListing(data.listing);
      })
      .catch(() => {}); // fail silently
  }, [flow, result, address, loopnetChecked]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Autocomplete ────────────────────────────────────────────────────────────

  const fetchPredictions = useCallback(async (val: string) => {
    if (val.trim().length < 3) { setPredictions([]); setShowDropdown(false); return; }
    try {
      const res = await fetch(`/api/property/autocomplete?input=${encodeURIComponent(val.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setShowDropdown((data.predictions ?? []).length > 0);
      }
    } catch { /* ignore */ }
  }, []);

  function handleAddressChange(val: string) {
    setAddress(val);
    setError("");
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    autocompleteTimerRef.current = setTimeout(() => fetchPredictions(val), 300);
  }

  function handleSelectPrediction(desc: string) {
    setAddress(desc);
    setPredictions([]);
    setShowDropdown(false);
    triggerFetch(desc);
  }

  // ── Lookup ──────────────────────────────────────────────────────────────────

  function clearPhaseTimers() {
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
  }

  async function triggerFetch(addressStr: string) {
    const trimmed = addressStr.trim();
    if (!trimmed) return;
    setFlow("loading");
    setLoadingPhase(0);
    setError("");
    setFetchErrorType(null);
    setResult(null);
    setLoopnetListing(null);
    setLoopnetChecked(false);

    clearPhaseTimers();
    PHASE_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => setLoadingPhase(i), delay);
      phaseTimersRef.current.push(t);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`/api/property/lookup?address=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setLoadingPhase(LOADING_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult(data);
      setFlow("confirm");
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setFetchErrorType("timeout");
        setError("Data unavailable — we'll retry shortly");
      } else {
        setFetchErrorType("notfound");
        setError("We couldn't find that address — try postcode + street name");
      }
      setFlow("address");
    } finally {
      clearPhaseTimers();
    }
  }

  function handleFetchManual() {
    if (!address.trim()) return;
    setShowDropdown(false);
    triggerFetch(address);
  }

  async function fetchWithCoords(lat: number, lng: number) {
    setFlow("loading");
    setLoadingPhase(0);
    setError("");
    setFetchErrorType(null);
    setResult(null);
    setLoopnetListing(null);
    setLoopnetChecked(false);
    setShowCandidatePicker(false);

    clearPhaseTimers();
    PHASE_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => setLoadingPhase(i), delay);
      phaseTimersRef.current.push(t);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(
        `/api/property/lookup?address=${encodeURIComponent(address.trim())}&lat=${lat}&lng=${lng}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setLoadingPhase(LOADING_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult(data);
      setFlow("confirm");
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setFetchErrorType("timeout");
        setError("Data unavailable — we'll retry shortly");
      } else {
        setFetchErrorType("notfound");
        setError("We couldn't find that address — try postcode + street name");
      }
      setFlow("address");
    } finally {
      clearPhaseTimers();
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!result) return;
    setFlow("saving");
    try {
      const res = await fetch("/api/user/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: address.trim(),
          address: address.trim(),
          lat: result.lat,
          lng: result.lng,
          isUK: result.isUK,
          epcRating: result.epcRating,
          floorAreaSqm: result.floorAreaSqm,
          floorAreaSqft: result.floorAreaSqft,
          propertyType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolioId("user");
        setSavedAssetId(data.id ?? null);
        setSavedIsUK(result.isUK);
        setCards(INITIAL_CARDS);
        setFlow("documents");
      } else {
        setError("Could not save property. Please try again.");
        setFlow("confirm");
      }
    } catch {
      setError("Network error. Please try again.");
      setFlow("confirm");
    }
  }

  // ── Email capture handler ────────────────────────────────────────────────

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setEmailLoading(true);
    setEmailError("");
    try {
      // Capture lead (fire-and-forget emails)
      await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Sign in — creates account if new, opens session
      const result = await signIn("credentials", { email, redirect: false });
      if (result?.error) {
        setEmailError("Something went wrong. Please try again.");
        setEmailLoading(false);
        return;
      }
      setFlow("type");
    } catch {
      setEmailError("Network error. Please try again.");
      setEmailLoading(false);
    }
  }

  // ── Document upload card handlers ─────────────────────────────────────────

  function updateCard(id: DocCard["id"], patch: Partial<DocCard>) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  async function handleFileUpload(cardId: DocCard["id"], file: File) {
    updateCard(cardId, { uploadState: "reading", error: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (cardId === "insurance") formData.append("documentType", "insurance");
      if (cardId === "energy")    formData.append("documentType", "energy");

      if (cardId === "other") {
        // Generic upload — store the file, no structured extraction needed
        updateCard(cardId, { uploadState: "fetching" });
        const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
        if (res.ok) {
          updateCard(cardId, { uploadState: "done", result: null });
        } else {
          updateCard(cardId, { uploadState: "error", error: "Upload failed — please try again." });
        }
        return;
      }

      if (cardId === "lease") {
        // Use parse-lease endpoint
        updateCard(cardId, { uploadState: "fetching" });
        const res = await fetch("/api/documents/parse-lease", { method: "POST", body: formData });
        const data = await res.json();
        if (!data.ok || !data.extracted?.monthlyRent) {
          updateCard(cardId, { uploadState: "error", error: data.error ?? "We couldn't read that document — try a clearer scan, or enter details manually." });
          return;
        }
        const { monthlyRent, currency, leaseEnd, tenantName, sqft } = data.extracted;
        // Compute leverage score heuristic: based on days to lease end
        let leverageScore = 5;
        if (leaseEnd) {
          const daysLeft = Math.max(0, (new Date(leaseEnd).getTime() - Date.now()) / 86400000);
          if (daysLeft < 90) leverageScore = 9;
          else if (daysLeft < 180) leverageScore = 7;
          else if (daysLeft < 365) leverageScore = 5;
          else if (daysLeft < 730) leverageScore = 3;
          else leverageScore = 2;
        }
        const estimatedERV = monthlyRent ? Math.round(monthlyRent * (savedIsUK ? 1.12 : 1.08)) : 0;
        const leaseResult: LeaseResult = {
          tenantName: tenantName ?? null,
          monthlyRent: monthlyRent ?? 0,
          currency: currency ?? (savedIsUK ? "GBP" : "USD"),
          leaseEnd: leaseEnd ?? null,
          leverageScore,
          estimatedERV,
        };
        updateCard(cardId, { uploadState: "done", result: leaseResult });
        // Persist to DB if tenant name is available (save-lease requires it)
        if (tenantName && savedAssetId) {
          fetch("/api/documents/save-lease", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantName,
              monthlyRent,
              currency: currency ?? (savedIsUK ? "GBP" : "USD"),
              leaseEnd: leaseEnd ?? null,
              sqft: sqft ?? null,
              propertyAddress: address,
              assetId: savedAssetId,
            }),
          }).catch(() => {});
        }
        return;
      }

      // Insurance or Energy
      const parseRes = await fetch("/api/documents/parse-policy", { method: "POST", body: formData });
      const parseData = await parseRes.json();

      if (!parseData.ok) {
        updateCard(cardId, { uploadState: "error", error: parseData.error ?? "We couldn't read that document — try a clearer scan, or enter details manually." });
        return;
      }

      if (cardId === "energy") {
        const { annualSpend, unitRate, supplier, currency } = parseData.extracted;
        if (!annualSpend) {
          updateCard(cardId, { uploadState: "error", error: "We couldn't read that document — try a clearer scan, or enter details manually." });
          return;
        }
        // Best rate benchmarks
        const isUK = savedIsUK;
        const bestUnitRate = isUK ? 0.24 : 0.12; // p/kWh or $/kWh
        const currentUnitRate = unitRate ?? (isUK ? 0.34 : 0.18);
        const saving = annualSpend ? Math.round(annualSpend * (1 - bestUnitRate / currentUnitRate)) : 0;
        const energyResult: EnergyResult = {
          supplier: supplier ?? null,
          annualSpend,
          unitRate: currentUnitRate,
          currency: currency ?? (isUK ? "GBP" : "USD"),
          bestRateLabel: isUK ? "Octopus Energy — 24.1p/kWh" : "Constellation Energy — $0.12/kWh",
          annualSaving: Math.max(0, saving),
        };
        updateCard(cardId, { uploadState: "done", result: energyResult });
        return;
      }

      // Insurance: fetch quotes
      const { currentPremium, insurer, renewalDate, currency } = parseData.extracted;
      if (!currentPremium) {
        updateCard(cardId, { uploadState: "error", error: "We couldn't read that document — try a clearer scan, or enter details manually." });
        return;
      }

      updateCard(cardId, { uploadState: "fetching" });

      const quotesRes = await fetch("/api/quotes/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPremium, assetId: savedAssetId, location: address }),
      });
      const quotesData = await quotesRes.json();

      const quotes: InsuranceQuote[] = (quotesData.quotes ?? []).slice(0, 3).map((q: {
        carrier: string; policyType: string; annualPremium: number; annualSaving: number; notes: string;
      }) => ({
        carrier: q.carrier,
        policyType: q.policyType,
        annualPremium: q.annualPremium,
        annualSaving: q.annualSaving,
        notes: q.notes,
      }));

      const insuranceResult: InsuranceResult = {
        currentPremium,
        insurer: insurer ?? null,
        renewalDate: renewalDate ?? null,
        currency: currency ?? (savedIsUK ? "GBP" : "USD"),
        quotes,
      };
      updateCard(cardId, { uploadState: "done", result: insuranceResult });

    } catch {
      updateCard(cardId, { uploadState: "error", error: "Something went wrong — please try again." });
    }
  }

  async function handleManualInsurance(card: DocCard) {
    const premium = parseFloat(card.manualPremium);
    if (!premium || premium <= 0) return;
    updateCard(card.id, { uploadState: "fetching", error: "" });
    try {
      const quotesRes = await fetch("/api/quotes/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPremium: premium, assetId: savedAssetId, location: address }),
      });
      const quotesData = await quotesRes.json();
      const quotes: InsuranceQuote[] = (quotesData.quotes ?? []).slice(0, 3).map((q: {
        carrier: string; policyType: string; annualPremium: number; annualSaving: number; notes: string;
      }) => ({
        carrier: q.carrier, policyType: q.policyType,
        annualPremium: q.annualPremium, annualSaving: q.annualSaving, notes: q.notes,
      }));
      const insuranceResult: InsuranceResult = {
        currentPremium: premium, insurer: null, renewalDate: null,
        currency: savedIsUK ? "GBP" : "USD", quotes,
      };
      updateCard(card.id, { uploadState: "done", result: insuranceResult });
    } catch {
      updateCard(card.id, { uploadState: "error", error: "Could not fetch quotes. Please try again." });
    }
  }

  function handleManualEnergy(card: DocCard) {
    const spend = parseFloat(card.manualSpend);
    if (!spend || spend <= 0) return;
    const isUK = savedIsUK;
    const currentUnitRate = isUK ? 0.34 : 0.18;
    const bestUnitRate = isUK ? 0.24 : 0.12;
    const saving = Math.round(spend * (1 - bestUnitRate / currentUnitRate));
    const energyResult: EnergyResult = {
      supplier: null, annualSpend: spend, unitRate: currentUnitRate,
      currency: isUK ? "GBP" : "USD",
      bestRateLabel: isUK ? "Octopus Energy — 24.1p/kWh" : "Constellation Energy — $0.12/kWh",
      annualSaving: Math.max(0, saving),
    };
    updateCard(card.id, { uploadState: "done", result: energyResult });
  }

  function handleManualLease(card: DocCard) {
    const rent = parseFloat(card.manualRent);
    if (!rent || rent <= 0) return;
    const estimatedERV = Math.round(rent * (savedIsUK ? 1.12 : 1.08));
    const leaseResult: LeaseResult = {
      tenantName: null, monthlyRent: rent,
      currency: savedIsUK ? "GBP" : "USD",
      leaseEnd: null, leverageScore: 5, estimatedERV,
    };
    updateCard(card.id, { uploadState: "done", result: leaseResult });
  }

  function allCardsDone() {
    return cards.every(c => c.uploadState === "done" || c.uploadState === "skipped");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <TopBar title="Add Property" />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-start justify-center"
        style={{ backgroundColor: "#F3F4F6" }}
      >
        <div className="w-full max-w-md mt-8 space-y-4">

          {/* ── State: address entry ── */}
          {(flow === "address") && (
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0A8A4C" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" fill="#fff"/>
                    <circle cx="7" cy="5" r="1.5" fill="#0A8A4C"/>
                  </svg>
                </div>
                <h2 className="text-sm font-bold" style={{ color: "#111827" }}>Add a property</h2>
              </div>
              <p className="text-xs mb-4 ml-8" style={{ color: "#6B7280" }}>
                Enter any address — RealHQ auto-fetches satellite imagery, EPC certificate, and planning history.
              </p>

              {/* Input + autocomplete */}
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFetchManual(); if (e.key === "Escape") setShowDropdown(false); }}
                    onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
                    placeholder="e.g. SW1A 2AA or 123 Main St"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid #D1D5DB", color: "#111827", backgroundColor: "#fff" }}
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    onClick={handleFetchManual}
                    disabled={!address.trim()}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all whitespace-nowrap hover:opacity-90"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                  >
                    Fetch →
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                {showDropdown && predictions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                    style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.10)" }}
                  >
                    {predictions.map((p, i) => (
                      <button
                        key={p.placeId + i}
                        className="w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-gray-50 flex items-center gap-2"
                        style={{ color: "#111827", borderBottom: i < predictions.length - 1 ? "1px solid #F3F4F6" : undefined }}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(p.description); }}
                      >
                        <svg width="10" height="12" viewBox="0 0 10 14" fill="none" className="shrink-0">
                          <path d="M5 0C2.79 0 1 1.79 1 4c0 3.25 4 9 4 9s4-5.75 4-9c0-2.21-1.79-4-4-4z" fill="#9CA3AF"/>
                          <circle cx="5" cy="4" r="1.5" fill="#fff"/>
                        </svg>
                        <span className="truncate">{p.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-2">
                  <p className="text-xs" style={{ color: "#D93025" }}>{error}</p>
                  {fetchErrorType === "timeout" && (
                    <button
                      onClick={() => triggerFetch(address)}
                      className="mt-1.5 text-xs font-semibold underline"
                      style={{ color: "#1647E8" }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── State: loading ── */}
          {flow === "loading" && (
            <>
              {/* Keep input visible during load */}
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
              >
                <div className="text-xs font-semibold mb-0.5" style={{ color: "#111827" }}>
                  {address}
                </div>
                <div className="text-[10.5px]" style={{ color: "#9CA3AF" }}>Analysing…</div>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
              >
                <div className="px-4 py-3 text-xs font-semibold" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", color: "#6B7280" }}>
                  RealHQ is fetching live data…
                </div>
                {LOADING_PHASES.map((phase, i) => {
                  const isDone = i < loadingPhase;
                  const isActive = i === loadingPhase;
                  const isPending = i > loadingPhase;
                  return (
                    <div
                      key={phase.id}
                      className="flex items-center gap-3 px-4 py-3 transition-all duration-300"
                      style={{
                        borderBottom: i < LOADING_PHASES.length - 1 ? "1px solid #F3F4F6" : undefined,
                        opacity: isPending ? 0.35 : 1,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{ backgroundColor: isDone ? "#0A8A4C" : isActive ? "#1647E8" : "#E5E7EB" }}
                      >
                        {isDone ? (
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : isActive ? (
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#fff" }} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#9CA3AF" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color: isDone ? "#0A8A4C" : isActive ? "#111827" : "#9CA3AF" }}>
                          {phase.label}
                        </div>
                        {isActive && (
                          <div className="text-[10.5px] mt-0.5" style={{ color: "#9CA3AF" }}>{phase.detail}</div>
                        )}
                      </div>
                      {isDone && (
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: "#0A8A4C" }}>done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── State: confirm "Is this your property?" ── */}
          {flow === "confirm" && result && (() => {
            const ad = result.assessorData;
            // Derived metrics — only calculated when assessor data is available
            const pricePerSqft = (ad?.lastSalePrice && ad?.buildingSqft && ad.buildingSqft > 0)
              ? Math.round(ad.lastSalePrice / ad.buildingSqft) : null;
            const siteCoverage = (ad?.buildingSqft && ad?.landSqft && ad.landSqft > 0)
              ? Math.round((ad.buildingSqft / ad.landSqft) * 100) : null;
            const hasDevPotential = siteCoverage !== null && siteCoverage < 40;
            return (
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
              >
                {/* Satellite image + boundary overlay */}
                {result.hasSatellite && result.lat && result.lng ? (() => {
                  // If we have a polygon, center the map on its centroid and fit zoom to show it.
                  // This ensures the building outline is always visible regardless of where
                  // Nominatim geocoded the address (street vs. building centroid).
                  const poly = result.boundaryPolygon && result.boundaryPolygon.length >= 3
                    ? result.boundaryPolygon : null;
                  const mapCenter = poly
                    ? polyCenter(poly)
                    : { lat: result.lat, lng: result.lng };
                  const mapZoom = poly ? polyFitZoom(poly, 400, 180) : 18;
                  return (
                  <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/property/satellite?lat=${mapCenter.lat}&lng=${mapCenter.lng}&zoom=${mapZoom}`}
                      alt="Satellite view"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {/* Boundary polygon overlay */}
                    {poly && (
                      <BoundaryOverlay
                        polygon={poly}
                        lat={mapCenter.lat}
                        lng={mapCenter.lng}
                        zoom={mapZoom}
                        width={400}
                        height={180}
                      />
                    )}
                    {/* Satellite label */}
                    <div
                      className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: "rgba(0,0,0,.55)", color: "#fff", backdropFilter: "blur(4px)" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                      {result.boundaryPolygon ? "Boundary confirmed" : "Satellite confirmed"}
                    </div>
                    {/* EPC badge (UK) or energy star flag (US) */}
                    {result.isUK && result.epcRating ? (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-[11px] font-bold text-white"
                        style={{
                          backgroundColor: ["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A",
                        }}
                      >
                        EPC {result.epcRating}
                      </div>
                    ) : !result.isUK && ad?.buildingClass ? (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{ backgroundColor: "rgba(0,0,0,.6)", color: "#fff", backdropFilter: "blur(4px)" }}
                      >
                        Class {ad.buildingClass}
                      </div>
                    ) : null}
                  </div>
                  );
                })() : (
                  <div
                    className="flex items-center justify-center"
                    style={{ height: 80, backgroundColor: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}
                  >
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>📍 Location confirmed</span>
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div>
                    <div className="text-sm font-bold mb-0.5" style={{ color: "#111827" }}>
                      Is this your property?
                    </div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>{address}</div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: "#9CA3AF" }}>
                      {result.isUK ? "UK market · GBP" : "US market · USD"}
                    </div>
                  </div>

                  {/* Multiple geocoding candidates picker */}
                  {result.candidates && result.candidates.length > 1 && (
                    <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#92400E" }}>
                        We found {result.candidates.length} matches — is this the right one?
                      </div>
                      <div className="space-y-1">
                        {result.candidates.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => fetchWithCoords(c.lat, c.lng)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-xs transition-all hover:opacity-80"
                            style={{
                              backgroundColor: i === 0 && !showCandidatePicker ? "rgba(10,138,76,0.1)" : "#fff",
                              border: i === 0 && !showCandidatePicker ? "1px solid rgba(10,138,76,0.3)" : "1px solid #E5E7EB",
                              color: "#111827",
                            }}
                          >
                            <span className="font-medium">{c.type && `[${c.type}] `}</span>
                            {c.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Property detected row */}
                  {(ad?.propertyType || ad?.yearBuilt || ad?.buildingSqft || ad?.landSqft) && (
                    <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534" }}>
                      <span className="font-semibold">Property detected: </span>
                      {[
                        ad.propertyType,
                        ad.yearBuilt ? `Built ${ad.yearBuilt}` : null,
                        ad.buildingSqft ? `${ad.buildingSqft.toLocaleString()} sqft` : null,
                        ad.landSqft ? `${(ad.landSqft / 43560).toFixed(2)} ac land` : null,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  )}

                  {/* Core data rows */}
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
                    {/* EPC (UK) or Building class (US) */}
                    {result.isUK ? (
                      result.epcRating ? (
                        <DataRow
                          label="EPC Rating" value={result.epcRating} badge
                          badgeColor={["A","B"].includes(result.epcRating) ? "#0A8A4C" : ["E","F","G"].includes(result.epcRating) ? "#D93025" : "#F5A94A"}
                        />
                      ) : (
                        <DataRow label="EPC Rating" pending />
                      )
                    ) : (
                      ad?.buildingClass
                        ? <DataRow label="Building class / grade" value={`Class ${ad.buildingClass}`} />
                        : <DataRow label="Building class / grade" pending />
                    )}

                    {/* Floor area — from EPC (UK) or ATTOM (US) */}
                    {(result.floorAreaSqft || ad?.buildingSqft) ? (
                      <DataRow
                        label="Building size"
                        value={result.floorAreaSqft
                          ? `${result.floorAreaSqft.toLocaleString()} sqft · ${result.floorAreaSqm?.toLocaleString()} m²`
                          : `${ad!.buildingSqft!.toLocaleString()} sqft`}
                      />
                    ) : (
                      <DataRow label="Building size" pending />
                    )}

                    {/* Land area */}
                    {ad?.landSqft ? (
                      <DataRow label="Land / lot area" value={`${ad.landSqft.toLocaleString()} sqft · ${(ad.landSqft / 43560).toFixed(2)} ac`} />
                    ) : !result.isUK ? (
                      <DataRow label="Land / lot area" pending />
                    ) : null}

                    {/* Last sale */}
                    {ad?.lastSalePrice ? (
                      <DataRow label="Last sale" value={`${fmt$(ad.lastSalePrice)}${ad.lastSaleDate ? ` · ${ad.lastSaleDate.slice(0, 7)}` : ""}`} />
                    ) : !result.isUK ? (
                      <DataRow label="Last sale" pending />
                    ) : null}

                    {/* Assessed value */}
                    {ad?.assessedValueTotal ? (
                      <DataRow label="Assessed value" value={`${fmt$(ad.assessedValueTotal)}${ad.assessedValueLand ? ` · land ${fmt$(ad.assessedValueLand)}` : ""}`} />
                    ) : !result.isUK ? (
                      <DataRow label="Assessed value" pending />
                    ) : null}

                    {/* Derived: price per sqft */}
                    {pricePerSqft ? (
                      <DataRow label="Price per sqft" value={`$${pricePerSqft.toLocaleString()}`} />
                    ) : !result.isUK ? (
                      <DataRow label="Price per sqft" pending />
                    ) : null}

                    {/* Derived: site coverage */}
                    {siteCoverage !== null ? (
                      <DataRow
                        label="Site coverage"
                        value={`${siteCoverage}%${hasDevPotential ? " · Development potential identified" : ""}`}
                      />
                    ) : !result.isUK ? (
                      <DataRow label="Site coverage ratio" pending />
                    ) : null}

                    {/* Planning history */}
                    <DataRow label="Planning history" value="Fetched — view after adding" />
                  </div>

                  {/* LoopNet listing panel — shown if active listing found */}
                  {loopnetListing && (
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6366F1" }}>
                            LoopNet listing found
                          </div>
                          <div className="text-xs font-medium" style={{ color: "#111827" }}>
                            {loopnetListing.sourceLabel}
                          </div>
                          {(loopnetListing.brokerName || loopnetListing.brokerFirm) && (
                            <div className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                              Broker: {[loopnetListing.brokerName, loopnetListing.brokerFirm].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        {loopnetListing.listingUrl && (
                          <a
                            href={loopnetListing.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded"
                            style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "#6366F1" }}
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data sources */}
                  <div className="text-[10px] flex gap-2 flex-wrap" style={{ color: "#9CA3AF" }}>
                    <span>📍 OpenStreetMap / Nominatim</span>
                    {result.isUK && <span>· 🇬🇧 EPC Open Data</span>}
                    {!result.isUK && ad && <span>· 🏛️ ATTOM Data</span>}
                    {result.hasSatellite && <span>· 🛰️ Google Maps Satellite</span>}
                    {loopnetListing && <span>· 🏢 LoopNet</span>}
                  </div>

                  {/* CTA */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => session ? setFlow("type") : setFlow("email")}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                    >
                      Yes, that&rsquo;s it →
                    </button>
                    <button
                      onClick={() => { setFlow("address"); setResult(null); setAddress(""); setError(""); }}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100"
                      style={{ border: "1px solid #D1D5DB", color: "#374151", backgroundColor: "#fff" }}
                    >
                      Search again
                    </button>
                  </div>

                  {/* Not quite right? — expands candidate list even for single result */}
                  {(!result.candidates || result.candidates.length <= 1) && (
                    <div>
                      {!showCandidatePicker ? (
                        <button
                          onClick={() => setShowCandidatePicker(true)}
                          className="text-[11px] underline"
                          style={{ color: "#9CA3AF" }}
                        >
                          Not quite right?
                        </button>
                      ) : (
                        <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                            Try a different match
                          </div>
                          <p className="text-[11px]" style={{ color: "#6B7280" }}>
                            Only one geocoding result was found. Try searching with a more specific address or postcode.
                          </p>
                          <button
                            onClick={() => { setFlow("address"); setResult(null); setAddress(""); setError(""); setShowCandidatePicker(false); }}
                            className="text-xs font-medium underline"
                            style={{ color: "#0A8A4C" }}
                          >
                            Search with a different address →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {error && <p className="text-xs" style={{ color: "#D93025" }}>{error}</p>}
                </div>
              </div>
            );
          })()}

          {/* ── State: email capture ── */}
          {flow === "email" && (
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: "#111827" }}>Save your analysis</div>
              <div className="text-xs mb-5" style={{ color: "#6B7280" }}>Enter your email and we&apos;ll keep your data ready.</div>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@company.com"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ border: "1px solid #D1D5DB", color: "#111827", backgroundColor: "#F9FAFB" }}
                />
                {emailError && <div className="text-xs" style={{ color: "#EF4444" }}>{emailError}</div>}
                <button
                  type="submit"
                  disabled={emailLoading || !emailInput.trim()}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  {emailLoading ? "Saving…" : "Save and continue →"}
                </button>
              </form>
              <div className="mt-4 text-xs text-center" style={{ color: "#9CA3AF" }}>
                Already have an account?{" "}
                <Link href="/signin" className="underline hover:opacity-70" style={{ color: "#6B7280" }}>Sign in →</Link>
              </div>
            </div>
          )}

          {/* ── State: property type selector ── */}
          {flow === "type" && (
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: "#111827" }}>What type of property is it?</div>
              <p className="text-xs mb-5" style={{ color: "#6B7280" }}>
                This helps RealHQ benchmark against the right comparables.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {PROPERTY_TYPES.map(({ type, icon, description }) => (
                  <button
                    key={type}
                    onClick={() => setPropertyType(type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                    style={{
                      border: propertyType === type ? "2px solid #0A8A4C" : "1px solid #E5E7EB",
                      backgroundColor: propertyType === type ? "#F0FDF4" : "#fff",
                    }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-semibold" style={{ color: propertyType === type ? "#0A8A4C" : "#111827" }}>
                      {type}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: "#9CA3AF" }}>{description}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!propertyType}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Add to my portfolio →
                </button>
                <button
                  onClick={() => setFlow("confirm")}
                  className="px-4 py-3 rounded-lg text-sm transition-all hover:bg-gray-100"
                  style={{ border: "1px solid #D1D5DB", color: "#374151", backgroundColor: "#fff" }}
                >
                  ←
                </button>
              </div>
            </div>
          )}

          {/* ── State: saving ── */}
          {flow === "saving" && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
            >
              <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ backgroundColor: "#E8F5EE" }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>Adding to your portfolio…</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>Setting up dashboards and running opportunity scan</div>
            </div>
          )}

          {/* ── State: document upload cards ── */}
          {flow === "documents" && (
            <div className="space-y-3 pb-8">
              {/* Header */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "#111827" }}>Upload your documents</span>
                    </div>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      RealHQ reads your leases, insurance schedules, and certificates automatically. The more you upload, the more accurate your analysis.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard?added=1&welcome=1")}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: "#6B7280", border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}
                  >
                    Skip for now →
                  </button>
                </div>
              </div>

              {/* Upload cards */}
              {cards.map((card) => (
                <UploadCard
                  key={card.id}
                  card={card}
                  isUK={savedIsUK}
                  fileInputRef={(el) => { fileInputRefs.current[card.id] = el; }}
                  onFileSelect={(file) => handleFileUpload(card.id, file)}
                  onSkip={() => updateCard(card.id, { uploadState: "skipped" })}
                  onRetry={() => updateCard(card.id, { uploadState: "idle", error: "", result: null })}
                  onShowManual={() => updateCard(card.id, { uploadState: "manual", error: "" })}
                  onManualFieldChange={(field, val) => updateCard(card.id, { [field]: val } as Partial<DocCard>)}
                  onManualSubmitInsurance={() => handleManualInsurance(card)}
                  onManualSubmitEnergy={() => handleManualEnergy(card)}
                  onManualSubmitLease={() => handleManualLease(card)}
                />
              ))}

              {/* Go to dashboard */}
              <button
                onClick={() => router.push("/dashboard?added=1&welcome=1")}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: allCardsDone() ? "#0A8A4C" : "#374151", color: "#fff" }}
              >
                {allCardsDone() ? "Go to my portfolio →" : "Go to my portfolio →"}
              </button>
            </div>
          )}

          {/* Skip link */}
          {(flow === "address") && (
            <p className="text-center text-xs pb-8" style={{ color: "#9CA3AF" }}>
              Already have properties?{" "}
              <button onClick={() => router.push("/dashboard")} className="underline" style={{ color: "#6B7280" }}>
                Go to dashboard
              </button>
            </p>
          )}

        </div>
      </main>
    </AppShell>
  );
}

// ─── Upload card component ────────────────────────────────────────────────────

const CARD_CONFIG = {
  lease: {
    icon: "📄",
    title: "Lease schedule or individual leases",
    prompt: "Upload lease schedule (Excel, CSV, PDF) or individual lease PDFs — extracts tenants, rent, expiry dates automatically",
    timeLabel: "45 sec",
    accept: ".pdf,.xlsx,.xls,.csv",
    color: "#0A8A4C",
  },
  insurance: {
    icon: "🛡️",
    title: "Insurance schedule PDF",
    prompt: "Upload your current policy schedule — extracts premium, renewal date, and insured value",
    timeLabel: "60 sec",
    accept: ".pdf",
    color: "#F5A94A",
  },
  energy: {
    icon: "⚡",
    title: "Energy bill",
    prompt: "Upload a utility bill — see live tariff alternatives in 30 seconds",
    timeLabel: "30 sec",
    accept: ".pdf",
    color: "#1647E8",
  },
  other: {
    icon: "📁",
    title: "Any other documents",
    prompt: "Planning consents, surveys, energy certificates, fire risk assessments — upload anything relevant",
    timeLabel: null,
    accept: ".pdf,.doc,.docx,.xlsx,.xls,.csv,.png,.jpg",
    color: "#6B7280",
  },
};

function UploadCard({
  card,
  isUK,
  fileInputRef,
  onFileSelect,
  onSkip,
  onRetry,
  onShowManual,
  onManualFieldChange,
  onManualSubmitInsurance,
  onManualSubmitEnergy,
  onManualSubmitLease,
}: {
  card: DocCard;
  isUK: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileSelect: (file: File) => void;
  onSkip: () => void;
  onRetry: () => void;
  onShowManual: () => void;
  onManualFieldChange: (field: string, val: string) => void;
  onManualSubmitInsurance: () => void;
  onManualSubmitEnergy: () => void;
  onManualSubmitLease: () => void;
}) {
  const cfg = CARD_CONFIG[card.id];
  const currencySymbol = isUK ? "£" : "$";
  const localInputRef = useRef<HTMLInputElement | null>(null);

  function setInputRef(el: HTMLInputElement | null) {
    localInputRef.current = el;
    fileInputRef(el);
  }

  function triggerUpload() {
    localInputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  }

  // ── Skipped state ──
  if (card.uploadState === "skipped") {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
      >
        <span className="text-lg">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{cfg.title}</div>
          <div className="text-[10.5px]" style={{ color: "#D1D5DB" }}>Skipped — add later in {cfg.title.split(" ")[0]} section</div>
        </div>
        <button
          onClick={onRetry}
          className="text-[10.5px] underline shrink-0"
          style={{ color: "#9CA3AF" }}
        >
          Upload
        </button>
      </div>
    );
  }

  // ── Done state (no result — other/generic upload) ──
  if (card.uploadState === "done" && !card.result) {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold" style={{ color: "#111827" }}>{cfg.title}</div>
          <div className="text-[10.5px]" style={{ color: "#6B7280" }}>Uploaded — will be processed automatically</div>
        </div>
      </div>
    );
  }

  // ── Done state ──
  if (card.uploadState === "done" && card.result) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: "#111827" }}>{cfg.title}</span>
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#E8F5EE", color: "#0A8A4C" }}>
            analysed
          </span>
        </div>

        {/* Results */}
        {card.id === "insurance" && (() => {
          const r = card.result as InsuranceResult;
          return (
            <div className="p-4 space-y-3">
              <div className="text-[10.5px]" style={{ color: "#6B7280" }}>
                Current premium: <span className="font-semibold" style={{ color: "#111827" }}>
                  {currencySymbol}{r.currentPremium.toLocaleString()}/yr
                </span>
                {r.insurer && <> · {r.insurer}</>}
              </div>
              <div className="space-y-2">
                {r.quotes.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: i === 0 ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${i === 0 ? "#BBF7D0" : "#F3F4F6"}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{q.carrier}</div>
                      <div className="text-[10px] truncate" style={{ color: "#6B7280" }}>{q.policyType}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold" style={{ color: "#0A8A4C" }}>
                        Save {currencySymbol}{q.annualSaving.toLocaleString()}/yr
                      </div>
                      <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
                        {currencySymbol}{q.annualPremium.toLocaleString()}/yr
                      </div>
                    </div>
                    {i === 0 && (
                      <button
                        onClick={() => window.open("/insurance", "_self")}
                        className="text-[10px] font-semibold px-2 py-1 rounded shrink-0"
                        style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                      >
                        Get quote
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {card.id === "energy" && (() => {
          const r = card.result as EnergyResult;
          return (
            <div className="p-4 space-y-3">
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <span className="text-xs" style={{ color: "#6B7280" }}>Current{r.supplier ? ` · ${r.supplier}` : ""}</span>
                  <span className="text-xs font-semibold" style={{ color: "#111827" }}>
                    {currencySymbol}{r.annualSpend.toLocaleString()}/yr
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-green-50">
                  <span className="text-xs" style={{ color: "#6B7280" }}>{r.bestRateLabel}</span>
                  <span className="text-xs font-bold" style={{ color: "#0A8A4C" }}>
                    Save {currencySymbol}{r.annualSaving.toLocaleString()}/yr
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.open("/energy", "_self")}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#1647E8", color: "#fff" }}
              >
                Switch now →
              </button>
            </div>
          );
        })()}

        {card.id === "lease" && (() => {
          const r = card.result as LeaseResult;
          const scoreColor = r.leverageScore >= 7 ? "#0A8A4C" : r.leverageScore >= 4 ? "#F5A94A" : "#D93025";
          return (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: scoreColor, fontFamily: "DM Serif Display, serif" }}>
                    {r.leverageScore}/10
                  </div>
                  <div className="text-[10px]" style={{ color: "#9CA3AF" }}>leverage score</div>
                </div>
                <div className="flex-1 rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <span className="text-xs" style={{ color: "#6B7280" }}>Current rent</span>
                    <span className="text-xs font-semibold" style={{ color: "#111827" }}>
                      {currencySymbol}{r.monthlyRent.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs" style={{ color: "#6B7280" }}>Est. ERV</span>
                    <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                      {currencySymbol}{r.estimatedERV.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.open("/income", "_self")}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                View analysis →
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── Progress states ──
  if (card.uploadState === "reading" || card.uploadState === "fetching") {
    const label = card.id === "other"
      ? "Reading your documents — about 30 seconds"
      : card.uploadState === "reading" ? "Reading your document…" : "Fetching live rates…";
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold mb-1.5" style={{ color: "#111827" }}>{cfg.title}</div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
              <div
                className="h-full rounded-full animate-pulse"
                style={{ backgroundColor: "#0A8A4C", width: card.uploadState === "reading" ? "40%" : "75%" }}
              />
            </div>
            <div className="text-[10.5px] mt-1" style={{ color: "#9CA3AF" }}>{label}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (card.uploadState === "error") {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: "#fff", border: "1px solid #FEE2E2", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
      >
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">{cfg.icon}</span>
          <div className="flex-1">
            <div className="text-xs font-semibold mb-0.5" style={{ color: "#111827" }}>{cfg.title}</div>
            <div className="text-[10.5px]" style={{ color: "#D93025" }}>{card.error}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { triggerUpload(); onRetry(); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Try again
          </button>
          <button onClick={onSkip} className="px-3 py-1.5 text-xs" style={{ color: "#9CA3AF" }}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Manual entry state ──
  if (card.uploadState === "manual") {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className="text-xs font-semibold" style={{ color: "#111827" }}>{cfg.title} — enter manually</span>
        </div>

        {card.id === "insurance" && (
          <div className="space-y-2">
            <label className="text-[10.5px]" style={{ color: "#6B7280" }}>Annual premium ({isUK ? "£" : "$"})</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={isUK ? "e.g. 4800" : "e.g. 6500"}
                value={card.manualPremium}
                onChange={(e) => onManualFieldChange("manualPremium", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
              <button
                onClick={onManualSubmitInsurance}
                disabled={!card.manualPremium}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                Get quotes
              </button>
            </div>
          </div>
        )}

        {card.id === "energy" && (
          <div className="space-y-2">
            <label className="text-[10.5px]" style={{ color: "#6B7280" }}>Annual energy spend ({isUK ? "£" : "$"})</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={isUK ? "e.g. 12000" : "e.g. 18000"}
                value={card.manualSpend}
                onChange={(e) => onManualFieldChange("manualSpend", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
              <button
                onClick={onManualSubmitEnergy}
                disabled={!card.manualSpend}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                style={{ backgroundColor: "#1647E8", color: "#fff" }}
              >
                See alternatives
              </button>
            </div>
          </div>
        )}

        {card.id === "lease" && (
          <div className="space-y-2">
            <label className="text-[10.5px]" style={{ color: "#6B7280" }}>Monthly rent ({isUK ? "£" : "$"})</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={isUK ? "e.g. 3500" : "e.g. 5000"}
                value={card.manualRent}
                onChange={(e) => onManualFieldChange("manualRent", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ border: "1px solid #D1D5DB", color: "#111827" }}
              />
              <button
                onClick={onManualSubmitLease}
                disabled={!card.manualRent}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:opacity-90"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                View leverage
              </button>
            </div>
          </div>
        )}

        <button onClick={onSkip} className="text-[10.5px] underline" style={{ color: "#9CA3AF" }}>
          Skip for now
        </button>
      </div>
    );
  }

  // ── Idle state ──
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: "#111827" }}>{cfg.title}</span>
            {cfg.timeLabel && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
              >
                {cfg.timeLabel}
              </span>
            )}
          </div>
          <p className="text-[10.5px] mb-3" style={{ color: "#6B7280" }}>{cfg.prompt}</p>
          <div className="flex items-center gap-3">
            <input
              ref={setInputRef}
              type="file"
              accept={cfg.accept ?? ".pdf"}
              className="hidden"
              onChange={handleInputChange}
            />
            <button
              onClick={() => { triggerUpload(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: cfg.color, color: "#fff" }}
            >
              {cfg.accept && cfg.accept.includes(".xlsx") ? "Upload file" : "Upload PDF"}
            </button>
            <button
              onClick={onSkip}
              className="text-xs"
              style={{ color: "#9CA3AF" }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DataRow({
  label, value, badge, badgeColor, pending,
}: {
  label: string;
  value?: string;
  badge?: boolean;
  badgeColor?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #F9FAFB" }}>
      <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
      {pending ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>Pending data</span>
      ) : badge ? (
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: badgeColor }}>
          {value}
        </span>
      ) : (
        <span className="text-xs font-medium font-mono" style={{ color: "#111827" }}>{value}</span>
      )}
    </div>
  );
}

// Projects a lat/lng coordinate onto a 400×200px static satellite image
// given the image center lat/lng and zoom level 18 (Google Static Maps default).
function latLngToPixel(lat: number, lng: number, centerLat: number, centerLng: number, w: number, h: number, zoom = 18): [number, number] {
  const scale = 256 * Math.pow(2, zoom);
  const toX = (l: number) => ((l + 180) / 360) * scale;
  const toY = (l: number) => {
    const s = Math.sin((l * Math.PI) / 180);
    return ((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale);
  };
  const cx = toX(centerLng);
  const cy = toY(centerLat);
  return [
    w / 2 + (toX(lng) - cx),
    h / 2 + (toY(lat) - cy),
  ];
}

function polyCenter(poly: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const lat = poly.reduce((s, p) => s + p.lat, 0) / poly.length;
  const lng = poly.reduce((s, p) => s + p.lng, 0) / poly.length;
  return { lat, lng };
}

function polyFitZoom(poly: { lat: number; lng: number }[], w: number, h: number): number {
  const lats = poly.map(p => p.lat);
  const lngs = poly.map(p => p.lng);
  const dLng = Math.max(...lngs) - Math.min(...lngs);
  // Find highest zoom where the bounding box fits within 80% of the viewport
  for (let z = 20; z >= 14; z--) {
    const scale = 256 * Math.pow(2, z);
    const pxLng = (dLng / 360) * scale;
    const sMax = Math.sin((Math.max(...lats) * Math.PI) / 180);
    const mercNMax = Math.log((1 + sMax) / (1 - sMax)) / (4 * Math.PI);
    const sMin = Math.sin((Math.min(...lats) * Math.PI) / 180);
    const mercNMin = Math.log((1 + sMin) / (1 - sMin)) / (4 * Math.PI);
    const pxLat = Math.abs(mercNMax - mercNMin) * scale;
    if (pxLng < w * 0.8 && pxLat < h * 0.8) return z;
  }
  return 14;
}

function BoundaryOverlay({
  polygon, lat, lng, zoom = 18, width, height,
}: {
  polygon: { lat: number; lng: number }[];
  lat: number;
  lng: number;
  zoom?: number;
  width: number;
  height: number;
}) {
  if (polygon.length < 3) return null;
  const points = polygon
    .map((p) => latLngToPixel(p.lat, p.lng, lat, lng, width, height, zoom))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <polygon
        points={points}
        fill="rgba(10,138,76,0.15)"
        stroke="#0A8A4C"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString()}`;
}

"use client";

// Design source: 01-home-search-states.html (onboard-1, 2, 3)
//                05-onboarding-email-advanced.html (onboard-4, 5, done)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import s from "./onboarding.module.css";

const ASSET_TYPES = [
  "Industrial", "Warehouse", "Office", "Retail",
  "Mixed use", "Flex / light industrial", "Residential", "Development land",
];
const REGIONS = [
  "South East", "London", "Midlands", "North West", "North East",
  "South West", "East of England", "Scotland", "Wales",
];
const SIGNALS = [
  "Administration / receivership", "Auction listings", "MEES non-compliance",
  "Absent owner", "Probate / deceased estate", "Dissolved company",
  "Price reduction", "Planning application", "New listing",
];
const EXCLUSIONS = ["Listed buildings", "Flood zone 3", "Residential only"];

const STORAGE_KEY = "dealscope.onboarding.draft";

type Draft = {
  assets: string[];
  regions: string[];
  postcodes: string;
  signals: string[];
  exclusions: string[];
  mandateName: string;
};

function defaultDraft(): Draft {
  return {
    assets: [],
    regions: [],
    postcodes: "",
    signals: [],
    exclusions: [],
    mandateName: "",
  };
}

function loadDraft(): Draft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    return { ...defaultDraft(), ...JSON.parse(raw) };
  } catch {
    return defaultDraft();
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => loadDraft());
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const persist = (next: Draft) => {
    setDraft(next);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
  };

  const toggle = (key: keyof Draft, value: string) => {
    const cur = draft[key] as string[];
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    persist({ ...draft, [key]: next });
  };

  const totalSteps = 5;
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    if (i + 1 < step) return "done";
    if (i + 1 === step) return "on";
    return "";
  });

  const handleCreateMandate = async () => {
    if (saving) return;
    const name = (draft.mandateName || "My first mandate").trim();
    setSaving(true);
    try {
      const res = await fetch("/api/dealscope/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          criteria: {
            assetClasses: draft.assets,
            locations: draft.regions,
            postcodes: draft.postcodes ? draft.postcodes.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
            signals: draft.signals,
            exclusions: draft.exclusions,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedId(data.id ?? "ok");
        if (typeof window !== "undefined") {
          try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
        }
        setStep(6);
      }
    } catch (err) {
      console.error("Create mandate failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const skipToHome = () => router.push("/scope");

  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.container}>
          {step <= totalSteps && (
            <div className={s.progress}>
              {dots.map((state, i) => (
                <div key={i} className={`${s.dot} ${state ? s[state] : ""}`} />
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <div className={s.stepLabel}>Step 1 of 5</div>
              <h1 className={s.title}>What property types do you look at?</h1>
              <p className={s.desc}>Select all that apply. This helps us show relevant opportunities and filter out the noise.</p>
              <div className={s.chips}>
                {ASSET_TYPES.map((a) => (
                  <button key={a} className={`${s.chip} ${draft.assets.includes(a) ? s.on : ""}`} onClick={() => toggle("assets", a)}>{a}</button>
                ))}
              </div>
              <div className={s.actions}>
                <button className={s.btnS} onClick={skipToHome}>Skip for now</button>
                <button className={s.btnP} onClick={() => setStep(2)}>Next</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={s.stepLabel}>Step 2 of 5</div>
              <h1 className={s.title}>Where do you invest?</h1>
              <p className={s.desc}>Select regions you&apos;re active in. You can always search anywhere — this sets your default filters.</p>
              <div className={s.chips}>
                {REGIONS.map((r) => (
                  <button key={r} className={`${s.chip} ${draft.regions.includes(r) ? s.on : ""}`} onClick={() => toggle("regions", r)}>{r}</button>
                ))}
              </div>
              <div className={s.subSection}>
                <div className={s.subLabel}>Or enter specific postcodes</div>
                <input
                  className={s.textInput}
                  placeholder="e.g. ME2, SE1, W2…"
                  value={draft.postcodes}
                  onChange={(e) => persist({ ...draft, postcodes: e.target.value })}
                />
              </div>
              <div className={s.actions}>
                <button className={s.btnS} onClick={() => setStep(1)}>Back</button>
                <button className={s.btnP} onClick={() => setStep(3)}>Next</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className={s.stepLabel}>Step 3 of 5</div>
              <h1 className={s.title}>What signals interest you?</h1>
              <p className={s.desc}>These are the events that trigger opportunities — distressed sellers, compliance failures, upcoming auctions.</p>
              <div className={s.chips}>
                {SIGNALS.map((sig) => (
                  <button key={sig} className={`${s.chip} ${draft.signals.includes(sig) ? s.on : ""}`} onClick={() => toggle("signals", sig)}>{sig}</button>
                ))}
              </div>
              <div className={s.subSection}>
                <div className={s.subLabel}>Never show me properties that are:</div>
                <div className={s.chips}>
                  {EXCLUSIONS.map((e) => (
                    <button key={e} className={`${s.chip} ${s.danger} ${draft.exclusions.includes(e) ? s.on : ""}`} onClick={() => toggle("exclusions", e)}>{e}</button>
                  ))}
                </div>
              </div>
              <div className={s.actions}>
                <button className={s.btnS} onClick={() => setStep(2)}>Back</button>
                <button className={s.btnP} onClick={() => setStep(4)}>Next</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className={s.stepLabel}>Step 4 of 5</div>
              <h1 className={s.title}>Add your existing portfolio</h1>
              <p className={s.desc}>If you own properties already, adding them helps DealScope score new opportunities in the context of your portfolio. You can do this from Settings any time.</p>
              <div className={s.optionList}>
                <div className={s.option}>
                  <div className={s.optionIcon}>+</div>
                  <div>
                    <div className={s.optionTitle}>Add property manually</div>
                    <div className={s.optionDesc}>Enter address, type, and estimated value</div>
                  </div>
                </div>
                <div className={s.option}>
                  <div className={s.optionIcon}>↑</div>
                  <div>
                    <div className={s.optionTitle}>Upload CSV</div>
                    <div className={s.optionDesc}>Bulk import from spreadsheet</div>
                  </div>
                </div>
              </div>
              <div className={s.actions}>
                <button className={s.btnS} onClick={() => setStep(3)}>Back</button>
                <button className={s.btnP} onClick={() => setStep(5)}>Skip for now</button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className={s.stepLabel}>Step 5 of 5</div>
              <h1 className={s.title}>Create your first mandate</h1>
              <p className={s.desc}>Based on your preferences, we&apos;ve suggested a search. Give it a name and we&apos;ll start monitoring the market for you.</p>
              <div className={s.summaryCard}>
                <div className={s.subLabel}>Mandate name</div>
                <input
                  className={s.textInput}
                  value={draft.mandateName}
                  placeholder="e.g. SE Industrial <£800k"
                  onChange={(e) => persist({ ...draft, mandateName: e.target.value })}
                />
                <div className={s.subSection}>
                  <div className={s.cardT}>Auto-populated from your preferences</div>
                  <div className={s.dr}><span>Asset classes</span><span>{draft.assets.join(", ") || "—"}</span></div>
                  <div className={s.dr}><span>Locations</span><span>{draft.regions.join(", ") || "—"}</span></div>
                  <div className={s.dr}><span>Signals</span><span>{draft.signals.length ? `${draft.signals.length} selected` : "—"}</span></div>
                  <div className={s.dr}><span>Exclusions</span><span>{draft.exclusions.join(", ") || "—"}</span></div>
                </div>
              </div>
              <div className={s.actions}>
                <button className={s.btnS} onClick={skipToHome}>Skip — I&apos;ll create mandates later</button>
                <button className={s.btnP} onClick={handleCreateMandate} disabled={saving}>
                  {saving ? "Creating…" : "Create mandate & start"}
                </button>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className={s.successIcon}>✓</div>
              <h1 className={s.title}>You&apos;re all set</h1>
              <p className={s.desc}>
                {createdId
                  ? "DealScope is now monitoring the market for you. Your first mandate is live and we'll alert you when new opportunities appear."
                  : "DealScope is ready. You can create mandates from the Settings page any time."}
              </p>
              <div className={s.actions}>
                <button className={s.btnP} onClick={skipToHome}>Go to DealScope</button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

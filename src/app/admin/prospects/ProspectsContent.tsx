"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ProspectPipeline, FL_PROSPECTS, SEUK_PROSPECTS, estimateCommission } from "./ProspectPipeline";
import { WAVE1_FL_PROSPECTS } from "@/lib/wave1-fl-prospects";
import { WAVE1_SEUK_PROSPECTS } from "@/lib/wave1-seuk-prospects";

type Market = "fl" | "seuk";

const MARKETS: { id: Market; flag: string; label: string; subtitle: string }[] = [
  { id: "fl",   flag: "🇺🇸", label: "Florida",    subtitle: "Commercial owner-operators · Industrial / mixed-use" },
  { id: "seuk", flag: "🇬🇧", label: "SE England", subtitle: "Logistics landlords · Kent · Surrey · Essex · Herts" },
];

interface MarketSummary {
  ready: number;
  contacted: number;
  demosBooked: number;
  commission: number;
}

// Dry-run response shape
interface DryRunProspect {
  prospectKey: string;
  name: string;
  email: string;
  company: string;
}
interface DryRunResult {
  dryRun: true;
  wouldSend: number;
  skipped: number;
  prospects: DryRunProspect[];
  skippedProspects: { prospectKey: string; reason: string }[];
}

export function ProspectsContent() {
  const [market, setMarket] = useState<Market>("fl");
  const [fl, setFl] = useState<MarketSummary>({ ready: 0, contacted: 0, demosBooked: 0, commission: 0 });
  const [uk, setUk] = useState<MarketSummary>({ ready: 0, contacted: 0, demosBooked: 0, commission: 0 });

  // Wave-1 FL send state
  const [wave1DryRun, setWave1DryRun] = useState<DryRunResult | null>(null);
  const [wave1Checking, setWave1Checking] = useState(false);
  const [wave1Sending, setWave1Sending] = useState(false);
  const [wave1Success, setWave1Success] = useState<{ queued: number } | null>(null);
  const [wave1Error, setWave1Error] = useState<string | null>(null);

  // Whether all wave-1 FL prospects have emailSent=true (shows "Wave 1 sent" badge)
  const [wave1AllSent, setWave1AllSent] = useState(false);

  // Email overrides from DB — prospectKey → emailOverride (null if not set)
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string | null>>({});
  // Inline email editor
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState<string | null>(null);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Wave-1 SE UK send state
  const [seukDryRun, setSeukDryRun] = useState<DryRunResult | null>(null);
  const [seukChecking, setSeukChecking] = useState(false);
  const [seukSending, setSeukSending] = useState(false);
  const [seukSuccess, setSeukSuccess] = useState<{ queued: number } | null>(null);
  const [seukError, setSeukError] = useState<string | null>(null);
  const [seukAllSent, setSeukAllSent] = useState(false);

  const active = MARKETS.find((m) => m.id === market)!;

  const loadSummaries = useCallback(async () => {
    const [flRes, ukRes] = await Promise.all([
      fetch("/api/admin/prospect-status?market=fl").catch(() => null),
      fetch("/api/admin/prospect-status?market=seuk").catch(() => null),
    ]);
    const flMap: Record<string, { status?: string; emailOverride?: string; emailSent?: boolean }> =
      flRes?.ok ? await flRes.json() : {};
    const ukMap: Record<string, { status?: string; emailOverride?: string; emailSent?: boolean }> =
      ukRes?.ok ? await ukRes.json() : {};

    function summarise(
      prospects: typeof FL_PROSPECTS,
      store: typeof flMap,
      mkt: "fl" | "seuk",
    ): MarketSummary {
      let ready = 0, contacted = 0, demosBooked = 0, commission = 0;
      for (const p of prospects) {
        const status = store[p.id]?.status ?? p.initialStatus;
        const email = store[p.id]?.emailOverride || p.email;
        if (status === "to_contact" && email) ready++;
        if (status === "contacted") contacted++;
        if (status === "demo_booked") demosBooked++;
        if (!["lost", "research_needed"].includes(status)) {
          commission += estimateCommission(p, mkt);
        }
      }
      return { ready, contacted, demosBooked, commission };
    }

    setFl(summarise(FL_PROSPECTS, flMap, "fl"));
    setUk(summarise(SEUK_PROSPECTS, ukMap, "seuk"));

    // Sync emailOverrides for Wave 1 FL prospects
    const overrides: Record<string, string | null> = {};
    for (const p of WAVE1_FL_PROSPECTS) {
      overrides[p.prospectKey] = flMap[p.prospectKey]?.emailOverride ?? null;
    }
    setEmailOverrides(overrides);

    // Check if all wave-1 FL prospects (static or override email) have been sent
    const allSent = WAVE1_FL_PROSPECTS
      .filter((p) => p.email || overrides[p.prospectKey])
      .every((p) => flMap[p.prospectKey]?.emailSent === true);
    setWave1AllSent(allSent);

    // Check if all wave-1 SE UK prospects with emails have been sent
    const seukSent = WAVE1_SEUK_PROSPECTS.length > 0 &&
      WAVE1_SEUK_PROSPECTS
        .filter((p) => p.email)
        .every((p) => ukMap[p.prospectKey]?.emailSent === true);
    setSeukAllSent(seukSent);
  }, []);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (editingKey) emailInputRef.current?.focus();
  }, [editingKey]);

  async function handleSaveEmail(prospectKey: string) {
    setEmailSaving(prospectKey);
    setEmailSaveError(null);
    try {
      const res = await fetch("/api/admin/prospect-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectKey, email: emailDraft }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      const data = await res.json();
      setEmailOverrides((prev) => ({ ...prev, [prospectKey]: data.emailOverride ?? null }));
      setEditingKey(null);
    } catch (e) {
      setEmailSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEmailSaving(null);
    }
  }

  function fmtComm(v: number, sym: string) {
    return v >= 1_000_000 ? `~${sym}${(v / 1_000_000).toFixed(1)}M` : `~${sym}${Math.round(v / 1_000)}k`;
  }

  // Step 1: dry run — preview who would be emailed
  async function handleWave1Preview() {
    setWave1Checking(true);
    setWave1Error(null);
    setWave1Success(null);
    try {
      const res = await fetch("/api/admin/send-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "fl", wave: 1, dryRun: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Request failed");
      }
      const data: DryRunResult = await res.json();
      setWave1DryRun(data);
    } catch (e) {
      setWave1Error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setWave1Checking(false);
    }
  }

  // Step 2: confirmed send
  async function handleWave1Send() {
    setWave1Sending(true);
    setWave1Error(null);
    try {
      const res = await fetch("/api/admin/send-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "fl", wave: 1, dryRun: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Request failed");
      }
      const data = await res.json();
      setWave1DryRun(null);
      setWave1Success({ queued: data.queued ?? 0 });
      // Refresh summaries so the badge updates
      await loadSummaries();
    } catch (e) {
      setWave1Error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setWave1Sending(false);
    }
  }

  const sendableCount = WAVE1_FL_PROSPECTS.filter(
    (p) => p.email || emailOverrides[p.prospectKey]
  ).length;

  // SE UK wave 1 handlers
  async function handleSeukPreview() {
    setSeukChecking(true);
    setSeukError(null);
    setSeukSuccess(null);
    try {
      const res = await fetch("/api/admin/send-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "seuk", wave: 1, dryRun: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Request failed");
      }
      const data: DryRunResult = await res.json();
      setSeukDryRun(data);
    } catch (e) {
      setSeukError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSeukChecking(false);
    }
  }

  async function handleSeukSend() {
    setSeukSending(true);
    setSeukError(null);
    try {
      const res = await fetch("/api/admin/send-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "seuk", wave: 1, dryRun: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Request failed");
      }
      const data = await res.json();
      setSeukDryRun(null);
      setSeukSuccess({ queued: data.queued ?? 0 });
      await loadSummaries();
    } catch (e) {
      setSeukError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSeukSending(false);
    }
  }

  const seukSendableCount = WAVE1_SEUK_PROSPECTS.filter((p) => p.email).length;

  return (
    <div className="space-y-6">
      {/* Cross-market pipeline summary bar */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}
      >
        <span style={{ color: "#8ba0b8" }}>
          <span style={{ color: "#e8eef5", fontWeight: 600 }}>FL</span>
          {": "}
          <span style={{ color: "#F5A94A" }}>{fl.ready} ready</span>
          {" · "}
          {fl.contacted} contacted
          {" · "}
          <span style={{ color: "#8b5cf6" }}>{fl.demosBooked} demos booked</span>
          <span style={{ color: "#2a4060" }}> | </span>
          <span style={{ color: "#e8eef5", fontWeight: 600 }}>UK</span>
          {": "}
          <span style={{ color: "#F5A94A" }}>{uk.ready} ready</span>
          {" · "}
          {uk.contacted} contacted
          {" · "}
          <span style={{ color: "#8b5cf6" }}>{uk.demosBooked} demos booked</span>
          <span style={{ color: "#2a4060" }}> | </span>
          {"Est. commission: "}
          <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmtComm(fl.commission, "$")}</span>
          {" FL · "}
          <span style={{ color: "#0A8A4C", fontWeight: 600 }}>{fmtComm(uk.commission, "£")}</span>
          {" UK"}
        </span>
      </div>

      {/* Wave 1 FL send button — shown when FL tab is active */}
      {market === "fl" && (
        <div
          className="rounded-xl px-5 py-4 space-y-4"
          style={{ backgroundColor: "#0d1825", border: "1px solid #1a3d28" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                  Wave 1 — FL Outreach
                </span>
                {wave1AllSent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C", border: "1px solid #0A8A4C40" }}
                  >
                    Wave 1 sent
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                {sendableCount} of {WAVE1_FL_PROSPECTS.length} prospects have email addresses ready to send.
                Emails are queued via the scheduler — not sent directly.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {wave1Success && (
                <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                  {wave1Success.queued} email{wave1Success.queued !== 1 ? "s" : ""} queued
                </span>
              )}
              {!wave1DryRun && !wave1Success && (
                <button
                  onClick={handleWave1Preview}
                  disabled={wave1Checking || wave1AllSent}
                  className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff", border: "1px solid #0A8A4C" }}
                >
                  {wave1Checking ? "Checking…" : wave1AllSent ? "Wave 1 sent" : "Send Wave 1 — FL"}
                </button>
              )}
            </div>
          </div>

          {/* Prospect email roster */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid #1a2d45" }}
          >
            {WAVE1_FL_PROSPECTS.map((p) => {
              const override = emailOverrides[p.prospectKey];
              const effectiveEmail = override || p.email;
              const isEditing = editingKey === p.prospectKey;
              const isSaving = emailSaving === p.prospectKey;
              return (
                <div
                  key={p.prospectKey}
                  className="flex items-center gap-3 px-3 py-2 text-xs"
                  style={{ backgroundColor: "#0a1520", borderBottom: "1px solid #1a2d45" }}
                >
                  <span style={{ color: "#e8eef5", minWidth: 100, flexShrink: 0 }}>
                    {p.firstName} {p.company}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {isEditing ? (
                      <>
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEmail(p.prospectKey);
                            if (e.key === "Escape") { setEditingKey(null); setEmailSaveError(null); }
                          }}
                          placeholder="email@example.com"
                          className="text-xs px-2 py-1 rounded font-mono outline-none"
                          style={{
                            backgroundColor: "#0B1622",
                            border: "1px solid #2a4060",
                            color: "#e8eef5",
                            width: 220,
                          }}
                        />
                        <button
                          onClick={() => handleSaveEmail(p.prospectKey)}
                          disabled={isSaving}
                          className="px-2 py-1 rounded text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                        >
                          {isSaving ? "…" : "✓"}
                        </button>
                        <button
                          onClick={() => { setEditingKey(null); setEmailSaveError(null); }}
                          className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                          style={{ color: "#5a7a96", border: "1px solid #1a2d45" }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {effectiveEmail ? (
                          <span className="font-mono truncate" style={{ color: override ? "#F5A94A" : "#3d5a72" }}>
                            {effectiveEmail}
                            {override && (
                              <span className="ml-1 text-[10px] px-1 rounded" style={{ backgroundColor: "#F5A94A22", color: "#F5A94A" }}>
                                override
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}
                          >
                            No email
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingKey(p.prospectKey);
                            setEmailDraft(effectiveEmail || "");
                            setEmailSaveError(null);
                          }}
                          className="ml-1 px-2 py-0.5 rounded text-[10px] transition-all hover:opacity-80"
                          style={{ color: "#5a7a96", border: "1px solid #1a2d45" }}
                        >
                          {effectiveEmail ? "Edit" : "Add"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {emailSaveError && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}
            >
              {emailSaveError}
            </div>
          )}

          {wave1Error && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}
            >
              {wave1Error}
            </div>
          )}

          {/* Dry-run confirmation modal */}
          {wave1DryRun && !wave1Sending && (
            <div className="space-y-3">
              <div className="text-xs font-semibold" style={{ color: "#F5A94A" }}>
                {wave1DryRun.wouldSend} prospect{wave1DryRun.wouldSend !== 1 ? "s" : ""} will be emailed
                {wave1DryRun.skipped > 0 && ` · ${wave1DryRun.skipped} skipped`}
              </div>

              {/* Prospects to send */}
              {wave1DryRun.prospects.length > 0 && (
                <div
                  className="rounded-lg divide-y divide-[#1a2d45] text-xs overflow-hidden"
                  style={{ border: "1px solid #1a2d45" }}
                >
                  {wave1DryRun.prospects.map((p) => (
                    <div
                      key={p.prospectKey}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: "#0a1520" }}
                    >
                      <span style={{ color: "#e8eef5" }}>{p.name}</span>
                      <span style={{ color: "#2a4060" }}>·</span>
                      <span style={{ color: "#5a7a96" }}>{p.company}</span>
                      <span className="ml-auto font-mono" style={{ color: "#3d5a72" }}>{p.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Skipped list */}
              {wave1DryRun.skippedProspects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Skipped:</div>
                  {wave1DryRun.skippedProspects.map((s) => (
                    <div key={s.prospectKey} className="text-xs" style={{ color: "#3d5a72" }}>
                      <span style={{ color: "#8ba0b8" }}>{s.prospectKey}</span>
                      {" — "}
                      {s.reason}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a2d0a11", color: "#8ba0b8", border: "1px solid #1a3d28" }}>
                Emails are queued as scheduled emails (sendAfter=now). The cron at{" "}
                <span style={{ color: "#e8eef5" }}>/api/cron/send-emails</span> handles delivery.
                ProspectStatus will be upserted to contacted/emailSent=true.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleWave1Send}
                  className="text-sm px-5 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Confirm — Queue {wave1DryRun.wouldSend} email{wave1DryRun.wouldSend !== 1 ? "s" : ""}
                </button>
                <button
                  onClick={() => { setWave1DryRun(null); setWave1Error(null); }}
                  className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: "transparent", color: "#5a7a96", border: "1px solid #1a2d45" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {wave1Sending && (
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              Queuing emails…
            </div>
          )}
        </div>
      )}

      {/* Wave 1 SE UK send button — shown when SE UK tab is active */}
      {market === "seuk" && (
        <div
          className="rounded-xl px-5 py-4 space-y-4"
          style={{ backgroundColor: "#0d1825", border: "1px solid #1a3d28" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                  Wave 1 — SE UK Outreach
                </span>
                {seukAllSent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: "#0A8A4C22", color: "#0A8A4C", border: "1px solid #0A8A4C40" }}
                  >
                    Wave 1 sent
                  </span>
                )}
              </div>
              {WAVE1_SEUK_PROSPECTS.length === 0 ? (
                <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  No prospects loaded yet — populate{" "}
                  <span style={{ color: "#8ba0b8", fontFamily: "monospace" }}>src/lib/wave1-seuk-prospects.ts</span>{" "}
                  once PRO-265 delivers the list.
                </p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  {seukSendableCount} of {WAVE1_SEUK_PROSPECTS.length} prospects have email addresses ready to send.
                  Emails are queued via the scheduler — not sent directly.
                </p>
              )}
            </div>
            {WAVE1_SEUK_PROSPECTS.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {seukSuccess && (
                  <span className="text-xs font-semibold" style={{ color: "#0A8A4C" }}>
                    {seukSuccess.queued} email{seukSuccess.queued !== 1 ? "s" : ""} queued
                  </span>
                )}
                {!seukDryRun && !seukSuccess && (
                  <button
                    onClick={handleSeukPreview}
                    disabled={seukChecking || seukAllSent}
                    className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#0A8A4C", color: "#fff", border: "1px solid #0A8A4C" }}
                  >
                    {seukChecking ? "Checking…" : seukAllSent ? "Wave 1 sent" : "Send Wave 1 — SE UK"}
                  </button>
                )}
              </div>
            )}
          </div>

          {seukError && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#CC1A1A22", color: "#CC1A1A", border: "1px solid #CC1A1A40" }}
            >
              {seukError}
            </div>
          )}

          {/* Dry-run confirmation */}
          {seukDryRun && !seukSending && (
            <div className="space-y-3">
              <div className="text-xs font-semibold" style={{ color: "#F5A94A" }}>
                {seukDryRun.wouldSend} prospect{seukDryRun.wouldSend !== 1 ? "s" : ""} will be emailed
                {seukDryRun.skipped > 0 && ` · ${seukDryRun.skipped} skipped`}
              </div>

              {seukDryRun.prospects.length > 0 && (
                <div
                  className="rounded-lg divide-y divide-[#1a2d45] text-xs overflow-hidden"
                  style={{ border: "1px solid #1a2d45" }}
                >
                  {seukDryRun.prospects.map((p) => (
                    <div
                      key={p.prospectKey}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: "#0a1520" }}
                    >
                      <span style={{ color: "#e8eef5" }}>{p.name}</span>
                      <span style={{ color: "#2a4060" }}>·</span>
                      <span style={{ color: "#5a7a96" }}>{p.company}</span>
                      <span className="ml-auto font-mono" style={{ color: "#3d5a72" }}>{p.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {seukDryRun.skippedProspects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs" style={{ color: "#5a7a96" }}>Skipped:</div>
                  {seukDryRun.skippedProspects.map((s) => (
                    <div key={s.prospectKey} className="text-xs" style={{ color: "#3d5a72" }}>
                      <span style={{ color: "#8ba0b8" }}>{s.prospectKey}</span>
                      {" — "}
                      {s.reason}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a2d0a11", color: "#8ba0b8", border: "1px solid #1a3d28" }}>
                Emails are queued as scheduled emails (sendAfter=now). The cron at{" "}
                <span style={{ color: "#e8eef5" }}>/api/cron/send-emails</span> handles delivery.
                ProspectStatus will be upserted to contacted/emailSent=true.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSeukSend}
                  className="text-sm px-5 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
                >
                  Confirm — Queue {seukDryRun.wouldSend} email{seukDryRun.wouldSend !== 1 ? "s" : ""}
                </button>
                <button
                  onClick={() => { setSeukDryRun(null); setSeukError(null); }}
                  className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: "transparent", color: "#5a7a96", border: "1px solid #1a2d45" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {seukSending && (
            <div className="text-xs" style={{ color: "#8ba0b8" }}>
              Queuing emails…
            </div>
          )}
        </div>
      )}

      {/* Market tabs + subtitle */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: market === m.id ? "#1a2d45" : "transparent",
                color: market === m.id ? "#e8eef5" : "#5a7a96",
                border: `1px solid ${market === m.id ? "#2a4060" : "#1a2d45"}`,
              }}
            >
              <span>{m.flag}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm" style={{ color: "#5a7a96" }}>
          {active.flag} {active.subtitle}
        </p>
      </div>

      <ProspectPipeline key={market} market={market} />
    </div>
  );
}

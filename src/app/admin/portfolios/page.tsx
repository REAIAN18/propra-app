"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

interface PortfolioRecord {
  id: string;
  name: string;
  urlKey: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminPortfoliosPage() {
  const [portfolios, setPortfolios] = useState<PortfolioRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [urlKey, setUrlKey] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function loadPortfolios() {
    setLoading(true);
    const res = await fetch("/api/admin/portfolios");
    if (res.ok) {
      setPortfolios(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { loadPortfolios(); }, []);

  function handleJsonChange(val: string) {
    setJsonText(val);
    setJsonError("");
    if (val.trim()) {
      try {
        JSON.parse(val);
      } catch {
        setJsonError("Invalid JSON");
      }
    }
  }

  function handleUrlKeyInput(val: string) {
    setUrlKey(val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveResult(null);

    if (!name.trim() || !urlKey.trim() || !jsonText.trim()) {
      setSaveResult({ ok: false, message: "All fields are required." });
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      setSaveResult({ ok: false, message: "JSON is invalid." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, urlKey, data }),
    });

    if (res.ok) {
      setSaveResult({ ok: true, message: `Saved! Shareable link: https://arcahq.ai/dashboard?portfolio=${urlKey}&welcome=1&company=${encodeURIComponent(name)}` });
      setName("");
      setUrlKey("");
      setJsonText("");
      loadPortfolios();
    } else {
      const err = await res.json().catch(() => ({}));
      setSaveResult({ ok: false, message: err.error ?? "Failed to save." });
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "#0B1622" }}>
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: "#5a7a96" }}>
              ← Admin
            </Link>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: SERIF, color: "#e8eef5" }}>
            Client Portfolios
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a96" }}>
            Upload a client portfolio JSON to create a shareable dashboard link — no code needed.
          </p>
        </div>

        {/* Upload form */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: "#e8eef5" }}>Create / update portfolio</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>Client name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Starlight Industrial Holdings"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: "#0B1622",
                    border: "1px solid #1a2d45",
                    color: "#e8eef5",
                  }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>URL key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={urlKey}
                    onChange={(e) => handleUrlKeyInput(e.target.value)}
                    placeholder="starlight-industrial"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "#0B1622",
                      border: "1px solid #1a2d45",
                      color: "#e8eef5",
                    }}
                  />
                </div>
                {urlKey && (
                  <p className="text-xs mt-1" style={{ color: "#5a7a96" }}>
                    Link: /dashboard?portfolio={urlKey}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#5a7a96" }}>
                Portfolio JSON{" "}
                <span style={{ color: "#1a2d45" }}>— paste the full Portfolio object</span>
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={14}
                placeholder={`{\n  "id": "starlight-industrial",\n  "name": "Starlight Industrial Holdings",\n  "shortName": "Starlight",\n  "currency": "GBP",\n  "benchmarkG2N": 72,\n  "assets": [...]\n}`}
                className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none resize-y"
                style={{
                  backgroundColor: "#0B1622",
                  border: `1px solid ${jsonError ? "#f06040" : "#1a2d45"}`,
                  color: "#e8eef5",
                  lineHeight: "1.6",
                }}
              />
              {jsonError && (
                <p className="text-xs mt-1" style={{ color: "#f06040" }}>{jsonError}</p>
              )}
            </div>

            {saveResult && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: saveResult.ok ? "#0A8A4C22" : "#f0604022",
                  border: `1px solid ${saveResult.ok ? "#0A8A4C44" : "#f0604044"}`,
                  color: saveResult.ok ? "#0A8A4C" : "#f06040",
                  wordBreak: "break-all",
                }}
              >
                {saveResult.message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !!jsonError}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#1647E8", color: "#fff" }}
            >
              {saving ? "Saving…" : "Save portfolio"}
            </button>
          </form>
        </div>

        {/* Existing portfolios */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "#0d1825", border: "1px solid #1a2d45" }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: "#e8eef5" }}>Saved portfolios</h2>
          {loading ? (
            <p className="text-xs" style={{ color: "#5a7a96" }}>Loading…</p>
          ) : portfolios.length === 0 ? (
            <p className="text-xs" style={{ color: "#5a7a96" }}>No custom portfolios yet. Upload one above.</p>
          ) : (
            <div className="space-y-3">
              {portfolios.map((p) => {
                const shareLink = `https://arcahq.ai/dashboard?portfolio=${p.urlKey}&welcome=1&company=${encodeURIComponent(p.name)}`;
                return (
                  <div
                    key={p.id}
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: "#e8eef5" }}>{p.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                          Key: <span style={{ color: "#1647E8" }}>{p.urlKey}</span>
                          {p.createdBy ? ` · by ${p.createdBy}` : ""}
                          {" · "}updated {timeAgo(p.updatedAt)}
                        </p>
                        <p
                          className="text-xs mt-1 break-all"
                          style={{ color: "#5a7a96", fontFamily: "monospace" }}
                        >
                          {shareLink}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigator.clipboard.writeText(shareLink)}
                          className="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                          style={{ backgroundColor: "#1a2d45", color: "#5a7a96" }}
                        >
                          Copy link
                        </button>
                        <a
                          href={`/dashboard?portfolio=${p.urlKey}&welcome=1&company=${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                          style={{ backgroundColor: "#1647E822", color: "#1647E8" }}
                        >
                          Preview →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

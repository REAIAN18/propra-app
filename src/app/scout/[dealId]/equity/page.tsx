"use client";

import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

// ─── API response types ───────────────────────────────────────────────────────

type FinanceData = {
  deal: {
    id: string;
    address: string;
    assetType: string;
    askingPrice: number;
    currency: string;
    region: string;
  };
  capitalStack: {
    debt: { amount: number; percentage: number; label: string };
    equity: { amount: number; percentage: number; label: string };
    total: number;
  };
  debtTerms: {
    loanAmount: number;
    ltv: number;
    sofrRate: number;
    spreadBps: number;
    allInRate: number;
    termYears: number;
    structure: string;
    annualDebtService: number;
    dscr: number;
    dscr_status: string;
    cashAfterDebt: number;
  };
  lenders: { name: string; description: string; rateRange: string; ltv: string }[];
  equityScenarios: {
    structure: string;
    equityRequired: number;
    irr: number;
    description: string;
    color: string;
  }[];
};

type InvestorContact = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  type: string;
  status: string;
};

function fmtCcy(v: number, currency: string): string {
  const sym = currency === "GBP" ? "£" : "$";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${Math.round(v)}`;
}

export default function EquityRaisePage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const [dealId, setDealId] = useState("");
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [investors, setInvestors] = useState<InvestorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [debtPct, setDebtPct] = useState(65);
  const [mezzPct, setMezzPct] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addType, setAddType] = useState("LP");
  const [addStatus, setAddStatus] = useState("prospect");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [generatingIM, setGeneratingIM] = useState(false);
  const [generatingTeaser, setGeneratingTeaser] = useState(false);
  const [imReady, setImReady] = useState(false);
  const [teaserReady, setTeaserReady] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setDealId(p.dealId);
      fetchData(p.dealId);
    });
  }, [params]);

  const fetchData = async (id: string) => {
    setLoading(true);
    setFinanceError(null);
    try {
      const [financeRes, investorsRes] = await Promise.all([
        fetch(`/api/scout/deals/${id}/finance`),
        fetch(`/api/user/investor-contacts`),
      ]);
      if (financeRes.ok) {
        const data: FinanceData = await financeRes.json();
        setFinance(data);
        setDebtPct(Math.round(data.capitalStack.debt.percentage * 100));
      } else if (financeRes.status === 422) {
        setFinanceError("Deal has no asking price — finance model unavailable.");
      } else {
        setFinanceError("Could not load finance data.");
      }
      if (investorsRes.ok) setInvestors(await investorsRes.json());
    } catch {
      setFinanceError("Network error loading finance data.");
    } finally {
      setLoading(false);
    }
  };

  const liveStack = useMemo(() => {
    if (!finance) return null;
    const price = finance.capitalStack.total;
    const equityPct = Math.max(5, 100 - debtPct - mezzPct);
    const loanAmount = price * (debtPct / 100);
    const mezzAmount = price * (mezzPct / 100);
    const equityRequired = price * (equityPct / 100);
    const noi = finance.debtTerms.cashAfterDebt + finance.debtTerms.annualDebtService;
    const newDebtService = loanAmount * (finance.debtTerms.allInRate / 100);
    const mezzService = mezzAmount * ((finance.debtTerms.allInRate + 2.5) / 100);
    const netCashFlow = noi - newDebtService - mezzService;
    const cashOnCash = equityRequired > 0 ? (netCashFlow / equityRequired) * 100 : null;
    return { price, loanAmount, mezzAmount, equityRequired, equityPct, cashOnCash, noi };
  }, [finance, debtPct, mezzPct]);

  const handleAddInvestor = async () => {
    if (!addName.trim() || !addEmail.trim()) { setAddError("Name and email are required."); return; }
    setAddSaving(true); setAddError(null);
    try {
      const res = await fetch("/api/user/investor-contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim(), company: addCompany.trim() || undefined, type: addType, status: addStatus }),
      });
      if (res.ok) {
        const created = await res.json();
        setInvestors((prev) => [created, ...prev]);
        setShowAddForm(false); setAddName(""); setAddEmail(""); setAddCompany(""); setAddType("LP"); setAddStatus("prospect");
      } else {
        const err = await res.json().catch(() => ({}));
        setAddError((err as { error?: string }).error ?? "Failed to add investor.");
      }
    } catch { setAddError("Network error — please try again."); }
    finally { setAddSaving(false); }
  };

  const handleGenerateIM = async () => {
    setGeneratingIM(true); setGenError(null); setImReady(false);
    try {
      const res = await fetch(`/api/scout/deals/${dealId}/im`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const data = await res.json();
        if (data.pdfUrl) { setImReady(true); window.open(data.pdfUrl, "_blank"); }
        else setGenError("IM generated — PDF unavailable in this environment.");
      } else setGenError("Failed to generate Investment Memorandum.");
    } catch { setGenError("Error generating IM — please try again."); }
    finally { setGeneratingIM(false); }
  };

  const handleGenerateTeaser = async () => {
    setGeneratingTeaser(true); setGenError(null); setTeaserReady(false);
    try {
      const res = await fetch(`/api/scout/deals/${dealId}/teaser`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const data = await res.json();
        if (data.pdfUrl) { setTeaserReady(true); window.open(data.pdfUrl, "_blank"); }
        else setGenError("Teaser generated — PDF unavailable in this environment.");
      } else setGenError("Failed to generate Teaser.");
    } catch { setGenError("Error generating Teaser — please try again."); }
    finally { setGeneratingTeaser(false); }
  };

  const handleOpenSendModal = () => {
    if (selectedInvestors.size === 0) return;
    setSendSubject(`Investment Memorandum — ${finance?.deal.address ?? "Deal"}`);
    setSendBody(`Please find attached the Investment Memorandum for ${finance?.deal.address ?? "this deal"}.\n\nI would welcome the opportunity to discuss the investment thesis. Please let me know if you have any questions.\n\nBest regards`);
    setSendResult(null); setShowSendModal(true);
  };

  const handleSendIM = async () => {
    if (selectedInvestors.size === 0) return;
    setSending(true); setSendResult(null);
    try {
      const results = await Promise.all(Array.from(selectedInvestors).map((investorId) =>
        fetch(`/api/scout/deals/${dealId}/investors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investorId, documentType: "im" }) })
      ));
      if (results.every((r) => r.ok || r.status === 201)) {
        setSendResult(`Investment Memo recorded for ${selectedInvestors.size} investor${selectedInvestors.size > 1 ? "s" : ""}.`);
        setSelectedInvestors(new Set());
      } else setSendResult("Some sends failed — please retry.");
    } catch { setSendResult("Network error — please try again."); }
    finally { setSending(false); }
  };

  const toggleInvestor = (id: string) => {
    setSelectedInvestors((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  if (loading) {
    return (<AppShell><TopBar /><div className="p-8 text-[var(--tx3)]">Loading…</div></AppShell>);
  }

  const currency = finance?.deal.currency ?? "USD";
  const address = finance?.deal.address ?? "Deal";
  const sym = currency === "GBP" ? "£" : "$";
  const scenarios = finance?.equityScenarios ?? [];

  return (
    <AppShell>
      <TopBar />
      <div className="p-6 max-w-[1080px]">
        <div className="mb-6">
          <Link href="/scout" className="text-[11px] text-[var(--tx3)] hover:text-[var(--tx)] mb-2 inline-block">← Back to Scout</Link>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx3)] mb-1">{address}</div>
          <h1 className="text-[24px] font-serif text-[var(--tx)]">Equity Raise</h1>
          <p className="text-[13px] text-[var(--tx3)] mt-1">Capital stack modelling, investor outreach, and fundraising tools</p>
        </div>

        {financeError && (
          <div className="bg-[var(--red-lt)] border border-[var(--red-bdr)] rounded-lg p-4 mb-4 text-[var(--red)] text-[13px]">{financeError}</div>
        )}

        {finance && liveStack && (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-5 mb-4">
            <h3 className="text-[14px] font-semibold text-[var(--tx)] mb-4">Capital Stack Model</h3>
            <div className="flex gap-[3px] h-[160px] mb-5">
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg" style={{ flex: debtPct || 1, background: "rgba(56,189,248,.15)", border: "1px solid rgba(56,189,248,.3)" }}>
                <div className="text-[9px] font-mono uppercase text-[#38bdf8] mb-1">Senior Debt</div>
                <div className="text-[15px] font-serif text-[var(--tx)]">{fmtCcy(liveStack.loanAmount, currency)}</div>
                <div className="text-[9px] text-[var(--tx3)] mt-1">{debtPct}% LTV</div>
              </div>
              {mezzPct > 0 && (
                <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg" style={{ flex: mezzPct, background: "var(--amb-lt)", border: "1px solid var(--amb-bdr)" }}>
                  <div className="text-[9px] font-mono uppercase text-[var(--amb)] mb-1">Mezz</div>
                  <div className="text-[15px] font-serif text-[var(--tx)]">{fmtCcy(liveStack.mezzAmount, currency)}</div>
                  <div className="text-[9px] text-[var(--tx3)] mt-1">{mezzPct}%</div>
                </div>
              )}
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg" style={{ flex: liveStack.equityPct, background: "var(--acc-lt)", border: "1px solid var(--acc-bdr)" }}>
                <div className="text-[9px] font-mono uppercase text-[var(--acc)] mb-1">Equity</div>
                <div className="text-[15px] font-serif text-[var(--tx)]">{fmtCcy(liveStack.equityRequired, currency)}</div>
                <div className="text-[9px] text-[var(--tx3)] mt-1">{liveStack.equityPct}%</div>
              </div>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--tx2)]">Senior Debt</span>
                  <span className="text-[12px] font-mono text-[var(--tx)]">{debtPct}% · {fmtCcy(liveStack.loanAmount, currency)}</span>
                </div>
                <input type="range" min={0} max={80} value={debtPct} onChange={(e) => { const v = Number(e.target.value); if (v + mezzPct > 95) setMezzPct(Math.max(0, 95 - v)); setDebtPct(v); }}
                  className="w-full h-[6px] rounded bg-[var(--s3)] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#38bdf8] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg)] [&::-webkit-slider-thumb]:cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--tx2)]">Mezzanine</span>
                  <span className="text-[12px] font-mono text-[var(--tx)]">{mezzPct}% · {fmtCcy(liveStack.mezzAmount, currency)}</span>
                </div>
                <input type="range" min={0} max={20} value={mezzPct} onChange={(e) => { const v = Number(e.target.value); if (debtPct + v > 95) setDebtPct(Math.max(0, 95 - v)); setMezzPct(v); }}
                  className="w-full h-[6px] rounded bg-[var(--s3)] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--amb)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg)] [&::-webkit-slider-thumb]:cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[1px] bg-[var(--bdr)] border border-[var(--bdr)] rounded overflow-hidden">
              <div className="bg-[var(--s2)] px-4 py-3 text-center">
                <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">Equity Required</div>
                <div className="text-[18px] font-serif text-[var(--tx)]">{fmtCcy(liveStack.equityRequired, currency)}</div>
              </div>
              <div className="bg-[var(--s2)] px-4 py-3 text-center">
                <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">Cash-on-Cash</div>
                <div className={`text-[18px] font-serif ${liveStack.cashOnCash !== null && liveStack.cashOnCash > 0 ? "text-[var(--grn)]" : "text-[var(--red)]"}`}>
                  {liveStack.cashOnCash !== null ? `${liveStack.cashOnCash.toFixed(1)}%` : "—"}
                </div>
              </div>
              <div className="bg-[var(--s2)] px-4 py-3 text-center">
                <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-1">Loan Amount</div>
                <div className="text-[18px] font-serif text-[var(--tx)]">{fmtCcy(liveStack.loanAmount, currency)}</div>
              </div>
            </div>
            <p className="text-[10px] text-[var(--tx3)] mt-2">Cash-on-cash based on {sym}{Math.round(liveStack.noi / 1000)}k NOI from underwriting model · Indicative</p>
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-5 mb-4">
            <h3 className="text-[14px] font-semibold text-[var(--tx)] mb-1">Returns by Investor Class</h3>
            <p className="text-[11px] text-[var(--tx3)] mb-4">Indicative returns by ownership structure — display only.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {scenarios.map((s) => (
                <div key={s.structure} className="bg-[var(--s2)] border border-[var(--bdr)] rounded-lg p-4 text-center">
                  <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">{s.structure}</div>
                  <div className="text-[17px] font-serif text-[var(--acc)] mb-1">{fmtCcy(s.equityRequired, currency)}</div>
                  <div className={`text-[11px] ${s.color === "green" ? "text-[var(--grn)]" : "text-[var(--tx3)]"}`}>{s.description}</div>
                </div>
              ))}
            </div>
            <div className="border border-[var(--bdr)] rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-[var(--bdr)] bg-[var(--s2)]">
                <span className="text-[9px] font-mono uppercase tracking-wide text-[var(--tx3)]">Distribution Order — 80/20 LP/GP Structure</span>
              </div>
              {[
                { tier: "1st", label: "Return of Capital", desc: "All investors receive 100% of contributed equity", color: "text-[var(--tx)]" },
                { tier: "2nd", label: "LP Preferred Return", desc: "LPs receive preferred return on invested capital", color: "text-[var(--acc)]" },
                { tier: "3rd", label: "GP Catch-Up", desc: "GP receives catch-up to agreed profit share percentage", color: "text-[var(--amb)]" },
                { tier: "4th", label: "Residual Split", desc: "Remaining profits split 80% LP / 20% GP (carry)", color: "text-[var(--grn)]" },
              ].map((row) => (
                <div key={row.tier} className="grid gap-3 px-4 py-3 border-b border-[var(--bdr-lt)] last:border-0 hover:bg-[var(--s2)] transition-colors" style={{ gridTemplateColumns: "32px 1fr auto" }}>
                  <span className="text-[10px] font-mono text-[var(--tx3)]">{row.tier}</span>
                  <div>
                    <div className={`text-[12px] font-medium ${row.color}`}>{row.label}</div>
                    <div className="text-[11px] text-[var(--tx3)]">{row.desc}</div>
                  </div>
                  <span className="text-[12px] text-[var(--tx3)]">→</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--tx3)] mt-2">Waterfall is illustrative — terms finalised in JV agreement. IRR projections available in Underwriting model.</p>
          </div>
        )}

        <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-[var(--tx)]">Investors</h3>
            <button onClick={() => { setShowAddForm((v) => !v); setAddError(null); }} className="text-[11px] text-[var(--acc)] hover:opacity-80 transition-opacity">
              {showAddForm ? "Cancel" : "+ Add investor"}
            </button>
          </div>
          {showAddForm && (
            <div className="bg-[var(--s2)] border border-[var(--bdr)] rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Name *</label>
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Email *</label>
                  <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Company</label>
                  <input value={addCompany} onChange={(e) => setAddCompany(e.target.value)} placeholder="Firm or family office" className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Type</label>
                    <select value={addType} onChange={(e) => setAddType(e.target.value)} className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)]">
                      <option value="LP">LP</option>
                      <option value="JV">JV</option>
                      <option value="family_office">Family Office</option>
                      <option value="institution">Institution</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Status</label>
                    <select value={addStatus} onChange={(e) => setAddStatus(e.target.value)} className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)]">
                      <option value="prospect">Prospect</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="committed">Committed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
              </div>
              {addError && <div className="text-[var(--red)] text-[12px] mb-3">{addError}</div>}
              <button onClick={handleAddInvestor} disabled={addSaving} className="px-4 py-2 bg-[var(--acc)] text-white rounded text-[12px] font-semibold hover:bg-[#6d5ce0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {addSaving ? "Saving…" : "Add investor"}
              </button>
            </div>
          )}
          {investors.length === 0 ? (
            <div className="text-center py-8 text-[var(--tx3)] text-[13px]">No investors added yet. Add investors to track outreach.</div>
          ) : (
            <div className="space-y-[1px]">
              {investors.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 hover:bg-[var(--s2)] rounded transition-colors">
                  <input type="checkbox" checked={selectedInvestors.has(inv.id)} onChange={() => toggleInvestor(inv.id)} className="w-4 h-4 shrink-0 rounded border-[var(--bdr)] bg-[var(--s2)] accent-[var(--acc)] cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--tx)] truncate">{inv.name}</div>
                    {inv.company && <div className="text-[11px] text-[var(--tx3)] truncate">{inv.company}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono uppercase px-2 py-1 bg-[var(--s3)] text-[var(--tx3)] rounded border border-[var(--bdr)]">{inv.type}</span>
                    <span className={`text-[9px] font-mono uppercase px-2 py-1 rounded border ${inv.status === "interested" || inv.status === "committed" ? "bg-[var(--grn-lt)] text-[var(--grn)] border-[var(--grn-bdr)]" : inv.status === "contacted" ? "bg-[var(--acc-lt)] text-[var(--acc)] border-[var(--acc-bdr)]" : inv.status === "declined" ? "bg-[var(--red-lt)] text-[var(--red)] border-[var(--red-bdr)]" : "bg-[var(--s3)] text-[var(--tx3)] border-[var(--bdr)]"}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedInvestors.size > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--bdr)] flex items-center gap-3">
              <span className="text-[11px] text-[var(--tx3)]">{selectedInvestors.size} selected</span>
              <button onClick={handleOpenSendModal} className="px-4 py-1.5 bg-[var(--acc)] text-white rounded text-[12px] font-semibold hover:bg-[#6d5ce0] transition-colors">Send Investment Memo →</button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <button onClick={handleGenerateIM} disabled={generatingIM} className="flex-1 px-5 py-3 bg-[var(--acc)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {generatingIM ? "Generating…" : "Generate Investment Memorandum →"}
          </button>
          <button onClick={handleGenerateTeaser} disabled={generatingTeaser} className="flex-1 px-5 py-3 bg-[var(--grn)] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {generatingTeaser ? "Generating…" : "Generate 2-Page Teaser →"}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleOpenSendModal} disabled={selectedInvestors.size === 0} className="flex-1 px-5 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {selectedInvestors.size > 0 ? `Send IM to ${selectedInvestors.size} investor${selectedInvestors.size > 1 ? "s" : ""} →` : "Select investors above to send IM"}
          </button>
          <button disabled className="flex-1 px-5 py-2.5 bg-transparent text-[var(--tx3)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium opacity-50 cursor-not-allowed">Share via portal →</button>
        </div>
        {genError && <p className="text-[var(--red)] text-[12px] mt-2">{genError}</p>}
        {(imReady || teaserReady) && !genError && <p className="text-[var(--grn)] text-[12px] mt-2">Document ready — opened in new tab.</p>}
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-xl w-full max-w-[520px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Send Investment Memo</h3>
              <button onClick={() => setShowSendModal(false)} className="text-[var(--tx3)] hover:text-[var(--tx)] text-[20px] leading-none">×</button>
            </div>
            <div className="mb-3">
              <div className="text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">To</div>
              <div className="flex flex-wrap gap-1">
                {investors.filter((i) => selectedInvestors.has(i.id)).map((i) => (
                  <span key={i.id} className="px-2 py-1 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[11px] text-[var(--tx2)]">{i.name}</span>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Subject</label>
              <input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)]" />
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-mono uppercase text-[var(--tx3)] mb-1">Message</label>
              <textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={5} className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)] resize-none" />
            </div>
            {sendResult && <div className={`text-[12px] mb-3 ${sendResult.includes("failed") || sendResult.includes("error") ? "text-[var(--red)]" : "text-[var(--grn)]"}`}>{sendResult}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowSendModal(false)} className="flex-1 px-4 py-2 bg-transparent border border-[var(--bdr)] rounded text-[12px] text-[var(--tx2)] hover:border-[var(--tx3)] transition-colors">Cancel</button>
              <button onClick={handleSendIM} disabled={sending} className="flex-1 px-4 py-2 bg-[var(--acc)] text-white rounded text-[12px] font-semibold hover:bg-[#6d5ce0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? "Sending…" : "Send IM →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

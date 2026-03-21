"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { portfolioFinancing } from "@/lib/data/financing";

const ACTION_RULES: { keywords: string[]; label: string; href: string }[] = [
  { keywords: ["insurance", "premium", "carrier", "retender", "overpay on insurance"], label: "Insurance module", href: "/insurance" },
  { keywords: ["energy", "electricity", "supplier", "tariff", "kwh", "kWh", "overpay on energy"], label: "Energy module", href: "/energy" },
  { keywords: ["financing", "loan", "debt", "refinanc", "maturity", "icr", "ltv", "covenant", "lender"], label: "Financing", href: "/financing" },
  { keywords: ["hold", "sell", "irr", "disposal", "exit value", "transaction"], label: "Hold / Sell analyser", href: "/hold-sell" },
  { keywords: ["lease", "expiry", "reversion", "tenant", "break clause", "wault", "erv", "renewal", "rent review"], label: "Tenants & leases", href: "/tenants" },
  { keywords: ["compliance", "certificate", "fine exposure", "asbestos", "eicr", "fire risk", "health inspection", "phase i"], label: "Compliance tracker", href: "/compliance" },
  { keywords: ["solar", "ev charging", "5g", "mast", "parking revenue", "billboard", "additional income"], label: "Income opportunities", href: "/income" },
  { keywords: ["acquisition", "scout", "deal", "pipeline", "underwrite", "irr project"], label: "Acquisitions scout", href: "/scout" },
];

function detectActions(content: string): { label: string; href: string }[] {
  const lower = content.toLowerCase();
  const matches: { label: string; href: string }[] = [];
  for (const rule of ACTION_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matches.push({ label: rule.label, href: rule.href });
      if (matches.length === 2) break;
    }
  }
  return matches;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}


function fmtNum(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${v.toLocaleString()}`;
}

const SUGGESTED: { label: string; prompt: string }[] = [
  { label: "Biggest opportunity", prompt: "What's the single biggest opportunity in this portfolio right now?" },
  { label: "Hold or sell?", prompt: "Which assets should I sell and which should I hold? Give me the IRR analysis." },
  { label: "Financing review", prompt: "What's the state of the debt across this portfolio — any covenants, maturities, or refinancing opportunities?" },
  { label: "Lease risk", prompt: "What lease expiries should I be worried about and what's the rent reversion potential?" },
  { label: "Insurance overpay", prompt: "Which assets are overpaying most on insurance and what would a retender recover?" },
  { label: "Additional income", prompt: "What additional income streams could we activate and what's the estimated annual value?" },
  { label: "What should I do first this week?", prompt: "What should I do first this week to have the biggest impact on portfolio performance?" },
  { label: "Show me my rent review strategy", prompt: "Show me my rent review strategy — which leases need attention and what's the reversion potential?" },
  { label: "Where am I losing the most money?", prompt: "Where am I losing the most money across this portfolio and how do I stop it?" },
  { label: "Which asset should I consider selling?", prompt: "Which asset should I consider selling and why? Give me the hold vs sell analysis." },
];

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full animate-bounce"
          style={{
            backgroundColor: "#0A8A4C",
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.8s",
          }}
        />
      ))}
    </div>
  );
}

export default function AskPage() {
  const { portfolioId } = useNav();
  const { portfolio: activePortfolio } = usePortfolio(portfolioId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    abortRef.current?.abort();
  }, [portfolioId]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const raw = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error?.includes("ANTHROPIC_API_KEY")) {
            msg = "AI chat isn't enabled on this demo yet — ask the RealHQ team to activate it for your portfolio.";
          } else {
            msg = parsed.error ?? msg;
          }
        } catch { msg = raw || msg; }
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const evt = JSON.parse(data);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              assistantContent += evt.delta.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantContent };
                return next;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((_, i) => i < prev.length - 1 || prev[prev.length - 1].content !== ""));
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <AppShell>
      <TopBar title="Ask RealHQ" />

      <main className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: "#0B1622" }}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6">
          {isEmpty ? (
            <div className="max-w-2xl mx-auto">
              {/* Portfolio context card */}
              {(() => {
                const p = activePortfolio;
                if (!p) return null;
                const sym = p.currency === "USD" ? "$" : "£";
                const aum = p.assets.reduce((s, a) => s + (a.valuationUSD ?? a.valuationGBP ?? 0), 0);
                const insOverpay = p.assets.reduce((s, a) => s + (a.insurancePremium - a.marketInsurance), 0);
                const energyOverpay = p.assets.reduce((s, a) => s + (a.energyCost - a.marketEnergyCost), 0);
                const addIncome = p.assets.flatMap((a) => a.additionalIncomeOpportunities).reduce((s, o) => s + o.annualIncome, 0);
                const totalOpp = insOverpay + energyOverpay + addIncome;
                const today = new Date();
                const urgentLoans = (portfolioFinancing[portfolioId] ?? []).filter((l) => l.daysToMaturity <= 90 || l.icr < l.icrCovenant).length;
                const breakClauses = p.assets.flatMap((a) => a.leases.filter((l) => {
                  if (!l.breakDate) return false;
                  const d = Math.round((new Date(l.breakDate).getTime() - today.getTime()) / 86400000);
                  return d > 0 && d <= 90;
                })).length;
                const expiringCompliance = p.assets.flatMap((a) => a.compliance.filter((c) => c.status !== "valid")).length;
                const alerts = urgentLoans + breakClauses + expiringCompliance;
                return (
                  <div
                    className="mb-8 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4"
                    style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
                  >
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Portfolio</div>
                      <div className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{p.shortName}</div>
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>{p.assets.length} assets</div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>AUM</div>
                      <div className="text-sm font-semibold" style={{ color: "#111827", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {fmtNum(aum, sym)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Opportunity</div>
                      <div className="text-sm font-semibold" style={{ color: "#F5A94A", fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif" }}>
                        {fmtNum(totalOpp, sym)}/yr
                      </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#9CA3AF" }}>Alerts</div>
                      <div className="text-sm font-semibold" style={{ color: alerts > 0 ? "#DC2626" : "#0A8A4C" }}>
                        {alerts > 0 ? `${alerts} action${alerts !== 1 ? "s" : ""} needed` : "All clear"}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Welcome state */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-4" style={{ backgroundColor: "#F0FDF4" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    {/* Chat bubble with sparkle — communicates AI chat */}
                    <path d="M3 5.5C3 4.12 4.12 3 5.5 3H18.5C19.88 3 21 4.12 21 5.5V14.5C21 15.88 19.88 17 18.5 17H13L8 21V17H5.5C4.12 17 3 15.88 3 14.5V5.5Z" stroke="#0A8A4C" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="8.5" cy="10" r="1" fill="#0A8A4C" />
                    <circle cx="12" cy="10" r="1" fill="#0A8A4C" />
                    <circle cx="15.5" cy="10" r="1" fill="#0A8A4C" />
                  </svg>
                </div>
                <h2
                  className="text-xl lg:text-2xl mb-2"
                  style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", color: "#111827" }}
                >
                  Ask RealHQ anything about your portfolio
                </h2>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  RealHQ has full context on every asset — income, costs, leases, compliance, and opportunities.
                </p>
              </div>

              {/* Suggested prompts — always 2-col so mobile doesn't require huge scroll */}
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="text-left rounded-xl text-xs font-semibold transition-all duration-150 hover:border-[#0A8A4C] hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", color: "#111827", padding: "12px 14px" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4 lg:space-y-6">
              {messages.map((msg, i) => {
                const isDone = msg.role === "assistant" && msg.content !== "" && !streaming;
                const actions = isDone ? detectActions(msg.content) : [];
                return (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                      {msg.role === "assistant" && (
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mr-3 mt-0.5"
                          style={{ backgroundColor: "#F0FDF4" }}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user" ? "rounded-tr-md" : "rounded-tl-md"
                        }`}
                        style={{
                          backgroundColor: msg.role === "user" ? "#1647E8" : "#fff",
                          color: "#111827",
                          border: msg.role === "assistant" ? "1px solid #E5E7EB" : "none",
                        }}
                      >
                        {msg.content === "" && msg.role === "assistant" ? (
                          <LoadingDots />
                        ) : (
                          <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                        )}
                      </div>
                    </div>
                    {actions.length > 0 && (
                      <div className="flex gap-2 mt-2 ml-10">
                        {actions.map((a) => (
                          <Link
                            key={a.href}
                            href={a.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80 hover:-translate-y-0.5"
                            style={{ backgroundColor: "#F0FDF4", color: "#0A8A4C", border: "1px solid #BBF7D0" }}
                          >
                            {a.label}
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="#0A8A4C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: "#FEF2F2", border: "1px solid #DC2626", color: "#DC2626" }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="shrink-0 px-4 lg:px-6 py-3 lg:py-4"
          style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#0B1622" }}
        >
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div
                className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-150 focus-within:border-[#1647E8]"
                style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
                  style={{
                    color: "#111827",
                    maxHeight: 120,
                    overflowY: "auto",
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                  disabled={streaming}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  className="shrink-0 h-11 w-11 rounded-lg flex items-center justify-center transition-all duration-150 hover:opacity-80 active:scale-[0.95] disabled:opacity-30"
                  style={{ backgroundColor: "#0A8A4C" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 13V3M3.5 7.5L8 3L12.5 7.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="hidden sm:block text-xs" style={{ color: "#D1D5DB" }}>
                  Enter to send · Shift+Enter for new line
                </p>
                <p className="sm:hidden text-xs" style={{ color: "#D1D5DB" }}>
                  Tap ↑ to send
                </p>
                {!isEmpty && (
                  <button
                    type="button"
                    onClick={() => { setMessages([]); setError(null); }}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: "#D1D5DB" }}
                  >
                    Clear chat
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

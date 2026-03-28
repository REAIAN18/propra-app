"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useNav } from "@/components/layout/NavContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { portfolioFinancing } from "@/lib/data/financing";

interface UserAskContext {
  assets: {
    name: string;
    assetType: string;
    location: string;
    grossIncome: number;
    netIncome: number;
    insurancePremium: number;
    energyCost: number;
    occupancy: number;
  }[];
  summary: {
    assetCount: number;
    totalGrossIncome: number;
    totalNetIncome: number;
    totalInsurancePremium: number;
    totalEnergyCost: number;
    markets: string[];
    sym: string;
  } | null;
  opportunities: {
    estimatedInsuranceSaving: number;
    estimatedEnergySaving: number;
    estimatedIncomePotential: number;
    totalOpportunity: number;
    formatted: {
      insuranceSaving: string;
      energySaving: string;
      incomePotential: string;
      totalOpportunity: string;
    };
  } | null;
}

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
  { label: "What is my portfolio worth?", prompt: "What is my portfolio worth if RealHQ unlocks everything it has identified?" },
];

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full animate-bounce"
          style={{
            backgroundColor: "var(--tx3, #555568)",
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
  const [userContext, setUserContext] = useState<UserAskContext | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (portfolioId === "user") {
      fetch("/api/user/ask-context")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setUserContext(data))
        .catch(() => null);
    } else {
      setUserContext(null);
    }
  }, [portfolioId]);

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
            msg = "AI analysis is not yet active on this account. Visit realhq.com to get your portfolio health check.";
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
    <>
      {/* Nav bar */}
      <nav style={{
        height: '52px',
        background: 'rgba(9,9,11,.88)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--bdr, #252533)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: '17px', color: 'var(--tx, #e4e4ec)' }}>
            Real<span style={{ color: 'var(--acc, #7c6af0)', fontStyle: 'italic' }}>HQ</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--bdr, #252533)' }} />
          <div style={{ font: '400 12px var(--font-dm-sans, sans-serif)', color: 'var(--tx3, #555568)' }}>
            <b style={{ color: 'var(--tx2, #8888a0)', fontWeight: 500 }}>
              {portfolioId === "user" ? "My Portfolio" : activePortfolio?.shortName || "Portfolio"}
            </b>
            {portfolioId === "user" && userContext?.summary && ` · ${userContext.summary.assetCount} asset${userContext.summary.assetCount !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => { setMessages([]); setError(null); }}
            style={{
              height: '30px',
              padding: '0 12px',
              background: 'transparent',
              color: 'var(--tx2, #8888a0)',
              border: '1px solid var(--bdr, #252533)',
              borderRadius: '7px',
              font: '500 11px/1 var(--font-dm-sans, sans-serif)',
              cursor: 'pointer',
            }}
          >
            New conversation
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: "var(--bg, #09090b)", minHeight: 'calc(100vh - 52px)' }}>
        {/* Suggested questions — shown when conversation is empty */}
        {isEmpty && (
          <div style={{ display: 'flex', gap: '8px', padding: '24px 32px 16px', flexWrap: 'wrap' }}>
            {SUGGESTED.slice(0, 6).map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                style={{
                  padding: '8px 14px',
                  background: 'var(--s2, #18181f)',
                  border: '1px solid var(--bdr, #252533)',
                  borderRadius: '8px',
                  font: '400 12px var(--font-dm-sans, sans-serif)',
                  color: 'var(--tx2, #8888a0)',
                  cursor: 'pointer',
                  transition: 'all .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--acc-bdr, rgba(124,106,240,.22))';
                  e.currentTarget.style.color = 'var(--tx, #e4e4ec)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--bdr, #252533)';
                  e.currentTarget.style.color = 'var(--tx2, #8888a0)';
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8" style={{ paddingTop: isEmpty ? '0' : '24px' }}>
          {!isEmpty && (
            <div className="max-w-3xl mx-auto space-y-5">{messages.map((msg, i) => {
                const isDone = msg.role === "assistant" && msg.content !== "" && !streaming;
                const actions = isDone ? detectActions(msg.content) : [];
                return (
                  <div key={i} style={{ marginBottom: '20px', maxWidth: '720px', marginLeft: msg.role === 'user' ? 'auto' : '0', marginRight: msg.role === 'assistant' ? 'auto' : '0' }}>
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        font: '400 13px/1.6 var(--font-dm-sans, sans-serif)',
                        background: msg.role === 'user' ? 'var(--acc, #7c6af0)' : 'var(--s1, #111116)',
                        color: msg.role === 'user' ? '#fff' : 'var(--tx, #e4e4ec)',
                        border: msg.role === 'assistant' ? '1px solid var(--bdr, #252533)' : 'none',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                      }}
                    >
                      {msg.content === "" && msg.role === "assistant" ? (
                        <LoadingDots />
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                      )}
                    </div>
                    {actions.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {actions.map((a) => (
                          <Link
                            key={a.href}
                            href={a.href}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: 'var(--acc-lt, rgba(124,106,240,.10))',
                              color: 'var(--acc, #7c6af0)',
                              border: '1px solid var(--acc-bdr, rgba(124,106,240,.22))',
                              borderRadius: '8px',
                              font: '500 11px var(--font-dm-sans, sans-serif)',
                              textDecoration: 'none',
                              transition: 'opacity .15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {a.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {error && (
                <div
                  style={{
                    padding: '12px 18px',
                    background: 'var(--red-lt, rgba(248,113,113,.07))',
                    border: '1px solid var(--red-bdr, rgba(248,113,113,.22))',
                    borderRadius: '10px',
                    font: '400 12px var(--font-dm-sans, sans-serif)',
                    color: 'var(--red, #f87171)',
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: '16px 32px',
            borderTop: '1px solid var(--bdr, #252533)',
            background: 'var(--s1, #111116)',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your portfolio..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none"
                  style={{
                    padding: '12px 16px',
                    background: 'var(--s2, #18181f)',
                    border: '1px solid var(--bdr, #252533)',
                    borderRadius: '10px',
                    font: '400 13px var(--font-dm-sans, sans-serif)',
                    color: 'var(--tx, #e4e4ec)',
                    maxHeight: 120,
                    overflowY: "auto",
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--acc-bdr, rgba(124,106,240,.22))'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--bdr, #252533)'}
                  disabled={streaming}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  style={{
                    padding: '12px 20px',
                    background: 'var(--acc, #7c6af0)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    font: '600 12px var(--font-dm-sans, sans-serif)',
                    cursor: 'pointer',
                    opacity: !input.trim() || streaming ? 0.3 : 1,
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={(e) => !streaming && input.trim() && (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => !streaming && input.trim() && (e.currentTarget.style.opacity = '1')}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ContextLink {
  label: string;
  href: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: ContextLink[];
}

interface AskPanelProps {
  /** If true, user has real assets — show the chat UI.
   *  If false, show the placeholder prompt instead. */
  hasAssets: boolean;
}

export function AskPanel({ hasAssets }: AskPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    // Add an empty assistant message that will fill via streaming
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/user/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: "Sorry — AI is temporarily unavailable. Please try again shortly." };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sources: ContextLink[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          try {
            const evt = JSON.parse(data) as { delta?: string; done?: boolean; sources?: ContextLink[] };
            if (evt.delta) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  text: next[next.length - 1].text + evt.delta!,
                };
                return next;
              });
            }
            if (evt.done) {
              sources = evt.sources ?? [];
            }
          } catch { /* skip */ }
        }
      }

      // Attach sources to final assistant message
      if (sources.length > 0) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], sources };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: "Connection error — please try again." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  if (!hasAssets) {
    return (
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
      >
        <div className="text-sm font-medium mb-1" style={{ color: "#111827" }}>Ask RealHQ AI</div>
        <div className="text-xs" style={{ color: "#9CA3AF" }}>
          Add your first property to ask questions about your portfolio.
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid #E5E7EB", backgroundColor: "#fff" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #F3F4F6" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold"
            style={{ backgroundColor: "#1647E8" }}
          >
            AI
          </span>
          <span className="text-sm font-semibold" style={{ color: "#111827" }}>Ask RealHQ AI</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] transition-opacity hover:opacity-70"
            style={{ color: "#9CA3AF" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Message thread */}
      {messages.length > 0 && (
        <div
          className="px-4 py-3 overflow-y-auto space-y-3"
          style={{ maxHeight: 320, backgroundColor: "#FAFAFA" }}
        >
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { backgroundColor: "#1647E8", color: "#fff" }
                    : { backgroundColor: "#fff", color: "#111827", border: "1px solid #E5E7EB" }
                }
              >
                {msg.text || (loading && i === messages.length - 1 ? (
                  <span className="flex gap-1 items-center" style={{ color: "#9CA3AF" }}>
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                  </span>
                ) : "")}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                    {msg.sources.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#EEF2FE", color: "#1647E8" }}
                      >
                        {s.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Empty state suggestions */}
      {messages.length === 0 && (
        <div className="px-4 py-3" style={{ backgroundColor: "#FAFAFA" }}>
          <div className="text-[10px] mb-2" style={{ color: "#9CA3AF" }}>Try asking:</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "What's my total opportunity?",
              "Which lease expires soonest?",
              "How much could I save on energy?",
              "What should I do first?",
            ].map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-70"
                style={{ backgroundColor: "#EEF2FE", color: "#1647E8" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{ borderTop: "1px solid #F3F4F6" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
          placeholder="Ask anything about your portfolio…"
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: "#111827" }}
          disabled={loading}
        />
        <button
          onClick={() => void submit()}
          disabled={loading || !input.trim()}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
          style={{
            backgroundColor: input.trim() && !loading ? "#1647E8" : "#E5E7EB",
            opacity: input.trim() && !loading ? 1 : 0.5,
          }}
          aria-label="Send"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M7 2l4 4-4 4" stroke={input.trim() && !loading ? "#fff" : "#9CA3AF"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

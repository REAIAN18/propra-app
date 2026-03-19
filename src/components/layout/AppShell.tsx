"use client";

import { useState, useEffect, useRef } from "react";
import { NavProvider, useNav } from "./NavContext";
import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

function QuickQuestionModal({
  company,
  onClose,
}: {
  company: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const pathname = usePathname();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), message: message.trim(), company: company || undefined, page: pathname }),
      });
    } catch {
      // best-effort
    }
    setSent(true);
    setSending(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="fixed bottom-16 right-4 lg:right-6 z-70 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: "#111e2e", border: "1px solid #1a2d45" }}
      >
        {!sent ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e8eef5" }}>
                  Quick question
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a7a96" }}>
                  We&apos;ll reply within a few hours.
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-lg leading-none transition-opacity hover:opacity-60 ml-3"
                style={{ color: "#5a7a96" }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
                onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                onBlur={(e) => (e.target.style.borderColor = "#1a2d45")}
              />
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like to know?"
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ backgroundColor: "#0B1622", border: "1px solid #1a2d45", color: "#e8eef5" }}
                onFocus={(e) => (e.target.style.borderColor = "#0A8A4C")}
                onBlur={(e) => (e.target.style.borderColor = "#1a2d45")}
              />
              <button
                type="submit"
                disabled={sending || !email.trim() || !message.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
              >
                {sending ? "Sending…" : "Send message →"}
              </button>
            </form>
          </>
        ) : (
          <div className="py-4 text-center">
            <div
              className="mx-auto mb-3 h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#0A8A4C" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: "#e8eef5" }}>Got it — we&apos;ll be in touch.</div>
            <div className="text-xs mb-4" style={{ color: "#5a7a96" }}>
              Usually within a few hours.
            </div>
            <button
              onClick={onClose}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: "#5a7a96" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function BottomBar() {
  const [company, setCompany] = useState("");
  const [opp, setOpp] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setCompany(localStorage.getItem("arca_company") ?? "");
    setOpp(parseInt(localStorage.getItem("arca_opp") ?? "0", 10));
  }, []);

  const fmtOpp = opp >= 1_000_000 ? `$${(opp / 1_000_000).toFixed(1)}M` : opp > 0 ? `$${Math.round(opp / 1000)}k` : "";

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 py-2.5 gap-3"
        style={{ backgroundColor: "#111e2e", borderTop: "1px solid #1a2d45" }}
      >
        <span className="text-xs truncate hidden sm:block" style={{ color: "#5a7a96" }}>
          {company ? (
            <>
              <span style={{ color: "#8ba0b8" }}>{company}</span>
              {fmtOpp && (
                <> &nbsp;·&nbsp; <span style={{ color: "#F5A94A" }}>{fmtOpp}/yr</span> estimated</>
              )}
              {" "}· demo data
            </>
          ) : (
            "This is a demo — data is illustrative."
          )}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
            style={{ backgroundColor: "transparent", color: "#8ba0b8", border: "1px solid #1a2d45" }}
          >
            Quick question
          </button>
          <a
            href="https://cal.com/arca/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Run on your portfolio →
          </a>
        </div>
      </div>

      {showModal && (
        <QuickQuestionModal company={company} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, closeSidebar } = useNav();

  return (
    <div className="flex min-h-screen pb-12" style={{ backgroundColor: "#0B1622" }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:pl-56 min-w-0">
        {children}
      </div>

      <BottomBar />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <AppShellInner>{children}</AppShellInner>
    </NavProvider>
  );
}

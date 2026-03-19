"use client";

import { useState, useEffect } from "react";
import { NavProvider, useNav } from "./NavContext";
import { Sidebar } from "./Sidebar";

function BottomBar() {
  const [company, setCompany] = useState("");
  const [opp, setOpp] = useState(0);

  useEffect(() => {
    setCompany(localStorage.getItem("arca_company") ?? "");
    setOpp(parseInt(localStorage.getItem("arca_opp") ?? "0", 10));
  }, []);

  const fmtOpp = opp >= 1_000_000 ? `$${(opp / 1_000_000).toFixed(1)}M` : opp > 0 ? `$${Math.round(opp / 1000)}k` : "";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 py-2.5 gap-3"
      style={{ backgroundColor: "#111e2e", borderTop: "1px solid #1a2d45" }}
    >
      <span className="text-xs truncate" style={{ color: "#5a7a96" }}>
        {company ? (
          <>
            <span style={{ color: "#8ba0b8" }}>{company}</span>
            {fmtOpp && (
              <> &nbsp;·&nbsp; <span style={{ color: "#F5A94A" }}>{fmtOpp}/yr</span> estimated opportunity</>
            )}
            {" "}· demo data
          </>
        ) : (
          "This is a demo — data is illustrative."
        )}
      </span>
      <a
        href="https://cal.com/arca/demo"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: "transparent", color: "#1647E8", border: "1px solid #1647E840" }}
      >
        Book a call →
      </a>
    </div>
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

      {/* Sidebar — always visible on lg+, slide-in on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Main content area — offset by sidebar width on lg+ */}
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

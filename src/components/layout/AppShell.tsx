"use client";

import { NavProvider, useNav } from "./NavContext";
import { Sidebar } from "./Sidebar";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, closeSidebar } = useNav();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0B1622" }}>
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

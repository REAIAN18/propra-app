"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "realhq_portfolio_id";

interface NavContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  portfolioId: string;
  setPortfolioId: (id: string) => void;
}

const NavContext = createContext<NavContextType>({
  sidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
  portfolioId: "fl-mixed",
  setPortfolioId: () => {},
});

export function useNav() {
  return useContext(NavContext);
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Initialise from localStorage so the chosen portfolio persists across pages
  const [portfolioId, setPortfolioIdState] = useState("fl-mixed");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Only honour stored value if it's a real non-user portfolio ID.
    // "user" is always re-validated below — a previously stored "user" with
    // no assets would produce an empty dashboard.
    if (stored && stored !== "fl-mixed" && stored !== "user") {
      setPortfolioIdState(stored);
      return;
    }
    // Check whether this user has real assets; if so, switch to their own portfolio.
    // If not, stay on the demo portfolio so every page shows meaningful data.
    fetch("/api/portfolios/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id && Array.isArray(data?.assets) && data.assets.length > 0) {
          setPortfolioIdState(data.id);
          try { localStorage.setItem(STORAGE_KEY, data.id); } catch { /* ignore */ }
        } else {
          // No real assets — use demo portfolio and clear any stale "user" entry
          const fallback = stored && stored !== "user" ? stored : "fl-mixed";
          setPortfolioIdState(fallback);
          try { if (stored === "user") localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        }
      })
      .catch(() => {
        if (stored && stored !== "user") setPortfolioIdState(stored);
      });
  }, []);

  const setPortfolioId = useCallback((id: string) => {
    setPortfolioIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* SSR/private browsing */ }
  }, []);

  return (
    <NavContext.Provider
      value={{
        sidebarOpen,
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
        portfolioId,
        setPortfolioId,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

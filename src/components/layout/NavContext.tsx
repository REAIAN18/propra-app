"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "arca_portfolio_id";

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
    if (stored && stored !== "fl-mixed") {
      // Already switched to a custom portfolio — honour it
      setPortfolioIdState(stored);
      return;
    }
    // Check whether this user has real assets; if so, switch to their own portfolio
    fetch("/api/portfolios/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setPortfolioIdState(data.id);
          try { localStorage.setItem(STORAGE_KEY, data.id); } catch { /* ignore */ }
        } else if (stored) {
          setPortfolioIdState(stored);
        }
      })
      .catch(() => {
        if (stored) setPortfolioIdState(stored);
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

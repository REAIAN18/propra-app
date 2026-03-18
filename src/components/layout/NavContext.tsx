"use client";

import { createContext, useContext, useState } from "react";

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
  const [portfolioId, setPortfolioId] = useState("fl-mixed");

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

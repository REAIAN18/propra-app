"use client";

import { createContext, useContext, useState } from "react";

interface NavContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const NavContext = createContext<NavContextType>({
  sidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function useNav() {
  return useContext(NavContext);
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NavContext.Provider
      value={{
        sidebarOpen,
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

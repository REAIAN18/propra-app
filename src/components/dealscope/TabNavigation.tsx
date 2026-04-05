"use client";

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import s from "./TabNavigation.module.css";

export type DealScopeTab = "overview" | "property" | "planning" | "financials" | "documents";

export interface TabDef {
  id: DealScopeTab;
  label: string;
}

const DEFAULT_TABS: TabDef[] = [
  { id: "overview",   label: "Overview" },
  { id: "property",   label: "Property" },
  { id: "planning",   label: "Planning" },
  { id: "financials", label: "Financials" },
  { id: "documents",  label: "Documents" },
];

interface TabNavigationProps {
  /** Override the default 4 tabs */
  tabs?: TabDef[];
  /** Initial active tab (uncontrolled). Defaults to first tab or ?tab= param. */
  defaultTab?: DealScopeTab;
  /** Controlled active tab */
  activeTab?: DealScopeTab;
  /** Callback when tab changes */
  onTabChange?: (tab: DealScopeTab) => void;
  /** Tab panel content keyed by tab id */
  children?: Partial<Record<DealScopeTab, React.ReactNode>>;
  /** Sync active tab to ?tab= URL search param (default: true) */
  syncUrl?: boolean;
}

export function TabNavigation({
  tabs = DEFAULT_TABS,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  children,
  syncUrl = true,
}: TabNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getInitialTab = (): DealScopeTab => {
    if (controlledTab) return controlledTab;
    if (syncUrl) {
      const param = searchParams.get("tab") as DealScopeTab | null;
      if (param && tabs.some(t => t.id === param)) return param;
    }
    return defaultTab ?? tabs[0].id;
  };

  const [internalTab, setInternalTab] = useState<DealScopeTab>(getInitialTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = controlledTab ?? internalTab;

  const switchTab = (id: DealScopeTab) => {
    if (!controlledTab) setInternalTab(id);
    onTabChange?.(id);
    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  // Sync from URL when search params change externally
  useEffect(() => {
    if (!syncUrl || controlledTab) return;
    const param = searchParams.get("tab") as DealScopeTab | null;
    if (param && tabs.some(t => t.id === param) && param !== internalTab) {
      setInternalTab(param);
    }
  }, [searchParams, syncUrl, controlledTab, tabs, internalTab]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const tabCount = tabs.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabCount;
    if (e.key === "ArrowLeft")  next = (index - 1 + tabCount) % tabCount;
    if (e.key === "Home")       next = 0;
    if (e.key === "End")        next = tabCount - 1;
    if (next >= 0) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
      switchTab(tabs[next].id);
    }
  };

  return (
    <>
      <nav
        className={s.nav}
        role="tablist"
        aria-label="DealScope analysis tabs"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[i] = el; }}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`${s.tab}${active === tab.id ? ` ${s.tabActive}` : ""}`}
            onClick={() => switchTab(tab.id)}
            onKeyDown={e => handleKeyDown(e, i)}
            tabIndex={active === tab.id ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {children && tabs.map(tab => (
        active === tab.id && children[tab.id] ? (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            className={s.content}
          >
            {children[tab.id]}
          </div>
        ) : null
      ))}
    </>
  );
}

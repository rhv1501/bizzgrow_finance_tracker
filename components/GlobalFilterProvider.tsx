"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type GlobalFilter = {
  month: number; // 1-12 or 0 for "All"
  year: number;  // e.g., 2026 or 0 for "All"
  setFilter: (f: { month: number; year: number }) => void;
};

const GlobalFilterContext = createContext<GlobalFilter>({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  setFilter: () => {},
});

export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  return (
    <GlobalFilterContext.Provider value={{ ...filter, setFilter: setFilterState }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  return useContext(GlobalFilterContext);
}

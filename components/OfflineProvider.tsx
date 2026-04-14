"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type OfflineContextType = {
  isOffline: boolean;
};

const OfflineContext = createContext<OfflineContextType>({ isOffline: false });

export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration);
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });
      });
    }

    // Connectivity monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline }}>
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 transform ${isOffline ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-md text-amber-950 dark:text-amber-50 text-[10px] font-black uppercase tracking-[0.3em] py-1.5 text-center shadow-lg border-b border-amber-400/20">
          Connectivity Lost: Strictly Read-Only Mode Active
        </div>
      </div>
      <div className={`transition-all duration-500 ${isOffline ? "pt-8" : ""}`}>{children}</div>
    </OfflineContext.Provider>
  );
}

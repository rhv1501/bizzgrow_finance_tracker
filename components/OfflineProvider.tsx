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
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-[11px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-md border-b border-amber-600/20">
          Offline Mode: Read-Only Access
        </div>
      )}
      <div className={isOffline ? "pt-6" : ""}>{children}</div>
    </OfflineContext.Provider>
  );
}

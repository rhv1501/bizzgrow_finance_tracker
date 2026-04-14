"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Role, User } from "@/lib/types";
import { fetchJson } from "@/lib/client-utils";

type SessionState = {
  user: User | null;
  role: Role;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  user: null,
  role: "employee",
  loading: true,
  error: null,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("employee");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSession() {
    try {
      setLoading(true);
      const result = await fetchJson<{ user: User & { role: Role } }>("/api/auth/me");
      setUser(result.user);
      setRole(result.user.role || "employee");
      localStorage.setItem("ft_session", JSON.stringify(result));
      setError(null);
    } catch (err) {
      // Try to load from cache if offline or error
      const cached = localStorage.getItem("ft_session");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser(parsed.user);
          setRole(parsed.user.role || "employee");
        } catch (e) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to load session");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider 
      value={{ 
        user, 
        role, 
        loading, 
        error, 
        refresh: fetchSession 
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

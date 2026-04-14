"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/client-utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AlertCircle } from "lucide-react";

type MeResponse = {
  requiresPasswordChange?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const result = await fetchJson<MeResponse>("/api/auth/me");
        router.replace(
          result.requiresPasswordChange ? "/change-password" : (result.user.role === "employee" ? "/reimbursements" : "/")
        );
      } catch {
        // Not logged in; stay on login page.
      } finally {
        setCheckingSession(false);
      }
    }

    void checkSession();
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await fetchJson<{ requiresPasswordChange?: boolean; user: { role: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );

      if (result.requiresPasswordChange) {
        router.push("/change-password");
        router.refresh();
        return;
      }

      router.push(result.user.role === "employee" ? "/reimbursements" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md animate-pulse rounded-2xl border border-border bg-card p-6 shadow-sm h-64" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradients for premium feel */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-border bg-card/75 backdrop-blur-3xl p-8 shadow-2xl shadow-slate-200/60 dark:shadow-none ring-1 ring-white/30">
        <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                <svg className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <p className="font-black text-xs tracking-[0.4em] text-amber-700 dark:text-amber-500 uppercase">
                Finance Tracker Pro
            </p>
            <h1 className="mt-2 text-4xl font-black text-foreground tracking-tight">Sign In</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 text-center font-medium">
                Access your BizzGrow workspace to manage financial operations.
            </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 px-4 py-3 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3 font-semibold shadow-sm">
             <AlertCircle className="h-5 w-5 shrink-0 text-rose-900 dark:text-rose-200" />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-900 dark:text-zinc-400 tracking-widest px-1">Email Address</label>
            <input
                type="email"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                placeholder="info@bizzgrowlabs.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-900 dark:text-zinc-400 tracking-widest px-1">Secret Key</label>
            <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={submitting}
            />
          </div>
          <button
            type="submit"
            className="w-full mt-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20"
            disabled={submitting}
          >
            {submitting ? "Verifying..." : "Continue"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-black text-slate-700 dark:text-zinc-500 uppercase tracking-widest">
            &copy; 2026 BizzGrow Labs. Locked Environment.
        </p>
      </div>
    </main>
  );
}

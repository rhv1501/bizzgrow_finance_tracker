"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/client-utils";

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
          result.requiresPasswordChange ? "/change-password" : "/",
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
      const result = await fetchJson<{ requiresPasswordChange?: boolean }>(
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

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#e0f2fe_35%,#f8fafc_70%)] px-4 py-10">
        <div className="mx-auto max-w-md animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 h-8 w-32 rounded bg-slate-200" />
          <div className="h-4 w-52 rounded bg-slate-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#e0f2fe_35%,#f8fafc_70%)] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-mono text-xs tracking-widest text-amber-700">
          FINANCE TRACKER PRO
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use your BizzGrow account credentials to continue.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="user@bizzgrow.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={submitting}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            First-time admin login: <strong>admin@bizzgrow.com</strong> /{" "}
            <strong>Admin@123</strong>
          </div>
        </form>
      </div>
    </main>
  );
}

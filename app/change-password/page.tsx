"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/client-utils";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess("Password updated successfully. Redirecting...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-amber-500/10 blur-[100px] rounded-full" />
      
      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-border bg-card/50 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
            </div>
            <p className="font-black text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Security Update
            </p>
            <h1 className="mt-2 text-3xl font-black text-foreground">Change Password</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
                Your account requires a password update before you can continue.
            </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 px-4 py-3 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-3">
             <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-400 flex items-center gap-3">
             <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Current Password</label>
            <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                placeholder="Current Secret Key"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">New Password</label>
            <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                placeholder="New Secret Key (min 8 chars)"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
                disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Verify Password</label>
            <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                placeholder="Confirm New Secret Key"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                disabled={submitting}
            />
          </div>
          <button
            type="submit"
            className="w-full mt-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20"
            disabled={submitting}
          >
            {submitting ? "Updating Security..." : "Secure Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Identity Protection Active
        </p>
      </div>
    </main>
  );
}

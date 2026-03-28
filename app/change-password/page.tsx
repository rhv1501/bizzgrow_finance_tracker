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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#e0f2fe_35%,#f8fafc_70%)] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-mono text-xs tracking-widest text-amber-700">
          SECURITY UPDATE
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Change Password
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Your account requires a password update before continuing.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
            disabled={submitting}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            disabled={submitting}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

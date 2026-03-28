"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownCharts } from "@/components/Charts";
import { StatCard } from "@/components/StatCard";
import { fetchJson } from "@/lib/client-utils";
import { Role, SummaryResponse } from "@/lib/types";

type SummaryApiResponse = {
  role: Role;
  usingMockDb: boolean;
  summary: SummaryResponse;
};

const emptySummary: SummaryResponse = {
  totalIncome: 0,
  advanceReceived: 0,
  pendingPayments: 0,
  totalExpenses: 0,
  profit: 0,
  expensesByCategory: [],
  expensesByPerson: [],
};

export default function DashboardPage() {
  const [role, setRole] = useState<Role>("viewer");
  const [usingMockDb, setUsingMockDb] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse>(emptySummary);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await fetchJson<SummaryApiResponse>("/api/summary");
        setRole(result.role);
        setUsingMockDb(result.usingMockDb);
        setSummary(result.summary);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AppShell
      title="Business Dashboard"
      subtitle="Income, expenses, pending payments, and live profitability in one screen"
      role={role}
      setRole={setRole}
    >
      {usingMockDb && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Running in `MOCK_DB` mode. Set Google Sheets credentials in
          `.env.local` to use production data.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 shrink-0 font-semibold hover:text-rose-700"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
                <div className="h-8 w-32 rounded bg-slate-200" />
              </div>
            ))}
          </section>
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-48" />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total Income"
              value={summary.totalIncome}
              tone="positive"
            />
            <StatCard
              label="Advance Received"
              value={summary.advanceReceived}
              tone="positive"
            />
            <StatCard
              label="Pending Payments"
              value={summary.pendingPayments}
              tone="negative"
            />
            <StatCard
              label="Total Expenses"
              value={summary.totalExpenses}
              tone="negative"
            />
            <StatCard
              label="Profit"
              value={summary.profit}
              tone={summary.profit >= 0 ? "positive" : "negative"}
            />
          </section>

          <ExpenseBreakdownCharts
            byCategory={summary.expensesByCategory}
            byPerson={summary.expensesByPerson}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold">Smart Suggestions</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                Track every income entry with payment status to reduce cash flow
                blind spots.
              </li>
              <li>
                Use categories consistently (`Asset`, `Operations`, `Travel`,
                `Marketing`) for cleaner analytics.
              </li>
              <li>
                Review pending payments weekly and send reminders from the
                Income page.
              </li>
              <li>
                Keep team roles strict: Admin full control, Manager operations,
                Staff entries, Viewer read-only.
              </li>
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}

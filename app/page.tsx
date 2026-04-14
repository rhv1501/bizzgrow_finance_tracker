"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownCharts } from "@/components/Charts";
import { StatCard } from "@/components/StatCard";
import { fetchJson } from "@/lib/client-utils";
import { useSession } from "@/components/SessionProvider";
import { SummaryResponse } from "@/lib/types";

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
  const [summary, setSummary] = useState<SummaryResponse>(emptySummary);
  const [error, setError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoadingContent(true);
        const result = await fetchJson<{ summary: SummaryResponse }>("/api/summary");
        setSummary(result.summary);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        setLoadingContent(false);
      }
    }

    load();
  }, []);

  return (
    <AppShell
      title="Business Dashboard"
      subtitle="Income, expenses, pending payments, and live profitability. Track everything in one screen"
    >
      {error && (
        <div className="mb-4 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 text-sm text-rose-900 dark:text-rose-200 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-4 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss error"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {loadingContent ? (
        <div className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-2 h-3 w-24 rounded bg-muted" />
                <div className="h-8 w-32 rounded bg-muted" />
              </div>
            ))}
          </section>
          <div className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-sm h-64" />
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

          <section className="rounded-2xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur-sm">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Smart Suggestions
            </h3>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
                <span>Track every income entry with payment status to reduce cash flow blind spots.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</span>
                <span>Use categories consistently (`Software`, `Marketing`, `Office`, `Travel`) for cleaner analytics.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3</span>
                <span>Review pending payments weekly and send reminders from the Income page.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">4</span>
                <span>Keep team roles strict: Admin full control, Manager operations, Employee reimbursements only.</span>
              </li>
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}

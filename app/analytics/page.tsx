"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TrendCharts } from "@/components/Charts";
import { fetchJson } from "@/lib/client-utils";
import { useSession } from "@/components/SessionProvider";
import { AnalyticsResponse } from "@/lib/types";

const emptyAnalytics: AnalyticsResponse = {
  monthlyIncome: [],
  monthlyExpenses: [],
  clientRevenue: [],
  expenseCategory: [],
};

export default function AnalyticsPage() {
  const { role } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canDownload = useMemo(
    () => ["admin", "manager"].includes(role),
    [role],
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await fetchJson<{ analytics: AnalyticsResponse }>(
          "/api/analytics",
        );
        setAnalytics(result.analytics);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function downloadMonthlyReport() {
    const rows = [
      ["Month", "Income", "Expenses", "Profit"],
      ...Array.from(
        new Set([
          ...analytics.monthlyIncome.map((entry) => entry.month),
          ...analytics.monthlyExpenses.map((entry) => entry.month),
        ]),
      )
        .sort()
        .map((month) => {
          const income =
            analytics.monthlyIncome.find((entry) => entry.month === month)
              ?.amount ?? 0;
          const expense =
            analytics.monthlyExpenses.find((entry) => entry.month === month)
              ?.amount ?? 0;
          return [month, income, expense, income - expense];
        }),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Analytics"
      subtitle="Visualize historical performance and predict future cash flows"
    >
      {error && (
        <div className="mb-4 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-3 text-sm text-rose-900 dark:text-rose-200">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 shrink-0 font-bold hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {canDownload && (
        <div className="mb-6">
          <button
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 flex items-center gap-2"
            onClick={downloadMonthlyReport}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Report
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-sm h-64"
            />
          ))}
        </div>
      ) : (
        <TrendCharts
          monthlyIncome={analytics.monthlyIncome}
          monthlyExpenses={analytics.monthlyExpenses}
          clientRevenue={analytics.clientRevenue}
          expenseCategory={analytics.expenseCategory}
        />
      )}
    </AppShell>
  );
}

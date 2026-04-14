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

      {canDownload && (
        <div className="mb-4">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={downloadMonthlyReport}
          >
            Download Monthly Report (CSV)
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-64"
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

"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownCharts } from "@/components/Charts";
import { StatCard } from "@/components/StatCard";
import { fetchJson, formatCurrency } from "@/lib/client-utils";
import { useSession } from "@/components/SessionProvider";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { SummaryResponse, PeriodStats } from "@/lib/types";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const emptyStats: PeriodStats = { revenue: 0, expenses: 0, profit: 0 };

const emptySummary: SummaryResponse = {
  totalIncome: 0,
  advanceReceived: 0,
  pendingPayments: 0,
  totalExpenses: 0,
  profit: 0,
  thisWeek: emptyStats,
  thisMonth: emptyStats,
  thisYear: emptyStats,
  lifetime: emptyStats,
  expensesByCategory: [],
  expensesByPerson: [],
};

export default function DashboardPage() {
  const { month, year } = useGlobalFilter();
  const [summary, setSummary] = useState<SummaryResponse>(emptySummary);
  const [error, setError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [activeTab, setActiveTab] = useState<"week" | "month" | "year" | "lifetime">("month");

  useEffect(() => {
    async function load() {
      try {
        setLoadingContent(true);
        const result = await fetchJson<{ summary: SummaryResponse }>(`/api/summary?month=${month}&year=${year}`);
        setSummary(result.summary);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        setLoadingContent(false);
      }
    }

    load();
  }, [month, year]);

  const activeStats = useMemo(() => {
    switch (activeTab) {
      case "week": return summary.thisWeek;
      case "month": return summary.thisMonth;
      case "year": return summary.thisYear;
      case "lifetime": return summary.lifetime;
      default: return summary.thisMonth;
    }
  }, [activeTab, summary]);

  const periodLabel = useMemo(() => {
    const now = new Date();
    if (activeTab === "week") {
      const start = startOfWeek(now, { weekStartsOn: 0 });
      const end = endOfWeek(now, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
    }
    if (activeTab === "month") {
      const date = new Date(year || now.getFullYear(), (month || now.getMonth() + 1) - 1);
      return format(date, "MMMM yyyy");
    }
    if (activeTab === "year") {
      return `Year ${year || now.getFullYear()}`;
    }
    return "All Time";
  }, [activeTab, month, year]);

  const tabs = [
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "lifetime", label: "Lifetime" },
  ] as const;

  return (
    <AppShell
      title="Business Dashboard"
      subtitle="Strategic overview of your financial health and profitability"
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/50 backdrop-blur-md p-4 text-sm text-rose-900 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600">!</span>
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
          </div>
        )}

        {/* Primary Health Metrics (Lifetime/Context) */}
        {!loadingContent && (
            <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Total Revenue" value={summary.totalIncome} tone="positive" />
                <StatCard label="Total Expenses" value={summary.totalExpenses} tone="negative" />
                <StatCard label="Net Profit" value={summary.profit} tone={summary.profit >= 0 ? "positive" : "negative"} />
                <StatCard label="Advance Pool" value={summary.advanceReceived} tone="neutral" />
                <StatCard label="Outstanding" value={summary.pendingPayments} tone="negative" />
            </section>
        )}

        {/* Period Performance Section */}
        <section className="rounded-3xl glass-card p-1 shadow-2xl transition-all duration-500 hover:shadow-primary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 pb-0 gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black tracking-tight text-foreground flex flex-wrap items-center gap-2">
                Performance Breakdown
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  {periodLabel}
                </span>
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wide opacity-70">
                Detailed insights for the selected calendar period
              </p>
            </div>
            
            <div className="flex p-1 bg-muted/50 rounded-2xl border border-border/50 self-start overflow-x-auto max-w-full no-scrollbar">
              <div className="flex gap-1 min-w-max">
                {tabs.map((tab) => (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap ${
                        activeTab === tab.id
                        ? "bg-foreground text-background shadow-lg shadow-foreground/10 translate-y-[-1px]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    >
                    {tab.label}
                    </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {loadingContent ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl bg-muted/30 animate-pulse border border-border/50" />
                    ))
                    ) : (
                        <>
                            {/* Simplified Period Cards */}
                            <div className="group relative overflow-hidden rounded-2xl glass-card border-emerald-500/20 bg-emerald-500/5 p-6 transition-all duration-500 hover:bg-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 opacity-60">Revenue</p>
                                <p className="mt-2 text-4xl font-black tracking-tighter text-emerald-700 dark:text-emerald-400">
                                    {formatCurrency(activeStats.revenue)}
                                </p>
                                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl glass-card border-rose-500/20 bg-rose-500/5 p-6 transition-all duration-500 hover:bg-rose-500/10 hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 opacity-60">Expenses</p>
                                <p className="mt-2 text-4xl font-black tracking-tighter text-rose-700 dark:text-rose-400">
                                    {formatCurrency(activeStats.expenses)}
                                </p>
                                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            </div>

                            <div className={`group relative overflow-hidden rounded-2xl glass-card ${activeStats.profit >= 0 ? 'border-primary/20 bg-primary/5' : 'border-rose-500/20 bg-rose-500/5'} p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Operating Profit</p>
                                <p className={`mt-2 text-4xl font-black tracking-tighter ${activeStats.profit >= 0 ? 'text-primary' : 'text-rose-700 dark:text-rose-400'}`}>
                                    {formatCurrency(activeStats.profit)}
                                </p>
                                <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${activeStats.profit >= 0 ? 'bg-primary/10' : 'bg-rose-500/10'} blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Content Section - Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
                <ExpenseBreakdownCharts
                    byCategory={summary.expensesByCategory}
                    byPerson={summary.expensesByPerson}
                />
            </div>
            <div className="lg:col-span-4 space-y-6">
                <section className="h-full rounded-2xl glass-card p-6 shadow-sm transition-all hover:bg-card/50">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 mb-6">
                        <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Growth Strategies
                    </h3>
                    <ul className="space-y-6 text-[13px] font-medium text-muted-foreground">
                        <li className="flex gap-4">
                            <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">1</span>
                            <span className="leading-relaxed">Track every income entry with payment status to reduce cash flow blind spots.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">2</span>
                            <span className="leading-relaxed">Use categories consistently (`Software`, `Marketing`, `Office`, `Travel`) for cleaner analytics.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">3</span>
                            <span className="leading-relaxed">Review pending payments weekly and send reminders from the Income page.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">4</span>
                            <span className="leading-relaxed">Keep team roles strict: Admin full control, Manager operations, Employee reimbursements only.</span>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
      </div>
    </AppShell>
  );
}

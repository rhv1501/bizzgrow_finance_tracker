"use client";

import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, fetchJson } from "@/lib/client-utils";
import { useSession } from "@/components/SessionProvider";

export default function ReportsPage() {
  const { role, loading: sessionLoading } = useSession();
  const { month, year } = useGlobalFilter();

  const [rawIncome, setRawIncome] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    setDataLoading(true);
    Promise.all([
      supabase.from("income").select("*"),
      supabase.from("expenses").select("*")
    ]).then(([incRes, expRes]) => {
      if (incRes.data) setRawIncome(incRes.data);
      if (expRes.data) setRawExpenses(expRes.data);
      setDataLoading(false);
    });

    const channel = supabase.channel("reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, () => {
        supabase.from("income").select("*").then(({ data }) => {
          if (data) setRawIncome(data);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        supabase.from("expenses").select("*").then(({ data }) => {
          if (data) setRawExpenses(data);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const { income, expenses, journal } = useMemo(() => {
    let inc = rawIncome;
    let exp = rawExpenses;

    if (month > 0) {
      inc = inc.filter(r => new Date(r.date).getMonth() + 1 === month);
      exp = exp.filter(r => new Date(r.date).getMonth() + 1 === month);
    }
    if (year > 0) {
      inc = inc.filter(r => new Date(r.date).getFullYear() === year);
      exp = exp.filter(r => new Date(r.date).getFullYear() === year);
    }

    const merged = [
      ...inc.map(i => ({ ...i, type: "Income" as const, ref: (i.client_name || 'Missing Client') + " - " + (i.service_type || 'Unknown Service') })),
      ...exp.map(e => ({ ...e, type: "Expense" as const, ref: (e.item || 'Missing Item') + " (" + (e.category || 'Unknown Category') + ")" }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { income: inc, expenses: exp, journal: merged };
  }, [rawIncome, rawExpenses, month, year]);

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;

  const advanceReceived = income.filter(i => i.status === "Advance").reduce((sum, i) => sum + i.amount, 0);
  const pendingPayments = income.filter(i => i.status === "To be paid").reduce((sum, i) => sum + i.amount, 0);

  function exportCSV() {
    const header = "Date,Type,Reference,Amount,Notes\n";
    const rows = journal.map(j => `"${j.date}","${j.type}","${j.ref}",${j.amount},"${(j.notes || "").replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_report_${year}_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (!sessionLoading && role !== "admin" && role !== "manager") {
    return (
      <AppShell title="Reports" subtitle="Access Denied">
        <div className="p-6 text-center text-slate-500">You do not have permission to view reports.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Financial Reports" subtitle="P&L, Journal, and Balance Sheet">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Financial Statements</h2>
        <button 
          onClick={exportCSV}
          className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* P&L Statement */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Profit & Loss Statement</h2>
          {dataLoading ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-6 bg-slate-100 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Total Income</span>
                <span className="font-medium text-foreground">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Total Expenses</span>
                <span className="font-medium text-rose-600 dark:text-rose-400">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-bold">
                <span className="text-foreground">Net Profit</span>
                <span className={profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {formatCurrency(profit)}
                </span>
                </div>
            </div>
          )}
        </div>

        {/* Balance Sheet Summary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Balance Sheet Summary</h2>
          {dataLoading ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-6 bg-slate-100 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground font-medium">Accounts Receivable (Pending)</span>
                <span className="font-bold text-foreground">{formatCurrency(pendingPayments)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground font-medium">Liabilities (Advance Received)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(advanceReceived)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                <span className="text-muted-foreground font-medium">Retained Earnings (Profit)</span>
                <span className={profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {formatCurrency(profit)}
                </span>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Journal */}
      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Chronological Journal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted text-left text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4 text-right">Debit / Out</th>
                <th className="px-6 py-4 text-right">Credit / In</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border animate-pulse">
                         <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-muted rounded w-3/4 mx-auto"></div></td>
                    </tr>
                 ))
              ) : journal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">No transactions found for this period.</td>
                </tr>
              ) : journal.map((row, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${row.type === 'Income' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">{row.ref}</td>
                  <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400">{row.type === "Expense" ? formatCurrency(row.amount) : "-"}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">{row.type === "Income" ? formatCurrency(row.amount) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

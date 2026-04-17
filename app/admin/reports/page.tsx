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
          className="glass-btn glass-btn-success w-full sm:w-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* P&L Statement */}
        <div className="rounded-3xl glass-card p-6 shadow-2xl transition-all hover:shadow-primary/5">
          <div className="flex items-center gap-2 mb-6 text-foreground">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <h3 className="text-sm font-black uppercase tracking-widest">Profit & Loss Statement</h3>
          </div>
          {dataLoading ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted/20 rounded w-full"></div>
                <div className="h-4 bg-muted/20 rounded w-full"></div>
                <div className="h-6 bg-muted/20 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-4 text-sm font-bold">
                <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Total Revenue</span>
                <span className="text-foreground tracking-tight">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Total Overhead</span>
                <span className="text-rose-600 dark:text-rose-400 tracking-tight">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between pt-2 text-xl font-black">
                <span className="text-foreground tracking-tighter">Net Earnings</span>
                <span className={profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {formatCurrency(profit)}
                </span>
                </div>
            </div>
          )}
        </div>

        {/* Balance Sheet Summary */}
        <div className="rounded-3xl glass-card p-6 shadow-2xl transition-all hover:shadow-primary/5">
           <div className="flex items-center gap-2 mb-6 text-foreground">
             <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
             <h3 className="text-sm font-black uppercase tracking-widest">Financial Health</h3>
          </div>
          {dataLoading ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted/20 rounded w-full"></div>
                <div className="h-4 bg-muted/20 rounded w-full"></div>
                <div className="h-6 bg-muted/20 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-4 text-sm font-bold">
                <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Receivables</span>
                <span className="text-foreground tracking-tight">{formatCurrency(pendingPayments)}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Liabilities</span>
                <span className="text-amber-600 dark:text-amber-400 tracking-tight">{formatCurrency(advanceReceived)}</span>
                </div>
                <div className="flex justify-between pt-2">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Accumulated Equity</span>
                <span className={profit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-black tracking-tight" : "text-rose-600 dark:text-rose-400 font-black tracking-tight"}>
                    {formatCurrency(profit)}
                </span>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Journal */}
      <div className="mt-8 rounded-3xl glass-card overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/5">
        <div className="glass-header px-8 py-5 border-b border-border/30">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Chronological Business Journal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-left text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border/20">
              <tr>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Reference</th>
                <th className="px-8 py-5 text-right">Debit / Out</th>
                <th className="px-8 py-5 text-right">Credit / In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {dataLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                         <td colSpan={5} className="px-8 py-5"><div className="h-4 bg-muted/20 rounded w-3/4 mx-auto"></div></td>
                    </tr>
                 ))
              ) : journal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-muted-foreground italic tracking-wide">No transactions found for this period.</td>
                </tr>
              ) : journal.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 dark:hover:bg-white/5 transition-all">
                  <td className="px-8 py-5 whitespace-nowrap text-muted-foreground font-medium">{formatDate(row.date)}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border ${row.type === 'Income' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-black text-foreground tracking-tight">{row.ref}</td>
                  <td className="px-8 py-5 text-right font-black text-rose-600 dark:text-rose-400">{row.type === "Expense" ? formatCurrency(row.amount) : "-"}</td>
                  <td className="px-8 py-5 text-right font-black text-emerald-600 dark:text-emerald-400">{row.type === "Income" ? formatCurrency(row.amount) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

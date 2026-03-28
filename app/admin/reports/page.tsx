"use client";

import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { formatCurrency, formatDate, fetchJson } from "@/lib/client-utils";
import { Role } from "@/lib/types";

export default function ReportsPage() {
  const [role, setRole] = useState<Role>("viewer");
  const { month, year } = useGlobalFilter();

  useEffect(() => {
    fetchJson<any>("/api/auth/me").then(res => setRole(res?.user?.role || "viewer")).catch(() => {
      const cached = localStorage.getItem("ft_session");
      if (cached) setRole(JSON.parse(cached)?.user?.role || "viewer");
    });
  }, []);

  const rawIncome = useLiveQuery(() => db.income.toArray()) || [];
  const rawExpenses = useLiveQuery(() => db.expenses.toArray()) || [];

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
      ...inc.map(i => ({ ...i, type: "Income" as const, ref: i.client_name + " - " + i.service_type })),
      ...exp.map(e => ({ ...e, type: "Expense" as const, ref: e.item + " (" + e.category + ")" }))
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

  if (role !== "admin" && role !== "manager") {
    return (
      <AppShell title="Reports" subtitle="Access Denied" role={role} setRole={setRole}>
        <div className="p-6 text-center text-slate-500">You do not have permission to view reports.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Financial Reports" subtitle="P&L, Journal, and Balance Sheet" role={role} setRole={setRole}>
      <div className="mb-6 flex justify-end">
        <button 
          onClick={exportCSV}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Download CSV
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* P&L Statement */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Profit & Loss Statement</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-600">Total Income</span>
              <span className="font-medium text-slate-900">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-600">Total Expenses</span>
              <span className="font-medium text-rose-600">-{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <span>Net Profit</span>
              <span className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatCurrency(profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Sheet Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Balance Sheet Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-600">Accounts Receivable (Pending)</span>
              <span className="font-medium text-slate-900">{formatCurrency(pendingPayments)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-600">Liabilities (Advance Received)</span>
              <span className="font-medium text-amber-600">{formatCurrency(advanceReceived)}</span>
            </div>
            <div className="flex justify-between pt-2 font-medium">
              <span className="text-slate-600">Retained Earnings (Profit)</span>
              <span className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatCurrency(profit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Chronological Journal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3 text-right">Debit / Out</th>
                <th className="px-6 py-3 text-right">Credit / In</th>
              </tr>
            </thead>
            <tbody>
              {journal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No transactions found for this period.</td>
                </tr>
              ) : journal.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-6 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${row.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-6 py-3">{row.ref}</td>
                  <td className="px-6 py-3 text-right text-rose-600">{row.type === "Expense" ? formatCurrency(row.amount) : "-"}</td>
                  <td className="px-6 py-3 text-right text-emerald-600">{row.type === "Income" ? formatCurrency(row.amount) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

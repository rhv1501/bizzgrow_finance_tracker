"use client";
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { mutateLocal } from "@/lib/dexie-utils";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { Expense, Role } from "@/lib/types";
import { AuthSession } from "@/lib/auth";

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  item: "",
  project: "Internal",
  paid_by: "",
  amount: 0,
  category: "Operations",
  notes: "",
};

export default function ExpensesPage() {
  const [role, setRole] = useState<Role>("viewer");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const { month, year } = useGlobalFilter();
  const rawRows = useLiveQuery(() => db.expenses.toArray()) || [];
  const rows = useMemo(() => {
    let filtered = rawRows;
    if (month > 0) {
      filtered = filtered.filter(r => new Date(r.date).getMonth() + 1 === month);
    }
    if (year > 0) {
      filtered = filtered.filter(r => new Date(r.date).getFullYear() === year);
    }
    if (role === "employee" && session) {
      filtered = filtered.filter(r => r.paid_by === session.name && r.category === "Reimbursement");
    }
    return filtered;
  }, [rawRows, role, session, month, year]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = useMemo(
    () => ["admin", "manager", "staff"].includes(role),
    [role],
  );
  const canDelete = useMemo(() => ["admin", "manager"].includes(role), [role]);

  async function load() {
    try {
      setSessionLoading(true);
      const result = await fetchJson<any>("/api/auth/me").catch(() => {
        // Fallback to local storage if offline
        const cached = localStorage.getItem("ft_session");
        if (cached) return JSON.parse(cached);
        throw new Error("Cannot verify session offline");
      });

      localStorage.setItem("ft_session", JSON.stringify(result));

      const fetchedRole = result?.user?.role || "viewer";
      setRole(fetchedRole);
      setSession(result?.user || null);
      if (fetchedRole === "employee" && result?.user) {
        setForm(prev => ({
          ...prev,
          category: "Reimbursement",
          paid_by: result.user.name
        }));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await mutateLocal("expenses", "UPDATE", form, editingId);
        setEditingId(null);
      } else {
        await mutateLocal("expenses", "CREATE", form);
      }
      setForm(prev => ({
        ...defaultForm,
        category: role === "employee" ? "Reimbursement" : defaultForm.category,
        paid_by: role === "employee" && session ? session.name : defaultForm.paid_by
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(row: typeof rows[0]) {
    setEditingId(row.id);
    setForm({
      date: row.date,
      item: row.item,
      project: row.project || "",
      paid_by: row.paid_by,
      amount: row.amount,
      category: row.category,
      notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(prev => ({
      ...defaultForm,
      category: role === "employee" ? "Reimbursement" : defaultForm.category,
      paid_by: role === "employee" && session ? session.name : defaultForm.paid_by
    }));
  }

  async function deleteExpense(id: string) {
    setDeletingId(id);
    try {
      await mutateLocal("expenses", "DELETE", {}, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell
      title="Expense Tracker"
      subtitle="Record operational, project, and asset costs with ownership visibility"
      role={role}
      setRole={setRole}
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

      {canCreate && (
        <form
          onSubmit={submitExpense}
          className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editingId ? "Edit Expense" : "Add Expense"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <fieldset
            disabled={submitting}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Item"
              value={form.item}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, item: event.target.value }))
              }
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Project"
              value={form.project}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, project: event.target.value }))
              }
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Paid By"
              value={form.paid_by}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, paid_by: event.target.value }))
              }
              required
              disabled={role === "employee"}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              type="number"
              min={1}
              placeholder="Amount"
              value={form.amount || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: Number(event.target.value),
                }))
              }
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              required
              disabled={role === "employee"}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </fieldset>
          <button
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving…" : editingId ? "Update Expense" : "Add Expense"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Paid By</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessionLoading && rawRows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 animate-pulse"
                  >
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={8}
                  >
                    No expense entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">{row.item}</td>
                    <td className="px-4 py-3">{row.project}</td>
                    <td className="px-4 py-3">{row.paid_by}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.notes}</td>
                    <td className="px-4 py-3">
                      {canCreate && (
                        <button
                          className="mr-2 rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 disabled:opacity-40"
                          onClick={() => startEdit(row)}
                          disabled={deletingId === row.id || editingId === row.id}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete ? (
                        <button
                          className="rounded-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-40"
                          onClick={() => deleteExpense(row.id)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? "Deleting…" : "Delete"}
                        </button>
                      ) : !canCreate && (
                        <span className="text-xs text-slate-400">
                          No access
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

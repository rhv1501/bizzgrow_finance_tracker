"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { Expense, User } from "@/lib/types";

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  item: "",
  project: "Internal",
  paid_by: "",
  amount: 0,
  category: "Operations",
  notes: "",
  receipt_url: "",
};

export default function ExpensesPage() {
  const { month, year } = useGlobalFilter();
  const { role } = useSession();
  const [rawRows, setRawRows] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    
    Promise.all([
      supabase.from("expenses").select("*"),
      supabase.from("users").select("*")
    ]).then(([expRes, userRes]) => {
      if (expRes.data) setRawRows(expRes.data as unknown as Expense[]);
      if (userRes.data) setUsers(userRes.data as unknown as User[]);
      setLoading(false);
    });

    const channel = supabase.channel("expenses-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        supabase.from("expenses").select("*").then(({ data }) => setRawRows(data as any || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        supabase.from("users").select("*").then(({ data }) => setUsers(data as any || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const rows = useMemo(() => {
    let filtered = rawRows;
    if (month > 0) {
      filtered = filtered.filter(r => new Date(r.date).getMonth() + 1 === month);
    }
    if (year > 0) {
      filtered = filtered.filter(r => new Date(r.date).getFullYear() === year);
    }
    return filtered;
  }, [rawRows, month, year]);

  const canCreate = useMemo(
    () => ["admin", "manager"].includes(role),
    [role],
  );
  const canDelete = useMemo(() => ["admin", "manager"].includes(role), [role]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(data.path);
        
      setForm(prev => ({ ...prev, receipt_url: publicUrlData.publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await createClient().from("expenses").update(form).eq("id", editingId);
        setEditingId(null);
      } else {
        await createClient().from("expenses").insert(form);
      }
      setForm(defaultForm);
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
      receipt_url: row.receipt_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function deleteExpense(id: string) {
    setDeletingId(id);
    try {
      await createClient().from("expenses").delete().eq("id", id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell
      title="Expense Tracker"
      subtitle="Log and monitor internal operations, travel, and marketing costs"
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
            
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={form.paid_by}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, paid_by: event.target.value }))
              }
              required
            >
              <option value="" disabled>Select User (Paid By)</option>
              {users.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>

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
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              required
            >
              <option value="" disabled>Select Category</option>
              <option value="Software Subscriptions">Software Subscriptions</option>
              <option value="Marketing & Advertising">Marketing & Advertising</option>
              <option value="Office & Equipment">Office & Equipment</option>
              <option value="Travel & Logistics">Travel & Logistics</option>
              <option value="Payroll & Contracting">Payroll & Contracting</option>
              <option value="Operations">Operations</option>
              <option value="Legal & Compliance">Legal & Compliance</option>
              <option value="Reimbursement">Reimbursement</option>
              <option value="Other">Other</option>
            </select>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-1"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <div className="lg:col-span-1">
              <input
                type="file"
                accept="image/*,.pdf"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  if (e.target.files?.[0]) uploadFile(e.target.files[0]);
                }}
                disabled={uploading}
              />
              {uploading && <span className="text-xs text-blue-600 ml-2">Uploading...</span>}
              {form.receipt_url && !uploading && (
                <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 block mt-1 hover:underline">
                  View Attached Receipt
                </a>
              )}
            </div>
          </fieldset>
          <button
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={submitting || uploading}
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
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rawRows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 animate-pulse"
                  >
                    {Array.from({ length: 9 }).map((_, j) => (
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
                    colSpan={9}
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
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
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

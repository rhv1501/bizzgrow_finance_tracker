"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { useOffline } from "@/components/OfflineProvider";
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
  const { isOffline } = useOffline();
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

      {canCreate && (
        <form
          onSubmit={submitExpense}
          className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              {editingId ? "Edit Expense Entry" : "Add New Expense"}
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Item name / description"
              value={form.item}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, item: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Project / Client"
              value={form.project}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, project: event.target.value }))
              }
            />
            
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium lg:col-span-1 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Internal notes"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <div className="lg:col-span-1">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-all">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? "Uploading..." : form.receipt_url ? "Change Receipt" : "Upload Receipt"}
                <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
                    }}
                    disabled={uploading}
                />
              </label>
              {form.receipt_url && !uploading && (
                <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold block mt-1 hover:underline ml-1">
                  ✓ Receipt Attached
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted text-left text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Item</th>
                <th className="px-5 py-4">Project</th>
                <th className="px-5 py-4">Paid By</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Notes</th>
                <th className="px-5 py-4">Receipt</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && rawRows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="animate-pulse"
                  >
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded bg-muted w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-12 text-center text-muted-foreground italic"
                    colSpan={9}
                  >
                    No expense records found for this period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(row.date)}</td>
                    <td className="px-5 py-4 font-bold text-foreground">{row.item}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.project}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{row.paid_by}</td>
                    <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-400">
                            {row.category}
                        </span>
                    </td>
                    <td className="px-5 py-4 font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">{row.notes || "-"}</td>
                    <td className="px-5 py-4">
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 transition-all">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground opacity-50">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                            {canCreate && (
                                <button
                                className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/50 transition-all disabled:opacity-40"
                                onClick={() => startEdit(row)}
                                disabled={deletingId === row.id || editingId === row.id}
                                >
                                Edit
                                </button>
                            )}
                            {canDelete ? (
                                <button
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/50 transition-all disabled:opacity-40"
                                onClick={() => deleteExpense(row.id)}
                                disabled={deletingId === row.id}
                                >
                                {deletingId === row.id ? "..." : "Delete"}
                                </button>
                            ) : !canCreate && (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Read Only
                                </span>
                            )}
                        </div>
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

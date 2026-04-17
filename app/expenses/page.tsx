"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { useOffline } from "@/components/OfflineProvider";
import { Expense, User } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

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
    const prevRows = [...rawRows];

    // Optimistic Update
    if (editingId) {
      setRawRows(prev => prev.map(r => r.id === editingId ? { ...r, ...form } as any : r));
    } else {
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempEntry = { 
        ...form, 
        id: tempId, 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setRawRows(prev => [tempEntry as any, ...prev]);
    }

    try {
      if (editingId) {
        const { error } = await createClient().from("expenses").update(form).eq("id", editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await createClient().from("expenses").insert(form);
        if (error) throw error;
      }
      setForm(defaultForm);
      setError(null);
    } catch (err) {
      setRawRows(prevRows); // Rollback
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
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setDeletingId(id);
    const prevRows = [...rawRows];
    
    // Optimistic Delete
    setRawRows(prev => prev.filter(r => r.id !== id));

    try {
      const { error } = await createClient().from("expenses").delete().eq("id", id);
      if (error) throw error;
      setError(null);
    } catch (err) {
      setRawRows(prevRows); // Rollback
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
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onSubmit={submitExpense}
          className="mb-8 rounded-3xl glass-card p-6 shadow-2xl overflow-visible"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span className="h-5 w-5 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
              </span>
              {editingId ? "Edit Expense Entry" : "Register Expense"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 transition-colors"
              >
                Cancel Edit ×
              </button>
            )}
          </div>
          <fieldset
            disabled={submitting}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Item name / description"
              value={form.item}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, item: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Project / Client"
              value={form.project}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, project: event.target.value }))
              }
            />
            
            <select
              className="rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm disabled:opacity-50"
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
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
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
              className="rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm disabled:opacity-50"
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
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold lg:col-span-1 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Internal notes"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <div className="lg:col-span-1">
              <label className="flex items-center gap-2 glass-btn glass-btn-secondary py-2.5 px-3 backdrop-blur-sm">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? "..." : form.receipt_url ? "Change" : "Upload"}
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
                <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-black uppercase block mt-1 hover:underline ml-1">
                  ✓ Receipt Attached
                </a>
              )}
            </div>
          </fieldset>
          <button
            className="mt-6 glass-btn glass-btn-danger w-full sm:w-auto"
            type="submit"
            disabled={submitting || uploading}
          >
            {submitting ? "Processing…" : editingId ? "Update Expense" : "Save Expense"}
          </button>
        </motion.form>
      )}

      <section className="overflow-hidden rounded-3xl glass-card shadow-2xl transition-all duration-500 hover:shadow-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Item</th>
                <th className="px-6 py-5">Project</th>
                <th className="px-6 py-5">Paid By</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5 font-bold">Notes</th>
                <th className="px-6 py-5">Receipt</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
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
                        <span className="glass-badge glass-badge-neutral">
                            {row.category}
                        </span>
                    </td>
                    <td className="px-5 py-4 font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">{row.notes || "-"}</td>
                    <td className="px-5 py-4">
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer" className="glass-btn glass-btn-secondary px-2 py-1 text-[8px]">
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
                                className="glass-btn glass-btn-secondary px-3 py-1.5 text-[8px]"
                                onClick={() => startEdit(row)}
                                disabled={deletingId === row.id || editingId === row.id}
                                >
                                Edit
                                </button>
                            )}
                            {canDelete ? (
                                <button
                                className="glass-btn glass-btn-danger px-3 py-1.5 text-[8px]"
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

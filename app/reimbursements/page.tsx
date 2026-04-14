"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { Reimbursement, Client } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";

const EXPENSE_CATEGORIES = [
  "Software Subscriptions",
  "Marketing & Advertising",
  "Office & Equipment",
  "Travel & Logistics",
  "Payroll & Contracting",
  "Operations",
  "Legal & Compliance",
  "Reimbursement",
  "Other"
];

export default function ReimbursementsPage() {
  const { role, user } = useSession();
  const [items, setItems] = useState<Reimbursement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("Internal");
  const [customProject, setCustomProject] = useState("");
  const [category, setCategory] = useState("Operations");
  const [receiptUrl, setReceiptUrl] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Listen for realtime updates
    const channel = supabase
      .channel("reimbursements_changes_v4")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reimbursements" },
        () => {
          fetchReimbursements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchReimbursements(), fetchClients()]);
    setLoading(false);
  }

  async function fetchReimbursements() {
    const { data, error } = await supabase
      .from("reimbursements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setItems(data as Reimbursement[]);
    }
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setClients(data as Client[]);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    try {
      setSubmitting(true);
      const { data, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(data.path);

      setReceiptUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setSubmitting(false);
    }
  }

  function handleProjectChange(value: string) {
    setProject(value);
    if (value !== "__custom__") {
      setCustomProject("");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!user) throw new Error("Not authenticated");

      const finalProject = project === "__custom__" ? customProject : project;
      if (!finalProject) throw new Error("Please specify a project");

      const res = await fetchJson<{ data: Reimbursement }>("/api/reimbursements", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          date,
          project: finalProject,
          category,
          receipt_url: receiptUrl || null,
        }),
      });

      setAmount("");
      setDescription("");
      setReceiptUrl("");
      setDate(new Date().toISOString().slice(0, 10));
      setProject("Internal");
      setCustomProject("");
      setCategory("Operations");
      await fetchReimbursements();
    } catch (err: any) {
      setError(err.message || "Failed to create reimbursement");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(item: Reimbursement, newStatus: "approved" | "rejected") {
    setError(null);
    try {
      await fetchJson<{ data: Reimbursement }>(`/api/reimbursements/${item.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      await fetchReimbursements();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  }

  return (
    <AppShell
      title="Reimbursements"
      subtitle="Submit and track your out-of-pocket expenses"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 text-sm text-rose-900 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* File Reimbursement Form */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-base font-bold text-foreground">File New Reimbursement</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
            <div>
              <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-0">
              <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Project</label>
              <select
                required
                value={project}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
              >
                <option value="Internal">Internal (BizzGrow)</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__custom__">✎ Custom (One-off)</option>
              </select>
              {project === "__custom__" && (
                <input
                  type="text"
                  required
                  value={customProject}
                  onChange={(e) => setCustomProject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all mt-2"
                  placeholder="Custom name"
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Expenses details..."
              />
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1.5 block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receipt</label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-all truncate">
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {submitting ? "..." : receiptUrl ? "Change" : "Upload"}
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={uploadFile}
                            disabled={submitting}
                            className="hidden"
                        />
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="self-end rounded-xl bg-foreground text-background px-6 py-2.5 text-sm font-black hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-md"
                >
                    {submitting ? "..." : "Send"}
                </button>
            </div>
          </form>
          {receiptUrl && (
            <div className="mt-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </span>
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Receipt Ready</p>
            </div>
          )}
        </section>

        {/* Timeline List */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="bg-muted text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Details</th>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Receipt</th>
                    {role !== "employee" && <th className="px-5 py-4 text-center">Actions</th>}
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {loading && items.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td colSpan={role !== "employee" ? 8 : 7} className="px-5 py-5"><div className="h-4 bg-muted rounded w-full"></div></td>
                        </tr>
                    ))
                ) : items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-5 text-muted-foreground">{formatDate(item.date)}</td>
                    <td className="px-5 py-5 font-bold text-foreground">{item.user_name}</td>
                    <td className="px-5 py-5">
                        <div className="font-bold text-foreground">{item.category}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                    </td>
                    <td className="px-5 py-5">
                        <span className="rounded-lg bg-muted border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                            {item.project}
                        </span>
                    </td>
                    <td className="px-5 py-5 font-black text-foreground text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-5 py-5 text-center">
                        <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide border shadow-sm ${
                            item.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800"
                            : item.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800"
                            : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800"
                        }`}
                        >
                        {item.status}
                        </span>
                    </td>
                    <td className="px-5 py-5 text-center">
                        {item.receipt_url ? (
                        <a href={item.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 transition-all">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                        </a>
                        ) : (
                        <span className="text-muted-foreground opacity-30 text-[10px] font-bold uppercase tracking-tighter">-</span>
                        )}
                    </td>
                    {role !== "employee" && (
                        <td className="px-5 py-5">
                            <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => updateStatus(item, "approved")}
                                    disabled={item.status === "approved" || item.status === "rejected"}
                                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800 transition-all active:scale-90 disabled:opacity-30"
                                >
                                    Approve
                                </button>
                                <button 
                                    onClick={() => updateStatus(item, "rejected")}
                                    disabled={item.status === "approved" || item.status === "rejected"}
                                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/50 transition-all active:scale-90 disabled:opacity-30"
                                >
                                    Reject
                                </button>
                            </div>
                        </td>
                    )}
                    </tr>
                ))}
                {!loading && items.length === 0 && (
                    <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground italic">
                        No reimbursements in your history.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

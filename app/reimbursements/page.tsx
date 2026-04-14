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
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        {/* File Reimbursement Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">File New Reimbursement</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Project</label>
              <select
                required
                value={project}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner cursor-pointer"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner mt-1"
                  placeholder="Custom project name"
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="xl:col-span-1">
              <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                placeholder="What was this for?"
              />
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt</label>
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={uploadFile}
                        disabled={submitting}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                </div>
                <button
                type="submit"
                disabled={submitting}
                className="self-end rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                >
                {submitting ? "..." : "Submit"}
                </button>
            </div>
          </form>
          {receiptUrl && (
            <div className="mt-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </span>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Receipt Attached</p>
            </div>
          )}
        </section>

        {/* Timeline List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Category / Item</th>
                <th className="px-5 py-4">Project</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Receipt</th>
                {role !== "employee" && <th className="px-5 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && items.length === 0 ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                         <td colSpan={role !== "employee" ? 8 : 7} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                    </tr>
                 ))
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-slate-500 font-medium">{formatDate(item.date)}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{item.user_name}</td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{item.category}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </td>
                  <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">
                        {item.project}
                      </span>
                  </td>
                  <td className="px-5 py-4 font-black text-slate-900">{formatCurrency(item.amount)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                        item.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : item.status === "rejected"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {item.receipt_url ? (
                      <a href={item.receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">No File</span>
                    )}
                  </td>
                  {role !== "employee" && (
                    <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                             <button 
                                onClick={() => updateStatus(item, "approved")}
                                disabled={item.status === "approved" || item.status === "rejected"}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-100 disabled:opacity-30 border border-emerald-100 transition-all active:scale-90"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateStatus(item, "rejected")}
                                disabled={item.status === "approved" || item.status === "rejected"}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100 disabled:opacity-30 border border-rose-100 transition-all active:scale-90"
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
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 italic">
                    No reimbursements in your history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { Reimbursement, Client } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { useOffline } from "@/components/OfflineProvider";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "Travel",
  "Food",
  "Software",
  "Marketing",
  "Equipment",
  "Operations",
  "Other"
];

export default function ReimbursementsPage() {
  const { role, user } = useSession();
  const { isOffline } = useOffline();
  const [requests, setRequests] = useState<Reimbursement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    amount: 0,
    category: "Travel",
    description: "",
    project: "Internal",
    customProject: "",
    receipt_url: ""
  });

  const canApprove = role === "admin" || role === "manager";
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [reqRes, cliRes] = await Promise.all([
          supabase.from("reimbursements").select("*").order("created_at", { ascending: false }),
          supabase.from("clients").select("*").order("name", { ascending: true })
        ]);
        if (reqRes.data) setRequests(reqRes.data as Reimbursement[]);
        if (cliRes.data) setClients(cliRes.data as Client[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();

    const channel = supabase.channel("reimbursements_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reimbursements" }, () => {
        supabase.from("reimbursements").select("*").order("created_at", { ascending: false })
          .then(({ data }) => { if (data) setRequests(data as Reimbursement[]); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(data.path);

      setForm(prev => ({ ...prev, receipt_url: publicUrlData.publicUrl }));
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setError(null);
    const prevRequests = [...requests];

    const finalProject = form.project === "__custom__" ? form.customProject : form.project;
    
    const payload = {
      amount: form.amount,
      category: form.category,
      description: form.description,
      project: finalProject || "Internal",
      receipt_url: form.receipt_url || null,
      date: new Date().toISOString().slice(0, 10)
    };

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: Reimbursement = {
      id: tempId,
      user_id: user.id,
      user_name: user.name || user.email?.split('@')[0] || "User",
      amount: payload.amount,
      category: payload.category,
      description: payload.description,
      project: payload.project,
      date: payload.date,
      status: "pending",
      receipt_url: payload.receipt_url || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setRequests(prev => [optimisticRequest, ...prev]);

    try {
      await fetchJson("/api/reimbursements", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setForm({
        amount: 0,
        category: "Travel",
        description: "",
        project: "Internal",
        customProject: "",
        receipt_url: ""
      });
    } catch (err: any) {
      setRequests(prevRequests);
      setError(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const prevRequests = [...requests];
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    try {
      await fetchJson(`/api/reimbursements/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
    } catch (err: any) {
      setRequests(prevRequests);
      setError(err.message || "Failed to update status");
    }
  }

  return (
    <AppShell
      title="Reimbursements"
      subtitle="Submit business expenses and track approval status"
    >
      {error && (
        <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-4">
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </span>
          <button onClick={() => setError(null)} className="ml-4 font-black uppercase text-[10px] hover:opacity-70">Dismiss</button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Request Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-4"
        >
          <form
            onSubmit={onSubmit}
            className="rounded-3xl glass-card p-6 shadow-2xl sticky top-6"
          >
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2 mb-6">
              <span className="h-5 w-5 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
              </span>
              New Request
            </h2>
            <fieldset disabled={submitting} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Amount *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="0.00"
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Category *</label>
                <select
                  required
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="What was this expense for?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Project</label>
                <select
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer mb-2"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                >
                  <option value="Internal">Internal (BizzGrow)</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="__custom__">✎ Custom Project</option>
                </select>
                {form.project === "__custom__" && (
                    <input
                        type="text"
                        required
                        className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="Project Name"
                        value={form.customProject}
                        onChange={(e) => setForm({ ...form, customProject: e.target.value })}
                    />
                )}
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Receipt</label>
                 <label className="flex items-center justify-center gap-2 w-full glass-btn glass-btn-secondary border-dashed py-4 backdrop-blur-sm">
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? "..." : form.receipt_url ? "Change" : "Upload"}
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }}
                        disabled={uploading}
                    />
                </label>
                {form.receipt_url && !uploading && (
                    <p className="text-[10px] text-emerald-600 font-black uppercase text-center mt-1">✓ Receipt Attached</p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || uploading || isOffline}
                className="w-full glass-btn glass-btn-primary py-4 mt-2"
              >
                {submitting ? "Submitting..." : "Send Request"}
              </button>
            </fieldset>
          </form>
        </motion.div>

        {/* Requests List */}
        <div className="lg:col-span-8">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {loading && requests.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-3xl bg-muted/20 animate-pulse border border-border/50" />
                ))
              ) : requests.length === 0 ? (
                <div className="rounded-3xl glass-card p-12 text-center text-muted-foreground italic shadow-xl font-medium">
                  No reimbursement requests found.
                </div>
              ) : (
                requests.map((req) => (
                  <motion.article
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    key={req.id}
                    className="group relative overflow-hidden rounded-3xl glass-card p-6 shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">#{req.id.toString().slice(-8)}</span>
                             <span className={`glass-badge ${
                                req.status === 'approved' ? 'glass-badge-success' :
                                req.status === 'rejected' ? 'glass-badge-warning' :
                                'glass-badge-neutral'
                            }`}>
                                {req.status}
                            </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground">{req.description}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-black text-rose-600 dark:text-rose-400">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                {formatCurrency(req.amount)}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                {req.user_name}
                            </span>
                            <span className="flex items-center gap-1.5 opacity-60">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                {formatDate(req.date)}
                            </span>
                            {req.project && (
                                <span className="flex items-center gap-1.5 opacity-60">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    {req.project}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {req.receipt_url && (
                        <a
                          href={req.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-btn glass-btn-secondary px-4 py-2 text-[8px] shadow-sm"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          View Receipt
                        </a>
                      )}
                      {canApprove && req.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(req.id, "approved")}
                            className="flex-1 glass-btn glass-btn-success py-2 text-[8px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "rejected")}
                            className="flex-1 glass-btn glass-btn-danger py-2 text-[8px]"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                </motion.article>
              ))
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

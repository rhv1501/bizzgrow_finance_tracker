"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { Client, Income, Service } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { useOffline } from "@/components/OfflineProvider";
import { motion, AnimatePresence } from "framer-motion";

const defaultForm = {
  client_id: "",
  client_name: "",
  service_id: "",
  service_type: "",
  amount: 0,
  status: "To be paid" as "Advance" | "Paid" | "To be paid",
  payment_method: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const defaultNewClient = { name: "", contact: "", company: "" };
const defaultNewService = { name: "", price: 0 };

export default function IncomePage() {
  const { role } = useSession();
  const { isOffline } = useOffline();
  const { month, year } = useGlobalFilter();
  const [rawRows, setRawRows] = useState<Income[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("income").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("services").select("*")
    ]).then(([incRes, cliRes, srvRes]) => {
      if (incRes.data) setRawRows(incRes.data as unknown as Income[]);
      if (cliRes.data) setClients(cliRes.data as unknown as Client[]);
      if (srvRes.data) setServices(srvRes.data as unknown as Service[]);
    });

    const channel = supabase.channel("income-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, () => {
        supabase.from("income").select("*").then(({ data }) => setRawRows(data as any || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        supabase.from("clients").select("*").then(({ data }) => setClients(data as any || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        supabase.from("services").select("*").then(({ data }) => setServices(data as any || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [savingService, setSavingService] = useState(false);

  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [newClient, setNewClient] = useState(defaultNewClient);
  const [newService, setNewService] = useState(defaultNewService);

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
  const canManageMasterData = useMemo(
    () => ["admin", "manager"].includes(role),
    [role],
  );

  useEffect(() => {
    // Session is handled by provider, so we just set loading false for data
    setLoading(false);
  }, []);

  function handleClientSelect(value: string) {
    if (value === "__new__") {
      setShowNewClient(true);
      setForm((prev) => ({ ...prev, client_id: "", client_name: "" }));
    } else if (value === "__custom__") {
      setShowNewClient(false);
      setForm((prev) => ({ ...prev, client_id: "__custom__", client_name: "" }));
    } else {
      const client = clients.find((c) => c.id === value);
      setShowNewClient(false);
      setForm((prev) => ({
        ...prev,
        client_id: client?.id ?? "",
        client_name: client?.name ?? "",
      }));
    }
  }

  function handleServiceSelect(value: string) {
    if (value === "__new__") {
      setShowNewService(true);
      setForm((prev) => ({ ...prev, service_id: "", service_type: "" }));
    } else if (value === "__custom__") {
      setShowNewService(false);
      setForm((prev) => ({ ...prev, service_id: "__custom__", service_type: "" }));
    } else {
      const service = services.find((s) => s.id === value);
      setShowNewService(false);
      setForm((prev) => ({
        ...prev,
        service_id: service?.id ?? "",
        service_type: service?.name ?? "",
        amount: service?.price ? service.price : prev.amount,
      }));
    }
  }

  async function saveNewClient() {
    if (!newClient.name.trim()) return;
    setSavingClient(true);
    const prevClients = [...clients];
    const generatedId = crypto.randomUUID();
    
    // Optimistic Update
    const tempClient = { ...newClient, id: generatedId, created_at: new Date().toISOString() };
    setClients(prev => [...prev, tempClient]);

    try {
      const { error } = await createClient().from("clients").insert({ ...newClient, id: generatedId });
      if (error) throw error;
      
      setForm((prev) => ({
        ...prev,
        client_id: generatedId,
        client_name: newClient.name,
      }));
      setNewClient(defaultNewClient);
      setShowNewClient(false);
      setError(null);
    } catch (err) {
      setClients(prevClients); // Rollback
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSavingClient(false);
    }
  }

  async function saveNewService() {
    if (!newService.name.trim()) return;
    setSavingService(true);
    const prevServices = [...services];
    const generatedId = crypto.randomUUID();

    // Optimistic Update
    const tempService = { ...newService, id: generatedId, created_at: new Date().toISOString() };
    setServices(prev => [...prev, tempService]);

    try {
      const { error } = await createClient().from("services").insert({ ...newService, id: generatedId });
      if (error) throw error;

      setForm((prev) => ({
        ...prev,
        service_id: generatedId,
        service_type: newService.name,
        amount: newService.price || prev.amount,
      }));
      setNewService(defaultNewService);
      setShowNewService(false);
      setError(null);
    } catch (err) {
      setServices(prevServices); // Rollback
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setSavingService(false);
    }
  }

  async function submitIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const prevRows = [...rawRows];

    // Prepare payload
    const payload = {
      ...form,
      client_id: form.client_id === "__custom__" || !form.client_id ? null : form.client_id,
      service_id: form.service_id === "__custom__" || !form.service_id ? null : form.service_id,
    };

    // Optimistic Update
    if (editingId) {
      setRawRows(prev => prev.map(r => r.id === editingId ? { ...r, ...payload } as any : r));
    } else {
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempEntry = { 
        ...payload, 
        id: tempId, 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setRawRows(prev => [tempEntry as any, ...prev]);
    }

    try {
      if (editingId) {
        const { error } = await createClient().from("income").update(payload).eq("id", editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await createClient().from("income").insert(payload);
        if (error) throw error;
      }
      setForm(defaultForm);
      setError(null);
    } catch (err) {
      setRawRows(prevRows); // Rollback
      setError(
        err instanceof Error ? err.message : "Failed to save income entry",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(row: typeof rows[0]) {
    setEditingId(row.id);
    setForm({
      client_id: row.client_id || "__custom__",
      client_name: row.client_name,
      service_id: row.service_id || "__custom__",
      service_type: row.service_type,
      amount: row.amount,
      status: row.status as any,
      payment_method: row.payment_method || "",
      date: row.date,
      notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(defaultForm);
  }

  async function deleteIncome(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    setDeletingId(id);
    const prevRows = [...rawRows];
    
    // Optimistic Update
    setRawRows(prev => prev.filter(r => r.id !== id));

    try {
      const { error } = await createClient().from("income").delete().eq("id", id);
      if (error) throw error;
      setError(null);
    } catch (err) {
      setRawRows(prevRows); // Rollback
      setError(
        err instanceof Error ? err.message : "Failed to delete income entry",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell
      title="Income Tracker"
      subtitle="Track client-wise revenue, payment status, and pending collections"
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
          onSubmit={submitIncome}
          className="mb-8 rounded-3xl glass-card p-6 shadow-2xl overflow-visible"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span className="h-5 w-5 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
              </span>
              {editingId ? "Edit Income Entry" : "Register Income"}
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
            disabled={submitting || isOffline}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="flex flex-col gap-2">
              <select
                className="rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm"
                value={showNewClient ? "__new__" : form.client_id}
                onChange={(e) => handleClientSelect(e.target.value)}
                required={!showNewClient && form.client_id !== "__custom__"}
              >
                <option value="" disabled>Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__custom__">✎ Custom (One-off)</option>
                {canManageMasterData && (
                  <option value="__new__">+ Add to master catalog…</option>
                )}
              </select>

              {form.client_id === "__custom__" && !showNewClient && (
                <input
                  className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Custom client name"
                  value={form.client_name}
                  onChange={(e) => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                  required
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <select
                className="rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm"
                value={showNewService ? "__new__" : form.service_id}
                onChange={(e) => handleServiceSelect(e.target.value)}
                required={!showNewService && form.service_id !== "__custom__"}
              >
                <option value="" disabled>Select Service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {formatCurrency(s.price)}
                  </option>
                ))}
                <option value="__custom__">✎ Custom (One-off)</option>
                {canManageMasterData && (
                  <option value="__new__">+ Add to master catalog…</option>
                )}
              </select>

              {form.service_id === "__custom__" && !showNewService && (
                <input
                  className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Custom service name"
                  value={form.service_type}
                  onChange={(e) => setForm(prev => ({ ...prev, service_type: e.target.value }))}
                  required
                />
              )}
            </div>

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
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer backdrop-blur-sm"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as any,
                }))
              }
            >
              <option>Advance</option>
              <option>Paid</option>
              <option>To be paid</option>
            </select>
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
              placeholder="Payment Method"
              value={form.payment_method}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, payment_method: event.target.value }))
              }
            />
            <input
              className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-sm font-bold lg:col-span-2 focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="Notes and internal tags"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </fieldset>

          {showNewClient && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-800">
                New Client
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Name *"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Contact"
                  value={newClient.contact}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      contact: e.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Company"
                  value={newClient.company}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveNewClient}
                  disabled={savingClient || !newClient.name.trim()}
                  className="glass-btn glass-btn-primary px-3 py-1.5 text-[10px]"
                >
                  {savingClient ? "Saving…" : "Save Client"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClient(false);
                    setNewClient(defaultNewClient);
                  }}
                  disabled={savingClient}
                  className="glass-btn glass-btn-secondary px-3 py-1.5 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showNewService && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-800">
                New Service
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Service name *"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  placeholder="Default price"
                  value={newService.price || ""}
                  onChange={(e) =>
                    setNewService((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveNewService}
                  disabled={savingService || !newService.name.trim()}
                  className="glass-btn glass-btn-primary px-3 py-1.5 text-[10px]"
                >
                  {savingService ? "Saving…" : "Save Service"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewService(false);
                    setNewService(defaultNewService);
                  }}
                  disabled={savingService}
                  className="glass-btn glass-btn-secondary px-3 py-1.5 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            className="mt-6 glass-btn glass-btn-primary w-full sm:w-auto"
            type="submit"
            disabled={submitting || showNewClient || showNewService}
          >
            {submitting ? "Processing…" : editingId ? "Update Transaction" : "Save Transaction"}
          </button>
        </motion.form>
      )}

      <section className="overflow-hidden rounded-3xl glass-card shadow-2xl transition-all duration-500 hover:shadow-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-5">Client</th>
                <th className="px-6 py-5">Service</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Method</th>
                <th className="px-6 py-5 font-bold">Notes</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="animate-pulse"
                  >
                    {Array.from({ length: 8 }).map((_, j) => (
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
                    colSpan={8}
                  >
                    No income entries found for this period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{row.client_name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.service_type}</td>
                    <td className="px-5 py-4 font-black text-foreground">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-4">
                        <span className={`glass-badge ${
                            row.status === 'Paid' ? 'glass-badge-success' :
                            row.status === 'Advance' ? 'glass-badge-warning' :
                            'glass-badge-neutral'
                        }`}>
                            {row.status}
                        </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(row.date)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.payment_method || "-"}</td>
                    <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">{row.notes || "-"}</td>
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
                                onClick={() => deleteIncome(row.id)}
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

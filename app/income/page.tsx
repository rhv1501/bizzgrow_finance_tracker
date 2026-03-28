"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";
import { fetchJson, formatCurrency, formatDate } from "@/lib/client-utils";
import { Client, Income, Role, Service } from "@/lib/types";
import { mutateLocal } from "@/lib/dexie-utils";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "dexie-react-hooks";

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
  const [role, setRole] = useState<Role>("viewer");
  const { month, year } = useGlobalFilter();
  const rawRows = useLiveQuery(() => db.income.toArray()) || [];
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
  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const services = useLiveQuery(() => db.services.toArray()) || [];
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

  const canCreate = useMemo(
    () => ["admin", "manager", "staff"].includes(role),
    [role],
  );
  const canDelete = useMemo(() => ["admin", "manager"].includes(role), [role]);
  const canManageMasterData = useMemo(
    () => ["admin", "manager"].includes(role),
    [role],
  );

  async function load() {
    try {
      setLoading(true);
      const result = await fetchJson<any>("/api/auth/me").catch(() => {
        const cached = localStorage.getItem("ft_session");
        if (cached) return JSON.parse(cached);
        throw new Error("Cannot verify session offline");
      });
      localStorage.setItem("ft_session", JSON.stringify(result));
      setRole(result?.user?.role || "viewer");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleClientSelect(value: string) {
    if (value === "__new__") {
      setShowNewClient(true);
      setForm((prev) => ({ ...prev, client_id: "", client_name: "" }));
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
    try {
      const generatedId = crypto.randomUUID();
      await mutateLocal("clients", "CREATE", { ...newClient, id: generatedId });
      
      setForm((prev) => ({
        ...prev,
        client_id: generatedId,
        client_name: newClient.name,
      }));
      setNewClient(defaultNewClient);
      setShowNewClient(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSavingClient(false);
    }
  }

  async function saveNewService() {
    if (!newService.name.trim()) return;
    setSavingService(true);
    try {
      const generatedId = crypto.randomUUID();
      await mutateLocal("services", "CREATE", { ...newService, id: generatedId });

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
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setSavingService(false);
    }
  }

  async function submitIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await mutateLocal("income", "UPDATE", form, editingId);
        setEditingId(null);
      } else {
        await mutateLocal("income", "CREATE", form);
      }
      setForm(defaultForm);
    } catch (err) {
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
      client_id: row.client_id,
      client_name: row.client_name,
      service_id: row.service_id,
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
    setDeletingId(id);
    try {
      await mutateLocal("income", "DELETE", {}, id);
    } catch (err) {
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
          onSubmit={submitIncome}
          className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editingId ? "Edit Income" : "Add Income"}
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
            {/* Client dropdown */}
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={showNewClient ? "__new__" : form.client_id}
              onChange={(e) => handleClientSelect(e.target.value)}
              required={!showNewClient}
            >
              <option value="" disabled>
                Select Client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {canManageMasterData && (
                <option value="__new__">+ Add new client…</option>
              )}
            </select>

            {/* Service dropdown */}
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={showNewService ? "__new__" : form.service_id}
              onChange={(e) => handleServiceSelect(e.target.value)}
              required={!showNewService}
            >
              <option value="" disabled>
                Select Service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {canManageMasterData && (
                <option value="__new__">+ Add new service…</option>
              )}
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as
                    | "Advance"
                    | "Paid"
                    | "To be paid",
                }))
              }
            >
              <option>Advance</option>
              <option>Paid</option>
              <option>To be paid</option>
            </select>
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
              placeholder="Payment Method"
              value={form.payment_method}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  payment_method: event.target.value,
                }))
              }
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

          {/* Inline new client form */}
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
                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Inline new service form */}
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
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={submitting || showNewClient || showNewService}
          >
            {submitting ? "Saving…" : editingId ? "Update Income" : "Add Income"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
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
                    No income entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.client_name}</td>
                    <td className="px-4 py-3">{row.service_type}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">{row.payment_method || "-"}</td>
                    <td className="px-4 py-3">{row.notes || "-"}</td>
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
                          onClick={() => deleteIncome(row.id)}
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

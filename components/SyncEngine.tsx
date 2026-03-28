"use client";

import { useEffect } from "react";
import { db } from "@/lib/dexie";
import { fetchJson } from "@/lib/client-utils";
import { Client, Service, User, Income, Expense, AuditLog } from "@/lib/types";
import { pusherClient } from "@/lib/pusher-client";

export function SyncEngine() {
  useEffect(() => {
    // Basic network listener
    const handleOnline = () => {
      pushSyncQueue();
      pullAllData();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("trigger-sync", pushSyncQueue);
    
    // Initial fetch on mount
    if (navigator.onLine) {
      handleOnline();
    }

    let channel: any;
    if (pusherClient) {
      channel = pusherClient.subscribe("private-financetracker");
      channel.bind("sync-event", () => {
        pullAllData();
      });
    }

    // Set an interval to sync every minute just in case
    const interval = setInterval(() => {
      if (navigator.onLine) {
        handleOnline();
      }
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("trigger-sync", pushSyncQueue);
      if (pusherClient && channel) {
        channel.unbind_all();
        channel.unsubscribe();
      }
      clearInterval(interval);
    };
  }, []);

  async function pushSyncQueue() {
    const queue = await db.syncQueue.where("status").equals("pending").toArray();
    for (const record of queue) {
      try {
        await db.syncQueue.update(record.id!, { status: "syncing" });
        
        const method = record.operation === "CREATE" ? "POST" : record.operation === "UPDATE" ? "PUT" : "DELETE";
        const url = record.operation === "CREATE" ? `/api/${record.table}` : `/api/${record.table}/${record.record_id}`;
        
        const options: RequestInit = { method };
        if (record.operation !== "DELETE") {
          options.body = JSON.stringify(record.payload);
        }

        await fetchJson(url, options);

        // Success, remove from queue
        await db.syncQueue.delete(record.id!);
      } catch (err) {
        console.error("Sync error:", err);
        await db.syncQueue.update(record.id!, { status: "pending" }); // Retry later
      }
    }
  }

  return null;
}

export async function pullAllData() {
  try {
    // Example: pulling summary data is handled elsewhere, but for pure tables we fetch APIs
    // For now we just pull expenses and income as a basic implementation. 
    // Ideally we'd pull everything needed.
    const [expensesRes, incomeRes, clientsRes, servicesRes, usersRes] = await Promise.all([
      fetch("/api/expenses").then(res => res.json()),
      fetch("/api/income").then(res => res.json()),
      fetch("/api/clients").then(res => res.json()),
      fetch("/api/services").then(res => res.json()),
      fetch("/api/users").then(res => res.json())
    ]);

    if (expensesRes?.data) {
      await db.expenses.bulkPut(expensesRes.data);
    }
    if (incomeRes?.data) {
      await db.income.bulkPut(incomeRes.data);
    }
    if (clientsRes?.data) {
      await db.clients.bulkPut(clientsRes.data);
    }
    if (servicesRes?.data) {
      await db.services.bulkPut(servicesRes.data);
    }
    if (usersRes?.data) {
      await db.users.bulkPut(usersRes.data);
    }
  } catch (err) {
    console.error("Error pulling data:", err);
  }
}

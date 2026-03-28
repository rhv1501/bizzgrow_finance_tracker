import { db, SyncOperationRecord } from "./dexie";
import { TableName } from "./types";

export async function mutateLocal(
  table: TableName, 
  operation: "CREATE" | "UPDATE" | "DELETE", 
  payload: any, 
  record_id?: string
) {
  let finalId = record_id || "";
  
  if (operation === "CREATE") {
    finalId = crypto.randomUUID();
    payload.id = finalId;
    await (db as any)[table].put(payload);
  } else if (operation === "UPDATE") {
    await (db as any)[table].update(finalId, payload);
  } else if (operation === "DELETE") {
    await (db as any)[table].delete(finalId);
  }

  await db.syncQueue.add({
    table,
    operation,
    payload,
    record_id: finalId,
    timestamp: new Date().toISOString(),
    status: "pending"
  });

  if (navigator.onLine) {
     window.dispatchEvent(new Event("trigger-sync"));
  }
}

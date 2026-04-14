import { ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { listRows } from "@/lib/db";
import { AuditLog } from "@/lib/types";

export async function GET(request: Request) {
  const role = await requirePermission("manageUsers");
  if (role instanceof Response) {
    return role;
  }

  const rows = await listRows<AuditLog>("audit_logs");
  const sorted = [...rows].sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")),
  );

  return ok({ role, data: sorted });
}

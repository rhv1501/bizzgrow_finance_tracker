import { getSummary } from "@/lib/db";
import { ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

export async function GET(request: Request) {
  const role = await requirePermission("readCore");
  if (role instanceof Response) {
    return role;
  }

  const summary = await getSummary();

  return ok({
    role,
    summary,
  });
}

import { getSummary, isUsingMockDb } from "@/lib/db";
import { ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

export async function GET(request: Request) {
  const role = requirePermission(request, "read");
  if (role instanceof Response) {
    return role;
  }

  const summary = await getSummary();

  return ok({
    role,
    usingMockDb: isUsingMockDb(),
    summary,
  });
}

import { getSummary } from "@/lib/db";
import { ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

export async function GET(request: Request) {
  const role = await requirePermission("readCore");
  if (role instanceof Response) {
    return role;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  const summary = await getSummary(month, year);

  return ok({
    role,
    summary,
  });
}

import { fail, ok, parseZodError } from "@/lib/api";
import { createServiceSchema } from "@/lib/schemas";
import { createRow, listRows } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Service } from "@/lib/types";

export async function GET(request: Request) {
  const role = await requirePermission("readCore");
  if (role instanceof Response) {
    return role;
  }

  const rows = await listRows<Service>("services");
  return ok({ role, data: rows });
}

export async function POST(request: Request) {
  const role = await requirePermission("manageMasterData");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = createServiceSchema.parse(body);
    const created = await createRow<Service>("services", parsed);
    return ok({ role, data: created }, 201);
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

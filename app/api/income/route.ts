import { fail, ok, parseZodError } from "@/lib/api";
import { createIncomeSchema } from "@/lib/schemas";
import { createRow, listRows } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Income, Role } from "@/lib/types";

export async function GET(request: Request) {
  const role = await requirePermission("readCore");
  if (role instanceof Response) {
    return role;
  }

  const rows = await listRows<Income>("income");
  return ok({ role, data: rows });
}

export async function POST(request: Request) {
  const role = await requirePermission("manageCore");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = createIncomeSchema.parse(body);
    const created = await createRow<Income>("income", parsed);
    return ok({ role: role as Role, data: created }, 201);
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

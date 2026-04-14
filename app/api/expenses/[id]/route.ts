import { fail, ok, parseZodError } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateExpenseSchema } from "@/lib/schemas";
import { Expense } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = await requirePermission("manageCore");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = updateExpenseSchema.parse(body);
    const { id } = await context.params;
    const updated = await updateRow<Expense>("expenses", id, parsed);

    if (!updated) {
      return fail("Expense entry not found", 404);
    }

    return ok({ role, data: updated });
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = await requirePermission("manageCore");
  if (role instanceof Response) {
    return role;
  }

  const { id } = await context.params;
  const deleted = await deleteRow("expenses", id);
  if (!deleted) {
    return fail("Expense entry not found", 404);
  }

  return ok({ role, ok: true });
}

import { fail, ok, parseZodError } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateIncomeSchema } from "@/lib/schemas";
import { Income } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = requirePermission(request, "updateTransaction");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = updateIncomeSchema.parse(body);
    const { id } = await context.params;
    const updated = await updateRow<Income>("income", id, parsed);

    if (!updated) {
      return fail("Income entry not found", 404);
    }

    return ok({ role, data: updated });
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = requirePermission(request, "deleteTransaction");
  if (role instanceof Response) {
    return role;
  }

  const { id } = await context.params;
  const deleted = await deleteRow("income", id);
  if (!deleted) {
    return fail("Income entry not found", 404);
  }

  return ok({ role, ok: true });
}

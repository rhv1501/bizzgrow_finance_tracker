import { fail, ok, parseZodError } from "@/lib/api";
import { deleteRow, updateRow } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateServiceSchema } from "@/lib/schemas";
import { Service } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = await requirePermission("manageMasterData");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = updateServiceSchema.parse(body);
    const { id } = await context.params;
    const updated = await updateRow<Service>("services", id, parsed);

    if (!updated) {
      return fail("Service not found", 404);
    }

    return ok({ role, data: updated });
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const role = await requirePermission("manageMasterData");
  if (role instanceof Response) {
    return role;
  }

  const { id } = await context.params;
  const deleted = await deleteRow("services", id);
  if (!deleted) {
    return fail("Service not found", 404);
  }

  return ok({ role, ok: true });
}
